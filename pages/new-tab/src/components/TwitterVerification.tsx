import { useToast } from '../providers/ToastProvider';
import { useWallets } from '@privy-io/react-auth';
import { BASE_SEPOLIA_RPC_URL, TWITTER_VERIFIER_ABI, TWITTER_VERIFIER_ADDRESS } from '@repo/shared';
import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { baseSepolia } from 'viem/chains';
import type { Address, WalletClient } from 'viem';

interface TwitterVerificationProps {
  walletAddress: Address;
  onBack: () => void;
  onVerified: () => void;
}

type VerificationStep = 'username' | 'tweet' | 'verifying' | 'verified' | 'failed';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC_URL),
});

const TwitterVerification = ({ walletAddress, onBack, onVerified }: TwitterVerificationProps) => {
  const { wallets } = useWallets();
  const { showError } = useToast();

  // Get the Privy embedded wallet
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');

  const [step, setStep] = useState<VerificationStep>('username');
  const [username, setUsername] = useState('');
  const [nonce, setNonce] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const tweetMessage = nonce ? `Verifying my Twitter for ${walletAddress} #${nonce}` : '';

  // Poll for verification result
  useEffect(() => {
    if (step !== 'verifying') return;

    const interval = setInterval(async () => {
      try {
        const verified = await publicClient.readContract({
          address: TWITTER_VERIFIER_ADDRESS as Address,
          abi: TWITTER_VERIFIER_ABI,
          functionName: 'isVerified',
          args: [walletAddress],
        });
        if (verified) {
          clearInterval(interval);
          // Save verification status to storage
          const stored = await chrome.storage.local.get('twitter_verified');
          const data = stored.twitter_verified || {};
          data[walletAddress] = { username, verifiedAt: Date.now() };
          await chrome.storage.local.set({ twitter_verified: data });
          setStep('verified');
          onVerified();
        }
      } catch {
        // keep polling
      }
    }, 5000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setStep('failed');
    }, 180_000); // 3 minute timeout

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [step, walletAddress, username, onVerified]);

  const handleRegister = useCallback(async () => {
    const trimmed = username.trim().replace('@', '');
    if (!trimmed || !embeddedWallet) return;

    setIsLoading(true);
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const walletClient = (await import('viem')).createWalletClient({
        account: walletAddress,
        chain: baseSepolia,
        transport: (await import('viem')).custom(provider),
      }) as WalletClient;

      const hash = await walletClient.writeContract({
        address: TWITTER_VERIFIER_ADDRESS as Address,
        abi: TWITTER_VERIFIER_ABI,
        functionName: 'registerVerification',
        args: [trimmed],
        chain: baseSepolia,
        account: walletAddress,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let extractedNonce: string | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: TWITTER_VERIFIER_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'VerificationRegistered') {
            extractedNonce = (decoded.args as { nonce: string }).nonce;
            break;
          }
        } catch {
          // not our event
        }
      }

      if (!extractedNonce) {
        showError('Could not extract nonce from transaction');
        setIsLoading(false);
        return;
      }

      setNonce(extractedNonce);
      setStep('tweet');
    } catch (e: unknown) {
      const err = e as Error;
      showError(err.message || 'Registration failed');
    }
    setIsLoading(false);
  }, [username, embeddedWallet, walletAddress, showError]);

  const handleVerify = useCallback(async () => {
    if (!embeddedWallet) return;

    setIsLoading(true);
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const walletClient = (await import('viem')).createWalletClient({
        account: walletAddress,
        chain: baseSepolia,
        transport: (await import('viem')).custom(provider),
      }) as WalletClient;

      const hash = await walletClient.writeContract({
        address: TWITTER_VERIFIER_ADDRESS as Address,
        abi: TWITTER_VERIFIER_ABI,
        functionName: 'requestVerification',
        args: [],
        chain: baseSepolia,
        account: walletAddress,
      });

      setTxHash(hash);
      setStep('verifying');
    } catch (e: unknown) {
      const err = e as Error;
      showError(err.message || 'Verification request failed');
    }
    setIsLoading(false);
  }, [embeddedWallet, walletAddress, showError]);

  const handleTweet = useCallback(() => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetMessage)}`;
    window.open(url, '_blank');
  }, [tweetMessage]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(tweetMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tweetMessage]);

  // Render based on step
  const renderContent = () => {
    switch (step) {
      case 'username':
        return (
          <>
            <div className="verify-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <h2 className="verify-title">Verify Your Twitter</h2>
            <p className="verify-subtitle">
              Enter your Twitter username to start the verification process with Chainlink Functions.
            </p>
            <input
              type="text"
              placeholder="@username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleRegister()}
              className="verify-input"
              disabled={isLoading}
            />
            <button
              className="verify-btn verify-btn-primary"
              onClick={handleRegister}
              disabled={!username.trim() || isLoading}>
              {isLoading ? 'Registering...' : 'Continue'}
            </button>
          </>
        );

      case 'tweet':
        return (
          <>
            <div className="verify-icon verify-icon-info">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <h2 className="verify-title">Post This Tweet</h2>
            <p className="verify-subtitle">Post the following message from @{username} to verify ownership.</p>
            <div className="verify-tweet-box">{tweetMessage}</div>
            <div className="verify-btn-row">
              <button className="verify-btn" onClick={handleTweet}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Tweet It
              </button>
              <button className="verify-btn verify-btn-secondary" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button className="verify-btn verify-btn-primary" onClick={handleVerify} disabled={isLoading}>
              {isLoading ? 'Submitting...' : "I've Tweeted - Verify Now"}
            </button>
          </>
        );

      case 'verifying':
        return (
          <>
            <div className="verify-spinner">
              <div className="verify-spinner-ring" />
            </div>
            <h2 className="verify-title">Verifying...</h2>
            <p className="verify-subtitle">
              Chainlink Functions is checking your tweet. This may take up to 60 seconds.
            </p>
            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                className="verify-link"
                target="_blank"
                rel="noopener noreferrer">
                View Transaction
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
          </>
        );

      case 'verified':
        return (
          <>
            <div className="verify-icon verify-icon-success">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="verify-title verify-title-success">Verified!</h2>
            <p className="verify-subtitle">@{username} is now verified for your wallet address.</p>
            <button className="verify-btn verify-btn-primary" onClick={onBack}>
              Done
            </button>
          </>
        );

      case 'failed':
        return (
          <>
            <div className="verify-icon verify-icon-error">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className="verify-title verify-title-error">Verification Failed</h2>
            <p className="verify-subtitle">
              The tweet was not found or verification timed out. Make sure your tweet is public.
            </p>
            <button className="verify-btn verify-btn-primary" onClick={() => setStep('tweet')}>
              Try Again
            </button>
          </>
        );
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-header">
        <button className="verify-back-btn" onClick={onBack}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="verify-header-title">Twitter Verification</span>
        <div className="verify-header-spacer" />
      </div>
      <div className="verify-content">{renderContent()}</div>
    </div>
  );
};

export default TwitterVerification;
