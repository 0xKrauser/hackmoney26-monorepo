/**
 * Deploy ReactionPool contract to Base Sepolia
 *
 * Prerequisites:
 *   - PRIVATE_KEY environment variable set
 *   - Account has Base Sepolia ETH for gas
 *
 * Usage:
 *   npx tsx scripts/1-deploy.ts
 *
 * Or with Foundry:
 *   forge script script/Deploy.s.sol:Deploy --rpc-url base-sepolia --broadcast
 */

import { getClients } from './client';

const main = async () => {
  console.log('\n=== Deploying ReactionPool Contract ===\n');

  const { publicClient, account } = await getClients();

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${Number(balance) / 1e18} ETH`);

  if (balance < 1000000000000000n) {
    console.error('Insufficient balance. Get Base Sepolia ETH from faucet.');
    console.log('Faucet: https://www.alchemy.com/faucets/base-sepolia');
    process.exit(1);
  }

  console.log('\nTo deploy with Foundry, run:');
  console.log('');
  console.log('  cd poc');
  console.log('  source .env');
  console.log('  forge script script/Deploy.s.sol:Deploy --rpc-url base-sepolia --broadcast --verify');
  console.log('');
  console.log('After deployment, update CONTRACTS.reactionPool in:');
  console.log('  - packages/web3/lib/config.ts');
  console.log('  - poc/scripts/client.ts');
  console.log('');
};

main().catch(console.error);
