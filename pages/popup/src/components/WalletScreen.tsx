import ChainSelector from './ChainSelector';
import CreateMeme from './CreateMeme';
import FavoriteMemecoins from './FavoriteMemecoins';
import OwnedMemecoins from './OwnedMemecoins';
import TwitterVerification from './TwitterVerification';
import { useChain } from '../hooks/useChain';
import { useToast } from '../providers/ToastProvider';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useCallback, useEffect } from 'react';
import type { Address } from 'viem';

type ActiveView = 'main' | 'twitter-verify' | 'create-meme';
type MemecoinTab = 'favorites' | 'created';

const WalletScreen = () => {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { showSuccess, showError } = useToast();
  const { config: chainConfig } = useChain();
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [copied, setCopied] = useState(false);
  const [isTwitterVerified, setIsTwitterVerified] = useState(false);
  const [memecoinTab, setMemecoinTab] = useState<MemecoinTab>('favorites');

  // Get the embedded wallet address
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const walletAddress = embeddedWallet?.address as Address | undefined;

  // Check Twitter verification status from storage
  useEffect(() => {
    const checkTwitterVerification = async () => {
      if (!walletAddress) return;
      try {
        const stored = await chrome.storage.local.get('twitter_verified');
        if (stored.twitter_verified?.[walletAddress]) {
          setIsTwitterVerified(true);
        }
      } catch {
        // ignore
      }
    };
    checkTwitterVerification();
  }, [walletAddress]);

  const handleCopyAddress = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      showSuccess('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError('Failed to copy');
    }
  }, [walletAddress, showSuccess, showError]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      showError('Failed to logout');
    }
  }, [logout, showError]);

  const handleComingSoon = useCallback(
    (feature: string) => {
      showError(`${feature} coming soon!`);
    },
    [showError],
  );

  // Render different views
  if (activeView === 'twitter-verify' && walletAddress) {
    return (
      <TwitterVerification
        walletAddress={walletAddress}
        onBack={() => setActiveView('main')}
        onVerified={() => {
          setIsTwitterVerified(true);
          showSuccess('Twitter verified!');
          setActiveView('main');
        }}
      />
    );
  }

  if (activeView === 'create-meme' && walletAddress) {
    return <CreateMeme walletAddress={walletAddress} onBack={() => setActiveView('main')} />;
  }

  return (
    <div className="wallet-screen">
      {/* Header with user info */}
      <div className="wallet-header">
        <div className="wallet-header-left">
          <div className="wallet-avatar">{walletAddress?.slice(2, 4).toUpperCase() || 'FR'}</div>
          <div className="wallet-user-info">
            <span className="wallet-email">
              {user?.email?.address ||
                (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Wallet')}
            </span>
            {isTwitterVerified && (
              <span className="wallet-twitter-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Verified
              </span>
            )}
          </div>
        </div>
        <div className="wallet-header-right">
          <ChainSelector />
          <button className="wallet-logout-btn" onClick={handleLogout} title="Logout">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Wallet Address Card */}
      <div className="wallet-address-card">
        <div className="wallet-address-label">Wallet Address</div>
        <div className="wallet-address-row">
          <span className="wallet-address-value">
            {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : 'Loading...'}
          </span>
          <button className="wallet-copy-btn" onClick={handleCopyAddress} disabled={!walletAddress}>
            {copied ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
        {walletAddress && (
          <a
            href={`${chainConfig.explorerUrl}/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="wallet-explorer-link">
            View on {chainConfig.name === 'Base' ? 'BaseScan' : 'Sepolia BaseScan'}
            <svg
              width="10"
              height="10"
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
        )}
      </div>

      {/* Twitter Verification Card */}
      <div className="wallet-twitter-card">
        <div className="wallet-twitter-info">
          <div className="wallet-twitter-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div className="wallet-twitter-text">
            <span className="wallet-twitter-title">Twitter</span>
            <span className="wallet-twitter-status">{isTwitterVerified ? 'Verified' : 'Not verified'}</span>
          </div>
        </div>
        {isTwitterVerified ? (
          <div className="wallet-verified-badge">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ) : (
          <button className="wallet-verify-btn" onClick={() => setActiveView('twitter-verify')}>
            Verify
          </button>
        )}
      </div>

      {/* Action Buttons Grid */}
      <div className="wallet-actions-section">
        <h3 className="wallet-section-title">Actions</h3>
        <div className="wallet-actions-grid">
          <ActionButton icon={<SwapIcon />} label="Swap" onClick={() => handleComingSoon('Swap')} />
          <ActionButton icon={<TransferIcon />} label="Send" onClick={() => handleComingSoon('Send')} />
          <ActionButton icon={<DepositIcon />} label="Deposit" onClick={() => handleComingSoon('Deposit')} />
          <ActionButton icon={<CreateMemeIcon />} label="Create" onClick={() => setActiveView('create-meme')} accent />
        </div>
      </div>

      {/* Memecoins Section with Tabs */}
      <div className="wallet-memecoins-section">
        <div className="memecoins-tabs">
          <button
            className={`memecoins-tab ${memecoinTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setMemecoinTab('favorites')}>
            <StarIcon />
            Reactions
          </button>
          <button
            className={`memecoins-tab ${memecoinTab === 'created' ? 'active' : ''}`}
            onClick={() => setMemecoinTab('created')}>
            <CoinIcon />
            Created
          </button>
        </div>
        <div className="memecoins-tab-content">
          {memecoinTab === 'favorites' && <FavoriteMemecoins />}
          {memecoinTab === 'created' && walletAddress && <OwnedMemecoins walletAddress={walletAddress} />}
          {memecoinTab === 'created' && !walletAddress && (
            <div className="memecoins-empty">
              <p>Connect wallet to view created memecoins</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Action Button Component
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}

const ActionButton = ({ icon, label, onClick, accent }: ActionButtonProps) => (
  <button className={`wallet-action-btn ${accent ? 'wallet-action-btn-accent' : ''}`} onClick={onClick}>
    <div className="wallet-action-icon">{icon}</div>
    <span className="wallet-action-label">{label}</span>
  </button>
);

// Icons
const SwapIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M16 3l4 4-4 4" />
    <path d="M20 7H4" />
    <path d="M8 21l-4-4 4-4" />
    <path d="M4 17h16" />
  </svg>
);

const TransferIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const DepositIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M12 2v15" />
    <path d="M17 12l-5 5-5-5" />
    <path d="M19 22H5" />
  </svg>
);

const CreateMemeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const StarIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CoinIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v12" />
    <path d="M15 9.5a3 3 0 1 0 0 5H9" />
  </svg>
);

export default WalletScreen;
