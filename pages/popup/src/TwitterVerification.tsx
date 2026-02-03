import { useStorage } from '@repo/shared';
import { verificationStorage } from '@repo/storage';
import { cn } from '@repo/ui';

interface TwitterVerificationProps {
  isLight: boolean;
}

export const TwitterVerification = ({ isLight }: TwitterVerificationProps) => {
  const state = useStorage(verificationStorage);

  const openNewTab = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('new-tab/index.html') });
  };

  const btnClass = cn(
    'w-full rounded px-4 py-2 font-bold shadow hover:scale-[1.02] transition-transform',
    isLight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700',
  );

  // Verified state
  if (state.verificationStatus === 'verified') {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="text-2xl">&#10003;</div>
        <h2 className="text-sm font-bold text-green-500">Verified!</h2>
        <p className="text-xs opacity-70">
          @{state.twitterUsername} is verified for {state.walletAddress?.slice(0, 6)}...{state.walletAddress?.slice(-4)}
        </p>
        <button className={btnClass} onClick={openNewTab}>
          View Details
        </button>
      </div>
    );
  }

  // Verifying state
  if (state.verificationStatus === 'verifying') {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <h2 className="text-sm font-bold">Verification in Progress</h2>
        <p className="text-xs opacity-70">Chainlink Functions is checking your tweet.</p>
        <button className={btnClass} onClick={openNewTab}>
          View Status
        </button>
      </div>
    );
  }

  // In-progress states (wallet connected, tweet pending, etc.)
  if (state.walletAddress && (state.verificationStatus === 'tweet_pending' || state.verificationStatus === 'idle')) {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <h2 className="text-sm font-bold">Verification In Progress</h2>
        <p className="text-xs opacity-70">
          {state.walletAddress.slice(0, 6)}...{state.walletAddress.slice(-4)}
        </p>
        <button className={btnClass} onClick={openNewTab}>
          Continue Verification
        </button>
      </div>
    );
  }

  // Default: not started
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <h2 className="text-sm font-bold">Verify Your Twitter Account</h2>
      <p className="text-xs opacity-70">Connect your wallet and verify your Twitter identity on-chain.</p>
      <button className={btnClass} onClick={openNewTab}>
        Start Verification
      </button>
    </div>
  );
};
