import { channelStorage } from '@repo/storage';
import { CONTRACTS, REACTION_COST } from '@repo/web3';
import { useCallback, useEffect, useState } from 'react';
import type { SerializedChannelState, SerializedSession } from '@repo/storage';

/**
 * Channel dashboard state
 */
interface ChannelState {
  channel: SerializedChannelState | null;
  sessions: SerializedSession[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Channel statistics
 */
interface ChannelStats {
  totalDeposited: bigint;
  availableBalance: bigint;
  totalSpent: bigint;
  activeSessionCount: number;
  totalReactions: number;
}

/**
 * Hook for managing Yellow Network channel state
 *
 * This provides the channel dashboard functionality for the side panel,
 * including balance display, deposit/withdraw actions, and session management.
 */
export const useChannel = (walletAddress: `0x${string}` | null) => {
  const [state, setState] = useState<ChannelState>({
    channel: null,
    sessions: [],
    isLoading: false,
    error: null,
  });

  // Load channel state from storage
  useEffect(() => {
    if (!walletAddress) {
      setState({
        channel: null,
        sessions: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    const loadChannel = async () => {
      const storageState = await channelStorage.get();

      if (storageState.activeChannel && storageState.walletAddress === walletAddress) {
        setState({
          channel: storageState.activeChannel,
          sessions: storageState.activeChannel.sessions,
          isLoading: false,
          error: null,
        });
      }
    };

    loadChannel();

    // Subscribe to storage changes
    const unsubscribe = channelStorage.subscribe(() => {
      loadChannel();
    });

    return unsubscribe;
  }, [walletAddress]);

  /**
   * Calculate channel statistics
   */
  const getStats = useCallback((): ChannelStats => {
    if (!state.channel) {
      return {
        totalDeposited: 0n,
        availableBalance: 0n,
        totalSpent: 0n,
        activeSessionCount: 0,
        totalReactions: 0,
      };
    }

    const totalDeposited = BigInt(state.channel.totalAmount);
    const availableBalance = BigInt(state.channel.availableBalance);
    const totalSpent = totalDeposited - availableBalance;
    const activeSessionCount = state.sessions.length;
    const totalReactions = state.sessions.reduce((sum, s) => sum + s.reactionCount, 0);

    return {
      totalDeposited,
      availableBalance,
      totalSpent,
      activeSessionCount,
      totalReactions,
    };
  }, [state.channel, state.sessions]);

  /**
   * Create a new channel (simulated for PoC)
   *
   * In production, this would:
   * 1. Call Custody.deposit()
   * 2. Call Custody.createChannel()
   * 3. Connect to ClearNode WebSocket
   * 4. Register channel with ReactionPool
   */
  const createChannel = useCallback(
    async (depositAmount: bigint) => {
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Simulated channel creation for PoC
        // In production, this would interact with on-chain contracts
        const channelId = `0x${Date.now().toString(16).padStart(64, '0')}` as `0x${string}`;
        const now = Date.now();

        const newChannel: SerializedChannelState = {
          channelId,
          userAddress: walletAddress,
          poolAddress: CONTRACTS.reactionPool,
          totalAmount: depositAmount.toString(),
          availableBalance: depositAmount.toString(),
          sessions: [],
          isActive: true,
          createdAt: now,
        };

        await channelStorage.setActiveChannel(newChannel);
        await channelStorage.completeOnboarding();

        setState({
          channel: newChannel,
          sessions: [],
          isLoading: false,
          error: null,
        });

        console.log('[frens] Channel created:', {
          channelId,
          depositAmount: depositAmount.toString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create channel';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [walletAddress],
  );

  /**
   * Deposit more funds to the channel (simulated for PoC)
   *
   * In production, this would:
   * 1. Call Token.approve()
   * 2. Call Custody.deposit()
   * 3. Call Custody.resizeChannel() to add funds
   */
  const deposit = useCallback(
    async (amount: bigint) => {
      if (!state.channel) {
        throw new Error('No active channel');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const newTotal = BigInt(state.channel.totalAmount) + amount;
        const newAvailable = BigInt(state.channel.availableBalance) + amount;

        const updatedChannel: SerializedChannelState = {
          ...state.channel,
          totalAmount: newTotal.toString(),
          availableBalance: newAvailable.toString(),
        };

        await channelStorage.setActiveChannel(updatedChannel);

        setState(prev => ({
          ...prev,
          channel: updatedChannel,
          isLoading: false,
        }));

        console.log('[frens] Deposit added:', {
          amount: amount.toString(),
          newTotal: newTotal.toString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to deposit';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [state.channel],
  );

  /**
   * Withdraw funds from the channel (simulated for PoC)
   *
   * In production, this would:
   * 1. Close active sessions
   * 2. Call Custody.resizeChannel() to remove funds
   * 3. Call Custody.withdraw()
   */
  const withdraw = useCallback(
    async (amount: bigint) => {
      if (!state.channel) {
        throw new Error('No active channel');
      }

      const availableBalance = BigInt(state.channel.availableBalance);
      if (amount > availableBalance) {
        throw new Error('Insufficient balance');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const newTotal = BigInt(state.channel.totalAmount) - amount;
        const newAvailable = availableBalance - amount;

        const updatedChannel: SerializedChannelState = {
          ...state.channel,
          totalAmount: newTotal.toString(),
          availableBalance: newAvailable.toString(),
        };

        await channelStorage.setActiveChannel(updatedChannel);

        setState(prev => ({
          ...prev,
          channel: updatedChannel,
          isLoading: false,
        }));

        console.log('[frens] Withdrawal complete:', {
          amount: amount.toString(),
          newAvailable: newAvailable.toString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to withdraw';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [state.channel],
  );

  /**
   * Close the channel completely (simulated for PoC)
   *
   * In production, this would:
   * 1. Close all active sessions
   * 2. Call Custody.closeChannel()
   * 3. Distribute final allocations
   */
  const closeChannel = useCallback(async () => {
    if (!state.channel) {
      throw new Error('No active channel');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await channelStorage.clearChannelData();

      setState({
        channel: null,
        sessions: [],
        isLoading: false,
        error: null,
      });

      console.log('[frens] Channel closed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to close channel';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    }
  }, [state.channel]);

  return {
    ...state,
    stats: getStats(),
    reactionCost: REACTION_COST,
    createChannel,
    deposit,
    withdraw,
    closeChannel,
  };
};
