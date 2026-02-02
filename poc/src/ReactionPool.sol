// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReactionPool
 * @notice Channel participant for paid reactions via Yellow Network
 * @dev Validates off-chain state updates via ERC-1271
 *
 * This contract serves as the counterparty in Yellow Network state channels,
 * enabling users to pay for emoji reactions without on-chain transactions.
 *
 * Key features:
 * - ERC-1271 signature validation for Yellow Network integration
 * - Channel registration and activity tracking
 * - Closure permission enforcement (min balance, inactivity)
 * - State hash pre-approval for efficient validation
 */
contract ReactionPool is IERC1271, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ Constants ============

    bytes4 public constant MAGIC_VALUE = 0x1626ba7e;
    bytes4 public constant INVALID_SIGNATURE = 0xffffffff;

    // Closure permission thresholds
    uint256 public constant MIN_CLOSE_BALANCE = 1000; // ~0.001 USDC (6 decimals)
    uint256 public constant INACTIVITY_PERIOD = 7 days;

    // ============ State Variables ============

    /// @notice Custody contract address (Yellow Network)
    address public custodyAddress;

    /// @notice Channel tracking
    struct ChannelInfo {
        address user;
        uint256 lastActivity;
        bool active;
    }

    /// @notice Mapping from channelId to channel info
    mapping(bytes32 => ChannelInfo) public channels;

    /// @notice Pre-approved state hashes for ERC-1271 validation
    mapping(bytes32 => bool) public approvedStateHashes;

    /// @notice Authorized signers who can approve states on behalf of the pool
    mapping(address => bool) public authorizedSigners;

    // ============ Events ============

    event ChannelRegistered(bytes32 indexed channelId, address indexed user);
    event ChannelClosed(bytes32 indexed channelId);
    event StateApproved(bytes32 indexed stateHash);
    event StateRevoked(bytes32 indexed stateHash);
    event ActivityRecorded(bytes32 indexed channelId, uint256 timestamp);
    event SignerAuthorized(address indexed signer, bool authorized);
    event CustodyAddressUpdated(address indexed newCustody);

    // ============ Errors ============

    error ChannelNotActive();
    error ChannelAlreadyExists();
    error InvalidSignature();
    error UnauthorizedCaller();

    // ============ Constructor ============

    constructor(address _custodyAddress) Ownable(msg.sender) {
        custodyAddress = _custodyAddress;
    }

    // ============ ERC-1271: Yellow Network Signature Validation ============

    /**
     * @notice Validates signatures for Yellow Network state channel operations
     * @dev Yellow Network calls this to verify the pool "signed" a state transition
     * @param hash The hash of the state being validated
     * @param signature Encoded signature data (can be pre-approval or real-time validation)
     * @return magicValue MAGIC_VALUE if valid, INVALID_SIGNATURE otherwise
     */
    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) external view override returns (bytes4) {
        // Option 1: Check if this state hash was pre-approved
        if (approvedStateHashes[hash]) {
            return MAGIC_VALUE;
        }

        // Option 2: Validate signature from authorized signer (exact 65 bytes)
        if (signature.length == 65) {
            address recovered = hash.toEthSignedMessageHash().recover(signature);
            if (authorizedSigners[recovered]) {
                return MAGIC_VALUE;
            }
        }

        // Option 3: Validate user signature + channel context
        // Signature format: abi.encode(channelId, userSignature)
        if (signature.length > 65) {
            (bytes32 channelId, bytes memory userSig) = abi.decode(
                signature,
                (bytes32, bytes)
            );

            ChannelInfo storage info = channels[channelId];
            if (info.active && info.user != address(0) && userSig.length == 65) {
                address signer = hash.toEthSignedMessageHash().recover(userSig);
                if (signer == info.user) {
                    return MAGIC_VALUE;
                }
            }
        }

        return INVALID_SIGNATURE;
    }

    // ============ Channel Registration ============

    /**
     * @notice Register a new channel with this contract as participant
     * @dev Should be called when a channel is created with ReactionPool as participant
     * @param channelId The unique identifier of the channel
     * @param user The user's address (other channel participant)
     */
    function registerChannel(
        bytes32 channelId,
        address user
    ) external {
        // In production, verify caller is Custody contract
        // require(msg.sender == custodyAddress, "Only Custody");

        if (channels[channelId].active) {
            revert ChannelAlreadyExists();
        }

        channels[channelId] = ChannelInfo({
            user: user,
            lastActivity: block.timestamp,
            active: true
        });

        emit ChannelRegistered(channelId, user);
    }

    /**
     * @notice Pre-approve a state hash for ERC-1271 validation
     * @dev Called by backend/authorized signer to approve upcoming state transitions
     * @param channelId The channel this state belongs to
     * @param stateHash The hash of the state to approve
     * @param userSignature User's signature authorizing this approval
     */
    function approveStateHash(
        bytes32 channelId,
        bytes32 stateHash,
        bytes calldata userSignature
    ) external {
        ChannelInfo storage info = channels[channelId];
        if (!info.active) {
            revert ChannelNotActive();
        }

        // Verify user signed this approval
        bytes32 approvalHash = keccak256(
            abi.encode("APPROVE_STATE", channelId, stateHash)
        );
        address signer = approvalHash.toEthSignedMessageHash().recover(userSignature);

        if (signer != info.user) {
            revert InvalidSignature();
        }

        info.lastActivity = block.timestamp;
        approvedStateHashes[stateHash] = true;

        emit StateApproved(stateHash);
        emit ActivityRecorded(channelId, block.timestamp);
    }

    /**
     * @notice Batch approve multiple state hashes
     * @param channelId The channel these states belong to
     * @param stateHashes Array of state hashes to approve
     * @param userSignature User's signature authorizing all approvals
     */
    function batchApproveStateHashes(
        bytes32 channelId,
        bytes32[] calldata stateHashes,
        bytes calldata userSignature
    ) external {
        ChannelInfo storage info = channels[channelId];
        if (!info.active) {
            revert ChannelNotActive();
        }

        // Verify user signed this batch approval
        bytes32 approvalHash = keccak256(
            abi.encode("BATCH_APPROVE", channelId, stateHashes)
        );
        address signer = approvalHash.toEthSignedMessageHash().recover(userSignature);

        if (signer != info.user) {
            revert InvalidSignature();
        }

        info.lastActivity = block.timestamp;

        for (uint256 i = 0; i < stateHashes.length; i++) {
            approvedStateHashes[stateHashes[i]] = true;
            emit StateApproved(stateHashes[i]);
        }

        emit ActivityRecorded(channelId, block.timestamp);
    }

    /**
     * @notice Record activity to prevent premature closure
     * @param channelId The channel to record activity for
     */
    function recordActivity(bytes32 channelId) external {
        ChannelInfo storage info = channels[channelId];
        if (!info.active) {
            revert ChannelNotActive();
        }

        info.lastActivity = block.timestamp;
        emit ActivityRecorded(channelId, block.timestamp);
    }

    // ============ Closure Permissions ============

    /**
     * @notice Check if a channel can be closed
     * @dev Closure is allowed if: balance < MIN_CLOSE_BALANCE OR inactive > INACTIVITY_PERIOD
     * @param channelId The channel to check
     * @param currentBalance The current balance in the channel
     * @return allowed Whether closure is allowed
     * @return reason Human-readable reason
     */
    function canClose(
        bytes32 channelId,
        uint256 currentBalance
    ) external view returns (bool allowed, string memory reason) {
        ChannelInfo storage info = channels[channelId];

        if (!info.active) {
            return (false, "Channel not active");
        }

        if (currentBalance < MIN_CLOSE_BALANCE) {
            return (true, "Below minimum balance");
        }

        if (block.timestamp > info.lastActivity + INACTIVITY_PERIOD) {
            return (true, "Inactive timeout");
        }

        return (false, "Active with sufficient balance");
    }

    /**
     * @notice Mark a channel as closed
     * @dev Should be called when channel is finalized
     * @param channelId The channel to mark as closed
     */
    function markClosed(bytes32 channelId) external {
        // In production, verify caller is Custody contract
        // require(msg.sender == custodyAddress, "Only Custody");

        channels[channelId].active = false;
        emit ChannelClosed(channelId);
    }

    // ============ Admin Functions ============

    /**
     * @notice Authorize or revoke a signer
     * @param signer The address to authorize/revoke
     * @param authorized Whether to authorize (true) or revoke (false)
     */
    function setAuthorizedSigner(
        address signer,
        bool authorized
    ) external onlyOwner {
        authorizedSigners[signer] = authorized;
        emit SignerAuthorized(signer, authorized);
    }

    /**
     * @notice Update the Custody contract address
     * @param newCustody The new Custody contract address
     */
    function setCustodyAddress(address newCustody) external onlyOwner {
        custodyAddress = newCustody;
        emit CustodyAddressUpdated(newCustody);
    }

    /**
     * @notice Revoke a previously approved state hash
     * @param stateHash The state hash to revoke
     */
    function revokeStateHash(bytes32 stateHash) external onlyOwner {
        approvedStateHashes[stateHash] = false;
        emit StateRevoked(stateHash);
    }

    // ============ View Functions ============

    /**
     * @notice Get channel information
     * @param channelId The channel to query
     * @return user The user's address
     * @return lastActivity Timestamp of last activity
     * @return active Whether the channel is active
     */
    function getChannelInfo(
        bytes32 channelId
    ) external view returns (address user, uint256 lastActivity, bool active) {
        ChannelInfo storage info = channels[channelId];
        return (info.user, info.lastActivity, info.active);
    }

    /**
     * @notice Check if a state hash is approved
     * @param stateHash The state hash to check
     * @return Whether the state hash is approved
     */
    function isStateApproved(bytes32 stateHash) external view returns (bool) {
        return approvedStateHashes[stateHash];
    }

    /**
     * @notice Check if an address is an authorized signer
     * @param signer The address to check
     * @return Whether the address is authorized
     */
    function isAuthorizedSigner(address signer) external view returns (bool) {
        return authorizedSigners[signer];
    }
}
