import { cn } from '@repo/ui';
import { useState } from 'react';
import type { SerializedChannelState, SerializedSession } from '@repo/storage';

interface ChannelStats {
  totalDeposited: bigint;
  availableBalance: bigint;
  totalSpent: bigint;
  activeSessionCount: number;
  totalReactions: number;
}

interface ChannelDashboardProps {
  channel: SerializedChannelState | null;
  sessions: SerializedSession[];
  stats: ChannelStats;
  reactionCost: bigint;
  isLoading: boolean;
  error: string | null;
  onCreateChannel: (amount: bigint) => Promise<void>;
  onDeposit: (amount: bigint) => Promise<void>;
  onWithdraw: (amount: bigint) => Promise<void>;
  onCloseChannel: () => Promise<void>;
  isLight: boolean;
}

/**
 * Format USDC amount (6 decimals)
 */
const formatUSDC = (amount: bigint): string => {
  const value = Number(amount) / 1e6;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

/**
 * Channel dashboard component
 *
 * Shows channel balance, stats, and actions (deposit/withdraw).
 * When no channel exists, shows onboarding flow.
 */
export const ChannelDashboard = ({
  channel,
  sessions,
  stats,
  reactionCost,
  isLoading,
  error,
  onCreateChannel,
  onDeposit,
  onWithdraw,
  onCloseChannel,
  isLight,
}: ChannelDashboardProps) => {
  const [depositAmount, setDepositAmount] = useState('10');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // No channel - show onboarding
  if (!channel) {
    return (
      <div className={cn('flex flex-col gap-4 rounded-lg p-4', isLight ? 'bg-white' : 'bg-gray-700')}>
        <h3 className={cn('text-lg font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>Get Started</h3>
        <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-300')}>
          Create a channel to start sending paid reactions. Your funds stay in a state channel for instant, gas-free
          payments.
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="initial-deposit" className={cn('text-sm', isLight ? 'text-gray-700' : 'text-gray-300')}>
            Initial deposit (USDC)
          </label>
          <input
            id="initial-deposit"
            type="number"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            min="1"
            step="1"
            className={cn(
              'rounded-lg border px-3 py-2 text-sm',
              isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-800 text-gray-100',
            )}
            placeholder="10"
          />
        </div>

        <button
          onClick={() => {
            const amount = BigInt(Math.floor(parseFloat(depositAmount) * 1e6));
            onCreateChannel(amount);
          }}
          disabled={isLoading || !depositAmount}
          className={cn(
            'w-full rounded-lg px-4 py-2 font-medium transition-colors',
            'bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
          )}>
          {isLoading ? 'Creating...' : 'Create Channel'}
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // Has channel - show dashboard
  const reactionsRemaining = stats.availableBalance / reactionCost;

  return (
    <div className="flex flex-col gap-4">
      {/* Balance Card */}
      <div className={cn('rounded-lg p-4', isLight ? 'border border-gray-200 bg-white' : 'bg-gray-700')}>
        <div className="flex items-baseline justify-between">
          <span className={cn('text-sm', isLight ? 'text-gray-500' : 'text-gray-400')}>Available Balance</span>
          <span className={cn('text-2xl font-bold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            ${formatUSDC(stats.availableBalance)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className={cn('h-1.5 flex-1 rounded-full', isLight ? 'bg-gray-200' : 'bg-gray-600')}>
            <div
              className="h-full rounded-full bg-green-500"
              style={{
                width: `${stats.totalDeposited > 0n ? (Number(stats.availableBalance) / Number(stats.totalDeposited)) * 100 : 0}%`,
              }}
            />
          </div>
          <span className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>
            {reactionsRemaining.toString()} reactions left
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className={cn('rounded-lg p-3', isLight ? 'bg-gray-50' : 'bg-gray-800')}>
          <span className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>Total Deposited</span>
          <p className={cn('text-sm font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            ${formatUSDC(stats.totalDeposited)}
          </p>
        </div>
        <div className={cn('rounded-lg p-3', isLight ? 'bg-gray-50' : 'bg-gray-800')}>
          <span className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>Total Spent</span>
          <p className={cn('text-sm font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            ${formatUSDC(stats.totalSpent)}
          </p>
        </div>
        <div className={cn('rounded-lg p-3', isLight ? 'bg-gray-50' : 'bg-gray-800')}>
          <span className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>Active Sessions</span>
          <p className={cn('text-sm font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            {stats.activeSessionCount}
          </p>
        </div>
        <div className={cn('rounded-lg p-3', isLight ? 'bg-gray-50' : 'bg-gray-800')}>
          <span className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>Total Reactions</span>
          <p className={cn('text-sm font-semibold', isLight ? 'text-gray-900' : 'text-gray-100')}>
            {stats.totalReactions}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const amount = BigInt(10 * 1e6); // Quick deposit $10
            onDeposit(amount);
          }}
          disabled={isLoading}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 font-medium transition-colors',
            'bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50',
          )}>
          + Add $10
        </button>
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          disabled={isLoading}
          className={cn(
            'flex-1 rounded-lg px-4 py-2 font-medium transition-colors',
            isLight ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-gray-600 text-gray-100 hover:bg-gray-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}>
          Withdraw
        </button>
      </div>

      {/* Withdraw Panel */}
      {showWithdraw && (
        <div className={cn('rounded-lg p-3', isLight ? 'bg-gray-50' : 'bg-gray-800')}>
          <div className="flex gap-2">
            <input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              max={Number(stats.availableBalance) / 1e6}
              step="0.01"
              className={cn(
                'flex-1 rounded border px-2 py-1 text-sm',
                isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700',
              )}
              placeholder="Amount (USDC)"
            />
            <button
              onClick={() => {
                const amount = BigInt(Math.floor(parseFloat(withdrawAmount) * 1e6));
                onWithdraw(amount);
                setWithdrawAmount('');
                setShowWithdraw(false);
              }}
              disabled={!withdrawAmount || isLoading}
              className={cn(
                'rounded px-4 py-1 font-medium transition-colors',
                'bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
              )}>
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div className={cn('rounded-lg p-3', isLight ? 'bg-gray-50' : 'bg-gray-800')}>
          <h4 className={cn('mb-2 text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
            Recent Sessions
          </h4>
          <div className="max-h-32 space-y-2 overflow-y-auto">
            {sessions.slice(-5).map(session => (
              <div
                key={session.sessionId}
                className={cn(
                  'flex items-center justify-between text-xs',
                  isLight ? 'text-gray-600' : 'text-gray-400',
                )}>
                <span className="max-w-[120px] truncate font-mono">Post #{session.postId.slice(-8)}</span>
                <span>{session.reactionCount} reactions</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Close Channel */}
      <button
        onClick={onCloseChannel}
        disabled={isLoading}
        className={cn(
          'text-center text-xs hover:underline',
          isLight ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300',
        )}>
        Close channel and withdraw all funds
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
