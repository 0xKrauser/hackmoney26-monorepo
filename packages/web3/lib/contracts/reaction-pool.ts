import { CONTRACTS } from '../config.js';
import { createPublicClientInstance } from '../wallet.js';
import { parseAbi } from 'viem';
import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';

/**
 * ReactionPool contract ABI
 */
export const REACTION_POOL_ABI = parseAbi([
  // ERC-1271
  'function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4)',

  // Channel registration
  'function registerChannel(bytes32 channelId, address user) external',

  // State approval
  'function approveStateHash(bytes32 channelId, bytes32 stateHash, bytes calldata userSignature) external',
  'function batchApproveStateHashes(bytes32 channelId, bytes32[] calldata stateHashes, bytes calldata userSignature) external',

  // Activity tracking
  'function recordActivity(bytes32 channelId) external',

  // Closure
  'function canClose(bytes32 channelId, uint256 currentBalance) external view returns (bool allowed, string memory reason)',
  'function markClosed(bytes32 channelId) external',

  // View functions
  'function getChannelInfo(bytes32 channelId) external view returns (address user, uint256 lastActivity, bool active)',
  'function isStateApproved(bytes32 stateHash) external view returns (bool)',
  'function isAuthorizedSigner(address signer) external view returns (bool)',

  // Constants
  'function MAGIC_VALUE() external view returns (bytes4)',
  'function MIN_CLOSE_BALANCE() external view returns (uint256)',
  'function INACTIVITY_PERIOD() external view returns (uint256)',

  // Admin
  'function setAuthorizedSigner(address signer, bool authorized) external',
  'function setCustodyAddress(address newCustody) external',
  'function revokeStateHash(bytes32 stateHash) external',

  // Events
  'event ChannelRegistered(bytes32 indexed channelId, address indexed user)',
  'event ChannelClosed(bytes32 indexed channelId)',
  'event StateApproved(bytes32 indexed stateHash)',
  'event StateRevoked(bytes32 indexed stateHash)',
  'event ActivityRecorded(bytes32 indexed channelId, uint256 timestamp)',
]);

/**
 * Channel info from ReactionPool
 */
export interface ReactionPoolChannelInfo {
  user: `0x${string}`;
  lastActivity: bigint;
  active: boolean;
}

/**
 * Get the ReactionPool contract address
 * Throws if not configured
 */
export const getReactionPoolAddress = (): `0x${string}` => {
  if (CONTRACTS.reactionPool === '0x0000000000000000000000000000000000000000') {
    throw new Error('ReactionPool address not configured. Deploy the contract first.');
  }
  return CONTRACTS.reactionPool;
};

/**
 * Register a channel with the ReactionPool
 * @param walletClient - The wallet client
 * @param channelId - The channel ID
 * @param user - The user's address
 */
export const registerChannel = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  channelId: `0x${string}`,
  user: `0x${string}`,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  return walletClient.writeContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'registerChannel',
    args: [channelId, user],
    account,
  });
};

/**
 * Approve a state hash on the ReactionPool
 * @param walletClient - The wallet client
 * @param channelId - The channel ID
 * @param stateHash - The state hash to approve
 * @param userSignature - User's signature
 */
export const approveStateHash = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  channelId: `0x${string}`,
  stateHash: `0x${string}`,
  userSignature: `0x${string}`,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  return walletClient.writeContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'approveStateHash',
    args: [channelId, stateHash, userSignature],
    account,
  });
};

/**
 * Batch approve state hashes on the ReactionPool
 * @param walletClient - The wallet client
 * @param channelId - The channel ID
 * @param stateHashes - Array of state hashes to approve
 * @param userSignature - User's signature
 */
export const batchApproveStateHashes = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  channelId: `0x${string}`,
  stateHashes: `0x${string}`[],
  userSignature: `0x${string}`,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  return walletClient.writeContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'batchApproveStateHashes',
    args: [channelId, stateHashes, userSignature],
    account,
  });
};

