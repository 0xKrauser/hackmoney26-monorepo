import { useChain } from '../hooks/useChain';
import { createFlaunch } from '@flaunch/sdk';
import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import type { PublicClient, FlaunchSDK } from '@flaunch/sdk';
import type { Address } from 'viem';

const RPC_URL = 'https://sepolia.base.org';
const STORAGE_KEY = 'user-created-memes';

interface OwnedMemecoinsProps {
  walletAddress: Address;
}

interface MemeInfo {
  address: Address;
  name: string;
  symbol: string;
  image: string;
  priceUSD: string;
  createdAt: number;
}

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// Using type assertion to work around viem version mismatch
const flaunchRead = createFlaunch({ publicClient: publicClient as unknown as PublicClient });

// Get stored memes from localStorage
const getStoredMemes = (walletAddress: Address): string[] => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${walletAddress.toLowerCase()}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// For use in CreateMeme
const addStoredMeme = (walletAddress: Address, memeAddress: string, timestamp: number): void => {
  try {
    const stored = getStoredMemes(walletAddress);
    const entry = `${memeAddress}:${timestamp}`;
    if (!stored.some(e => e.startsWith(memeAddress))) {
      stored.unshift(entry);
      localStorage.setItem(`${STORAGE_KEY}-${walletAddress.toLowerCase()}`, JSON.stringify(stored));
    }
  } catch {
    // Ignore storage errors
  }
};

const OwnedMemecoins = ({ walletAddress }: OwnedMemecoinsProps) => {
  const { config: chainConfig } = useChain();
  const [memes, setMemes] = useState<MemeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadMemes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const storedMemes = getStoredMemes(walletAddress);

      if (storedMemes.length === 0) {
        setMemes([]);
        setLoading(false);
        return;
      }

      const memeInfos: MemeInfo[] = [];

      for (const entry of storedMemes) {
        try {
          const [address, timestamp] = entry.split(':');
          const coinAddress = address as Address;

          // Get metadata from Flaunch
          const metadata = await flaunchRead.getCoinMetadata(coinAddress);

          // Try to get price
          let priceUSD = '0';
          try {
            const price = await (
              flaunchRead as FlaunchSDK & { coinPriceInUSD: (args: { coinAddress: Address }) => Promise<number> }
            ).coinPriceInUSD({ coinAddress });
            priceUSD = typeof price === 'number' ? price.toFixed(6) : String(price);
          } catch {
            // Price might not be available
          }

          memeInfos.push({
            address: coinAddress,
            name: metadata.name,
            symbol: metadata.symbol,
            image: metadata.image || '',
            priceUSD,
            createdAt: parseInt(timestamp) || Date.now(),
          });
        } catch {
          // Skip memes that fail to load
        }
      }

      setMemes(memeInfos);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'Failed to load memecoins');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadMemes();
  }, [loadMemes]);

  if (loading) {
    return (
      <div className="memecoins-loading">
        <div className="memecoins-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="memecoins-error">
        <span>{error}</span>
        <button className="memecoins-retry-btn" onClick={loadMemes}>
          Retry
        </button>
      </div>
    );
  }

  if (memes.length === 0) {
    return (
      <div className="memecoins-empty">
        <div className="memecoins-empty-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <p>No memecoins yet</p>
        <span className="memecoins-empty-hint">Create your first memecoin!</span>
      </div>
    );
  }

  return (
    <div className="memecoins-list">
      {memes.map(meme => (
        <a
          key={meme.address}
          href={`${chainConfig.explorerUrl}/address/${meme.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="memecoins-item">
          <div className="memecoins-item-image">
            {meme.image ? (
              <img src={meme.image} alt={meme.name} />
            ) : (
              <div className="memecoins-item-placeholder">
                <span>{meme.symbol.slice(0, 2)}</span>
              </div>
            )}
          </div>
          <div className="memecoins-item-info">
            <span className="memecoins-item-name">{meme.name}</span>
            <span className="memecoins-item-symbol">${meme.symbol}</span>
          </div>
          <div className="memecoins-item-price">
            <span className="memecoins-item-price-value">${meme.priceUSD}</span>
          </div>
          <svg
            className="memecoins-item-arrow"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      ))}
    </div>
  );
};

export { addStoredMeme };
export default OwnedMemecoins;
