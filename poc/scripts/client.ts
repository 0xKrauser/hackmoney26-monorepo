/**
 * Shared client setup for demo scripts
 *
 * Usage:
 *   import { getClients, CONTRACTS } from './client';
 *   const { publicClient, walletClient } = await getClients();
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Contract addresses on Base Sepolia
export const CONTRACTS = {
  custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as const,
  adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as const,
  // ReactionPool contract
  reactionPool: '0xF16A94b6086b6d7948905f2B7244E96D0b8e3715' as const,
  // Test token (TestUSDC)
  testToken: '0x1b888D884b442936292118D29Ef0fcC701685DcD' as const,
} as const;

// ClearNode WebSocket URL
export const CLEARNODE_WS = 'wss://clearnet.yellow.com/ws';

// RPC URL for Base Sepolia
export const RPC_URL = 'https://sepolia.base.org';

/**
 * Get private key from environment
 */
export const getPrivateKey = (): `0x${string}` => {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    throw new Error('PRIVATE_KEY environment variable not set');
  }
  if (!pk.startsWith('0x')) {
    return `0x${pk}`;
  }
  return pk as `0x${string}`;
};

/**
 * Create public and wallet clients
 */
export const getClients = async () => {
  const privateKey = getPrivateKey();
  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  console.log('Account:', account.address);

  return {
    publicClient,
    walletClient,
    account,
  };
};

/**
 * Format address for display
 */
export const formatAddress = (address: string): string => `${address.slice(0, 6)}...${address.slice(-4)}`;

/**
 * Format USDC amount (6 decimals)
 */
export const formatUSDC = (amount: bigint): string => {
  const value = Number(amount) / 1e6;
  return `$${value.toFixed(6)} USDC`;
};

/**
 * Parse USDC amount from string
 */
export const parseUSDC = (amount: string): bigint => BigInt(Math.floor(parseFloat(amount) * 1e6));
