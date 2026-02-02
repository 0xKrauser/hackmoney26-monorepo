/**
 * Set up a channel: deposit to Custody and create channel
 *
 * This script:
 *   1. Approves token spending to Custody
 *   2. Deposits tokens to Custody
 *   3. Creates a channel with ReactionPool as participant
 *
 * Prerequisites:
 *   - PRIVATE_KEY environment variable set
 *   - ReactionPool deployed (update CONTRACTS.reactionPool)
 *   - Test token deployed (update CONTRACTS.testToken)
 *   - Account has test tokens
 *
 * Usage:
 *   npx tsx scripts/2-setup-channel.ts
 */

import { getClients, CONTRACTS, formatAddress, formatUSDC, parseUSDC } from './client';
import { parseAbi } from 'viem';

// ERC20 ABI for approve and balanceOf
const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]);

// Custody ABI
const CUSTODY_ABI = parseAbi([
  'function deposit(address token, uint256 amount) external',
  'function getDeposit(address token, address account) external view returns (uint256)',
  'function createChannel(bytes32 channelId, (address,address,address,uint256,uint256,bytes32,uint64) channel) external',
  'function getChannelId((address,address,address,uint256,uint256,bytes32,uint64) channel) external pure returns (bytes32)',
]);

const main = async () => {
  console.log('\n=== Setting Up Channel ===\n');

  const { publicClient, walletClient, account } = await getClients();

  // Configuration
  const depositAmount = parseUSDC('10'); // 10 USDC
  const token = CONTRACTS.testToken;
  const reactionPool = CONTRACTS.reactionPool;

  if (token === '0x0000000000000000000000000000000000000000') {
    console.error('Test token not configured. Update CONTRACTS.testToken in client.ts');
    process.exit(1);
  }

  if (reactionPool === '0x0000000000000000000000000000000000000000') {
    console.error('ReactionPool not configured. Deploy and update CONTRACTS.reactionPool');
    process.exit(1);
  }

  // 1. Check token balance
  console.log('1. Checking token balance...');
  const balance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log(`   Balance: ${formatUSDC(balance)}`);

  if (balance < depositAmount) {
    console.error(`Insufficient balance. Need ${formatUSDC(depositAmount)}`);
    process.exit(1);
  }

  // 2. Check and set allowance
  console.log('\n2. Checking allowance...');
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, CONTRACTS.custody],
  });
  console.log(`   Current allowance: ${formatUSDC(allowance)}`);

  if (allowance < depositAmount) {
    console.log('   Approving Custody contract...');
    const approveTx = await walletClient.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.custody, depositAmount],
    });
    console.log(`   Tx: ${approveTx}`);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log('   Approved!');
  }

  // 3. Deposit to Custody
  console.log('\n3. Depositing to Custody...');
  const depositTx = await walletClient.writeContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'deposit',
    args: [token, depositAmount],
  });
  console.log(`   Tx: ${depositTx}`);
  await publicClient.waitForTransactionReceipt({ hash: depositTx });
  console.log(`   Deposited ${formatUSDC(depositAmount)}!`);

  // 4. Check Custody balance
  const custodyBalance = await publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getDeposit',
    args: [token, account.address],
  });
  console.log(`   Custody balance: ${formatUSDC(custodyBalance)}`);

  // 5. Create channel
  console.log('\n4. Creating channel...');

  // Channel struct: [participant0, participant1, adjudicator, challenge, nonce, token, amount]
  const nonce = BigInt(Date.now());
  const channel: readonly [`0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint, `0x${string}`, bigint] = [
    account.address, // User
    reactionPool, // ReactionPool contract
    CONTRACTS.adjudicator,
    0n, // No challenge period for PoC
    nonce,
    token,
    depositAmount,
  ];

  // Get channel ID
  const channelId = await publicClient.readContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'getChannelId',
    args: [channel],
  });
  console.log(`   Channel ID: ${channelId}`);

  // Create channel
  const createTx = await walletClient.writeContract({
    address: CONTRACTS.custody,
    abi: CUSTODY_ABI,
    functionName: 'createChannel',
    args: [channelId, channel],
  });
  console.log(`   Tx: ${createTx}`);
  await publicClient.waitForTransactionReceipt({ hash: createTx });
  console.log('   Channel created!');

  console.log('\n=== Channel Setup Complete ===');
  console.log(`Channel ID: ${channelId}`);
  console.log(`User: ${formatAddress(account.address)}`);
  console.log(`Pool: ${formatAddress(reactionPool)}`);
  console.log(`Amount: ${formatUSDC(depositAmount)}`);
};

main().catch(console.error);
