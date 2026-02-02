import {
  addSessionToChannel,
  getAvailableBalance,
  getSessionByPostId,
  removeSessionFromChannel,
  updateSession,
} from './channel.js';
import { CONTRACTS } from '@repo/web3';
import type { ClearNodeClient } from './clearnode.js';
import type { AppDefinition, Allocation, CreateSessionParams, ReactionSession, ClearNodeResponse } from './types.js';
import type { MessageSigner } from '@repo/web3';

/**
 * Protocol identifier for reaction sessions
 */
export const REACTION_PROTOCOL = 'reaction-v1';

/**
 * Create app definition for a reaction session
 */
export const createAppDefinition = (userAddress: `0x${string}`, poolAddress: `0x${string}`): AppDefinition => ({
  protocol: REACTION_PROTOCOL,
  participants: [userAddress, poolAddress],
  weights: [100, 0], // User initiates, pool validates
  quorum: 100, // Both must agree
  challenge: 0, // No challenge period for PoC
  nonce: Date.now(),
});

/**
 * Create initial allocations for a session
 */
export const createInitialAllocations = (
  userAddress: `0x${string}`,
  poolAddress: `0x${string}`,
  userAmount: bigint,
): Allocation[] => [
  { participant: userAddress, asset: 'usdc', amount: userAmount.toString() },
  { participant: poolAddress, asset: 'usdc', amount: '0' },
];

/**
 * Create a new reaction session for a specific post
 */
export const createReactionSession = async (
  client: ClearNodeClient,
  signer: MessageSigner,
  params: CreateSessionParams,
): Promise<ReactionSession> => {
  const { userAddress, poolAddress, channelId, postId, initialUserAmount } = params;

  // Check if session already exists for this post
  const existing = getSessionByPostId(channelId, postId);
  if (existing) {
    return existing;
  }

  // Check available balance
  const available = getAvailableBalance(channelId);
  if (available < initialUserAmount) {
    throw new Error(`Insufficient balance. Available: ${available}, Requested: ${initialUserAmount}`);
  }

  // Create app definition and allocations
  const definition = createAppDefinition(userAddress, poolAddress);
  const allocations = createInitialAllocations(userAddress, poolAddress, initialUserAmount);

  // Build the message for ClearNode
  const message = {
    type: 'create_app_session',
    channel_id: channelId,
    definition,
    allocations,
    metadata: {
      post_id: postId,
    },
  };

  // Sign the message
  const messageJson = JSON.stringify(message);
  const signature = await signer.sign(messageJson);

  // Send to ClearNode
  const response = await client.sendAndWait<ClearNodeResponse & { app_session_id: string }>({
    ...message,
    signature,
  });

  if (!response.app_session_id) {
    throw new Error('Failed to create session: no session ID returned');
  }

  // Create local session state
  const session: ReactionSession = {
    sessionId: response.app_session_id,
    postId,
    channelId,
    userAllocation: initialUserAmount,
    poolAllocation: 0n,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    reactionCount: 0,
  };

  // Add to channel state
  addSessionToChannel(channelId, session);

  return session;
};

/**
 * Close a reaction session and settle allocations
 */
export const closeReactionSession = async (
  client: ClearNodeClient,
  signer: MessageSigner,
  session: ReactionSession,
): Promise<void> => {
  // Build final allocations
  const allocations = [
    {
      participant: signer.address,
      asset: 'usdc',
      amount: session.userAllocation.toString(),
    },
    {
      participant: CONTRACTS.reactionPool,
      asset: 'usdc',
      amount: session.poolAllocation.toString(),
    },
  ];

  // Build close message
  const message = {
    type: 'close_app_session',
    app_session_id: session.sessionId,
    allocations,
  };

  // Sign the message
  const messageJson = JSON.stringify(message);
  const signature = await signer.sign(messageJson);

  // Send to ClearNode
  await client.sendAndWait({
    ...message,
    signature,
  });

  // Remove from channel state
  removeSessionFromChannel(session.channelId, session.sessionId);
};

/**
 * Update session allocations (internal use)
 */
export const updateSessionAllocations = (
  session: ReactionSession,
  newUserAllocation: bigint,
  newPoolAllocation: bigint,
): ReactionSession | null =>
  updateSession(session.channelId, session.sessionId, {
    userAllocation: newUserAllocation,
    poolAllocation: newPoolAllocation,
    lastActivity: Date.now(),
    reactionCount: session.reactionCount + 1,
  });

/**
 * Get or create a session for a post
 * Creates a new session if one doesn't exist
 */
export const getOrCreateSession = async (
  client: ClearNodeClient,
  signer: MessageSigner,
  params: CreateSessionParams,
): Promise<ReactionSession> => {
  const existing = getSessionByPostId(params.channelId, params.postId);
  if (existing) {
    return existing;
  }
  return createReactionSession(client, signer, params);
};

/**
 * Get session statistics
 */
export const getSessionStats = (
  session: ReactionSession,
): {
  totalSpent: bigint;
  averagePerReaction: bigint;
  duration: number;
} => {
  const totalSpent = session.poolAllocation;
  const averagePerReaction = session.reactionCount > 0 ? totalSpent / BigInt(session.reactionCount) : 0n;
  const duration = Date.now() - session.createdAt;

  return {
    totalSpent,
    averagePerReaction,
    duration,
  };
};
