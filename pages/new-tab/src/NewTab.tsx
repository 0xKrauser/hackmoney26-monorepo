import '@src/NewTab.css';
import {
  BASE_SEPOLIA_RPC_URL,
  TWITTER_VERIFIER_ABI,
  TWITTER_VERIFIER_ADDRESS,
  useStorage,
  withErrorBoundary,
  withSuspense,
} from '@repo/shared';
import { verificationStorage } from '@repo/storage';
import { ErrorDisplay, LoadingSpinner } from '@repo/ui';
import { useEffect, useState, useCallback } from 'react';
import { createWalletClient, createPublicClient, custom, http, decodeEventLog } from 'viem';
import { baseSepolia } from 'viem/chains';
import type { Address } from 'viem';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC_URL),
});

const ensureBaseSepolia = async () => {
  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x14A34' }],
    });
  } catch (switchError: unknown) {
    const err = switchError as { code?: number };
    if (err.code === 4902) {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x14A34',
            chainName: 'Base Sepolia',
            rpcUrls: ['https://sepolia.base.org'],
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          },
        ],
      });
    }
  }
};

const getWalletClient = () => {
  if (!window.ethereum) throw new Error('No wallet detected. Install MetaMask or another browser wallet.');
  return createWalletClient({ chain: baseSepolia, transport: custom(window.ethereum) });
};

