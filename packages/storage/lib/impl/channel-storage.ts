import { createStorage, StorageEnum } from '../base/index.js';
import type { BaseStorageType } from '../base/index.js';

/**
 * Serialized session state for storage
 */
interface SerializedSessionType {
  sessionId: string;
  postId: string;
  channelId: string;
  userAllocation: string;
  poolAllocation: string;
  createdAt: number;
  lastActivity: number;
  reactionCount: number;
}

/**
 * Serialized channel state for storage
 */
interface SerializedChannelStateType {
  channelId: string;
  userAddress: string;
  poolAddress: string;
  totalAmount: string;
  availableBalance: string;
  sessions: SerializedSessionType[];
  isActive: boolean;
  createdAt: number;
}

/**
 * Storage state for Yellow Network channels
 */
interface ChannelStorageStateType {
  /** Active channel for the current user */
  activeChannel: SerializedChannelStateType | null;
  /** Wallet address of the connected user */
  walletAddress: string | null;
  /** Whether the user has completed onboarding */
  onboardingComplete: boolean;
  /** Last sync timestamp */
  lastSyncAt: number;
}

/**
 * Channel storage with helper methods
 */
interface ChannelStorageTypeInterface extends BaseStorageType<ChannelStorageStateType> {
  /** Set the active channel */
  setActiveChannel: (channel: SerializedChannelStateType | null) => Promise<void>;
  /** Set the wallet address */
  setWalletAddress: (address: string | null) => Promise<void>;
  /** Update session in storage */
  updateSession: (session: SerializedSessionType) => Promise<void>;
  /** Remove session from storage */
  removeSession: (sessionId: string) => Promise<void>;
  /** Mark onboarding complete */
  completeOnboarding: () => Promise<void>;
  /** Clear all channel data */
  clearChannelData: () => Promise<void>;
  /** Get session by post ID */
  getSessionByPostId: (postId: string) => Promise<SerializedSessionType | null>;
}

/**
 * Default channel storage state
 */
const defaultChannelState: ChannelStorageStateType = {
  activeChannel: null,
  walletAddress: null,
  onboardingComplete: false,
  lastSyncAt: 0,
};

/**
 * Serialization helpers for BigInt conversion
 */
const serialization = {
  serialize: (value: ChannelStorageStateType): string => JSON.stringify(value),
  deserialize: (text: string): ChannelStorageStateType => {
    try {
      return JSON.parse(text) as ChannelStorageStateType;
    } catch {
      return defaultChannelState;
    }
  },
};

/**
 * Base storage instance for channel data
 */
const storage = createStorage<ChannelStorageStateType>('yellow-channel-storage', defaultChannelState, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
  serialization,
});

/**
 * Channel storage instance with helper methods
 */
const channelStorageInstance: ChannelStorageTypeInterface = {
  ...storage,

  setActiveChannel: async (channel: SerializedChannelStateType | null) => {
    await storage.set(current => ({
      ...current,
      activeChannel: channel,
      lastSyncAt: Date.now(),
    }));
  },

  setWalletAddress: async (address: string | null) => {
    await storage.set(current => ({
      ...current,
      walletAddress: address,
      lastSyncAt: Date.now(),
    }));
  },

  updateSession: async (session: SerializedSessionType) => {
    await storage.set(current => {
      if (!current.activeChannel) return current;

      const sessions = current.activeChannel.sessions.filter(s => s.sessionId !== session.sessionId);
      sessions.push(session);

      return {
        ...current,
        activeChannel: {
          ...current.activeChannel,
          sessions,
        },
        lastSyncAt: Date.now(),
      };
    });
  },

  removeSession: async (sessionId: string) => {
    await storage.set(current => {
      if (!current.activeChannel) return current;

      return {
        ...current,
        activeChannel: {
          ...current.activeChannel,
          sessions: current.activeChannel.sessions.filter(s => s.sessionId !== sessionId),
        },
        lastSyncAt: Date.now(),
      };
    });
  },

  completeOnboarding: async () => {
    await storage.set(current => ({
      ...current,
      onboardingComplete: true,
      lastSyncAt: Date.now(),
    }));
  },

  clearChannelData: async () => {
    await storage.set(() => ({
      ...defaultChannelState,
      lastSyncAt: Date.now(),
    }));
  },

  getSessionByPostId: async (postId: string) => {
    const state = await storage.get();
    if (!state.activeChannel) return null;

    return state.activeChannel.sessions.find(s => s.postId === postId) ?? null;
  },
};

// Export types and instance at end of file
export type SerializedSession = SerializedSessionType;
export type SerializedChannelState = SerializedChannelStateType;
export type ChannelStorageState = ChannelStorageStateType;
export type ChannelStorageType = ChannelStorageTypeInterface;
export const channelStorage = channelStorageInstance;
