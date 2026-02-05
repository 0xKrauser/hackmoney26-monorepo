import ChainSelector from './ChainSelector';
import { XIcon, ArrowRightIcon } from './icons';
import { useWalletBalances } from '../hooks/useWalletBalances';
import { useToast } from '../providers/ToastProvider';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import type { Address } from 'viem';
import logoImg from '/logo.png';

interface MainWalletProps {
  onNavigate: (view: 'swap' | 'twitter-verify') => void;
  isTwitterVerified: boolean;
}

const MainWallet = ({ onNavigate, isTwitterVerified }: MainWalletProps) => {
  const { user, logout } = usePrivy();
  const { wallets } = useWallets();
  const { eth, tokens, isLoading } = useWalletBalances();
  const { showError } = useToast();

  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const walletAddress = embeddedWallet?.address as Address | undefined;

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

  const displayName =
    user?.email?.address || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Wallet');

  return (
    <div className="to-cream relative flex h-[600px] flex-col bg-gradient-to-b from-white from-75%">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Frens" className="h-8 w-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{displayName}</span>
            {isTwitterVerified && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <XIcon className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>
        </div>
        <ChainSelector />
      </header>

      {/* Balance */}
      <section className="px-4 pb-2 pt-4">
        <p className="mb-1 text-sm text-gray-500">Total Balance</p>
        {isLoading ? (
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
        ) : (
          <h1 className="text-3xl font-bold text-gray-900">$0.00</h1>
        )}
      </section>

      {/* Chart */}
      <BalanceChart />

      {/* Actions */}
      <section className="grid grid-cols-3 gap-3 px-4 pb-4">
        <ActionButton label="Swap" onClick={() => onNavigate('swap')} />
        <ActionButton label="Deposit" onClick={() => handleComingSoon('Deposit')} />
        <ActionButton label="Transfer" onClick={() => handleComingSoon('Transfer')} />
      </section>

      {/* Assets */}
      <section className="flex min-h-0 flex-1 flex-col px-4">
        <div className="mb-1 flex items-center justify-between px-2 text-xs font-semibold text-gray-500">
          <span>Assets</span>
          <div className="flex gap-6">
            <span>Value</span>
            <span className="w-14 text-right">USD</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto pb-2">
          {eth && (
            <AssetRow
              symbol={eth.symbol}
              name={eth.name}
              balance={formatBalance(eth.balance)}
              usdValue="$0.00"
              logoURI={eth.logoURI}
            />
          )}

          {tokens.map(token => (
            <AssetRow
              key={token.address}
              symbol={token.symbol}
              name={token.name}
              balance={formatBalance(token.balance)}
              usdValue="$0.00"
              logoURI={token.logoURI}
            />
          ))}

          {isLoading && !eth && (
            <>
              <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
              <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-3">
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-500 underline transition-colors hover:text-gray-700">
          See you later
        </button>
      </footer>

      {/* Verify Toast */}
      {!isTwitterVerified && (
        <button
          type="button"
          onClick={() => onNavigate('twitter-verify')}
          className="absolute bottom-8 left-4 right-4 flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3 shadow-lg transition-transform hover:scale-[1.02]"
          aria-label="Verify your Twitter account">
          <div className="flex items-center gap-3">
            <XIcon className="h-5 w-5 text-white" />
            <div className="text-left">
              <p className="text-sm font-medium text-white">Verify to react</p>
              <p className="text-xs text-gray-400">Connect X to drop memecoins</p>
            </div>
          </div>
          <ArrowRightIcon className="h-5 w-5 text-gray-400" />
        </button>
      )}
    </div>
  );
};

// Helpers
const formatBalance = (balance: string): string => {
  const num = parseFloat(balance);
  if (num === 0) return '0.0000';
  if (num < 0.0001) return '<0.0001';
  return num.toFixed(4);
};

// Components
interface ActionButtonProps {
  label: string;
  onClick: () => void;
}

const ActionButton = ({ label, onClick }: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className="hover:border-primary hover:text-primary w-full rounded-lg border border-gray-200 bg-white py-1.5 text-xs font-medium text-gray-700 transition-colors">
    {label}
  </button>
);

interface AssetRowProps {
  symbol: string;
  name: string;
  balance: string;
  usdValue: string;
  logoURI?: string;
}

const AssetRow = ({ symbol, name, balance, usdValue, logoURI }: AssetRowProps) => (
  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1.5">
    <div className="flex items-center gap-2">
      {logoURI ? (
        <img src={logoURI} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          {symbol.slice(0, 2)}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-gray-900">{symbol}</p>
        <p className="text-[10px] text-gray-500">{name}</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <p className="text-sm font-medium text-gray-900">
        {balance} {symbol}
      </p>
      <p className="w-14 text-right text-xs text-gray-500">{usdValue}</p>
    </div>
  </div>
);

// Chart
const CHART_DATA = [
  { value: 100 },
  { value: 120 },
  { value: 115 },
  { value: 135 },
  { value: 125 },
  { value: 145 },
  { value: 140 },
  { value: 160 },
  { value: 155 },
  { value: 175 },
  { value: 165 },
  { value: 180 },
];

const TIME_PERIODS = ['1D', '1W', '1M', '1Y', 'ALL'] as const;
type TimePeriod = (typeof TIME_PERIODS)[number];

const BalanceChart = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1W');

  return (
    <section className="px-4 pb-3">
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={CHART_DATA}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
              <filter id="chartShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F97316" floodOpacity="0.3" />
              </filter>
            </defs>
            <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#F97316"
              strokeWidth={2.5}
              fill="url(#chartGradient)"
              filter="url(#chartShadow)"
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex justify-center gap-1">
        {TIME_PERIODS.map(period => (
          <button
            key={period}
            type="button"
            onClick={() => setSelectedPeriod(period)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              selectedPeriod === period
                ? 'bg-primary shadow-primary/30 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-600'
            }`}>
            {period}
          </button>
        ))}
      </div>
    </section>
  );
};

export default MainWallet;
