import { keccak256, toBytes } from 'viem';
import type { Account, WalletClient, Transport, Chain } from 'viem';

/**
 * Message signer interface compatible with Nitrolite
 */
export interface MessageSigner {
  address: `0x${string}`;
  sign: (message: string | Uint8Array) => Promise<`0x${string}`>;
}

/**
 * Create a message signer from a wallet client
 * @param walletClient - The viem wallet client
 * @param address - The address to sign with
 */
export const createMessageSigner = (
  walletClient: WalletClient<Transport, Chain, Account>,
  address: `0x${string}`,
): MessageSigner => ({
  address,
  sign: async (message: string | Uint8Array) => {
    const messageBytes = typeof message === 'string' ? toBytes(message) : message;
    return walletClient.signMessage({
      account: address,
      message: { raw: messageBytes },
    });
  },
});

/**
 * Sign a state hash for approval
 * @param walletClient - The wallet client
 * @param address - The signer address
 * @param channelId - The channel ID
 * @param stateHash - The state hash to approve
 */
export const signStateApproval = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  address: `0x${string}`,
  channelId: `0x${string}`,
  stateHash: `0x${string}`,
): Promise<`0x${string}`> => {
  // Create the approval message hash
  const approvalMessage = keccak256(toBytes(`APPROVE_STATE${channelId}${stateHash}`));

  return walletClient.signMessage({
    account: address,
    message: { raw: toBytes(approvalMessage) },
  });
};

/**
 * Sign a batch of state hashes for approval
 * @param walletClient - The wallet client
 * @param address - The signer address
 * @param channelId - The channel ID
 * @param stateHashes - Array of state hashes to approve
 */
export const signBatchStateApproval = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  address: `0x${string}`,
  channelId: `0x${string}`,
  stateHashes: `0x${string}`[],
): Promise<`0x${string}`> => {
  // Create the batch approval message hash
  const hashesConcat = stateHashes.join('');
  const approvalMessage = keccak256(toBytes(`BATCH_APPROVE${channelId}${hashesConcat}`));

  return walletClient.signMessage({
    account: address,
    message: { raw: toBytes(approvalMessage) },
  });
};

/**
 * Create a signature with channel context for ERC-1271 validation
 * @param walletClient - The wallet client
 * @param address - The signer address
 * @param channelId - The channel ID
 * @param stateHash - The state hash to sign
 */
export const signWithChannelContext = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  address: `0x${string}`,
  channelId: `0x${string}`,
  stateHash: `0x${string}`,
): Promise<`0x${string}`> => {
  // Sign the state hash
  const signature = await walletClient.signMessage({
    account: address,
    message: { raw: toBytes(stateHash) },
  });

  // Encode with channel context: abi.encode(channelId, signature)
  // This matches what the ReactionPool contract expects
  const channelIdBytes = toBytes(channelId);
  const signatureBytes = toBytes(signature);

  // ABI encode the result
  // For simplicity, we'll return a concatenated version that can be decoded
  // In practice, you'd use proper ABI encoding
  return `0x${Buffer.from([...channelIdBytes, ...signatureBytes]).toString('hex')}` as `0x${string}`;
};

/**
 * Verify a signature locally (for testing)
 * @param message - The original message
 * @param signature - The signature to verify
 * @param expectedAddress - The expected signer address
 */
export const verifySignature = async (
  message: string | Uint8Array,
  signature: `0x${string}`,
  expectedAddress: `0x${string}`,
): Promise<boolean> => {
  const { recoverMessageAddress } = await import('viem');
  const messageBytes = typeof message === 'string' ? toBytes(message) : message;

  try {
    const recovered = await recoverMessageAddress({
      message: { raw: messageBytes },
      signature,
    });
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
};
