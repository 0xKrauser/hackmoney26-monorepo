/**
 * Close channel and final settlement
 *
 * This script:
 *   1. Checks closure permissions
 *   2. Closes all app sessions
 *   3. Calls Custody.closeChannel()
 *   4. Distributes final allocations
 *
 * Prerequisites:
 *   - Channel created (run 2-setup-channel.ts first)
 *   - PRIVATE_KEY environment variable set
 *
 * Usage:
 *   npx tsx scripts/5-close-channel.ts <channelId>
 */

import { getClients, CONTRACTS, formatUSDC, formatAddress } from './client';
import { parseAbi } from 'viem';

// Custody ABI (compatible with MockCustody for testing)
const CUSTODY_ABI = parseAbi([
  'function closeChannel(bytes32 channelId, (address,address,address,uint256,uint256,address,uint256) channel, bytes[] signatures) external',
  'function getChannel(bytes32 channelId) external view returns ((address,address,address,uint256,uint256,address,uint256))',
  'function withdrawal(address token, uint256 amount) external',
  'function getDeposit(address token, address account) external view returns (uint256)',
]);

// ReactionPool ABI
const REACTION_POOL_ABI = parseAbi([
  'function getChannelInfo(bytes32 channelId) external view returns (address user, uint256 lastActivity, bool active)',
  'function canClose(bytes32 channelId, uint256 currentBalance) external view returns (bool allowed, string memory reason)',
  'function markClosed(bytes32 channelId) external',
]);

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: npx tsx scripts/5-close-channel.ts <channelId>');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/5-close-channel.ts 0x1234...');
    process.exit(1);
  }

  const channelId = args[0] as `0x${string}`;

  console.log('\n=== Closing Channel ===\n');
  console.log(`Channel ID: ${channelId}`);

  const { publicClient, walletClient, account } = await getClients();

  // 1. Get channel info
  console.log('\n1. Getting channel info...');
  const channelData = await publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getChannel',
    args: [channelId],
  });

  const [participant0, participant1, adjudicator, challenge, nonce, token, amount] = channelData;
  console.log(`   User: ${formatAddress(participant0)}`);
  console.log(`   Pool: ${formatAddress(participant1)}`);
  console.log(`   Amount: ${formatUSDC(amount)}`);

  // 2. Check closure permissions
  console.log('\n2. Checking closure permissions...');
  const [allowed, reason] = await publicClient.readContract({
    address: CONTRACTS.reactionPool,
    abi: REACTION_POOL_ABI,
    functionName: 'canClose',
    args: [channelId, amount],
  });
  console.log(`   Allowed: ${allowed}`);
  console.log(`   Reason: ${reason}`);

  if (!allowed) {
    console.log('\n  Closure not allowed. Channel has:');
    console.log('   - Sufficient balance (> MIN_CLOSE_BALANCE)');
    console.log('   - Recent activity (< INACTIVITY_PERIOD)');
    console.log('\nTo close anyway, use --force flag (not implemented in PoC)');
    console.log('Or wait for inactivity period / spend more funds.');
    process.exit(1);
  }

  // 3. Close channel on Custody
  console.log('\n3. Closing channel on Custody...');

  const channel: readonly [`0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint, `0x${string}`, bigint] = [
    participant0,
    participant1,
    adjudicator,
    challenge,
    nonce,
    token,
    amount,
  ];

  // Sign closure (simplified - actual implementation needs both parties)
  const signatures: `0x${string}`[] = [];

  const closeTx = await walletClient.writeContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'closeChannel',
    args: [channelId, channel, signatures],
  });
  console.log(`   Tx: ${closeTx}`);
  await publicClient.waitForTransactionReceipt({ hash: closeTx });
  console.log('   Channel closed!');

  // 4. Mark closed on ReactionPool
  console.log('\n4. Marking closed on ReactionPool...');
  const markTx = await walletClient.writeContract({
    address: CONTRACTS.reactionPool,
    abi: REACTION_POOL_ABI,
    functionName: 'markClosed',
    args: [channelId],
  });
  console.log(`   Tx: ${markTx}`);
  await publicClient.waitForTransactionReceipt({ hash: markTx });

  // 5. Withdraw remaining funds
  console.log('\n5. Checking withdrawable balance...');
  const deposit = await publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getDeposit',
    args: [token, account.address],
  });
  console.log(`   Withdrawable: ${formatUSDC(deposit)}`);

  if (deposit > 0n) {
    console.log('   Withdrawing...');
    const withdrawTx = await walletClient.writeContract({
      address: CONTRACTS.custody,
      abi: CUSTODY_ABI,
      functionName: 'withdrawal',
      args: [token, deposit],
    });
    console.log(`   Tx: ${withdrawTx}`);
    await publicClient.waitForTransactionReceipt({ hash: withdrawTx });
    console.log(`   Withdrew ${formatUSDC(deposit)}!`);
  }

  // 6. Verify closure
  console.log('\n6. Verifying closure...');
  const [, , active] = await publicClient.readContract({
    address: CONTRACTS.reactionPool,
    abi: REACTION_POOL_ABI,
    functionName: 'getChannelInfo',
    args: [channelId],
  });
  console.log(`   Channel active: ${active}`);

  console.log('\n=== Channel Closed ===');
  console.log(`Final settlement: ${formatUSDC(deposit)} returned to user`);
};

main().catch(console.error);
