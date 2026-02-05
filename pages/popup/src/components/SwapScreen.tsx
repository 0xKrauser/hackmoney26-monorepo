import { useLiFiSwap, BASE_TOKENS } from '../hooks/useLiFiSwap';
import { useState } from 'react';
import type { Token } from '../hooks/useLiFiSwap';

interface SwapScreenProps {
  onBack: () => void;
}

const SwapScreen = ({ onBack }: SwapScreenProps) => {
  const {
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    status,
    error,
    txHash,
    rate,
    gasCostUSD,
    setFromToken,
    setToToken,
    setFromAmount,
    switchTokens,
    executeSwap,
    reset,
  } = useLiFiSwap();

  const [showTokenSelector, setShowTokenSelector] = useState<'from' | 'to' | null>(null);

  const handleTokenSelect = (token: Token) => {
    if (showTokenSelector === 'from') {
      setFromToken(token);
    } else {
      setToToken(token);
    }
    setShowTokenSelector(null);
  };

  const isLoading = status === 'quoting' || status === 'signing' || status === 'executing';
  const canSwap = !!fromAmount && parseFloat(fromAmount) > 0 && !!toAmount && status === 'idle';

  // Success screen
  if (status === 'success') {
    return (
      <div className="flex h-[600px] flex-col bg-[#0c0e14] p-4">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <CheckIcon className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">Swap Complete!</h2>
          <p className="mb-6 text-sm text-gray-400">Your transaction has been confirmed.</p>
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 text-sm text-blue-400 hover:underline">
              View on BaseScan
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              reset();
              onBack();
            }}
            className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] flex-col bg-[#0c0e14]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Go back">
          <ArrowLeftIcon />
        </button>
        <h2 className="flex-1 text-lg font-semibold text-white">Swap</h2>
        <span className="rounded-lg border border-blue-500/30 bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-400">
          Base
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* From Token */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-sm text-gray-400">You pay</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTokenSelector('from')}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 transition-colors hover:bg-white/15">
              {fromToken.logoURI && (
                <img src={fromToken.logoURI} alt={fromToken.symbol} className="h-6 w-6 rounded-full" />
              )}
              <span className="font-medium text-white">{fromToken.symbol}</span>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </button>
            <input
              type="number"
              value={fromAmount}
              onChange={e => setFromAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-right text-2xl font-medium text-white outline-none placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* Switch Button */}
        <div className="relative z-10 -my-2 flex justify-center">
          <button
            type="button"
            onClick={switchTokens}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0c0e14] text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            <SwitchIcon />
          </button>
        </div>

        {/* To Token */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 text-sm text-gray-400">You receive</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTokenSelector('to')}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 transition-colors hover:bg-white/15">
              {toToken.logoURI && <img src={toToken.logoURI} alt={toToken.symbol} className="h-6 w-6 rounded-full" />}
              <span className="font-medium text-white">{toToken.symbol}</span>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </button>
            <div className="flex-1 text-right text-2xl font-medium text-gray-400">
              {status === 'quoting' ? <span className="animate-pulse">...</span> : toAmount || '0'}
            </div>
          </div>
        </div>

        {/* Quote Details */}
        {toAmount && (
          <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Rate</span>
              <span className="text-gray-300">
                1 {fromToken.symbol} = {rate} {toToken.symbol}
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Network fee</span>
              <span className="text-gray-300">~${gasCostUSD}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}
      </div>

      {/* Swap Button */}
      <div className="border-t border-white/5 p-4">
        <button
          type="button"
          onClick={executeSwap}
          disabled={!canSwap || isLoading}
          className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500">
          {status === 'quoting' && 'Getting quote...'}
          {status === 'signing' && 'Confirm in wallet...'}
          {status === 'executing' && 'Swapping...'}
          {status === 'idle' && 'Swap'}
          {status === 'error' && 'Try again'}
        </button>
      </div>

      {/* Token Selector Modal */}
      {showTokenSelector && (
        <TokenSelectorModal
          tokens={BASE_TOKENS}
          selectedToken={showTokenSelector === 'from' ? fromToken : toToken}
          onSelect={handleTokenSelect}
          onClose={() => setShowTokenSelector(null)}
        />
      )}
    </div>
  );
};

// Token Selector Modal
interface TokenSelectorModalProps {
  tokens: Token[];
  selectedToken: Token;
  onSelect: (token: Token) => void;
  onClose: () => void;
}

const TokenSelectorModal = ({ tokens, selectedToken, onSelect, onClose }: TokenSelectorModalProps) => (
  <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end">
    {/* Backdrop */}
    <button
      type="button"
      className="absolute inset-0 bg-black/60"
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      aria-label="Close modal"
    />
    {/* Content */}
    <div className="relative w-full rounded-t-2xl bg-[#12141a] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Select token</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white">
          <CloseIcon />
        </button>
      </div>
      <div className="space-y-1">
        {tokens.map(token => (
          <button
            key={token.address}
            type="button"
            onClick={() => onSelect(token)}
            className={`flex w-full items-center gap-3 rounded-xl p-3 transition-colors ${
              selectedToken.address === token.address ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5'
            }`}>
            {token.logoURI && <img src={token.logoURI} alt={token.symbol} className="h-10 w-10 rounded-full" />}
            <div className="flex-1 text-left">
              <div className="font-medium text-white">{token.symbol}</div>
              <div className="text-sm text-gray-400">{token.name}</div>
            </div>
            {selectedToken.address === token.address && <CheckIcon className="h-5 w-5 text-blue-400" />}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// Icons
const ArrowLeftIcon = () => (
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
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const SwitchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M7 16V4M7 4L3 8M7 4L11 8" />
    <path d="M17 8V20M17 20L21 16M17 20L13 16" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default SwapScreen;
