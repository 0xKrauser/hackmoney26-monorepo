import { CONTRACTS } from '../config.js';
import { createPublicClientInstance } from '../wallet.js';
import { encodeFunctionData, parseAbi } from 'viem';
import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';

/**
 * Custody contract ABI (relevant functions only)
 */
export const CUSTODY_ABI = parseAbi([
  // Deposit
  'function deposit(address token, uint256 amount) external',
  'function depositTo(address token, uint256 amount, address recipient) external',

  // Channel management
  'function createChannel(bytes32 channelId, (address,address,address,uint256,uint256,bytes32,uint64) channel) external',
  'function resizeChannel(bytes32 channelId, (address,address,address,uint256,uint256,bytes32,uint64) channel, (uint8,(address,uint256)[]) resize) external',
  'function closeChannel(bytes32 channelId, (address,address,address,uint256,uint256,bytes32,uint64) channel, bytes[] signatures) external',

  // View functions
  'function getDeposit(address token, address account) external view returns (uint256)',
  'function getChannel(bytes32 channelId) external view returns ((address,address,address,uint256,uint256,bytes32,uint64))',
  'function getChannelId((address,address,address,uint256,uint256,bytes32,uint64) channel) external pure returns (bytes32)',

  // Events
  'event Deposit(address indexed token, address indexed account, uint256 amount)',
  'event ChannelCreated(bytes32 indexed channelId)',
  'event ChannelResized(bytes32 indexed channelId)',
  'event ChannelClosed(bytes32 indexed channelId)',
]);

/**
 * Channel structure matching the Custody contract
 */
export interface Channel {
  participants: readonly [`0x${string}`, `0x${string}`];
  adjudicator: `0x${string}`;
  challenge: bigint;
  nonce: bigint;
  token: `0x${string}`;
  amount: bigint;
}

/**
 * Channel tuple format for contract calls
 */
export type ChannelTuple = [
  `0x${string}`, // participant0
  `0x${string}`, // participant1
  `0x${string}`, // adjudicator
  bigint, // challenge
  bigint, // nonce
  `0x${string}`, // token
  bigint, // amount
];

/**
 * Convert Channel to tuple format
 */
export const channelToTuple = (channel: Channel): ChannelTuple => [
  channel.participants[0],
  channel.participants[1],
  channel.adjudicator,
  channel.challenge,
  channel.nonce,
  channel.token,
  channel.amount,
];

/**
 * Resize allocation structure
 */
export interface ResizeAllocation {
  intent: number; // 0 = WITHDRAW, 1 = DEPOSIT, etc.
  allocations: Array<{
    destination: `0x${string}`;
    amount: bigint;
  }>;
}

/**
 * Get the deposit balance for an address
 * @param token - Token address
 * @param account - Account address
 */
export const getDeposit = async (
  token: `0x${string}`,
  account: `0x${string}`,
  client?: PublicClient,
): Promise<bigint> => {
  const publicClient = client ?? createPublicClientInstance();

  return publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getDeposit',
    args: [token, account],
  });
};

/**
 * Deposit tokens to the Custody contract
 * @param walletClient - The wallet client
 * @param token - Token address
 * @param amount - Amount to deposit
 */
export const deposit = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  token: `0x${string}`,
  amount: bigint,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  return walletClient.writeContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'deposit',
    args: [token, amount],
    account,
  });
};

/**
 * Approve token spending for the Custody contract
 * @param walletClient - The wallet client
 * @param token - Token address
 * @param amount - Amount to approve
 */
export const approveToken = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  token: `0x${string}`,
  amount: bigint,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  return walletClient.writeContract({
    address: token,
    abi: parseAbi(['function approve(address spender, uint256 amount) external returns (bool)']),
    functionName: 'approve',
    args: [CONTRACTS.custody, amount],
    account,
  });
};

/**
 * Deposit tokens (with approval if needed)
 * @param walletClient - The wallet client
 * @param token - Token address
 * @param amount - Amount to deposit
 */
export const depositWithApproval = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  token: `0x${string}`,
  amount: bigint,
): Promise<{ approveTx?: `0x${string}`; depositTx: `0x${string}` }> => {
  const [account] = await walletClient.getAddresses();
  const publicClient = createPublicClientInstance();

  // Check current allowance
  const allowance = await publicClient.readContract({
    address: token,
    abi: parseAbi(['function allowance(address owner, address spender) external view returns (uint256)']),
    functionName: 'allowance',
    args: [account, CONTRACTS.custody],
  });

  let approveTx: `0x${string}` | undefined;

  // Approve if needed
  if (allowance < amount) {
    approveTx = await approveToken(walletClient, token, amount);
    // Wait for approval to be mined
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
  }

  // Deposit
  const depositTx = await deposit(walletClient, token, amount);

  return { approveTx, depositTx };
};

/**
 * Create a new channel
 * @param walletClient - The wallet client
 * @param channel - The channel configuration
 */
export const createChannel = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  channel: Channel,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();
  const publicClient = createPublicClientInstance();

  // Get the channel ID
  const channelId = await publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getChannelId',
    args: [channelToTuple(channel)],
  });

  return walletClient.writeContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'createChannel',
    args: [channelId, channelToTuple(channel)],
    account,
  });
};

/**
 * Resize (partial withdraw from) a channel
 * @param walletClient - The wallet client
 * @param channelId - The channel ID
 * @param channel - The channel configuration
 * @param resize - The resize allocation
 */
export const resizeChannel = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  channelId: `0x${string}`,
  channel: Channel,
  resize: ResizeAllocation,
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  const resizeTuple: [number, readonly [`0x${string}`, bigint][]] = [
    resize.intent,
    resize.allocations.map(a => [a.destination, a.amount] as const),
  ];

  return walletClient.writeContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'resizeChannel',
    args: [channelId, channelToTuple(channel), resizeTuple],
    account,
  });
};

/**
 * Close a channel with final settlement
 * @param walletClient - The wallet client
 * @param channelId - The channel ID
 * @param channel - The channel configuration
 * @param signatures - Signatures from all participants
 */
export const closeChannel = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  channelId: `0x${string}`,
  channel: Channel,
  signatures: `0x${string}`[],
): Promise<`0x${string}`> => {
  const [account] = await walletClient.getAddresses();

  return walletClient.writeContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'closeChannel',
    args: [channelId, channelToTuple(channel), signatures],
    account,
  });
};

/**
 * Get channel info from the contract
 * @param channelId - The channel ID
 */
export const getChannel = async (channelId: `0x${string}`, client?: PublicClient): Promise<ChannelTuple | null> => {
  const publicClient = client ?? createPublicClientInstance();

  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.custody,
      abi: CUSTODY_ABI,
      functionName: 'getChannel',
      args: [channelId],
    });
    return result as ChannelTuple;
  } catch {
    return null;
  }
};

/**
 * Calculate channel ID from channel parameters
 * @param channel - The channel configuration
 */
export const getChannelId = async (channel: Channel, client?: PublicClient): Promise<`0x${string}`> => {
  const publicClient = client ?? createPublicClientInstance();

  return publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getChannelId',
    args: [channelToTuple(channel)],
  });
};

/**
 * Encode deposit calldata for bundled transactions
 */
export const encodeDeposit = (token: `0x${string}`, amount: bigint): `0x${string}` =>
  encodeFunctionData({
    abi: CUSTODY_ABI,
    functionName: 'deposit',
    args: [token, amount],
  });
