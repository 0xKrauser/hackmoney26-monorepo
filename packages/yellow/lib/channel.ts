import { CONTRACTS, CHAIN_ID } from '@repo/web3';
import type { ChannelState, ReactionSession } from './types.js';

/**
 * In-memory channel state management
 * In production, this would be backed by persistent storage
 */
const channelStateMap = new Map<`0x${string}`, ChannelState>();

/**
 * Create a new channel state
 */
export const createChannelState = (params: {
  channelId: `0x${string}`;
  userAddress: `0x${string}`;
  totalAmount: bigint;
}): ChannelState => {
  const state: ChannelState = {
    channelId: params.channelId,
    userAddress: params.userAddress,
    poolAddress: CONTRACTS.reactionPool,
    totalAmount: params.totalAmount,
    availableBalance: params.totalAmount,
    sessions: new Map(),
    isActive: true,
    createdAt: Date.now(),
  };

  channelStateMap.set(params.channelId, state);
  return state;
};

/**
 * Get channel state by ID
 */
export const getChannelState = (channelId: `0x${string}`): ChannelState | null =>
  channelStateMap.get(channelId) ?? null;

/**
 * Get channel state by user address
 */
export const getChannelByUser = (userAddress: `0x${string}`): ChannelState | null => {
  for (const state of channelStateMap.values()) {
    if (state.userAddress.toLowerCase() === userAddress.toLowerCase() && state.isActive) {
      return state;
    }
  }
  return null;
};

/**
 * Update channel state
 */
export const updateChannelState = (
  channelId: `0x${string}`,
  updates: Partial<Pick<ChannelState, 'totalAmount' | 'availableBalance' | 'isActive'>>,
): ChannelState | null => {
  const state = channelStateMap.get(channelId);
  if (!state) return null;

  const updated: ChannelState = {
    ...state,
    ...updates,
  };
  channelStateMap.set(channelId, updated);
  return updated;
};

/**
 * Add a session to a channel
 */
export const addSessionToChannel = (channelId: `0x${string}`, session: ReactionSession): boolean => {
  const state = channelStateMap.get(channelId);
  if (!state) return false;

  state.sessions.set(session.sessionId, session);
  return true;
};

/**
 * Remove a session from a channel
 */
export const removeSessionFromChannel = (channelId: `0x${string}`, sessionId: string): ReactionSession | null => {
  const state = channelStateMap.get(channelId);
  if (!state) return null;

  const session = state.sessions.get(sessionId);
  if (session) {
    state.sessions.delete(sessionId);
  }
  return session ?? null;
};

/**
 * Get session by post ID
 */
export const getSessionByPostId = (channelId: `0x${string}`, postId: string): ReactionSession | null => {
  const state = channelStateMap.get(channelId);
  if (!state) return null;

  for (const session of state.sessions.values()) {
    if (session.postId === postId) {
      return session;
    }
  }
  return null;
};

/**
 * Update a session in a channel
 */
export const updateSession = (
  channelId: `0x${string}`,
  sessionId: string,
  updates: Partial<Pick<ReactionSession, 'userAllocation' | 'poolAllocation' | 'lastActivity' | 'reactionCount'>>,
): ReactionSession | null => {
  const state = channelStateMap.get(channelId);
  if (!state) return null;

  const session = state.sessions.get(sessionId);
  if (!session) return null;

  const updated: ReactionSession = {
    ...session,
    ...updates,
  };
  state.sessions.set(sessionId, updated);
  return updated;
};

/**
 * Calculate total amount locked in active sessions
 */
export const getLockedAmount = (channelId: `0x${string}`): bigint => {
  const state = channelStateMap.get(channelId);
  if (!state) return 0n;

  let locked = 0n;
  for (const session of state.sessions.values()) {
    locked += session.userAllocation + session.poolAllocation;
  }
  return locked;
};

/**
 * Get available balance for new sessions
 */
export const getAvailableBalance = (channelId: `0x${string}`): bigint => {
  const state = channelStateMap.get(channelId);
  if (!state) return 0n;

  const locked = getLockedAmount(channelId);
  return state.totalAmount > locked ? state.totalAmount - locked : 0n;
};

/**
 * Mark channel as closed
 */
export const closeChannel = (channelId: `0x${string}`): boolean => {
  const state = channelStateMap.get(channelId);
  if (!state) return false;

  state.isActive = false;
  return true;
};

/**
 * Get all active channels
 */
export const getAllActiveChannels = (): ChannelState[] => {
  const active: ChannelState[] = [];
  for (const state of channelStateMap.values()) {
    if (state.isActive) {
      active.push(state);
    }
  }
  return active;
};

/**
 * Clear all channel state (for testing)
 */
export const clearAllChannelState = (): void => {
  channelStateMap.clear();
};

/**
 * Generate a unique channel ID based on parameters
 * Note: In production, this would come from the Custody contract
 */
export const generateChannelId = (
  userAddress: `0x${string}`,
  poolAddress: `0x${string}`,
  nonce: bigint,
): `0x${string}` => {
  // Simple hash for PoC - in production, use the actual contract's getChannelId
  const data = `${CHAIN_ID}:${userAddress}:${poolAddress}:${nonce.toString()}`;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);

  // Simple hash (not cryptographically secure, just for demo)
  let hash = 0n;
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash * 31n + BigInt(bytes[i])) % 2n ** 256n;
  }

  return `0x${hash.toString(16).padStart(64, '0')}` as `0x${string}`;
};
