import { favoritesStorage } from '@repo/storage';
import { useState, useEffect } from 'react';
import type { FavoriteMemecoin } from '@repo/storage';

// Icons
const PlusIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const App = () => {
  const [favorites, setFavorites] = useState<FavoriteMemecoin[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<FavoriteMemecoin | null>(null);

  // Load favorites on mount and subscribe to changes
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        // Get the current chain first, then load favorites for that chain
        const chain = await favoritesStorage.getCurrentChain();
        const favs = await favoritesStorage.getFavorites(chain);
        setFavorites(favs);
      } catch {
        // Storage might not be available in content script context
        console.log('[frens] Could not load favorites');
      }
    };
    loadFavorites();

    // Subscribe to storage changes (including chain changes)
    const unsubscribe = favoritesStorage.subscribe(() => {
      loadFavorites();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleCoinSelect = (coin: FavoriteMemecoin) => {
    setSelectedCoin(coin);
    setIsOpen(false);
    // TODO: In future, this will trigger sending the memecoin as reaction
    console.log('[frens] Selected reaction coin:', coin);
  };

  // Don't render if no favorites
  if (favorites.length === 0) {
    return (
      <div className="frens-reactions-empty">
        <button
          type="button"
          className="frens-reactions-add-btn"
          onClick={() => {
            // Open extension popup to add favorites
            chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
          }}
          title="Add memecoins to react with">
          <PlusIcon />
        </button>
      </div>
    );
  }

  // Show first 3 favorites as preview, click to expand
  const previewCoins = favorites.slice(0, 3);
  const hasMore = favorites.length > 3;

  return (
    <div className="frens-reactions-container">
      {!isOpen ? (
        <button type="button" className="frens-reactions-trigger" onClick={() => setIsOpen(true)}>
          <div className="frens-reactions-avatars">
            {previewCoins.map((coin, i) => (
              <div key={coin.address} className="frens-reactions-avatar" style={{ zIndex: previewCoins.length - i }}>
                {coin.imageUrl ? (
                  <img src={coin.imageUrl} alt={coin.symbol} />
                ) : (
                  <span className="frens-reactions-avatar-fallback">{coin.symbol.slice(0, 2)}</span>
                )}
              </div>
            ))}
          </div>
          {hasMore && <span className="frens-reactions-count">+{favorites.length - 3}</span>}
        </button>
      ) : (
        <div className="frens-reactions-picker">
          <div className="frens-reactions-header">
            <span className="frens-reactions-title">React with memecoin</span>
            <button type="button" className="frens-reactions-close" onClick={() => setIsOpen(false)}>
              <CloseIcon />
            </button>
          </div>
          <div className="frens-reactions-list">
            {favorites.map(coin => (
              <button
                type="button"
                key={coin.address}
                className={`frens-reactions-item ${selectedCoin?.address === coin.address ? 'selected' : ''}`}
                onClick={() => handleCoinSelect(coin)}>
                <div className="frens-reactions-item-image">
                  {coin.imageUrl ? (
                    <img src={coin.imageUrl} alt={coin.symbol} />
                  ) : (
                    <span className="frens-reactions-item-fallback">{coin.symbol.slice(0, 2)}</span>
                  )}
                </div>
                <div className="frens-reactions-item-info">
                  <span className="frens-reactions-item-symbol">${coin.symbol}</span>
                  <span className="frens-reactions-item-name">{coin.name}</span>
                </div>
                <span className="frens-reactions-item-amount">{coin.amount || 100}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { App };
