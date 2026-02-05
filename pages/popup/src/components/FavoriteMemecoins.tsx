import { useChain } from '../hooks/useChain';
import { favoritesStorage } from '@repo/storage';
import { useState, useEffect, useCallback } from 'react';
import type { FavoriteMemecoin, SupportedChain } from '@repo/storage';

interface TokenResponse {
  tokenAddress: string;
  name: string;
  symbol: string;
  image?: string;
  marketCapETH: string;
  description?: string;
}

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string;
  marketCapETH: string;
}

// Format market cap in ETH (value comes in wei)
const formatMarketCap = (value: string) => {
  // Convert from wei to ETH (divide by 10^18)
  const weiValue = parseFloat(value);
  if (Number.isNaN(weiValue)) return '0 ETH';

  const ethValue = weiValue / 1e18;

  if (ethValue >= 1000000) return `${(ethValue / 1000000).toFixed(2)}M ETH`;
  if (ethValue >= 1000) return `${(ethValue / 1000).toFixed(2)}K ETH`;
  if (ethValue >= 1) return `${ethValue.toFixed(2)} ETH`;
  if (ethValue >= 0.001) return `${ethValue.toFixed(4)} ETH`;
  return `${ethValue.toFixed(6)} ETH`;
};

type ViewMode = 'favorites' | 'trending' | 'add-address';

