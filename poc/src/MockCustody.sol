// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockCustody
 * @notice A simplified mock of Yellow Network's Custody contract for LOCAL TESTING ONLY
 * @dev This contract is NOT production-ready and should ONLY be used for testing the PoC
 *      with custom test tokens (like TestUSDC) when Yellow's testnet tokens are unavailable.
 *
 * ⚠️  WARNING: This is a MOCK contract for development/testing purposes.
 *     For production, use Yellow Network's official Custody contract.
 *     Official Base Sepolia Custody: 0x019B65A265EB3363822f2752141b3dF16131b262
 */
contract MockCustody {
    using SafeERC20 for IERC20;

    /// @notice Channel definition matching Yellow Network's Nitrolite protocol
    struct Channel {
        address participant0;
        address participant1;
        address adjudicator;
        uint256 challenge;
        uint256 nonce;
        address token;
        uint256 amount;
    }

    /// @notice Allocation for channel resizing
    struct Allocation {
        address destination;
        uint256 amount;
    }

    /// @notice Resize operation
    struct Resize {
        uint8 allocationType;
        Allocation[] allocations;
    }

    /// @notice User deposits per token
    mapping(address token => mapping(address user => uint256 amount)) public deposits;

    /// @notice Active channels
    mapping(bytes32 channelId => Channel) public channels;

    /// @notice Whether a channel exists
    mapping(bytes32 channelId => bool) public channelExists;

    // Events
    event Deposited(address indexed token, address indexed user, uint256 amount);
    event Withdrawn(address indexed token, address indexed user, uint256 amount);
    event ChannelCreated(bytes32 indexed channelId, address indexed participant0, address indexed participant1);
    event ChannelClosed(bytes32 indexed channelId);
    event ChannelResized(bytes32 indexed channelId, uint256 newAmount);

    /**
     * @notice Deposit tokens into custody
     * @param token The ERC20 token address
     * @param amount The amount to deposit
     */
    function deposit(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        deposits[token][msg.sender] += amount;
        emit Deposited(token, msg.sender, amount);
    }

    /**
     * @notice Get user's deposit balance
     * @param token The ERC20 token address
     * @param account The user's address
     * @return The deposit balance
     */
    function getDeposit(address token, address account) external view returns (uint256) {
        return deposits[token][account];
    }

    /**
     * @notice Withdraw tokens from custody
     * @param token The ERC20 token address
     * @param amount The amount to withdraw
     */
    function withdrawal(address token, uint256 amount) external {
        require(deposits[token][msg.sender] >= amount, "Insufficient deposit");
        deposits[token][msg.sender] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Compute channel ID from channel parameters
     * @param channel The channel struct
     * @return The channel ID
     */
    function getChannelId(Channel calldata channel) external pure returns (bytes32) {
        bytes32 id;
        bytes memory data = abi.encode(channel);
        assembly {
            id := keccak256(add(data, 32), mload(data))
        }
        return id;
    }

    /**
     * @notice Create a new channel
     * @param channelId The precomputed channel ID
     * @param channel The channel parameters
     */
    function createChannel(bytes32 channelId, Channel calldata channel) external {
        require(!channelExists[channelId], "Channel already exists");
        require(
            msg.sender == channel.participant0 || msg.sender == channel.participant1,
            "Not a participant"
        );
        require(deposits[channel.token][channel.participant0] >= channel.amount, "Insufficient deposit");

        // Lock funds from participant0's deposit
        deposits[channel.token][channel.participant0] -= channel.amount;

        // Store channel
        channels[channelId] = channel;
        channelExists[channelId] = true;

        emit ChannelCreated(channelId, channel.participant0, channel.participant1);
    }

    /**
     * @notice Get channel details
     * @param channelId The channel ID
     * @return The channel struct
     */
    function getChannel(bytes32 channelId) external view returns (Channel memory) {
        require(channelExists[channelId], "Channel does not exist");
        return channels[channelId];
    }

    /**
     * @notice Close a channel and distribute funds
     * @param channelId The channel ID
     * @param channel The final channel state
     * @dev Signatures parameter ignored in mock - not verified
     */
    function closeChannel(
        bytes32 channelId,
        Channel calldata channel,
        bytes[] calldata /* signatures */
    ) external {
        require(channelExists[channelId], "Channel does not exist");
        // In a real implementation, signatures would be verified
        // For mock, we just trust the caller

        // Return remaining funds to participant0
        deposits[channel.token][channel.participant0] += channel.amount;

        // Clear channel
        delete channels[channelId];
        channelExists[channelId] = false;

        emit ChannelClosed(channelId);
    }

    /**
     * @notice Resize a channel (partial withdraw/deposit)
     * @param channelId The channel ID
     * @param channel The updated channel state
     * @param resize The resize operation details
     */
    function resizeChannel(
        bytes32 channelId,
        Channel calldata channel,
        Resize calldata resize
    ) external {
        require(channelExists[channelId], "Channel does not exist");
        Channel storage storedChannel = channels[channelId];

        // Process allocations
        for (uint256 i = 0; i < resize.allocations.length; i++) {
            Allocation calldata alloc = resize.allocations[i];
            deposits[storedChannel.token][alloc.destination] += alloc.amount;
        }

        // Update channel with new amount
        storedChannel.amount = channel.amount;

        emit ChannelResized(channelId, channel.amount);
    }
}
