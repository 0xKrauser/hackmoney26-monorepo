import { useToast } from '../providers/ToastProvider';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useCallback } from 'react';

const WalletScreen = () => {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { showSuccess, showError } = useToast();
  const [copied, setCopied] = useState(false);

  // Get the embedded wallet address
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const walletAddress = embeddedWallet?.address;

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

  const openDashboard = useCallback(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('new-tab/index.html') });
    window.close();
  }, []);

  const openBasescan = useCallback(() => {
    if (walletAddress) {
      chrome.tabs.create({ url: `https://sepolia.basescan.org/address/${walletAddress}` });
    }
  }, [walletAddress]);

  return (
    <div className="wallet-screen">
      {/* Header */}
      <div className="wallet-header">
        <div className="wallet-header-left">
          <div className="wallet-avatar">{walletAddress?.slice(2, 4).toUpperCase() || 'FR'}</div>
          <div className="wallet-user-info">
            <span className="wallet-title">Frens</span>
            {user?.email && <span className="wallet-email">{user.email.address}</span>}
          </div>
        </div>
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

      {/* Address Card */}
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
        <button className="wallet-explorer-btn" onClick={openBasescan}>
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
        </button>
      </div>

      {/* Quick Actions */}
      <div className="wallet-actions">
        <button className="wallet-action-btn" onClick={() => showError('Swap coming soon!')}>
          <svg
            width="18"
            height="18"
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
          <span>Swap</span>
        </button>
        <button className="wallet-action-btn" onClick={() => showError('Transfer coming soon!')}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          <span>Send</span>
        </button>
        <button className="wallet-action-btn" onClick={() => showError('Deposit coming soon!')}>
          <svg
            width="18"
            height="18"
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
          <span>Deposit</span>
        </button>
      </div>

      {/* Open Dashboard Button */}
      <button className="wallet-dashboard-btn" onClick={openDashboard}>
        <div className="wallet-dashboard-btn-content">
          <div className="wallet-dashboard-btn-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <div className="wallet-dashboard-btn-text">
            <span className="wallet-dashboard-btn-title">Open Full Dashboard</span>
            <span className="wallet-dashboard-btn-subtitle">Create memes, verify Twitter, and more</span>
          </div>
        </div>
        <svg
          width="16"
          height="16"
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
      </button>

      {/* Footer */}
      <div className="wallet-footer">
        <span>Base Sepolia</span>
        <span className="wallet-footer-dot"></span>
        <span>Connected</span>
      </div>
    </div>
  );
};

export default WalletScreen;
