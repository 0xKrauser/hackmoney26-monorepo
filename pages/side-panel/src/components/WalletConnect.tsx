import { cn } from '@repo/ui';

interface WalletConnectProps {
  isConnected: boolean;
  isConnecting: boolean;
  address: `0x${string}` | null;
  isSmartWallet: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isLight: boolean;
}

/**
 * Wallet connection component
 *
 * Shows connect button when disconnected, or address and disconnect
 * option when connected. Displays smart wallet indicator if applicable.
 */
export const WalletConnect = ({
  isConnected,
  isConnecting,
  address,
  isSmartWallet,
  error,
  onConnect,
  onDisconnect,
  isLight,
}: WalletConnectProps) => {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className={cn(
            'w-full rounded-lg px-4 py-2 font-medium transition-colors',
            'bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
          )}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-2 rounded-lg p-4', isLight ? 'border border-gray-200 bg-white' : 'bg-gray-700')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('size-2 rounded-full', 'bg-green-500')} />
          <span className={cn('font-mono text-sm', isLight ? 'text-gray-900' : 'text-gray-100')}>
            {address && formatAddress(address)}
          </span>
        </div>
        {isSmartWallet && (
          <span
            className={cn(
              'rounded px-2 py-1 text-xs',
              isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900 text-blue-300',
            )}>
            Smart Wallet
          </span>
        )}
      </div>
      <button
        onClick={onDisconnect}
        className={cn(
          'text-left text-xs hover:underline',
          isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200',
        )}>
        Disconnect
      </button>
    </div>
  );
};