const FavoriteMemecoins = () => {
  const { config: chainConfig, chain } = useChain();
  const [favorites, setFavorites] = useState<FavoriteMemecoin[]>([]);
  const [trendingCoins, setTrendingCoins] = useState<SearchResult[]>([]);
  const [addressInput, setAddressInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('favorites');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear trending coins and sync chain when chain changes
  useEffect(() => {
    setTrendingCoins([]);
    setError('');
    // Sync current chain to favorites storage
    favoritesStorage.setCurrentChain(chain as SupportedChain);
  }, [chain]);

  // Load favorites on mount and when chain changes
  useEffect(() => {
    const loadFavorites = async () => {
      const favs = await favoritesStorage.getFavorites(chain as SupportedChain);
      setFavorites(favs);
    };
    loadFavorites();

    // Subscribe to storage changes
    const unsubscribe = favoritesStorage.subscribe(() => {
      loadFavorites();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [chain]);

  // Fetch trending coins by market cap
  const fetchTrendingCoins = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // API returns tokens sorted by market cap (highest first) by default
      const response = await fetch(`${chainConfig.flaunchApi}/tokens?limit=10`);

      if (!response.ok) {
        throw new Error('Failed to load coins');
      }

      const data = await response.json();
      const tokens: TokenResponse[] = data?.data || [];

      if (tokens.length === 0) {
        throw new Error(`No coins found on ${chainConfig.name}`);
      }

      const results: SearchResult[] = tokens.map(t => ({
        id: t.tokenAddress,
        name: t.name,
        symbol: t.symbol,
        imageUrl: t.image || '',
        marketCapETH: t.marketCapETH,
      }));

      setTrendingCoins(results);
    } catch (e) {
      setError((e as Error).message || 'Failed to load coins');
      setTrendingCoins([]);
    } finally {
      setLoading(false);
    }
  }, [chainConfig.flaunchApi, chainConfig.name]);

  // Lookup coin by address
  const handleAddByAddress = useCallback(async () => {
    if (!addressInput.trim()) return;

    const address = addressInput.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/i.test(address)) {
      setError('Invalid address format');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${chainConfig.flaunchApi}/tokens/${address}`);

      if (response.status === 404) {
        throw new Error(`Coin not found on ${chainConfig.name}. Make sure it was created via Flaunch.`);
      }

      if (!response.ok) {
        throw new Error('Failed to fetch coin details');
      }

      const coin: TokenResponse = await response.json();

      if (!coin || !coin.tokenAddress) {
        throw new Error(`Coin not found on ${chainConfig.name}. Make sure it was created via Flaunch.`);
      }

      await favoritesStorage.addFavorite(
        {
          address: coin.tokenAddress,
          name: coin.name,
          symbol: coin.symbol,
          imageUrl: coin.image || '',
          marketCapETH: coin.marketCapETH || '0',
        },
        chain as SupportedChain,
      );

      setAddressInput('');
      setError('');
      setViewMode('favorites');
    } catch (e) {
      setError((e as Error).message || 'Failed to add coin');
    } finally {
      setLoading(false);
    }
  }, [addressInput, chainConfig.flaunchApi, chainConfig.name, chain]);

  // Add to favorites
  const handleAddFavorite = async (coin: SearchResult) => {
    await favoritesStorage.addFavorite(
      {
        address: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        imageUrl: coin.imageUrl,
        marketCapETH: coin.marketCapETH,
      },
      chain as SupportedChain,
    );
  };

  // Remove from favorites
  const handleRemoveFavorite = async (address: string) => {
    await favoritesStorage.removeFavorite(address, chain as SupportedChain);
  };

  // Update amount for a favorite
  const handleUpdateAmount = async (address: string, amount: number) => {
    const validAmount = Math.max(1, Math.floor(amount));
    await favoritesStorage.updateAmount(address, validAmount, chain as SupportedChain);
  };

  // Check if coin is favorited
  const isFavorited = (address: string) => favorites.some(f => f.address.toLowerCase() === address.toLowerCase());

  // Render favorites view
  const renderFavorites = () => (
    <>
      <div className="favorites-header">
        <span className="favorites-count">
          {favorites.length} coin{favorites.length !== 1 ? 's' : ''}
        </span>
        <div className="favorites-actions">
          <button
            type="button"
            className="favorites-action-btn"
            onClick={() => {
              setError('');
              setViewMode('trending');
              fetchTrendingCoins();
            }}
            title="Browse trending coins">
            <TrendingIcon />
          </button>
          <button
            type="button"
            className="favorites-action-btn"
            onClick={() => {
              setError('');
              setViewMode('add-address');
            }}
            title="Add by address">
            <PlusIcon />
          </button>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="favorites-empty">
          <div className="favorites-empty-icon">
            <StarIcon />
          </div>
          <p>No reaction coins yet</p>
          <span className="favorites-empty-hint">Add memecoins to react on Twitter</span>
        </div>
      ) : (
        <div className="favorites-list">
          {favorites.map(coin => (
            <div key={coin.address} className="favorites-item favorites-item-with-amount">
              <div className="favorites-item-image">
                {coin.imageUrl ? (
                  <img src={coin.imageUrl} alt={coin.name} />
                ) : (
                  <div className="favorites-item-placeholder">
                    <span>{coin.symbol.slice(0, 2)}</span>
                  </div>
                )}
              </div>
              <div className="favorites-item-info">
                <span className="favorites-item-name">{coin.name}</span>
                <span className="favorites-item-symbol">${coin.symbol}</span>
              </div>
              <div className="favorites-item-amount">
                <input
                  type="number"
                  className="favorites-amount-input"
                  value={coin.amount || 100}
                  onChange={e => handleUpdateAmount(coin.address, parseInt(e.target.value, 10) || 100)}
                  min={1}
                  title="Coins per reaction"
                />
              </div>
              <button
                type="button"
                className="favorites-remove-btn"
                onClick={() => handleRemoveFavorite(coin.address)}
                title="Remove from favorites">
                <CloseIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // Render trending view
  const renderTrending = () => (
    <>
      <div className="favorites-header">
        <button type="button" className="favorites-back-btn" onClick={() => setViewMode('favorites')}>
          <BackIcon />
        </button>
        <h4 className="favorites-title">Trending Coins</h4>
        <div style={{ width: 24 }} />
      </div>

      {error && <div className="favorites-error">{error}</div>}

      {loading && trendingCoins.length === 0 && (
        <div className="favorites-loading">
          <SpinnerIcon />
          <span>Loading trending coins...</span>
        </div>
      )}

      <div className="favorites-results">
        {trendingCoins.map(coin => (
          <div key={coin.id} className="favorites-item">
            <div className="favorites-item-image">
              {coin.imageUrl ? (
                <img src={coin.imageUrl} alt={coin.name} />
              ) : (
                <div className="favorites-item-placeholder">
                  <span>{coin.symbol.slice(0, 2)}</span>
                </div>
              )}
            </div>
            <div className="favorites-item-info">
              <span className="favorites-item-name">{coin.name}</span>
              <span className="favorites-item-symbol">${coin.symbol}</span>
            </div>
            <div className="favorites-item-mcap">{formatMarketCap(coin.marketCapETH)}</div>
            <button
              type="button"
              className={`favorites-star-btn ${isFavorited(coin.id) ? 'favorited' : ''}`}
              onClick={() => (isFavorited(coin.id) ? handleRemoveFavorite(coin.id) : handleAddFavorite(coin))}
              title={isFavorited(coin.id) ? 'Remove from favorites' : 'Add to favorites'}>
              <StarIcon filled={isFavorited(coin.id)} />
            </button>
          </div>
        ))}
      </div>
    </>
  );

  // Render add by address view
  const renderAddByAddress = () => (
    <>
      <div className="favorites-header">
        <button type="button" className="favorites-back-btn" onClick={() => setViewMode('favorites')}>
          <BackIcon />
        </button>
        <h4 className="favorites-title">Add by Address</h4>
        <div style={{ width: 24 }} />
      </div>

      <div className="favorites-address-section">
        <p className="favorites-address-hint">Enter a memecoin contract address to add it to your favorites.</p>
        <input
          type="text"
          className="favorites-address-input"
          placeholder="0x..."
          value={addressInput}
          onChange={e => setAddressInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddByAddress()}
        />
        {error && <div className="favorites-error">{error}</div>}
        <button
          type="button"
          className="favorites-add-btn"
          onClick={handleAddByAddress}
          disabled={loading || !addressInput.trim()}>
          {loading ? (
            <>
              <SpinnerIcon /> Adding...
            </>
          ) : (
            'Add to Favorites'
          )}
        </button>
      </div>
    </>
  );

  return (
    <div className="favorites-container">
      {viewMode === 'favorites' && renderFavorites()}
      {viewMode === 'trending' && renderTrending()}
      {viewMode === 'add-address' && renderAddByAddress()}
    </div>
  );
};

// Icons
const StarIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TrendingIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const BackIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    className="favorites-spinner"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);

export default FavoriteMemecoins;
