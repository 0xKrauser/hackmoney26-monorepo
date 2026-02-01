import { createStorage, StorageEnum } from '@repo/storage';
import type { EmojiType } from './types.js';
import type { BaseStorageType } from '@repo/storage';

/**
 * Storage for frequently used emojis.
 * Uses chrome.storage.local for extension compatibility with live updates.
 */
const storage = createStorage<EmojiType[]>('frequently-used-emojis', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export type FrequentlyUsedStorageType = BaseStorageType<EmojiType[]> & {
  add: (emoji: EmojiType) => Promise<void>;
};

export const frequentlyUsedStorage: FrequentlyUsedStorageType = {
  ...storage,
  /**
   * Add an emoji to frequently used list.
   * Moves to front if already exists, limits to 18 items.
   */
  add: async (emoji: EmojiType) => {
    await storage.set((emojis: EmojiType[]) => {
      const filtered = emojis.filter((e: EmojiType) => {
        if ('id' in emoji) {
          return !('id' in e) || e.id !== emoji.id;
        }
        return e.name !== emoji.name;
      });
      return [emoji, ...filtered].slice(0, 18);
    });
  },
};
