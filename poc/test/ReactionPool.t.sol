// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {ReactionPool} from "../src/ReactionPool.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract ReactionPoolTest is Test {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    ReactionPool public pool;

    address public owner;
    uint256 public ownerKey;

    address public user;
    uint256 public userKey;

    address public authorizedSigner;
    uint256 public signerKey;

    address public custodyAddress;

    bytes32 public channelId;

    function setUp() public {
        // Generate test accounts with private keys
        ownerKey = 0xA11CE;
        owner = vm.addr(ownerKey);

        userKey = 0xB0B;
        user = vm.addr(userKey);

        signerKey = 0x51611E8;
        authorizedSigner = vm.addr(signerKey);

        custodyAddress = address(0xC0FFEE);

        // Deploy contract as owner
        vm.prank(owner);
        pool = new ReactionPool(custodyAddress);

        // Generate a channel ID
        channelId = keccak256(abi.encode(user, address(pool), block.timestamp));
    }

    // ============ Constructor Tests ============

    function test_Constructor() public view {
        assertEq(pool.owner(), owner);
        assertEq(pool.custodyAddress(), custodyAddress);
        assertEq(pool.MAGIC_VALUE(), bytes4(0x1626ba7e));
        assertEq(pool.MIN_CLOSE_BALANCE(), 1000);
        assertEq(pool.INACTIVITY_PERIOD(), 7 days);
    }

    // ============ Channel Registration Tests ============

    function test_RegisterChannel() public {
        pool.registerChannel(channelId, user);

        (address registeredUser, uint256 lastActivity, bool active) = pool.getChannelInfo(channelId);

        assertEq(registeredUser, user);
        assertEq(lastActivity, block.timestamp);
        assertTrue(active);
    }

    function test_RegisterChannel_EmitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit ReactionPool.ChannelRegistered(channelId, user);

        pool.registerChannel(channelId, user);
    }

    function test_RegisterChannel_RevertIfAlreadyExists() public {
        pool.registerChannel(channelId, user);

        vm.expectRevert(ReactionPool.ChannelAlreadyExists.selector);
        pool.registerChannel(channelId, user);
    }

    // ============ ERC-1271 Tests ============

    function test_IsValidSignature_PreApprovedHash() public {
        // Setup channel
        pool.registerChannel(channelId, user);

        // Create and approve a state hash
        bytes32 stateHash = keccak256("test state");
        bytes32 approvalHash = keccak256(
            abi.encode("APPROVE_STATE", channelId, stateHash)
        );

        // User signs the approval
        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userKey, ethSignedHash);
        bytes memory userSignature = abi.encodePacked(r, s, v);

        pool.approveStateHash(channelId, stateHash, userSignature);

        // Verify ERC-1271 returns MAGIC_VALUE
        bytes4 result = pool.isValidSignature(stateHash, "");
        assertEq(result, pool.MAGIC_VALUE());
    }

    function test_IsValidSignature_AuthorizedSigner() public {
        // Authorize signer
        vm.prank(owner);
        pool.setAuthorizedSigner(authorizedSigner, true);

        // Create a hash and sign it with authorized signer
        bytes32 stateHash = keccak256("test state");
        bytes32 ethSignedHash = stateHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Verify ERC-1271 returns MAGIC_VALUE
        bytes4 result = pool.isValidSignature(stateHash, signature);
        assertEq(result, pool.MAGIC_VALUE());
    }

    function test_IsValidSignature_UserSignatureWithChannel() public {
        // Setup channel
        pool.registerChannel(channelId, user);

        // Create a hash and sign it with user
        bytes32 stateHash = keccak256("test state");
        bytes32 ethSignedHash = stateHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userKey, ethSignedHash);
        bytes memory userSignature = abi.encodePacked(r, s, v);

        // Encode signature with channel context
        bytes memory signature = abi.encode(channelId, userSignature);

        // Verify ERC-1271 returns MAGIC_VALUE
        bytes4 result = pool.isValidSignature(stateHash, signature);
        assertEq(result, pool.MAGIC_VALUE());
    }

    function test_IsValidSignature_InvalidSignature() public {
        bytes32 stateHash = keccak256("test state");

        // Empty signature should return INVALID
        bytes4 result = pool.isValidSignature(stateHash, "");
        assertEq(result, pool.INVALID_SIGNATURE());

        // Random signature should return INVALID
        result = pool.isValidSignature(stateHash, "random");
        assertEq(result, pool.INVALID_SIGNATURE());
    }

    function test_IsValidSignature_UnauthorizedSigner() public {
        // Don't authorize the signer
        bytes32 stateHash = keccak256("test state");
        bytes32 ethSignedHash = stateHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Should return INVALID_SIGNATURE
        bytes4 result = pool.isValidSignature(stateHash, signature);
        assertEq(result, pool.INVALID_SIGNATURE());
    }

    // ============ State Hash Approval Tests ============

    function test_ApproveStateHash() public {
        pool.registerChannel(channelId, user);

        bytes32 stateHash = keccak256("test state");
        bytes32 approvalHash = keccak256(
            abi.encode("APPROVE_STATE", channelId, stateHash)
        );

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userKey, ethSignedHash);
        bytes memory userSignature = abi.encodePacked(r, s, v);

        vm.expectEmit(true, false, false, false);
        emit ReactionPool.StateApproved(stateHash);

        pool.approveStateHash(channelId, stateHash, userSignature);

        assertTrue(pool.isStateApproved(stateHash));
    }

    function test_ApproveStateHash_UpdatesActivity() public {
        pool.registerChannel(channelId, user);

        // Warp time forward
        uint256 newTime = block.timestamp + 1 days;
        vm.warp(newTime);

        bytes32 stateHash = keccak256("test state");
        bytes32 approvalHash = keccak256(
            abi.encode("APPROVE_STATE", channelId, stateHash)
        );

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userKey, ethSignedHash);
        bytes memory userSignature = abi.encodePacked(r, s, v);

        pool.approveStateHash(channelId, stateHash, userSignature);

        (, uint256 lastActivity,) = pool.getChannelInfo(channelId);
        assertEq(lastActivity, newTime);
    }

    function test_ApproveStateHash_RevertIfChannelNotActive() public {
        bytes32 stateHash = keccak256("test state");

        vm.expectRevert(ReactionPool.ChannelNotActive.selector);
        pool.approveStateHash(channelId, stateHash, "");
    }

    function test_ApproveStateHash_RevertIfInvalidSignature() public {
        pool.registerChannel(channelId, user);

        bytes32 stateHash = keccak256("test state");

        // Sign with wrong key
        bytes32 approvalHash = keccak256(
            abi.encode("APPROVE_STATE", channelId, stateHash)
        );
        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethSignedHash); // wrong key
        bytes memory wrongSignature = abi.encodePacked(r, s, v);

        vm.expectRevert(ReactionPool.InvalidSignature.selector);
        pool.approveStateHash(channelId, stateHash, wrongSignature);
    }

    function test_BatchApproveStateHashes() public {
        pool.registerChannel(channelId, user);

        bytes32[] memory stateHashes = new bytes32[](3);
        stateHashes[0] = keccak256("state 1");
        stateHashes[1] = keccak256("state 2");
        stateHashes[2] = keccak256("state 3");

        bytes32 approvalHash = keccak256(
            abi.encode("BATCH_APPROVE", channelId, stateHashes)
        );

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userKey, ethSignedHash);
        bytes memory userSignature = abi.encodePacked(r, s, v);

        pool.batchApproveStateHashes(channelId, stateHashes, userSignature);

        assertTrue(pool.isStateApproved(stateHashes[0]));
        assertTrue(pool.isStateApproved(stateHashes[1]));
        assertTrue(pool.isStateApproved(stateHashes[2]));
    }

    // ============ Activity Recording Tests ============

    function test_RecordActivity() public {
        pool.registerChannel(channelId, user);

        uint256 newTime = block.timestamp + 1 days;
        vm.warp(newTime);

        vm.expectEmit(true, false, false, true);
        emit ReactionPool.ActivityRecorded(channelId, newTime);

        pool.recordActivity(channelId);

        (, uint256 lastActivity,) = pool.getChannelInfo(channelId);
        assertEq(lastActivity, newTime);
    }

    function test_RecordActivity_RevertIfNotActive() public {
        vm.expectRevert(ReactionPool.ChannelNotActive.selector);
        pool.recordActivity(channelId);
    }

    // ============ Closure Permission Tests ============

    function test_CanClose_NotActive() public view {
        (bool allowed, string memory reason) = pool.canClose(channelId, 10000);
        assertFalse(allowed);
        assertEq(reason, "Channel not active");
    }

    function test_CanClose_BelowMinBalance() public {
        pool.registerChannel(channelId, user);

        (bool allowed, string memory reason) = pool.canClose(channelId, 500);
        assertTrue(allowed);
        assertEq(reason, "Below minimum balance");
    }

    function test_CanClose_InactiveTimeout() public {
        pool.registerChannel(channelId, user);

        // Warp past inactivity period
        vm.warp(block.timestamp + 8 days);

        (bool allowed, string memory reason) = pool.canClose(channelId, 10000);
        assertTrue(allowed);
        assertEq(reason, "Inactive timeout");
    }

    function test_CanClose_ActiveWithBalance() public {
        pool.registerChannel(channelId, user);

        (bool allowed, string memory reason) = pool.canClose(channelId, 10000);
        assertFalse(allowed);
        assertEq(reason, "Active with sufficient balance");
    }

    function test_MarkClosed() public {
        pool.registerChannel(channelId, user);

        vm.expectEmit(true, false, false, false);
        emit ReactionPool.ChannelClosed(channelId);

        pool.markClosed(channelId);

        (,, bool active) = pool.getChannelInfo(channelId);
        assertFalse(active);
    }

    // ============ Admin Function Tests ============

    function test_SetAuthorizedSigner() public {
        vm.prank(owner);
        pool.setAuthorizedSigner(authorizedSigner, true);

        assertTrue(pool.isAuthorizedSigner(authorizedSigner));
    }

    function test_SetAuthorizedSigner_Revoke() public {
        vm.prank(owner);
        pool.setAuthorizedSigner(authorizedSigner, true);

        vm.prank(owner);
        pool.setAuthorizedSigner(authorizedSigner, false);

        assertFalse(pool.isAuthorizedSigner(authorizedSigner));
    }

    function test_SetAuthorizedSigner_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert();
        pool.setAuthorizedSigner(authorizedSigner, true);
    }

    function test_SetCustodyAddress() public {
        address newCustody = address(0xDEAD);

        vm.prank(owner);
        pool.setCustodyAddress(newCustody);

        assertEq(pool.custodyAddress(), newCustody);
    }

    function test_SetCustodyAddress_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert();
        pool.setCustodyAddress(address(0xDEAD));
    }

    function test_RevokeStateHash() public {
        // First approve a hash
        pool.registerChannel(channelId, user);

        bytes32 stateHash = keccak256("test state");
        bytes32 approvalHash = keccak256(
            abi.encode("APPROVE_STATE", channelId, stateHash)
        );

        bytes32 ethSignedHash = approvalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userKey, ethSignedHash);
        bytes memory userSignature = abi.encodePacked(r, s, v);

        pool.approveStateHash(channelId, stateHash, userSignature);
        assertTrue(pool.isStateApproved(stateHash));

        // Now revoke it
        vm.prank(owner);
        pool.revokeStateHash(stateHash);

        assertFalse(pool.isStateApproved(stateHash));
    }

    function test_RevokeStateHash_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert();
        pool.revokeStateHash(keccak256("test"));
    }

    // ============ Integration Test: Full Flow ============

    function test_FullReactionFlow() public {
        // 1. Register channel
        pool.registerChannel(channelId, user);

        // 2. Authorize backend signer
        vm.prank(owner);
        pool.setAuthorizedSigner(authorizedSigner, true);

        // 3. User initiates reactions (pre-approve states)
        bytes32[] memory reactionStates = new bytes32[](5);
        for (uint256 i = 0; i < 5; i++) {
            reactionStates[i] = keccak256(abi.encode("reaction", i, block.timestamp));
        }

        bytes32 batchApprovalHash = keccak256(
            abi.encode("BATCH_APPROVE", channelId, reactionStates)
        );
        bytes32 ethSignedHash = batchApprovalHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userKey, ethSignedHash);
        bytes memory userSignature = abi.encodePacked(r, s, v);

        pool.batchApproveStateHashes(channelId, reactionStates, userSignature);

        // 4. Verify all states are approved (Yellow Network can validate)
        for (uint256 i = 0; i < 5; i++) {
            bytes4 loopResult = pool.isValidSignature(reactionStates[i], "");
            assertEq(loopResult, pool.MAGIC_VALUE());
        }

        // 5. Backend signer can also sign state transitions
        bytes32 newState = keccak256("backend approved state");
        bytes32 newStateEthSigned = newState.toEthSignedMessageHash();
        (v, r, s) = vm.sign(signerKey, newStateEthSigned);
        bytes memory signerSig = abi.encodePacked(r, s, v);

        bytes4 signerResult = pool.isValidSignature(newState, signerSig);
        assertEq(signerResult, pool.MAGIC_VALUE());

        // 6. Check closure not allowed (active with balance)
        (bool canCloseNow,) = pool.canClose(channelId, 10000);
        assertFalse(canCloseNow);

        // 7. After inactivity, closure allowed
        vm.warp(block.timestamp + 8 days);
        (canCloseNow,) = pool.canClose(channelId, 10000);
        assertTrue(canCloseNow);

        // 8. Mark channel closed
        pool.markClosed(channelId);
        (,, bool active) = pool.getChannelInfo(channelId);
        assertFalse(active);
    }
}
