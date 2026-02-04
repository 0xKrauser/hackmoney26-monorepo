import CreateMeme from './CreateMeme';
import OwnedMemecoins from './OwnedMemecoins';
import TwitterVerification from './TwitterVerification';
import { useToast } from '../providers/ToastProvider';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useCallback, useEffect } from 'react';
import type { Address } from 'viem';

type ActiveView = 'main' | 'twitter-verify' | 'create-meme' | 'swap' | 'transfer' | 'portfolio' | 'transactions';

const WalletScreen = () => {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { showSuccess, showError } = useToast();
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [copied, setCopied] = useState(false);
  const [isTwitterVerified, setIsTwitterVerified] = useState(false);

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
      showSuccess('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError('Failed to copy address');
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
          showSuccess('Twitter verified successfully!');
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Verified
              </span>
            )}
          </div>
        </div>
        <button className="wallet-logout-btn" onClick={handleLogout} title="Logout">
          <svg
            width="18"
            height="18"
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
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
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
            href={`https://sepolia.basescan.org/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="wallet-explorer-link">
            View on BaseScan
            <svg
              width="12"
              height="12"
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div className="wallet-twitter-text">
            <span className="wallet-twitter-title">Twitter Verification</span>
            <span className="wallet-twitter-status">
              {isTwitterVerified ? 'Verified with Chainlink' : 'Link your Twitter account'}
            </span>
          </div>
        </div>
        {isTwitterVerified ? (
          <div className="wallet-verified-badge">
            <svg
              width="16"
              height="16"
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
          <ActionButton icon={<TransferIcon />} label="Transfer" onClick={() => handleComingSoon('Transfer')} />
          <ActionButton icon={<PortfolioIcon />} label="Portfolio" onClick={() => handleComingSoon('Portfolio')} />
          <ActionButton
            icon={<TransactionsIcon />}
            label="Transactions"
            onClick={() => handleComingSoon('Transactions')}
          />
          <ActionButton icon={<DepositIcon />} label="Deposit" onClick={() => handleComingSoon('Deposit')} />
          <ActionButton icon={<WithdrawIcon />} label="Withdraw" onClick={() => handleComingSoon('Withdraw')} />
          <ActionButton icon={<ClaimIcon />} label="Claim" onClick={() => handleComingSoon('Claim Memecoins')} />
          <ActionButton
            icon={<CreateMemeIcon />}
            label="Create Meme"
            onClick={() => setActiveView('create-meme')}
            accent
          />
        </div>
      </div>

      {/* Owned Memecoins Section */}
      {walletAddress && (
        <div className="wallet-memecoins-section">
          <h3 className="wallet-section-title">Your Memecoins</h3>
          <OwnedMemecoins walletAddress={walletAddress} />
        </div>
      )}
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
    width="20"
    height="20"
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
    width="20"
    height="20"
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

const PortfolioIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

const TransactionsIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const DepositIcon = () => (
  <svg
    width="20"
    height="20"
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

const WithdrawIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M12 17V2" />
    <path d="M17 7l-5-5-5 5" />
    <path d="M19 22H5" />
  </svg>
);

const ClaimIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const CreateMemeIcon = () => (
  <svg
    width="20"
    height="20"
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

export default WalletScreen;