const NewTab = () => {
  const state = useStorage(verificationStorage);

  const [addressInput, setAddressInput] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [verifying, setVerifyingLocal] = useState(false);

  // Poll for verification result when in verifying state
  useEffect(() => {
    if (state.verificationStatus !== 'verifying' || !state.walletAddress) return;

    const interval = setInterval(async () => {
      try {
        const verified = await publicClient.readContract({
          address: TWITTER_VERIFIER_ADDRESS as Address,
          abi: TWITTER_VERIFIER_ABI,
          functionName: 'isVerified',
          args: [state.walletAddress as Address],
        });
        if (verified) {
          clearInterval(interval);
          await verificationStorage.setVerified();
        }
      } catch {
        // keep polling
      }
    }, 5000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      verificationStorage.setFailed();
    }, 180_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [state.verificationStatus, state.walletAddress]);

  const tweetMessage =
    state.walletAddress && state.verificationNonce
      ? `Verifying my Twitter for ${state.walletAddress} #${state.verificationNonce}`
      : '';

  const handleSubmitAddress = useCallback(async () => {
    const addr = addressInput.trim();
    if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Enter a valid Ethereum address (0x...)');
      return;
    }
    setError('');
    await verificationStorage.setWallet(addr.toLowerCase());
  }, [addressInput]);

  // Step 1: Call registerVerification on-chain to get nonce
  const handleRegister = useCallback(async () => {
    const trimmed = username.trim().replace('@', '');
    if (!trimmed) return;
    setError('');
    setRegistering(true);
    try {
      await window.ethereum!.request({ method: 'eth_requestAccounts' });
      await ensureBaseSepolia();

      const walletClient = getWalletClient();
      const [account] = await walletClient.getAddresses();

      const hash = await walletClient.writeContract({
        address: TWITTER_VERIFIER_ADDRESS as Address,
        abi: TWITTER_VERIFIER_ABI,
        functionName: 'registerVerification',
        args: [trimmed],
        account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let nonce: string | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: TWITTER_VERIFIER_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'VerificationRegistered') {
            nonce = (decoded.args as { nonce: string }).nonce;
            break;
          }
        } catch {
          // not our event
        }
      }

      if (!nonce) {
        setError('Could not extract nonce from transaction. Try again.');
        setRegistering(false);
        return;
      }

      await verificationStorage.setRegistered(trimmed, nonce);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'Registration transaction failed');
    }
    setRegistering(false);
  }, [username]);

  const handleTweet = useCallback(() => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetMessage)}`;
    window.open(url, '_blank');
  }, [tweetMessage]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(tweetMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tweetMessage]);

  // Step 2: Call requestVerification on-chain
  const handleVerify = useCallback(async () => {
    setError('');
    setVerifyingLocal(true);
    try {
      await window.ethereum!.request({ method: 'eth_requestAccounts' });
      await ensureBaseSepolia();

      const walletClient = getWalletClient();
      const [account] = await walletClient.getAddresses();

      const hash = await walletClient.writeContract({
        address: TWITTER_VERIFIER_ADDRESS as Address,
        abi: TWITTER_VERIFIER_ABI,
        functionName: 'requestVerification',
        args: [],
        account,
      });

      await verificationStorage.setVerifying(hash);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || 'Verification transaction failed');
    }
    setVerifyingLocal(false);
  }, []);

  const handleReset = useCallback(async () => {
    await verificationStorage.reset();
    setAddressInput('');
    setUsername('');
    setError('');
  }, []);

  // --- Render ---

  const renderAddressStep = () => (
    <div className="signer-content">
      <div className="signer-connect-icon">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M22 10H2" />
          <path d="M6 14h4" />
        </svg>
      </div>
      <h2 className="signer-title">Enter Your Wallet Address</h2>
      <p className="signer-subtitle">Paste your Ethereum address to start the Twitter verification process.</p>
      <input
        type="text"
        placeholder="0x..."
        value={addressInput}
        onChange={e => setAddressInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmitAddress()}
        className="signer-input signer-input-mono"
      />
      <button className="signer-btn signer-btn-verify" onClick={handleSubmitAddress} disabled={!addressInput.trim()}>
        Next
      </button>
      {error && <p className="signer-error-msg">{error}</p>}
    </div>
  );

  const renderUsernameStep = () => (
    <div className="signer-content">
      <h2 className="signer-title">Register On-Chain</h2>
      <p className="signer-subtitle">
        Enter your Twitter username and sign a transaction to register your verification intent.
      </p>
      <p className="signer-subtitle" style={{ fontSize: '12px' }}>
        Wallet: {state.walletAddress?.slice(0, 6)}...{state.walletAddress?.slice(-4)}
      </p>
      <input
        type="text"
        placeholder="Twitter username (without @)"
        value={username}
        onChange={e => setUsername(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !registering && handleRegister()}
        className="signer-input"
        disabled={registering}
      />
      <button
        className="signer-btn signer-btn-verify"
        onClick={handleRegister}
        disabled={!username.trim() || registering}>
        {registering ? 'Registering...' : 'Register & Get Nonce'}
      </button>
      {registering && (
        <div className="signer-hint">
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
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>Confirm the transaction in your wallet.</span>
        </div>
      )}
      <button className="signer-btn signer-btn-secondary" onClick={handleReset}>
        Start Over
      </button>
      {error && <p className="signer-error-msg">{error}</p>}
    </div>
  );

  const renderTweetModal = () => (
    <div className="signer-content">
      <h2 className="signer-title">Post This Tweet</h2>
      <p className="signer-subtitle">
        @{state.twitterUsername} &middot; {state.walletAddress?.slice(0, 6)}...{state.walletAddress?.slice(-4)}
      </p>
      <div className="signer-tweet-box">{tweetMessage}</div>
      <div className="signer-btn-row">
        <button className="signer-btn" onClick={handleTweet}>
          Tweet It
        </button>
        <button className="signer-btn signer-btn-secondary" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <button className="signer-btn signer-btn-verify" onClick={handleVerify} disabled={verifying}>
        {verifying ? 'Submitting...' : "I've Tweeted \u2014 Verify Now"}
      </button>
      <button className="signer-btn signer-btn-secondary" onClick={handleReset}>
        Start Over
      </button>
      {error && <p className="signer-error-msg">{error}</p>}
    </div>
  );

  const renderVerifying = () => (
    <div className="signer-content">
      <div className="signer-spinner">
        <div className="signer-spinner-ring" />
      </div>
      <h2 className="signer-title">Verifying...</h2>
      <p className="signer-subtitle">Chainlink Functions is checking your tweet. This may take up to 60 seconds.</p>
      {state.txHash && (
        <a
          href={`https://sepolia.basescan.org/tx/${state.txHash}`}
          className="signer-link"
          target="_blank"
          rel="noopener noreferrer">
          <svg
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
          View on BaseScan
        </a>
      )}
    </div>
  );

  const renderVerified = () => (
    <div className="signer-content">
      <div className="signer-success-icon">
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
      <h2 className="signer-title signer-title-success">Verified!</h2>
      <p className="signer-subtitle">
        @{state.twitterUsername} is verified for {state.walletAddress?.slice(0, 6)}...{state.walletAddress?.slice(-4)}
      </p>
      <button className="signer-btn signer-btn-secondary" onClick={handleReset}>
        Done
      </button>
    </div>
  );

  const renderFailed = () => (
    <div className="signer-content">
      <div className="signer-error-icon">
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
      <h2 className="signer-title signer-title-error">Verification Failed</h2>
      <p className="signer-subtitle">
        The tweet was not found or the verification timed out. Make sure your tweet is public and contains the exact
        message.
      </p>
      {error && <p className="signer-error-msg">{error}</p>}
      <button className="signer-btn" onClick={handleReset}>
        Try Again
      </button>
    </div>
  );

  const renderStep = () => {
    if (!state.walletAddress) {
      return renderAddressStep();
    }

    switch (state.verificationStatus) {
      case 'idle':
        return renderUsernameStep();
      case 'tweet_pending':
        return renderTweetModal();
      case 'verifying':
        return renderVerifying();
      case 'verified':
        return renderVerified();
      case 'failed':
        return renderFailed();
      default:
        return renderAddressStep();
    }
  };

  return (
    <div className="signer-page">
      <div className="signer-backdrop" />
      <div className="signer-card">
        <div className="signer-card-inner">
          <div className="signer-header">
            <div className="signer-logo">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="signer-header-text">Twitter Verification</span>
          </div>
          {renderStep()}
        </div>
      </div>
      <div className="signer-footer">
        <span>Base Sepolia</span>
        <span className="signer-footer-dot" />
        <span>Chainlink Functions</span>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(NewTab, <LoadingSpinner />), ErrorDisplay);
