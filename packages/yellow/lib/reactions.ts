import { updateSessionAllocations } from './session.js';
import { REACTION_COST } from '@repo/web3';
import type { ClearNodeClient } from './clearnode.js';
import type { ReactionSession, ClearNodeResponse, SessionUpdateResult } from './types.js';
import type { MessageSigner } from '@repo/web3';

/**
 * Send a reaction payment within a session
 * This is an off-chain state update - instant, no gas
 */
export const sendReaction = async (
  client: ClearNodeClient,
  signer: MessageSigner,
  session: ReactionSession,
  reactionCost: bigint = REACTION_COST,
): Promise<SessionUpdateResult> => {
  // Validate sufficient balance
  if (session.userAllocation < reactionCost) {
    throw new Error(`Insufficient balance for reaction. Available: ${session.userAllocation}, Cost: ${reactionCost}`);
  }

  // Calculate new allocations
  const newUserAllocation = session.userAllocation - reactionCost;
  const newPoolAllocation = session.poolAllocation + reactionCost;

  // Build allocations update
  const allocations = [
    { participant: signer.address, asset: 'usdc', amount: newUserAllocation.toString() },
    { participant: session.channelId, asset: 'usdc', amount: newPoolAllocation.toString() },
  ];

  // Build state update message
  const message = {
    type: 'state_update',
    app_session_id: session.sessionId,
    action: 'reaction',
    allocations,
    metadata: {
      reaction_cost: reactionCost.toString(),
      timestamp: Date.now(),
    },
  };

  // Sign the message
  const messageJson = JSON.stringify(message);
  const signature = await signer.sign(messageJson);

  // Send to ClearNode
  const response = await client.sendAndWait<ClearNodeResponse & { state_hash?: string }>({
    ...message,
    signature,
  });

  // Update local session state
  const updatedSession = updateSessionAllocations(session, newUserAllocation, newPoolAllocation);

  if (!updatedSession) {
    throw new Error('Failed to update local session state');
  }

  return {
    session: updatedSession,
    stateHash: (response.state_hash ?? '0x0') as `0x${string}`,
  };
};

/**
 * Send multiple reactions in batch
 * Useful for when user rapidly clicks multiple emojis
 */
export const sendBatchReactions = async (
  client: ClearNodeClient,
  signer: MessageSigner,
  session: ReactionSession,
  count: number,
  reactionCost: bigint = REACTION_COST,
): Promise<SessionUpdateResult> => {
  const totalCost = reactionCost * BigInt(count);

  // Validate sufficient balance
  if (session.userAllocation < totalCost) {
    throw new Error(
      `Insufficient balance for ${count} reactions. Available: ${session.userAllocation}, Cost: ${totalCost}`,
    );
  }

  // Calculate new allocations
  const newUserAllocation = session.userAllocation - totalCost;
  const newPoolAllocation = session.poolAllocation + totalCost;

  // Build allocations update
  const allocations = [
    { participant: signer.address, asset: 'usdc', amount: newUserAllocation.toString() },
    { participant: session.channelId, asset: 'usdc', amount: newPoolAllocation.toString() },
  ];

  // Build batch state update message
  const message = {
    type: 'state_update',
    app_session_id: session.sessionId,
    action: 'batch_reaction',
    allocations,
    metadata: {
      reaction_count: count,
      reaction_cost: reactionCost.toString(),
      total_cost: totalCost.toString(),
      timestamp: Date.now(),
    },
  };

  // Sign the message
  const messageJson = JSON.stringify(message);
  const signature = await signer.sign(messageJson);

  // Send to ClearNode
  const response = await client.sendAndWait<ClearNodeResponse & { state_hash?: string }>({
    ...message,
    signature,
  });

  // Update local session state (increment reaction count by batch size)
  let updatedSession = session;
  for (let i = 0; i < count; i++) {
    const result = updateSessionAllocations(
      updatedSession,
      i === 0 ? newUserAllocation : updatedSession.userAllocation,
      i === 0 ? newPoolAllocation : updatedSession.poolAllocation,
    );
    if (result) {
      updatedSession = result;
    }
  }

  return {
    session: updatedSession,
    stateHash: (response.state_hash ?? '0x0') as `0x${string}`,
  };
};

/**
 * Check if user can afford a reaction
 */
export const canAffordReaction = (session: ReactionSession, reactionCost: bigint = REACTION_COST): boolean =>
  session.userAllocation >= reactionCost;

/**
 * Get remaining reaction capacity
 */
export const getRemainingReactions = (session: ReactionSession, reactionCost: bigint = REACTION_COST): number => {
  if (reactionCost === 0n) return 0;
  return Number(session.userAllocation / reactionCost);
};

/**
 * Estimate total cost for multiple reactions
 */
export const estimateReactionCost = (count: number, reactionCost: bigint = REACTION_COST): bigint =>
  reactionCost * BigInt(count);

/**
 * Format allocation for display (converts from smallest unit)
 */
export const formatAllocation = (amount: bigint, decimals: number = 6): string => {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0');

  // Remove trailing zeros
  const trimmedFraction = fractionStr.replace(/0+$/, '');

  if (trimmedFraction) {
    return `${whole}.${trimmedFraction}`;
  }
  return whole.toString();
};

/**
 * Parse allocation from display format
 */
export const parseAllocation = (amount: string, decimals: number = 6): bigint => {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0');
  let fraction = 0n;

  if (parts[1]) {
    const fractionStr = parts[1].padEnd(decimals, '0').slice(0, decimals);
    fraction = BigInt(fractionStr);
  }

  const multiplier = 10n ** BigInt(decimals);
  return whole * multiplier + fraction;
};
