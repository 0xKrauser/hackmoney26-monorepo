import { CHAIN, RPC_URL } from './config.js';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { Account, Chain, Transport, WalletClient } from 'viem';

/**
 * Wallet connection state
 */
export interface WalletState {
  address: `0x${string}` | null;
  isConnected: boolean;
  chainId: number | null;
}

/**
 * Create a public client for reading blockchain state
 */
export const createPublicClientInstance = () =>
  createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL),
  });

/**
 * Create a wallet client from a browser wallet (e.g., MetaMask)
 * @param ethereum - The ethereum provider (window.ethereum)
 */
export const createBrowserWalletClient = (
  ethereum: Parameters<typeof custom>[0],
): WalletClient<Transport, Chain, Account> =>
  createWalletClient({
    chain: CHAIN,
    transport: custom(ethereum),
  }) as WalletClient<Transport, Chain, Account>;

/**
 * Create a wallet client from a private key (for scripts/testing)
 * @param privateKey - The private key (with or without 0x prefix)
 */
export const createPrivateKeyWalletClient = (privateKey: `0x${string}`): WalletClient<Transport, Chain, Account> => {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: CHAIN,
    transport: http(RPC_URL),
  });
};

/**
 * Request wallet connection from browser wallet
 * @param ethereum - The ethereum provider
 * @returns Array of connected addresses
 */
export const requestWalletConnection = async (ethereum: Parameters<typeof custom>[0]): Promise<`0x${string}`[]> => {
  const client = createBrowserWalletClient(ethereum);
  return client.requestAddresses();
};

/**
 * Get the current chain ID from the wallet
 * @param ethereum - The ethereum provider
 */
export const getWalletChainId = async (ethereum: Parameters<typeof custom>[0]): Promise<number> => {
  const client = createBrowserWalletClient(ethereum);
  return client.getChainId();
};

/**
 * Switch wallet to the correct chain
 * @param ethereum - The ethereum provider
 */
export const switchToChain = async (ethereum: Parameters<typeof custom>[0]): Promise<void> => {
  const client = createBrowserWalletClient(ethereum);
  await client.switchChain({ id: CHAIN.id });
};

/**
 * Add the target chain to the wallet if it doesn't exist
 * @param ethereum - The ethereum provider
 */
export const addChainToWallet = async (ethereum: Parameters<typeof custom>[0]): Promise<void> => {
  const client = createBrowserWalletClient(ethereum);
  await client.addChain({ chain: CHAIN });
};

/**
 * Get the balance of an address
 * @param address - The address to check
 */
export const getBalance = async (address: `0x${string}`): Promise<bigint> => {
  const client = createPublicClientInstance();
  return client.getBalance({ address });
};

/**
 * Get the balance of an ERC20 token
 * @param tokenAddress - The token contract address
 * @param address - The address to check
 */
export const getTokenBalance = async (tokenAddress: `0x${string}`, address: `0x${string}`): Promise<bigint> => {
  const client = createPublicClientInstance();

  const balance = await client.readContract({
    address: tokenAddress,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'balanceOf',
    args: [address],
  });

  return balance;
};

/**
 * Check if an address has approved spending for a spender
 * @param tokenAddress - The token contract address
 * @param owner - The token owner address
 * @param spender - The spender address
 */
export const getTokenAllowance = async (
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
): Promise<bigint> => {
  const client = createPublicClientInstance();

  const allowance = await client.readContract({
    address: tokenAddress,
    abi: [
      {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'allowance',
    args: [owner, spender],
  });

  return allowance;
};
