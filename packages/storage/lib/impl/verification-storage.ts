import { createStorage, StorageEnum } from '../base/index.js';

type VerificationStatus = 'idle' | 'registered' | 'tweet_pending' | 'verifying' | 'verified' | 'failed';

interface VerificationState {
  walletAddress: string | null;
  twitterUsername: string | null;
  verificationStatus: VerificationStatus;
  txHash: string | null;
  verificationNonce: string | null;
}

const storage = createStorage<VerificationState>(
  'verification-storage-key',
  {
    walletAddress: null,
    twitterUsername: null,
    verificationStatus: 'idle',
    txHash: null,
    verificationNonce: null,
  },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const verificationStorage = {
  ...storage,
  setWallet: async (address: string) => {
    await storage.set(current => ({ ...current, walletAddress: address }));
  },
  clearWallet: async () => {
    await storage.set({
      walletAddress: null,
      twitterUsername: null,
      verificationStatus: 'idle',
      txHash: null,
      verificationNonce: null,
    });
  },
  setRegistered: async (username: string, nonce: string) => {
    await storage.set(current => ({
      ...current,
      twitterUsername: username,
      verificationNonce: nonce,
      verificationStatus: 'tweet_pending' as VerificationStatus,
    }));
  },
  setVerifying: async (txHash: string) => {
    await storage.set(current => ({
      ...current,
      verificationStatus: 'verifying' as VerificationStatus,
      txHash,
    }));
  },
  setVerified: async () => {
    await storage.set(current => ({
      ...current,
      verificationStatus: 'verified' as VerificationStatus,
    }));
  },
  setFailed: async () => {
    await storage.set(current => ({
      ...current,
      verificationStatus: 'failed' as VerificationStatus,
    }));
  },
  reset: async () => {
    await storage.set({
      walletAddress: null,
      twitterUsername: null,
      verificationStatus: 'idle',
      txHash: null,
      verificationNonce: null,
    });
  },
};
