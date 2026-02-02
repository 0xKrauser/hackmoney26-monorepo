/**
 * Partial withdrawal from channel without closing
 *
 * This script demonstrates resizeChannel():
 *   1. User signs withdrawal request
 *   2. State hash is approved on ReactionPool
 *   3. Custody.resizeChannel() is called
 *   4. Funds are withdrawn but channel stays open
 *
 * Prerequisites:
 *   - Channel created (run 2-setup-channel.ts first)
 *   - PRIVATE_KEY environment variable set
 *
 * Usage:
 *   npx tsx scripts/4-partial-withdraw.ts <channelId> <amount>
 */

import { getClients, CONTRACTS, formatUSDC, parseUSDC } from './client';
import { parseAbi } from 'viem';

// Custody ABI for resize (compatible with MockCustody for testing)
const CUSTODY_ABI = parseAbi([
  'function resizeChannel(bytes32 channelId, (address,address,address,uint256,uint256,address,uint256) channel, (uint8,(address,uint256)[]) resize) external',
  'function getChannel(bytes32 channelId) external view returns ((address,address,address,uint256,uint256,address,uint256))',
  'function withdrawal(address token, uint256 amount) external',
  'function getDeposit(address token, address account) external view returns (uint256)',
]);

// ReactionPool ABI
const REACTION_POOL_ABI = parseAbi([
  'function getChannelInfo(bytes32 channelId) external view returns (address user, uint256 lastActivity, bool active)',
  'function canClose(bytes32 channelId, uint256 currentBalance) external view returns (bool allowed, string memory reason)',
]);

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/4-partial-withdraw.ts <channelId> <amount>');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx scripts/4-partial-withdraw.ts 0x1234... 10');
    process.exit(1);
  }

  const channelId = args[0] as `0x${string}`;
  const withdrawAmount = parseUSDC(args[1]);

  console.log('\n=== Partial Withdrawal ===\n');
  console.log(`Amount: ${formatUSDC(withdrawAmount)}`);

  const { publicClient, walletClient, account } = await getClients();

  // 1. Get current channel state
  console.log('\n1. Getting channel state...');
  const channelData = await publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getChannel',
    args: [channelId],
  });

  const [participant0, participant1, adjudicator, challenge, nonce, token, amount] = channelData;
  console.log(`   Current amount: ${formatUSDC(amount)}`);
  console.log(`   Token: ${token}`);

  if (withdrawAmount > amount) {
    console.error(`Cannot withdraw ${formatUSDC(withdrawAmount)} from channel with ${formatUSDC(amount)}`);
    process.exit(1);
  }

  // 2. Check if closure is allowed (for validation)
  console.log('\n2. Checking withdrawal permissions...');
  const newBalance = amount - withdrawAmount;
  const [canCloseAllowed, canCloseReason] = await publicClient.readContract({
    address: CONTRACTS.reactionPool,
    abi: REACTION_POOL_ABI,
    functionName: 'canClose',
    args: [channelId, newBalance],
  });
  console.log(`   Can close after withdrawal: ${canCloseAllowed} (${canCloseReason})`);

  // 3. Prepare resize operation
  console.log('\n3. Preparing resize...');

  // ResizeIntent: 0 = WITHDRAW
  const resizeIntent = 0;
  const resizeAllocations: readonly [`0x${string}`, bigint][] = [[account.address, withdrawAmount]];

  const resizeTuple: readonly [number, readonly [`0x${string}`, bigint][]] = [resizeIntent, resizeAllocations];

  // 4. Execute resize
  console.log('\n4. Executing resizeChannel...');
  const channel: readonly [`0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint, `0x${string}`, bigint] = [
    participant0,
    participant1,
    adjudicator,
    challenge,
    nonce,
    token,
    amount,
  ];

  const resizeTx = await walletClient.writeContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'resizeChannel',
    args: [channelId, channel, resizeTuple],
  });
  console.log(`   Tx: ${resizeTx}`);
  await publicClient.waitForTransactionReceipt({ hash: resizeTx });
  console.log('   Channel resized!');

  // 5. Withdraw from Custody
  console.log('\n5. Withdrawing from Custody...');
  const withdrawTx = await walletClient.writeContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'withdrawal',
    args: [token, withdrawAmount],
  });
  console.log(`   Tx: ${withdrawTx}`);
  await publicClient.waitForTransactionReceipt({ hash: withdrawTx });
  console.log(`   Withdrew ${formatUSDC(withdrawAmount)}!`);

  // 6. Verify final state
  console.log('\n6. Verifying final state...');
  const finalChannelData = await publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getChannel',
    args: [channelId],
  });
  const finalAmount = finalChannelData[6];
  console.log(`   Channel amount: ${formatUSDC(finalAmount)}`);

  const deposit = await publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getDeposit',
    args: [token, account.address],
  });
  console.log(`   Custody deposit: ${formatUSDC(deposit)}`);

  console.log('\n=== Partial Withdrawal Complete ===');
  console.log(`Withdrawn: ${formatUSDC(withdrawAmount)}`);
  console.log(`Remaining in channel: ${formatUSDC(finalAmount)}`);
  console.log('Channel is still OPEN for more reactions!');
};

main().catch(console.error);
