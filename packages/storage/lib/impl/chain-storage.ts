import { createStorage, StorageEnum } from '../base/index.js';

type SupportedChain = 'base' | 'base-sepolia';

interface ChainConfig {
  id: SupportedChain;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  flaunchApi: string;
}

const CHAIN_CONFIGS: Record<SupportedChain, ChainConfig> = {
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    flaunchApi: 'https://dev-api.flayerlabs.xyz/v1/base',
  },
  'base-sepolia': {
    id: 'base-sepolia',
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    flaunchApi: 'https://dev-api.flayerlabs.xyz/v1/base-sepolia',
  },
};

interface ChainState {
  selectedChain: SupportedChain;
}

const storage = createStorage<ChainState>(
  'chain-selection-storage-key',
  {
    selectedChain: 'base-sepolia', // Default to testnet for safety
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

const chainStorage = {
  ...storage,

  setChain: async (chain: SupportedChain) => {
    await storage.set({ selectedChain: chain });
  },

  getChain: async (): Promise<SupportedChain> => {
    const state = await storage.get();
    return state.selectedChain;
  },

  getChainConfig: async (): Promise<ChainConfig> => {
    const state = await storage.get();
    return CHAIN_CONFIGS[state.selectedChain];
  },
};

export { chainStorage, CHAIN_CONFIGS };
export type { SupportedChain, ChainConfig };
