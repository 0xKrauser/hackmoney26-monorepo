/**
 * Send a reaction via the ReactionPool contract
 *
 * This script simulates an off-chain reaction:
 *   1. User signs a reaction intent
 *   2. ReactionPool approves the state hash
 *   3. Yellow Network accepts via ERC-1271
 *
 * Prerequisites:
 *   - Channel created (run 2-setup-channel.ts first)
 *   - PRIVATE_KEY environment variable set
 *
 * Usage:
 *   npx tsx scripts/3-send-reaction.ts <channelId> [amount]
 */

import { getClients, CONTRACTS, formatUSDC, parseUSDC } from './client';
import { parseAbi, keccak256, encodePacked } from 'viem';

// ReactionPool ABI
const REACTION_POOL_ABI = parseAbi([
  'function approveStateHash(bytes32 channelId, bytes32 stateHash, bytes calldata userSignature) external',
  'function batchApproveStateHashes(bytes32 channelId, bytes32[] calldata stateHashes, bytes calldata userSignature) external',
  'function recordActivity(bytes32 channelId) external',
  'function getChannelInfo(bytes32 channelId) external view returns (address user, uint256 lastActivity, bool active)',
  'function isStateApproved(bytes32 stateHash) external view returns (bool)',
]);

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: npx tsx scripts/3-send-reaction.ts <channelId> [amount]');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/3-send-reaction.ts 0x1234... 0.001');
    process.exit(1);
  }

  const channelId = args[0] as `0x${string}`;
  const reactionAmount = args[1] ? parseUSDC(args[1]) : parseUSDC('0.001'); // Default: $0.001

  console.log('\n=== Sending Reaction ===\n');

  const { publicClient, walletClient, account } = await getClients();

  if (CONTRACTS.reactionPool === '0x0000000000000000000000000000000000000000') {
    console.error('ReactionPool not configured. Deploy and update CONTRACTS.reactionPool');
    process.exit(1);
  }

  // 1. Check channel info
  console.log('1. Checking channel...');
  try {
    const [user, lastActivity, active] = await publicClient.readContract({
      address: CONTRACTS.reactionPool,
      abi: REACTION_POOL_ABI,
      functionName: 'getChannelInfo',
      args: [channelId],
    });
    console.log(`   User: ${user}`);
    console.log(`   Last Activity: ${new Date(Number(lastActivity) * 1000).toISOString()}`);
    console.log(`   Active: ${active}`);

    if (!active) {
      console.error('Channel is not active');
      process.exit(1);
    }
  } catch {
    console.error('Channel not found. Create channel first.');
    process.exit(1);
  }

  // 2. Create reaction intent
  console.log('\n2. Creating reaction intent...');
  const version = BigInt(Date.now());
  const recipient = '0x0000000000000000000000000000000000000001' as `0x${string}`; // Placeholder recipient

  // Create state hash (simplified - actual format depends on Yellow spec)
  const stateHash = keccak256(
    encodePacked(['bytes32', 'address', 'uint256', 'uint256'], [channelId, recipient, reactionAmount, version]),
  );
  console.log(`   State hash: ${stateHash}`);
  console.log(`   Amount: ${formatUSDC(reactionAmount)}`);

  // 3. Sign the approval
  console.log('\n3. Signing approval...');
  const approvalHash = keccak256(encodePacked(['string', 'bytes32', 'bytes32'], ['APPROVE', channelId, stateHash]));
  const signature = await walletClient.signMessage({
    account,
    message: { raw: approvalHash },
  });
  console.log(`   Signature: ${signature.slice(0, 20)}...`);

  // 4. Submit to ReactionPool
  console.log('\n4. Approving state hash on ReactionPool...');
  const tx = await walletClient.writeContract({
    address: CONTRACTS.reactionPool,
    abi: REACTION_POOL_ABI,
    functionName: 'approveStateHash',
    args: [channelId, stateHash, signature],
  });
  console.log(`   Tx: ${tx}`);
  await publicClient.waitForTransactionReceipt({ hash: tx });

  // 5. Verify approval
  console.log('\n5. Verifying approval...');
  const isApproved = await publicClient.readContract({
    address: CONTRACTS.reactionPool,
    abi: REACTION_POOL_ABI,
    functionName: 'isStateApproved',
    args: [stateHash],
  });
  console.log(`   State approved: ${isApproved}`);

  console.log('\n=== Reaction Sent ===');
  console.log(`State Hash: ${stateHash}`);
  console.log(`Amount: ${formatUSDC(reactionAmount)}`);
  console.log('');
  console.log('Yellow Network will now call isValidSignature() on the ReactionPool');
  console.log('and receive MAGIC_VALUE (0x1626ba7e) confirming the approval.');
};

main().catch(console.error);
