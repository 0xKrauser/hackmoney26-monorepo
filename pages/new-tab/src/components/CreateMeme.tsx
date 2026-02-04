import { addStoredMeme } from './OwnedMemecoins';
import { useToast } from '../providers/ToastProvider';
import { createFlaunch } from '@flaunch/sdk';
import { useWallets } from '@privy-io/react-auth';
import { useState, useCallback, useMemo } from 'react';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import type { ReadWriteFlaunchSDK, PublicClient, WalletClient } from '@flaunch/sdk';
import type { ChangeEvent } from 'react';
import type { Address } from 'viem';

const RPC_URL = 'https://sepolia.base.org';

interface CreateMemeProps {
  walletAddress: Address;
  onBack: () => void;
}

interface MemeFormData {
  name: string;
  symbol: string;
  description: string;
  imageData: string;
  websiteUrl: string;
  twitterUrl: string;
  discordUrl: string;
  telegramUrl: string;
  fairLaunchDuration: number;
  fairLaunchPercent: number;
  initialMarketCapUSD: number;
  creatorFeePercent: number;
}

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const CreateMeme = ({ walletAddress, onBack }: CreateMemeProps) => {
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const { showError, showSuccess } = useToast();

  const [formData, setFormData] = useState<MemeFormData>({
    name: '',
    symbol: '',
    description: '',
    imageData: '',
    websiteUrl: '',
    twitterUrl: '',
    discordUrl: '',
    telegramUrl: '',
    fairLaunchDuration: 30,
    fairLaunchPercent: 0,
    initialMarketCapUSD: 10_000,
    creatorFeePercent: 80,
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState<{ memecoin: string; tokenId: string } | null>(null);
  const [txHash, setTxHash] = useState<string>('');

  const handleInputChange = (field: keyof MemeFormData) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleNumberChange = (field: keyof MemeFormData) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, imageData: base64String }));
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const isFormValid = useMemo(
    () =>
      formData.name.trim().length > 0 &&
      formData.symbol.trim().length > 0 &&
      formData.symbol.trim().length <= 10 &&
      formData.imageData.length > 0,
    [formData],
  );

  const handleCreate = useCallback(async () => {
    if (!isFormValid || !embeddedWallet) return;
    setIsCreating(true);

    try {
      // Create wallet client from embedded wallet
      const walletClient = createWalletClient({
        account: embeddedWallet.address as Address,
        chain: baseSepolia,
        transport: http(RPC_URL),
      });

      // Create Flaunch SDK instance
      const flaunch = createFlaunch({
        publicClient: publicClient as unknown as PublicClient,
        walletClient: walletClient as unknown as WalletClient,
      }) as ReadWriteFlaunchSDK;

      // Launch the memecoin
      const hash = await flaunch.flaunchIPFS({
        name: formData.name.trim(),
        symbol: formData.symbol.trim().toUpperCase(),
        fairLaunchPercent: formData.fairLaunchPercent,
        fairLaunchDuration: formData.fairLaunchDuration * 60,
        initialMarketCapUSD: formData.initialMarketCapUSD,
        creator: walletAddress,
        creatorFeeAllocationPercent: formData.creatorFeePercent,
        metadata: {
          base64Image: formData.imageData,
          description: formData.description || '',
          ...(formData.websiteUrl && { websiteUrl: formData.websiteUrl }),
          ...(formData.twitterUrl && { twitterUrl: formData.twitterUrl }),
          ...(formData.discordUrl && { discordUrl: formData.discordUrl }),
          ...(formData.telegramUrl && { telegramUrl: formData.telegramUrl }),
        },
      });

      setTxHash(hash);

      // Wait for transaction and get pool data
      const flaunchRead = createFlaunch({ publicClient: publicClient as unknown as PublicClient });
      const poolCreatedData = await flaunchRead.getPoolCreatedFromTx(hash);

      if (poolCreatedData) {
        addStoredMeme(walletAddress, poolCreatedData.memecoin, Date.now());
        setSuccess({
          memecoin: poolCreatedData.memecoin,
          tokenId: poolCreatedData.tokenId.toString(),
        });
        showSuccess('Memecoin created successfully!');
      } else {
        showError('Transaction succeeded but could not parse memecoin address');
      }
    } catch (e: unknown) {
      const err = e as Error;
      showError(err.message || 'Failed to create memecoin');
    } finally {
      setIsCreating(false);
    }
  }, [formData, isFormValid, walletAddress, embeddedWallet, showError, showSuccess]);

  if (success) {
    return (
      <div className="create-meme-container">
        <div className="create-meme-success">
          <div className="create-meme-success-icon">
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
          <h2 className="create-meme-success-title">Memecoin Created!</h2>
          <p className="create-meme-success-text">
            Your memecoin <strong>{formData.symbol}</strong> has been launched.
          </p>
          <div className="create-meme-success-details">
            <div className="create-meme-detail-row">
              <span className="create-meme-detail-label">Contract</span>
              <a
                href={`https://sepolia.basescan.org/address/${success.memecoin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="create-meme-detail-link">
                {success.memecoin.slice(0, 10)}...{success.memecoin.slice(-8)}
              </a>
            </div>
            <div className="create-meme-detail-row">
              <span className="create-meme-detail-label">Token ID</span>
              <span className="create-meme-detail-value">{success.tokenId}</span>
            </div>
            {txHash && (
              <div className="create-meme-detail-row">
                <span className="create-meme-detail-label">Transaction</span>
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="create-meme-detail-link">
                  View on BaseScan
                </a>
              </div>
            )}
          </div>
          <button className="create-meme-btn create-meme-btn-primary" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="create-meme-container">
      <div className="create-meme-header">
        <button className="create-meme-back-btn" onClick={onBack}>
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
        <h2 className="create-meme-title">Create Memecoin</h2>
        <div className="create-meme-header-spacer" />
      </div>

      <div className="create-meme-form">
        {/* Image Upload */}
        <div className="create-meme-image-section">
          <label className="create-meme-image-upload">
            <input type="file" accept="image/*" onChange={handleImageChange} className="create-meme-image-input" />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="create-meme-image-preview" />
            ) : (
              <div className="create-meme-image-placeholder">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Upload Image</span>
              </div>
            )}
          </label>
        </div>

        {/* Basic Info */}
        <div className="create-meme-field">
          <label htmlFor="meme-name" className="create-meme-label">
            Name *
          </label>
          <input
            id="meme-name"
            type="text"
            placeholder="My Awesome Meme"
            value={formData.name}
            onChange={handleInputChange('name')}
            className="create-meme-input"
          />
        </div>

        <div className="create-meme-field">
          <label htmlFor="meme-symbol" className="create-meme-label">
            Symbol * (max 10 chars)
          </label>
          <input
            id="meme-symbol"
            type="text"
            placeholder="MEME"
            value={formData.symbol}
            onChange={handleInputChange('symbol')}
            className="create-meme-input"
            maxLength={10}
          />
        </div>

        <div className="create-meme-field">
          <label htmlFor="meme-description" className="create-meme-label">
            Description
          </label>
          <textarea
            id="meme-description"
            placeholder="Tell us about your memecoin..."
            value={formData.description}
            onChange={handleInputChange('description')}
            className="create-meme-textarea"
            rows={3}
          />
        </div>

        {/* Launch Settings */}
        <div className="create-meme-section-title">Launch Settings</div>

        <div className="create-meme-row">
          <div className="create-meme-field create-meme-field-half">
            <label htmlFor="meme-marketcap" className="create-meme-label">
              Initial Market Cap (USD)
            </label>
            <input
              id="meme-marketcap"
              type="number"
              value={formData.initialMarketCapUSD}
              onChange={handleNumberChange('initialMarketCapUSD')}
              className="create-meme-input"
              min={1000}
            />
            <span className="create-meme-hint">$10k+ avoids fees</span>
          </div>

          <div className="create-meme-field create-meme-field-half">
            <label htmlFor="meme-creator-fee" className="create-meme-label">
              Creator Fee %
            </label>
            <input
              id="meme-creator-fee"
              type="number"
              value={formData.creatorFeePercent}
              onChange={handleNumberChange('creatorFeePercent')}
              className="create-meme-input"
              min={0}
              max={100}
            />
          </div>
        </div>

        <div className="create-meme-row">
          <div className="create-meme-field create-meme-field-half">
            <label htmlFor="meme-launch-duration" className="create-meme-label">
              Fair Launch Duration (min)
            </label>
            <input
              id="meme-launch-duration"
              type="number"
              value={formData.fairLaunchDuration}
              onChange={handleNumberChange('fairLaunchDuration')}
              className="create-meme-input"
              min={0}
            />
          </div>

          <div className="create-meme-field create-meme-field-half">
            <label htmlFor="meme-launch-percent" className="create-meme-label">
              Fair Launch %
            </label>
            <input
              id="meme-launch-percent"
              type="number"
              value={formData.fairLaunchPercent}
              onChange={handleNumberChange('fairLaunchPercent')}
              className="create-meme-input"
              min={0}
              max={100}
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="create-meme-section-title">Social Links (Optional)</div>

        <div className="create-meme-row">
          <div className="create-meme-field create-meme-field-half">
            <label htmlFor="meme-website" className="create-meme-label">
              Website
            </label>
            <input
              id="meme-website"
              type="url"
              placeholder="https://..."
              value={formData.websiteUrl}
              onChange={handleInputChange('websiteUrl')}
              className="create-meme-input"
            />
          </div>

          <div className="create-meme-field create-meme-field-half">
            <label htmlFor="meme-twitter" className="create-meme-label">
              Twitter
            </label>
            <input
              id="meme-twitter"
              type="url"
              placeholder="https://x.com/..."
              value={formData.twitterUrl}
              onChange={handleInputChange('twitterUrl')}
              className="create-meme-input"
            />
          </div>
        </div>

        <div className="create-meme-row">
          <div className="create-meme-field create-meme-field-half">
            <label htmlFor="meme-discord" className="create-meme-label">
              Discord
            </label>
            <input
              id="meme-discord"
              type="url"
              placeholder="https://discord.gg/..."
              value={formData.discordUrl}
              onChange={handleInputChange('discordUrl')}
              className="create-meme-input"
            />
          </div>

          <div className="create-meme-field create-meme-field-half">
            <label htmlFor="meme-telegram" className="create-meme-label">
              Telegram
            </label>
            <input
              id="meme-telegram"
              type="url"
              placeholder="https://t.me/..."
              value={formData.telegramUrl}
              onChange={handleInputChange('telegramUrl')}
              className="create-meme-input"
            />
          </div>
        </div>

        <button
          className="create-meme-btn create-meme-btn-primary"
          onClick={handleCreate}
          disabled={!isFormValid || isCreating || !embeddedWallet}>
          {isCreating ? 'Creating...' : 'Create Memecoin'}
        </button>

        {isCreating && (
          <div className="create-meme-hint create-meme-hint-center">
            <svg
              className="create-meme-spinner"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <span>Confirm the transaction in your wallet...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateMeme;
