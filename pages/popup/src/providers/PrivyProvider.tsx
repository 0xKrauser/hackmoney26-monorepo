import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { base, baseSepolia } from 'viem/chains';
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
      defaultChain: base,
      supportedChains: [base, baseSepolia],
    }}>
    {children}
  </BasePrivyProvider>
);
