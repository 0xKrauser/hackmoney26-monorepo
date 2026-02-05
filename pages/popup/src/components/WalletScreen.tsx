import MainWallet from './MainWallet';
import SwapScreen from './SwapScreen';
import TwitterVerification from './TwitterVerification';
import { useToast } from '../providers/ToastProvider';
import { useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import type { Address } from 'viem';

type ActiveView = 'main' | 'twitter-verify' | 'swap';

const WalletScreen = () => {
  const { wallets } = useWallets();
  const { showSuccess } = useToast();
  const [activeView, setActiveView] = useState<ActiveView>('main');
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

  // Render different views
  if (activeView === 'swap') {
    return <SwapScreen onBack={() => setActiveView('main')} />;
  }

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

  return <MainWallet onNavigate={setActiveView} isTwitterVerified={isTwitterVerified} />;
};

export default WalletScreen;
