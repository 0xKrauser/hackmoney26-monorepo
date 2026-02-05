import { chainStorage, CHAIN_CONFIGS } from '@repo/storage';
import { useState, useEffect, useCallback } from 'react';
import type { SupportedChain, ChainConfig } from '@repo/storage';

export const useChain = () => {
  const [chain, setChainState] = useState<SupportedChain>('base-sepolia');
  const [loading, setLoading] = useState(true);

  // Load chain on mount
  useEffect(() => {
    const loadChain = async () => {
      try {
        const selectedChain = await chainStorage.getChain();
        setChainState(selectedChain);
      } catch {
        // Default to base-sepolia
      } finally {
        setLoading(false);
      }
    };
    loadChain();

    // Subscribe to storage changes
    const unsubscribe = chainStorage.subscribe(() => {
      loadChain();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const setChain = useCallback(async (newChain: SupportedChain) => {
    await chainStorage.setChain(newChain);
    setChainState(newChain);
  }, []);

  const config: ChainConfig = CHAIN_CONFIGS[chain];

  return {
    chain,
    setChain,
    config,
    loading,
    isMainnet: chain === 'base',
    isTestnet: chain === 'base-sepolia',
  };
};
