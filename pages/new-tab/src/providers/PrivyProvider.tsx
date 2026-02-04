import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { baseSepolia } from 'viem/chains';
import type { ReactNode } from 'react';

interface PrivyProviderProps {
  children: ReactNode;
}

export const PrivyProvider = ({ children }: PrivyProviderProps) => (
  <BasePrivyProvider
    appId={process.env.CEB_PRIVY_APP_ID}
    config={{
      appearance: {
        theme: 'dark',
        accentColor: '#3b82f6',
        logo: 'https://i.imgur.com/placeholder.png',
      },
      loginMethods: ['email'],
      embeddedWallets: {
        createOnLogin: 'users-without-wallets',
      },
      defaultChain: baseSepolia,
      supportedChains: [baseSepolia],
    }}>
    {children}
  </BasePrivyProvider>
);
