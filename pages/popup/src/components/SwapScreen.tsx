import ChainSelector from './ChainSelector';
import { ArrowLeftIcon, ChevronDownIcon, SwitchIcon, CheckIcon, CloseIcon } from './icons';
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

  if (status === 'success') {
    return (
      <div className="to-cream flex h-[600px] flex-col bg-gradient-to-b from-white from-75% p-4">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckIcon className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Swap Complete!</h2>
          <p className="mb-6 text-sm text-gray-500">Your transaction has been confirmed.</p>
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mb-6 text-sm hover:underline">
              View on BaseScan
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              reset();
              onBack();
            }}
            className="bg-primary hover:bg-primary/90 w-full rounded-xl py-3 font-medium text-white transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="to-cream flex h-[600px] flex-col bg-gradient-to-b from-white from-75%">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            aria-label="Go back">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-gray-900">Swap</h1>
        </div>
        <ChainSelector />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {/* From Token */}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <span className="mb-2 block text-xs text-gray-500">You pay</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTokenSelector('from')}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 transition-colors hover:bg-gray-50">
              {fromToken.logoURI && <img src={fromToken.logoURI} alt="" className="h-5 w-5 rounded-full" />}
              <span className="text-sm font-medium text-gray-900">{fromToken.symbol}</span>
              <ChevronDownIcon className="h-3 w-3 text-gray-400" />
            </button>
            <input
              type="number"
              inputMode="decimal"
              value={fromAmount}
              onChange={e => setFromAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-right text-xl font-semibold text-gray-900 outline-none placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Switch Button */}
        <div className="relative z-10 -my-1.5 flex justify-center">
          <button
            type="button"
            onClick={switchTokens}
            aria-label="Switch tokens"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-600">
            <SwitchIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* To Token */}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <span className="mb-2 block text-xs text-gray-500">You receive</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTokenSelector('to')}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 transition-colors hover:bg-gray-50">
              {toToken.logoURI && <img src={toToken.logoURI} alt="" className="h-5 w-5 rounded-full" />}
              <span className="text-sm font-medium text-gray-900">{toToken.symbol}</span>
              <ChevronDownIcon className="h-3 w-3 text-gray-400" />
            </button>
            <div className="flex-1 text-right text-xl font-semibold text-gray-400">
              {status === 'quoting' ? <span className="animate-pulse">...</span> : toAmount || '0'}
            </div>
          </div>
        </div>

        {/* Quote Details */}
        {toAmount && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-gray-200 bg-white p-2.5 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Rate</span>
              <span className="text-gray-700">
                1 {fromToken.symbol} = {rate} {toToken.symbol}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Network fee</span>
              <span className="text-gray-700">~${gasCostUSD}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
      </main>

      {/* Swap Button */}
      <footer className="p-4">
        <button
          type="button"
          onClick={executeSwap}
          disabled={!canSwap || isLoading}
          className="bg-primary hover:bg-primary/90 w-full rounded-xl py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500">
          {status === 'quoting' && 'Getting quote...'}
          {status === 'signing' && 'Confirm in wallet...'}
          {status === 'executing' && 'Swapping...'}
          {status === 'idle' && 'Swap'}
          {status === 'error' && 'Try again'}
        </button>
      </footer>

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

interface TokenSelectorModalProps {
  tokens: Token[];
  selectedToken: Token;
  onSelect: (token: Token) => void;
  onClose: () => void;
}

const TokenSelectorModal = ({ tokens, selectedToken, onSelect, onClose }: TokenSelectorModalProps) => (
  <div role="dialog" aria-modal="true" aria-label="Select token" className="fixed inset-0 z-50 flex items-end">
    <div
      className="absolute inset-0 bg-black/40"
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role="button"
      tabIndex={0}
      aria-label="Close"
    />
    <div className="relative w-full rounded-t-2xl bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Select token</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>
      <ul className="space-y-1">
        {tokens.map(token => (
          <li key={token.address}>
            <button
              type="button"
              onClick={() => onSelect(token)}
              className={`flex w-full items-center gap-3 rounded-xl p-3 transition-colors ${
                selectedToken.address === token.address ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'
              }`}>
              {token.logoURI && <img src={token.logoURI} alt="" className="h-10 w-10 rounded-full" />}
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">{token.symbol}</div>
                <div className="text-sm text-gray-500">{token.name}</div>
              </div>
              {selectedToken.address === token.address && <CheckIcon className="text-primary h-5 w-5" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default SwapScreen;
