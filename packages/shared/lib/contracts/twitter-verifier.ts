export const TWITTER_VERIFIER_ADDRESS = '0x0000000000000000000000000000000000000000' as const; // UPDATE after deployment

export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const BASE_SEPOLIA_RPC_URL = 'https://sepolia.base.org';

export const TWITTER_VERIFIER_ABI = [
  {
    name: 'registerVerification',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'username', type: 'string' }],
    outputs: [{ name: 'nonce', type: 'bytes32' }],
  },
  {
    name: 'requestVerification',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'requestId', type: 'bytes32' }],
  },
  {
    name: 'isVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getRegistration',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'username', type: 'string' },
      { name: 'nonce', type: 'bytes32' },
    ],
  },
  {
    name: 'verifiedTwitter',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'VerificationRegistered',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'username', type: 'string', indexed: false },
      { name: 'nonce', type: 'bytes32', indexed: false },
    ],
  },
  {
    name: 'VerificationRequested',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'username', type: 'string', indexed: false },
    ],
  },
  {
    name: 'VerificationFulfilled',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'username', type: 'string', indexed: false },
      { name: 'verified', type: 'bool', indexed: false },
    ],
  },
  {
    name: 'VerificationFailed',
    type: 'event',
    inputs: [
      { name: 'requestId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'username', type: 'string', indexed: false },
      { name: 'err', type: 'bytes', indexed: false },
    ],
  },
] as const;
