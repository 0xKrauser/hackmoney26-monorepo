import { channelStorage } from '@repo/storage';
import { REACTION_COST } from '@repo/web3';
import { useCallback, useEffect, useState } from 'react';
import type { EmojiType } from '@repo/emoji-picker';

/**
 * Payment state for reactions
 */
interface PaymentState {
  isConnected: boolean;
  isLoading: boolean;
  balance: bigint;
  error: string | null;
}

/**
 * Send reaction params
 */
interface SendReactionParams {
  postId: string;
  emoji: EmojiType;
}

/**
 * Hook for managing reaction payments via Yellow Network
 *
 * This provides the interface between the emoji picker UI and the
 * off-chain payment system. In PoC mode, it communicates with the
 * side panel for wallet connection and channel management.
 */
export const useReactionPayment = () => {
  const [state, setState] = useState<PaymentState>({
    isConnected: false,
    isLoading: false,
    balance: 0n,
    error: null,
  });

  // Load initial state from storage
  useEffect(() => {
    const loadState = async () => {
      const storageState = await channelStorage.get();

      setState(prev => ({
        ...prev,
        isConnected: !!storageState.walletAddress && !!storageState.activeChannel,
        balance: storageState.activeChannel ? BigInt(storageState.activeChannel.availableBalance) : 0n,
      }));
    };

    loadState();

    // Subscribe to storage changes
    const unsubscribe = channelStorage.subscribe(() => {
      loadState();
    });

    return unsubscribe;
  }, []);

  /**
   * Send a reaction payment for a post
   *
   * This creates or updates an app session for the post and
   * deducts the reaction cost from the user's channel balance.
   */
  const sendReaction = useCallback(
    async ({ postId, emoji }: SendReactionParams): Promise<void> => {
      if (!state.isConnected) {
        // Open side panel to connect wallet
        chrome.runtime.sendMessage({
          type: 'OPEN_SIDE_PANEL',
          action: 'CONNECT',
        });
        throw new Error('Wallet not connected');
      }

      if (state.balance < REACTION_COST) {
        // Open side panel to deposit
        chrome.runtime.sendMessage({
          type: 'OPEN_SIDE_PANEL',
          action: 'DEPOSIT',
        });
        throw new Error('Insufficient balance');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Get or create session for this post
        let session = await channelStorage.getSessionByPostId(postId);

        if (!session) {
          // Create new session for this post
          const storageState = await channelStorage.get();
          const now = Date.now();

          session = {
            sessionId: `session-${postId}-${now}`,
            postId,
            channelId: storageState.activeChannel?.channelId ?? '',
            userAllocation: storageState.activeChannel?.availableBalance ?? '0',
            poolAllocation: '0',
            createdAt: now,
            lastActivity: now,
            reactionCount: 0,
          };
        }

        // Calculate new allocations
        const newUserAllocation = BigInt(session.userAllocation) - REACTION_COST;
        const newPoolAllocation = BigInt(session.poolAllocation) + REACTION_COST;

        // Update session
        const updatedSession = {
          ...session,
          userAllocation: newUserAllocation.toString(),
          poolAllocation: newPoolAllocation.toString(),
          lastActivity: Date.now(),
          reactionCount: session.reactionCount + 1,
        };

        await channelStorage.updateSession(updatedSession);

        // Log reaction for debugging
        console.log('[frens] Reaction sent:', {
          postId,
          emoji: 'char' in emoji ? emoji.char : emoji.name,
          cost: REACTION_COST.toString(),
          newBalance: newUserAllocation.toString(),
        });

        setState(prev => ({
          ...prev,
          isLoading: false,
          balance: newUserAllocation,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send reaction';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [state.isConnected, state.balance],
  );

  /**
   * Open the side panel for wallet management
   */
  const openWalletPanel = useCallback((action: 'CONNECT' | 'DEPOSIT' | 'WITHDRAW' = 'CONNECT') => {
    chrome.runtime.sendMessage({
      type: 'OPEN_SIDE_PANEL',
      action,
    });
  }, []);

  return {
    ...state,
    sendReaction,
    openWalletPanel,
    reactionCost: REACTION_COST,
  };
};
