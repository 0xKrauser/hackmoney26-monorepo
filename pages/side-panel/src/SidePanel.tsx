import '@src/SidePanel.css';
import { t } from '@repo/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@repo/shared';
import { exampleThemeStorage } from '@repo/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@repo/ui';
import { ChannelDashboard } from '@src/components/ChannelDashboard';
import { WalletConnect } from '@src/components/WalletConnect';
import { useChannel } from '@src/hooks/useChannel';
import { useWallet } from '@src/hooks/useWallet';

const SidePanel = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const logo = isLight ? 'side-panel/logo_vertical.svg' : 'side-panel/logo_vertical_dark.svg';

  // Wallet hook
  const { address, isConnected, isConnecting, isSmartWallet, error: walletError, connect, disconnect } = useWallet();

  // Channel hook
  const {
    channel,
    sessions,
    stats,
    reactionCost,
    isLoading: channelLoading,
    error: channelError,
    createChannel,
    deposit,
    withdraw,
    closeChannel,
  } = useChannel(address);

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  return (
    <div className={cn('min-h-screen', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      {/* Header */}
      <header
        className={cn(
          'flex items-center justify-between border-b p-4',
          isLight ? 'border-gray-200' : 'border-gray-700',
        )}>
        <button onClick={goGithubSite} className="flex items-center">
          <img src={chrome.runtime.getURL(logo)} className="h-8" alt="Frens logo" />
        </button>
        <ToggleButton onClick={exampleThemeStorage.toggle} className="text-xs">
          {t('toggleTheme')}
        </ToggleButton>
      </header>

      {/* Main Content */}
      <main className="space-y-4 p-4">
        {/* Wallet Section */}
        <section>
          <h2 className={cn('mb-2 text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>Wallet</h2>
          <WalletConnect
            isConnected={isConnected}
            isConnecting={isConnecting}
            address={address}
            isSmartWallet={isSmartWallet}
            error={walletError}
            onConnect={connect}
            onDisconnect={disconnect}
            isLight={isLight}
          />
        </section>

        {/* Channel Section - only shown when connected */}
        {isConnected && (
          <section>
            <h2 className={cn('mb-2 text-sm font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>Channel</h2>
            <ChannelDashboard
              channel={channel}
              sessions={sessions}
              stats={stats}
              reactionCost={reactionCost}
              isLoading={channelLoading}
              error={channelError}
              onCreateChannel={createChannel}
              onDeposit={deposit}
              onWithdraw={withdraw}
              onCloseChannel={closeChannel}
              isLight={isLight}
            />
          </section>
        )}

        {/* Info Section */}
        <section
          className={cn(
            'rounded-lg p-4 text-xs',
            isLight ? 'bg-blue-50 text-blue-800' : 'bg-blue-900/30 text-blue-300',
          )}>
          <h3 className="mb-1 font-medium">How it works</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Connect your wallet (EOA or Smart Wallet)</li>
            <li>Create a payment channel with USDC</li>
            <li>Click emojis on posts to send instant payments</li>
            <li>Withdraw anytime without closing the channel</li>
          </ul>
        </section>

        {/* Network Info */}
        <footer className={cn('text-center text-xs', isLight ? 'text-gray-400' : 'text-gray-500')}>
          <p>Base Sepolia Testnet</p>
          <p className="mt-1">Powered by Yellow Network</p>
        </footer>
      </main>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
