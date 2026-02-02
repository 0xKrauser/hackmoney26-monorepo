import { channelStorage } from '@repo/storage';
import { CHAIN } from '@repo/web3';
import { useCallback, useEffect, useState } from 'react';

/**
 * Wallet connection state
 */
interface WalletState {
  address: `0x${string}` | null;
  isConnecting: boolean;
  isConnected: boolean;
  chainId: number | null;
  error: string | null;
  isSmartWallet: boolean;
}

/**
 * Ethereum provider interface (EIP-1193)
 */
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

/**
 * Get ethereum provider from window
 * In production, this would be replaced with smart wallet SDK connection
 *
 * TODO: Replace with smart wallet provider:
 * - Privy: `const { user, login } = usePrivy()`
 * - Coinbase: `const { address, connect } = useCoinbaseWallet()`
 * - Safe: `const { safeAddress, connect } = useSafe()`
 */
const getEthereumProvider = (): EthereumProvider | null => {
  if (typeof window !== 'undefined' && 'ethereum' in window) {
    return (window as { ethereum?: EthereumProvider }).ethereum ?? null;
  }
  return null;
};

/**
 * Hook for managing wallet connection
 *
 * This is designed to work with both EOA and smart wallets.
 * For smart wallet integration, replace the connection logic
 * with the appropriate SDK (Privy, Coinbase, Safe, etc.)
 *
 * Smart wallet considerations:
 * - ERC-4337 account abstraction
 * - Passkey/WebAuthn authentication
 * - Social login providers
 * - Session keys for gasless transactions
 */
export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
    isConnected: false,
    chainId: null,
    error: null,
    isSmartWallet: false,
  });

  // Load initial state from storage
  useEffect(() => {
    const loadState = async () => {
      const storageState = await channelStorage.get();
      if (storageState.walletAddress) {
        setState(prev => ({
          ...prev,
          address: storageState.walletAddress as `0x${string}`,
          isConnected: true,
        }));
      }
    };

    loadState();
  }, []);

  /**
   * Connect wallet
   *
   * TODO: For smart wallet integration, replace this with:
   *
   * Privy:
   * ```
   * const { login } = usePrivy();
   * await login();
   * ```
   *
   * Coinbase Smart Wallet:
   * ```
   * const { connect } = useConnect();
   * await connect({ connector: coinbaseWallet() });
   * ```
   *
   * ZeroDev:
   * ```
   * const kernelClient = await createKernelAccountClient({...});
   * const address = kernelClient.account.address;
   * ```
   */
  const connect = useCallback(async () => {
    const ethereum = getEthereumProvider();
    if (!ethereum) {
      setState(prev => ({
        ...prev,
        error: 'No wallet detected. Please install a wallet or use a smart wallet provider.',
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request connection - works for both EOA and injected smart wallets
      const accounts = (await ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      const address = accounts[0] as `0x${string}`;

      // Get current chain ID
      const chainIdHex = (await ethereum.request({
        method: 'eth_chainId',
      })) as string;
      const chainId = parseInt(chainIdHex, 16);

      // Check if this is a smart wallet by checking code at address
      // Smart contract wallets have code deployed at their address
      const code = (await ethereum.request({
        method: 'eth_getCode',
        params: [address, 'latest'],
      })) as string;
      const isSmartWallet = code !== '0x' && code !== '0x0';

      // Switch to correct chain if needed
      if (chainId !== CHAIN.id) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CHAIN.id.toString(16)}` }],
          });
        } catch (switchError) {
          // Chain might need to be added
          console.warn('Failed to switch chain:', switchError);
        }
      }

      // Save to storage
      await channelStorage.setWalletAddress(address);

      setState({
        address,
        isConnecting: false,
        isConnected: true,
        chainId: CHAIN.id,
        error: null,
        isSmartWallet,
      });

      console.log('[frens] Wallet connected:', {
        address,
        chainId: CHAIN.id,
        isSmartWallet,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect wallet';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
    }
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async () => {
    await channelStorage.clearChannelData();
    setState({
      address: null,
      isConnecting: false,
      isConnected: false,
      chainId: null,
      error: null,
      isSmartWallet: false,
    });
  }, []);

  /**
   * Check if on correct chain
   */
  const isCorrectChain = state.chainId === CHAIN.id;

  return {
    ...state,
    connect,
    disconnect,
    isCorrectChain,
    targetChain: CHAIN,
  };
};
