import { useChain } from './useChain';
import {
  createConfig,
  getQuote,
  executeRoute,
  convertQuoteToRoute,
  EVM,
  getTokenAllowance,
  setTokenAllowance,
} from '@lifi/sdk';
import { useWallets } from '@privy-io/react-auth';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import type { Quote, Route } from '@lifi/sdk';

// Constants
const BASE_CHAIN_ID = 8453;
const QUOTE_DEBOUNCE_MS = 500;
const DEFAULT_SLIPPAGE = 0.05;
const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

// Types
interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

type SwapStatus = 'idle' | 'quoting' | 'signing' | 'executing' | 'success' | 'error';

interface ProviderRequest {
  method: string;
  params?: unknown[];
}

// Token list for Base mainnet
const BASE_TOKENS: Token[] = [
  {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  },
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
  },
];

// Helpers
const toHex = (chainId: number): string => `0x${chainId.toString(16)}`;

const parseAmount = (amount: string, decimals: number): string => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) return '0';
  return BigInt(Math.floor(parsed * 10 ** decimals)).toString();
};

const formatAmount = (amount: string | bigint, decimals: number): string =>
  (Number(amount) / 10 ** decimals).toFixed(6);

const calculateRate = (toAmount: string, toDecimals: number, fromAmount: string, fromDecimals: number): string => {
  const to = Number(toAmount) / 10 ** toDecimals;
  const from = Number(fromAmount) / 10 ** fromDecimals;
  return from > 0 ? (to / from).toFixed(6) : '';
};

const extractErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    const errorWithCause = err as Error & { cause?: Error };
    return errorWithCause.cause?.message || err.message;
  }
  return 'Unknown error';
};

/**
 * Hook for swapping tokens using Li.Fi SDK with Privy embedded wallet
 * Note: Li.Fi only supports mainnet, swaps will not work on testnet
 */
const useLiFiSwap = () => {
  const { wallets } = useWallets();
  const { isMainnet } = useChain();

  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const walletAddress = embeddedWallet?.address;

  // State
  const [fromToken, setFromToken] = useState<Token>(BASE_TOKENS[1]); // USDC default
  const [toToken, setToToken] = useState<Token>(BASE_TOKENS[0]); // ETH default
  const [fromAmount, setFromAmount] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Li.Fi SDK
  useEffect(() => {
    if (!embeddedWallet || isInitialized) return;

    const initLiFi = async () => {
      try {
        const rawProvider = await embeddedWallet.getEthereumProvider();

        // Wrap provider to handle unsupported EIP-5792 methods
        const provider = {
          ...rawProvider,
          request: async (args: ProviderRequest) => {
            if (args.method === 'wallet_getCapabilities') {
              return {}; // Privy doesn't support batching
            }
            return rawProvider.request(args);
          },
        };

        const walletClient = createWalletClient({
          account: embeddedWallet.address as `0x${string}`,
          chain: base,
          transport: custom(provider),
        });

        createConfig({
          integrator: 'frens-extension',
          apiKey: process.env.CEB_LIFI_API_KEY,
          providers: [
            EVM({
              getWalletClient: async () => walletClient,
              switchChain: async chainId => {
                await provider.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: toHex(chainId) }],
                });
                return walletClient;
              },
            }),
          ],
        });

        setIsInitialized(true);
      } catch (err) {
        console.error('[LiFi] Initialization failed:', err);
      }
    };

    initLiFi();
  }, [embeddedWallet, isInitialized]);

  // Fetch quote with debounce
  useEffect(() => {
    if (quoteTimeoutRef.current) {
      clearTimeout(quoteTimeoutRef.current);
    }

    const shouldFetchQuote = walletAddress && fromAmount && parseFloat(fromAmount) > 0 && isInitialized && isMainnet;

    if (!shouldFetchQuote) {
      setQuote(null);
      return;
    }

    quoteTimeoutRef.current = setTimeout(async () => {
      setStatus('quoting');
      setError(null);

      try {
        const result = await getQuote({
          fromChain: BASE_CHAIN_ID,
          toChain: BASE_CHAIN_ID,
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount: parseAmount(fromAmount, fromToken.decimals),
          fromAddress: walletAddress,
          slippage: DEFAULT_SLIPPAGE,
        });

        setQuote(result);
        setStatus('idle');
      } catch (err) {
        setError(extractErrorMessage(err));
        setQuote(null);
        setStatus('idle');
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
      }
    };
  }, [walletAddress, fromAmount, fromToken, toToken, isInitialized, isMainnet]);

  // Execute swap
  const executeSwap = useCallback(async () => {
    if (!quote || !embeddedWallet || !isInitialized || !walletAddress) return;

    setStatus('signing');
    setError(null);
    setTxHash(null);

    try {
      const route: Route = convertQuoteToRoute(quote);
      const isNativeToken = fromToken.address === NATIVE_TOKEN_ADDRESS;

      // Handle ERC20 approval if needed
      if (!isNativeToken) {
        const approvalAddress = route.steps[0]?.estimate?.approvalAddress;
        if (approvalAddress) {
          const allowance = await getTokenAllowance(
            fromToken.address as `0x${string}`,
            walletAddress as `0x${string}`,
            approvalAddress as `0x${string}`,
            BASE_CHAIN_ID,
          );

          const requiredAmount = BigInt(quote.action.fromAmount);
          if (allowance < requiredAmount) {
            await setTokenAllowance({
              tokenAddress: fromToken.address as `0x${string}`,
              spenderAddress: approvalAddress as `0x${string}`,
              amount: requiredAmount,
              chainId: BASE_CHAIN_ID,
            });
          }
        }
      }

      // Execute the swap
      await executeRoute(route, {
        updateRouteHook(updatedRoute) {
          const hash = updatedRoute.steps[0]?.execution?.process?.[0]?.txHash;
          if (hash) {
            setTxHash(hash);
            setStatus('executing');
          }
        },
        acceptExchangeRateUpdateHook: async () => true,
      });

      setStatus('success');
    } catch (err) {
      console.error('[LiFi] Swap failed:', err);
      setStatus('error');
      setError(extractErrorMessage(err));
    }
  }, [quote, embeddedWallet, isInitialized, walletAddress, fromToken.address]);

  // Switch from/to tokens
  const switchTokens = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
    setQuote(null);
  }, [fromToken, toToken]);

  // Reset state
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setQuote(null);
    setFromAmount('');
  }, []);

  // Derived values
  const toAmount = quote ? formatAmount(quote.estimate.toAmount, toToken.decimals) : '';

  const rate = quote
    ? calculateRate(quote.estimate.toAmount, toToken.decimals, quote.action.fromAmount, fromToken.decimals)
    : '';

  const gasCostUSD = quote?.estimate?.gasCosts?.[0]?.amountUSD || '0.00';

  return {
    // State
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    quote,
    status,
    error,
    txHash,
    rate,
    gasCostUSD,
    walletAddress,
    isInitialized,
    isMainnet,
    // Actions
    setFromToken,
    setToToken,
    setFromAmount,
    switchTokens,
    executeSwap,
    reset,
  };
};

export type { Token };
export { BASE_TOKENS, useLiFiSwap };
