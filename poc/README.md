# Yellow Network State Channel PoC

Proof of concept for paid emoji reactions using Yellow Network/Nitrolite state channels.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ON-CHAIN (Base Sepolia)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User Wallet ──deposit()──► Custody Contract ◄── ReactionPool       │
│       │                         │                     │              │
│       │                   createChannel()             │              │
│       │                         │              isValidSignature()    │
│       │                         ▼               (ERC-1271)           │
│       └─────────────────►  CHANNEL  ◄─────────────────┘              │
│                           (1 per user)                               │
│                                │                                     │
│        resizeChannel() ◄──────┴──────► closeChannel()               │
│        (partial withdraw)               (final settlement)           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     OFF-CHAIN (App Sessions)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Session 1 (post_123)    Session 2 (post_456)    Session N          │
│  alloc: [user: 950]      alloc: [user: 900]      alloc: [user: ...]  │
│         [pool: 50]              [pool: 100]             [pool: ...]  │
│                                                                      │
│  Each reaction = state update within session (signed, instant)       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Features Demonstrated

1. **ERC-1271 Contract Participant**: ReactionPool contract participates in channels by implementing `isValidSignature()`
2. **Partial Withdrawal**: Use `resizeChannel()` to withdraw without closing
3. **Closure Permissions**: ReactionPool enforces min balance and inactivity period
4. **App Sessions**: Multiple contexts per channel for different posts

## Quick Start

### 1. Deploy Contract

```bash
cd poc
cp .env.example .env
# Edit .env with your private key

forge build
forge script script/Deploy.s.sol:Deploy --rpc-url base-sepolia --broadcast
```

### 2. Run Demo Scripts

```bash
cd poc/scripts
npm install

# Deploy (shows instructions)
npx tsx 1-deploy.ts

# Create channel with $100 USDC
npx tsx 2-setup-channel.ts

# Send a reaction
npx tsx 3-send-reaction.ts 0x<channelId> 0.001

# Partial withdraw $10
npx tsx 4-partial-withdraw.ts 0x<channelId> 10

# Close channel
npx tsx 5-close-channel.ts 0x<channelId>
```

## Contracts

### ReactionPool.sol

- Implements `IERC1271` for Yellow Network signature validation
- Tracks channel state and user allocations
- Enforces closure permissions (min balance, inactivity period)
- Pre-approves state hashes for off-chain updates

### Key Functions

| Function | Description |
|----------|-------------|
| `isValidSignature(hash, sig)` | ERC-1271 - validates channel state transitions |
| `registerChannel(id, user)` | Called when channel is created |
| `approveStateHash(id, hash, sig)` | Pre-approve state for reaction |
| `canClose(id, balance)` | Check if closure is allowed |
| `markClosed(id)` | Finalize channel closure |

## Configuration

Update these addresses after deployment:

- `packages/web3/lib/config.ts`
- `poc/scripts/client.ts`

```typescript
const CONTRACTS = {
  custody: '0x019B65A265EB3363822f2752141b3dF16131b262',
  adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2',
  reactionPool: '0x...', // Your deployed address
  testToken: '0x...',    // PremintERC20 on Base Sepolia
};
```

## Testing

```bash
cd poc
forge test -vvv
```

## Network

- **Chain**: Base Sepolia (Chain ID: 84532)
- **RPC**: https://sepolia.base.org
- **Faucet**: https://www.alchemy.com/faucets/base-sepolia
