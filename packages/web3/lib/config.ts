import { baseSepolia } from 'viem/chains';

/**
 * Chain configuration for Yellow Network PoC
 */
export const CHAIN = baseSepolia;
export const CHAIN_ID = baseSepolia.id;

/**
 * Contract addresses on Base Sepolia
 */
export const CONTRACTS = {
  /** Yellow Network Custody contract */
  custody: '0x019B65A265EB3363822f2752141b3dF16131b262' as const,

  /** Yellow Network Adjudicator (SimpleConsensus) */
  adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2' as const,

  /** ReactionPool contract */
  reactionPool: '0xF16A94b6086b6d7948905f2B7244E96D0b8e3715' as const,

  /** Test token (TestUSDC) */
  testToken: '0x1b888D884b442936292118D29Ef0fcC701685DcD' as const,
} as const;

/**
 * Yellow Network ClearNode WebSocket endpoint
 */
export const CLEARNODE_WS = 'wss://clearnet.yellow.com/ws';

/**
 * Reaction cost in token units (6 decimals for USDC-like)
 * 1000 = 0.001 USDC per reaction
 */
export const REACTION_COST = 1000n;

/**
 * Minimum deposit amount
 * 1000000 = 1 USDC
 */
export const MIN_DEPOSIT = 1000000n;

/**
 * RPC URL for Base Sepolia
 */
export const RPC_URL = 'https://sepolia.base.org';

/**
 * Type for contract addresses
 */
export type ContractAddresses = typeof CONTRACTS;

/**
 * Update contract addresses at runtime (e.g., after deployment)
 */
export const updateContractAddress = <K extends keyof ContractAddresses>(key: K, address: `0x${string}`): void => {
  (CONTRACTS as Record<K, `0x${string}`>)[key] = address;
};
