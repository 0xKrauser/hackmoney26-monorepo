// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/TwitterVerifier.sol";

contract TwitterVerifierTest is Test {
    TwitterVerifier public verifier;
    address public user = address(0xBEEF);
    address public owner;

    function setUp() public {
        owner = address(this);
        // Use a mock address for router - requestVerification will revert
        // when actually calling the router, but we can test everything else
        verifier = new TwitterVerifier(
            address(0x1), // mock router
            bytes32("fun-base-sepolia-1"),
            1,
            300_000,
            "// mock source"
        );
    }

    function test_isVerified_default_false() public view {
        assertFalse(verifier.isVerified(user));
    }

    function test_verifiedTwitter_default_empty() public view {
        assertEq(bytes(verifier.verifiedTwitter(user)).length, 0);
    }

    function test_requestVerification_emptyUsername_reverts() public {
        vm.prank(user);
        vm.expectRevert(TwitterVerifier.EmptyUsername.selector);
        verifier.requestVerification("");
    }

    function test_setSource_onlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Only callable by owner");
        verifier.setSource("new source");
    }

    function test_setSource_owner_succeeds() public {
        verifier.setSource("new source");
        assertEq(verifier.s_source(), "new source");
    }

    function test_setGasLimit_onlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Only callable by owner");
        verifier.setGasLimit(500_000);
    }

    function test_setGasLimit_owner_succeeds() public {
        verifier.setGasLimit(500_000);
        assertEq(verifier.s_gasLimit(), 500_000);
    }

    function test_setSubscriptionId_onlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Only callable by owner");
        verifier.setSubscriptionId(42);
    }

    function test_setSubscriptionId_owner_succeeds() public {
        verifier.setSubscriptionId(42);
        assertEq(verifier.s_subscriptionId(), 42);
    }

    function test_setEncryptedSecretsReference_onlyOwner() public {
        vm.prank(user);
        vm.expectRevert("Only callable by owner");
        verifier.setEncryptedSecretsReference(hex"deadbeef");
    }

    function test_setEncryptedSecretsReference_owner_succeeds() public {
        verifier.setEncryptedSecretsReference(hex"deadbeef");
        assertEq(verifier.s_encryptedSecretsReference(), hex"deadbeef");
    }

    function test_twitterToAddress_default_zero() public view {
        assertEq(verifier.twitterToAddress("nonexistent"), address(0));
    }
}
