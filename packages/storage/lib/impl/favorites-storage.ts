import { createStorage, StorageEnum } from '../base/index.js';
import type { SupportedChain } from './chain-storage.js';

interface FavoriteMemecoin {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  marketCapETH: string;
  addedAt: number;
  amount: number; // Default amount of coins per reaction
}

interface FavoritesState {
  // Chain-specific favorites
  favoritesByChain: Record<SupportedChain, FavoriteMemecoin[]>;
  // Currently selected chain (synced from chain-storage)
  currentChain: SupportedChain;
}

const storage = createStorage<FavoritesState>(
  'favorite-memecoins-storage-key',
  {
    favoritesByChain: {
      base: [],
      'base-sepolia': [],
    },
    currentChain: 'base-sepolia',
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

const DEFAULT_AMOUNT = 100; // Default coins per reaction

// Helper to ensure state has the correct structure (handles migration from old format)
const normalizeState = (state: FavoritesState | { favorites?: FavoriteMemecoin[] }): FavoritesState => {
  // Check if this is old format (has favorites array instead of favoritesByChain)
  const oldState = state as { favorites?: FavoriteMemecoin[] };
  if (oldState.favorites && !('favoritesByChain' in state)) {
    // Migrate old favorites to base-sepolia (since that was the only chain before)
    return {
      favoritesByChain: {
        base: [],
        'base-sepolia': oldState.favorites.map(f => ({
          ...f,
          amount: f.amount ?? DEFAULT_AMOUNT,
        })),
      },
      currentChain: 'base-sepolia',
    };
  }

  // Ensure favoritesByChain exists and has both chains
  const newState = state as FavoritesState;
  return {
    favoritesByChain: {
      base: newState.favoritesByChain?.base || [],
      'base-sepolia': newState.favoritesByChain?.['base-sepolia'] || [],
    },
    currentChain: newState.currentChain || 'base-sepolia',
  };
};

const favoritesStorage = {
  ...storage,

  setCurrentChain: async (chain: SupportedChain) => {
    await storage.set(current => {
      const normalized = normalizeState(current);
      return {
        ...normalized,
        currentChain: chain,
      };
    });
  },

  getCurrentChain: async (): Promise<SupportedChain> => {
    const state = await storage.get();
    const normalized = normalizeState(state);
    return normalized.currentChain;
  },

  addFavorite: async (
    coin: Omit<FavoriteMemecoin, 'addedAt' | 'amount'> & { amount?: number },
    chain?: SupportedChain,
  ) => {
    await storage.set(current => {
      const normalized = normalizeState(current);
      const targetChain = chain ?? normalized.currentChain;
      const chainFavorites = normalized.favoritesByChain[targetChain] || [];

      // Don't add duplicates
      if (chainFavorites.some(f => f.address.toLowerCase() === coin.address.toLowerCase())) {
        return normalized;
      }

      return {
        ...normalized,
        favoritesByChain: {
          ...normalized.favoritesByChain,
          [targetChain]: [
            {
              ...coin,
              addedAt: Date.now(),
              amount: coin.amount ?? DEFAULT_AMOUNT,
            },
            ...chainFavorites,
          ],
        },
      };
    });
  },

  updateAmount: async (address: string, amount: number, chain?: SupportedChain) => {
    await storage.set(current => {
      const normalized = normalizeState(current);
      const targetChain = chain ?? normalized.currentChain;
      const chainFavorites = normalized.favoritesByChain[targetChain] || [];

      return {
        ...normalized,
        favoritesByChain: {
          ...normalized.favoritesByChain,
          [targetChain]: chainFavorites.map(f =>
            f.address.toLowerCase() === address.toLowerCase() ? { ...f, amount } : f,
          ),
        },
      };
    });
  },

  removeFavorite: async (address: string, chain?: SupportedChain) => {
    await storage.set(current => {
      const normalized = normalizeState(current);
      const targetChain = chain ?? normalized.currentChain;
      const chainFavorites = normalized.favoritesByChain[targetChain] || [];

      return {
        ...normalized,
        favoritesByChain: {
          ...normalized.favoritesByChain,
          [targetChain]: chainFavorites.filter(f => f.address.toLowerCase() !== address.toLowerCase()),
        },
      };
    });
  },

  isFavorite: async (address: string, chain?: SupportedChain): Promise<boolean> => {
    const state = await storage.get();
    const normalized = normalizeState(state);
    const targetChain = chain ?? normalized.currentChain;
    const chainFavorites = normalized.favoritesByChain[targetChain] || [];
    return chainFavorites.some(f => f.address.toLowerCase() === address.toLowerCase());
  },

  getFavorites: async (chain?: SupportedChain): Promise<FavoriteMemecoin[]> => {
    const state = await storage.get();
    const normalized = normalizeState(state);
    const targetChain = chain ?? normalized.currentChain;
    return normalized.favoritesByChain[targetChain] || [];
  },

  clearFavorites: async (chain?: SupportedChain) => {
    await storage.set(current => {
      const normalized = normalizeState(current);
      const targetChain = chain ?? normalized.currentChain;
      return {
        ...normalized,
        favoritesByChain: {
          ...normalized.favoritesByChain,
          [targetChain]: [],
        },
      };
    });
  },
};

export { favoritesStorage };
export type { FavoriteMemecoin };
