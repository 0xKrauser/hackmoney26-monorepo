import { useChain } from './useChain';
import { createConfig, getQuote, executeRoute, convertQuoteToRoute, EVM } from '@lifi/sdk';
import { useWallets } from '@privy-io/react-auth';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import type { Quote, Route } from '@lifi/sdk';

const BASE_CHAIN_ID = 8453; // Base mainnet (Li.Fi only supports mainnet)

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// Common Base tokens
const BASE_TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
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
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EescdeCB5BE2C/logo.png',
  },
];

type SwapStatus = 'idle' | 'quoting' | 'signing' | 'executing' | 'success' | 'error';

const useLiFiSwap = () => {
  const { wallets } = useWallets();
  const { isMainnet } = useChain();
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const walletAddress = embeddedWallet?.address;

  const [fromToken, setFromToken] = useState<Token>(BASE_TOKENS[1]); // USDC
  const [toToken, setToToken] = useState<Token>(BASE_TOKENS[0]); // ETH
  const [fromAmount, setFromAmount] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Li.Fi SDK with Privy wallet provider
  useEffect(() => {
    const initLiFi = async () => {
      if (!embeddedWallet || isInitialized) return;

      try {
        // Get the EIP-1193 provider from Privy's embedded wallet
        const provider = await embeddedWallet.getEthereumProvider();

        // Create viem wallet client with Privy's provider
        const walletClient = createWalletClient({
          account: embeddedWallet.address as `0x${string}`,
          chain: base,
          transport: custom(provider),
        });

        // Configure Li.Fi SDK with the wallet client
        createConfig({
          integrator: 'frens-extension',
          apiKey: process.env.CEB_LIFI_API_KEY,
          providers: [
            EVM({
              getWalletClient: async () => walletClient,
              switchChain: async chainId => {
                // Switch chain if needed (Base only for now)
                await provider.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: `0x${chainId.toString(16)}` }],
                });
                return walletClient;
              },
            }),
          ],
        });

        setIsInitialized(true);
      } catch (err) {
        console.error('[LiFi] Failed to initialize:', err);
      }
    };

    initLiFi();
  }, [embeddedWallet, isInitialized]);

  // Fetch quote when inputs change (debounced)
  useEffect(() => {
    if (quoteTimeoutRef.current) {
      clearTimeout(quoteTimeoutRef.current);
    }

    if (!walletAddress || !fromAmount || parseFloat(fromAmount) <= 0 || !isInitialized || !isMainnet) {
      setQuote(null);
      return;
    }

    quoteTimeoutRef.current = setTimeout(async () => {
      setStatus('quoting');
      setError(null);

      try {
        const amountInWei = BigInt(Math.floor(parseFloat(fromAmount) * 10 ** fromToken.decimals)).toString();

        const result = await getQuote({
          fromChain: BASE_CHAIN_ID,
          toChain: BASE_CHAIN_ID,
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount: amountInWei,
          fromAddress: walletAddress,
        });

        setQuote(result);
        setStatus('idle');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get quote');
        setQuote(null);
        setStatus('idle');
      }
    }, 500);

    return () => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
      }
    };
  }, [walletAddress, fromAmount, fromToken, toToken, isInitialized, isMainnet]);

  const executeSwap = useCallback(async () => {
    if (!quote || !embeddedWallet || !isInitialized) return;

    setStatus('signing');
    setError(null);
    setTxHash(null);

    try {
      const route: Route = convertQuoteToRoute(quote);

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
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Swap failed');
    }
  }, [quote, embeddedWallet, isInitialized]);

  const switchTokens = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
    setQuote(null);
  }, [fromToken, toToken]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setQuote(null);
    setFromAmount('');
  }, []);

  // Computed values
  const toAmount = quote ? (Number(quote.estimate.toAmount) / 10 ** toToken.decimals).toFixed(6) : '';

  const rate = quote ? (Number(quote.estimate.toAmount) / Number(quote.action.fromAmount)).toFixed(6) : '';

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
    isMainnet, // Li.Fi only works on mainnet
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
