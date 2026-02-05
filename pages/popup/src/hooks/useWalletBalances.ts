import { useChain } from './useChain';
import { BASE_TOKENS } from './useLiFiSwap';
import { useWallets } from '@privy-io/react-auth';
import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import type { Address } from 'viem';

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  balanceRaw: bigint;
  decimals: number;
  address: string;
  logoURI?: string;
  usdValue?: string;
}

interface WalletBalances {
  eth: TokenBalance | null;
  tokens: TokenBalance[];
  totalUsdValue: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const ERC20_TOKENS = BASE_TOKENS.filter(t => t.address !== '0x0000000000000000000000000000000000000000');

export const useWalletBalances = (): WalletBalances => {
  const { wallets } = useWallets();
  const { config: chainConfig, isMainnet } = useChain();
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const walletAddress = embeddedWallet?.address as Address | undefined;

  const [eth, setEth] = useState<TokenBalance | null>(null);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }

    const fetchBalances = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const chain = isMainnet ? base : baseSepolia;
        const publicClient = createPublicClient({
          chain,
          transport: http(chainConfig.rpcUrl),
        });

        // Fetch ETH balance
        const ethBalance = await publicClient.getBalance({ address: walletAddress });
        const ethToken = BASE_TOKENS.find(t => t.symbol === 'ETH');

        if (ethToken) {
          setEth({
            symbol: 'ETH',
            name: 'Ethereum',
            balance: formatUnits(ethBalance, 18),
            balanceRaw: ethBalance,
            decimals: 18,
            address: ethToken.address,
            logoURI: ethToken.logoURI,
          });
        }

        // Fetch ERC20 balances using multicall
        if (ERC20_TOKENS.length > 0) {
          const balanceCalls = ERC20_TOKENS.map(token => ({
            address: token.address as Address,
            abi: erc20Abi,
            functionName: 'balanceOf' as const,
            args: [walletAddress] as const,
          }));

          const results = await publicClient.multicall({
            contracts: balanceCalls,
          });

          const tokenBalances: TokenBalance[] = [];
          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const token = ERC20_TOKENS[i];
            if (result.status === 'success') {
              const balance = result.result as bigint;
              tokenBalances.push({
                symbol: token.symbol,
                name: token.name,
                balance: formatUnits(balance, token.decimals),
                balanceRaw: balance,
                decimals: token.decimals,
                address: token.address,
                logoURI: token.logoURI,
              });
            }
          }

          setTokens(tokenBalances);
        }
      } catch (err) {
        console.error('[useWalletBalances] Error fetching balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [walletAddress, chainConfig.rpcUrl, isMainnet, refetchTrigger]);

  // Calculate total USD value (placeholder - would need price feeds)
  const totalUsdValue = '0.00';

  return {
    eth,
    tokens,
    totalUsdValue,
    isLoading,
    error,
    refetch,
  };
};