/**
 * Record activity on a channel
 * @param walletClient - The wallet client
 * @param channelId - The channel ID
 */
export const recordActivity = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  channelId: `0x${string}`,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  return walletClient.writeContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'recordActivity',
    args: [channelId],
    account,
  });
};

/**
 * Check if a channel can be closed
 * @param channelId - The channel ID
 * @param currentBalance - Current balance in the channel
 */
export const canClose = async (
  channelId: `0x${string}`,
  currentBalance: bigint,
  client?: PublicClient,
): Promise<{ allowed: boolean; reason: string }> => {
  const publicClient = client ?? createPublicClientInstance();

  const [allowed, reason] = await publicClient.readContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'canClose',
    args: [channelId, currentBalance],
  });

  return { allowed, reason };
};

/**
 * Mark a channel as closed
 * @param walletClient - The wallet client
 * @param channelId - The channel ID
 */
export const markClosed = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  channelId: `0x${string}`,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  return walletClient.writeContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'markClosed',
    args: [channelId],
    account,
  });
};

/**
 * Get channel info from ReactionPool
 * @param channelId - The channel ID
 */
export const getChannelInfo = async (
  channelId: `0x${string}`,
  client?: PublicClient,
): Promise<ReactionPoolChannelInfo> => {
  const publicClient = client ?? createPublicClientInstance();

  const [user, lastActivity, active] = await publicClient.readContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'getChannelInfo',
    args: [channelId],
  });

  return {
    user: user as `0x${string}`,
    lastActivity,
    active,
  };
};

/**
 * Check if a state hash is approved
 * @param stateHash - The state hash to check
 */
export const isStateApproved = async (stateHash: `0x${string}`, client?: PublicClient): Promise<boolean> => {
  const publicClient = client ?? createPublicClientInstance();

  return publicClient.readContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'isStateApproved',
    args: [stateHash],
  });
};

/**
 * Validate a signature via ERC-1271
 * @param hash - The hash to validate
 * @param signature - The signature
 */
export const isValidSignature = async (
  hash: `0x${string}`,
  signature: `0x${string}`,
  client?: PublicClient,
): Promise<boolean> => {
  const publicClient = client ?? createPublicClientInstance();

  const result = await publicClient.readContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'isValidSignature',
    args: [hash, signature],
  });

  // MAGIC_VALUE = 0x1626ba7e
  return result === '0x1626ba7e';
};

/**
 * Get contract constants
 */
export const getContractConstants = async (
  client?: PublicClient,
): Promise<{
  magicValue: `0x${string}`;
  minCloseBalance: bigint;
  inactivityPeriod: bigint;
}> => {
  const publicClient = client ?? createPublicClientInstance();

  const [magicValue, minCloseBalance, inactivityPeriod] = await Promise.all([
    publicClient.readContract({
      address: getReactionPoolAddress(),
      abi: REACTION_POOL_ABI,
      functionName: 'MAGIC_VALUE',
    }),
    publicClient.readContract({
      address: getReactionPoolAddress(),
      abi: REACTION_POOL_ABI,
      functionName: 'MIN_CLOSE_BALANCE',
    }),
    publicClient.readContract({
      address: getReactionPoolAddress(),
      abi: REACTION_POOL_ABI,
      functionName: 'INACTIVITY_PERIOD',
    }),
  ]);

  return {
    magicValue: magicValue as `0x${string}`,
    minCloseBalance,
    inactivityPeriod,
  };
};

/**
 * Admin: Set authorized signer
 * @param walletClient - The wallet client (must be owner)
 * @param signer - The signer address
 * @param authorized - Whether to authorize or revoke
 */
export const setAuthorizedSigner = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  signer: `0x${string}`,
  authorized: boolean,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  return walletClient.writeContract({
    address: getReactionPoolAddress(),
    abi: REACTION_POOL_ABI,
    functionName: 'setAuthorizedSigner',
    args: [signer, authorized],
    account,
  });
};
