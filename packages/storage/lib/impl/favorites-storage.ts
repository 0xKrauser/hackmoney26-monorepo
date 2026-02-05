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

const favoritesStorage = {
  ...storage,

  setCurrentChain: async (chain: SupportedChain) => {
    await storage.set(current => ({
      ...current,
      currentChain: chain,
    }));
  },

  getCurrentChain: async (): Promise<SupportedChain> => {
    const state = await storage.get();
    return state.currentChain;
  },

  addFavorite: async (
    coin: Omit<FavoriteMemecoin, 'addedAt' | 'amount'> & { amount?: number },
    chain?: SupportedChain,
  ) => {
    await storage.set(current => {
      const targetChain = chain ?? current.currentChain;
      const chainFavorites = current.favoritesByChain[targetChain] || [];

      // Don't add duplicates
      if (chainFavorites.some(f => f.address.toLowerCase() === coin.address.toLowerCase())) {
        return current;
      }

      return {
        ...current,
        favoritesByChain: {
          ...current.favoritesByChain,
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
      const targetChain = chain ?? current.currentChain;
      const chainFavorites = current.favoritesByChain[targetChain] || [];

      return {
        ...current,
        favoritesByChain: {
          ...current.favoritesByChain,
          [targetChain]: chainFavorites.map(f =>
            f.address.toLowerCase() === address.toLowerCase() ? { ...f, amount } : f,
          ),
        },
      };
    });
  },

  removeFavorite: async (address: string, chain?: SupportedChain) => {
    await storage.set(current => {
      const targetChain = chain ?? current.currentChain;
      const chainFavorites = current.favoritesByChain[targetChain] || [];

      return {
        ...current,
        favoritesByChain: {
          ...current.favoritesByChain,
          [targetChain]: chainFavorites.filter(f => f.address.toLowerCase() !== address.toLowerCase()),
        },
      };
    });
  },

  isFavorite: async (address: string, chain?: SupportedChain): Promise<boolean> => {
    const state = await storage.get();
    const targetChain = chain ?? state.currentChain;
    const chainFavorites = state.favoritesByChain[targetChain] || [];
    return chainFavorites.some(f => f.address.toLowerCase() === address.toLowerCase());
  },

  getFavorites: async (chain?: SupportedChain): Promise<FavoriteMemecoin[]> => {
    const state = await storage.get();
    const targetChain = chain ?? state.currentChain;
    return state.favoritesByChain[targetChain] || [];
  },

  clearFavorites: async (chain?: SupportedChain) => {
    await storage.set(current => {
      const targetChain = chain ?? current.currentChain;
      return {
        ...current,
        favoritesByChain: {
          ...current.favoritesByChain,
          [targetChain]: [],
        },
      };
    });
  },
};

export { favoritesStorage };
export type { FavoriteMemecoin };
