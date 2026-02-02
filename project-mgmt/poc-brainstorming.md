# PoC: Smart Contract State Channels with Yellow/Nitrolite

## Your Specific Tasks

1. ✅ Contract as channel participant (ERC-1271) - Possible
2. ✅ Partial withdraw without closing - Yes, via resizeChannel()
3. ⚠️ Transfer between channels - Not directly supported, but workarounds exist

---

## Research Findings

### Base Sepolia Contract Addresses (Chain ID: 84532)

```typescript
const CONTRACTS = {
  custody: "0x019B65A265EB3363822f2752141b3dF16131b262",
  adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2",  // SimpleConsensus
  // PremintERC20 also deployed for testing
};

const CLEARNODE_WS = "wss://clearnet.yellow.com/ws";
```

### Exact State Hash Encoding (from Utils.sol)

```solidity
// From nitrolite/contract/src/Utils.sol
function getPackedState(bytes32 channelId, State memory state)
    internal pure returns (bytes memory)
{
    return abi.encode(
        channelId,
        state.intent,      // StateIntent enum (uint8)
        state.version,     // uint256
        state.data,        // bytes
        state.allocations  // Allocation[] array
    );
}

// State hash calculation:
bytes32 stateHash = keccak256(getPackedState(channelId, state));
```

### Type Definitions (from Types.sol)

```solidity
enum StateIntent {
    OPERATE,    // 0 - Normal state updates
    INITIALIZE, // 1 - Initial funding state
    RESIZE,     // 2 - Adjust allocations
    FINALIZE    // 3 - Close channel
}

struct State {
    StateIntent intent;
    uint256 version;
    bytes data;
    Allocation[] allocations;
    bytes[] sigs;
}

struct Allocation {
    address destination;
    address token;
    uint256 amount;
}

struct Channel {
    address[] participants;
    address adjudicator;
    uint64 challenge;
    uint64 nonce;
}
```

### ERC-1271 Support Confirmed

From Yellow docs: Smart contracts can sign via ERC-1271. The Nitrolite contract passes keccak256(packedState) to isValidSignature().

```solidity
interface IERC1271 {
    function isValidSignature(bytes32 hash, bytes memory signature)
        external view returns (bytes4); // 0x1626ba7e = valid
}
```

### Partial Withdrawal: resizeChannel()

```typescript
// Adjusts funds WITHOUT closing the channel
await client.resizeChannel({
  resizeState: {
    channelId,
    stateData: '0x...',
    allocations: newAllocations,  // <-- Change the split
    version: 2n,
    intent: StateIntent.RESIZE,
    serverSignature: signature
  },
  proofStates: []
});
```

### Channel Lifecycle

```
INITIAL → ACTIVE → (RESIZE*) → FINALIZE
   ↓         ↓         ↓           ↓
 create    join    resize*      close

* Can resize multiple times without closing
```

### Inter-Channel Transfers

Not directly supported. Options:
1. Close channel A → Withdraw → Deposit → Open channel B (gas heavy)
2. Use app sessions within a single channel (recommended)
3. Virtual channels (not in current Nitrolite)

---

## PoC Architecture

### Flow: User Deposits → Reacts → Withdraws

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. DEPOSIT (on-chain)                                                  │
│     User calls deposit() on Custody contract                            │
│     └─► Funds locked, available for channel creation                    │
├─────────────────────────────────────────────────────────────────────────┤
│  2. CREATE CHANNEL (on-chain)                                           │
│     Channel between: [User EOA, ReactionPool Contract]                  │
│     └─► Contract is participant via ERC-1271                            │
├─────────────────────────────────────────────────────────────────────────┤
│  3. REACT (off-chain via Yellow)                                        │
│     User signs reaction intent                                          │
│     Contract validates via isValidSignature()                           │
│     Yellow updates state                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  4. PARTIAL WITHDRAW (on-chain via resize)                              │
│     User requests withdrawal                                            │
│     Contract checks Yellow state                                        │
│     resizeChannel() adjusts allocations                                 │
│     └─► Channel stays open, user gets partial funds                     │
├─────────────────────────────────────────────────────────────────────────┤
│  5. CLOSE (on-chain)                                                    │
│     Final settlement                                                    │
│     closeChannel() distributes remaining funds                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Contract Implementation

### ReactionPool.sol - ERC-1271 Channel Participant

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ReactionPool
 * @notice Smart contract that participates in Yellow state channels via ERC-1271
 * @dev Implements isValidSignature to validate state transitions
 */
contract ReactionPool is IERC1271 {
    using ECDSA for bytes32;

    bytes4 constant internal MAGIC_VALUE = 0x1626ba7e;
    bytes4 constant internal INVALID_SIGNATURE = 0xffffffff;

    // ============ State ============

    // Channel state tracking
    mapping(bytes32 => ChannelState) public channels;  // channelId => state

    // Approved state hashes for Yellow verification
    mapping(bytes32 => bool) public approvedStates;

    // Pool token balances
    mapping(address => uint256) public poolBalances;  // token => amount

    // User allocations within this pool
    mapping(bytes32 => mapping(address => uint256)) public userAllocations; // channelId => user => amount

    // Pending reactions (off-chain state mirrored)
    mapping(bytes32 => uint256) public pendingReactions;  // channelId => total pending out

    // ============ Types ============

    struct ChannelState {
        address user;           // The EOA participant
        address token;          // Token in this channel
        uint256 deposited;      // User's initial deposit
        uint256 allocated;      // Current user allocation
        uint256 version;        // State version
        bool active;
    }

    struct ReactionIntent {
        bytes32 channelId;
        address recipient;      // Who receives the reaction
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
    }

    // ============ Events ============

    event ChannelOpened(bytes32 indexed channelId, address indexed user, address token, uint256 amount);
    event ReactionApproved(bytes32 indexed channelId, address indexed recipient, uint256 amount);
    event StateApproved(bytes32 indexed stateHash);
    event PartialWithdrawalApproved(bytes32 indexed channelId, uint256 amount);

    // ============ ERC-1271: Core Yellow Integration ============

    /**
     * @notice Yellow calls this to verify our "signature" on state transitions
     * @param hash The keccak256(packedState) from Yellow
     * @param signature Additional data (could contain user sig, etc.)
     * @return magicValue 0x1626ba7e if valid, 0xffffffff if not
     */
    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) external view override returns (bytes4) {
        // Option 1: Pre-approved states (most common)
        if (approvedStates[hash]) {
            return MAGIC_VALUE;
        }

        // Option 2: Validate signature data contains valid user authorization
        // This allows real-time validation without pre-approval
        if (signature.length >= 65) {
            (bytes32 channelId, bytes memory userSig) = abi.decode(signature, (bytes32, bytes));
            if (_validateUserAuthorization(hash, channelId, userSig)) {
                return MAGIC_VALUE;
            }
        }

        return INVALID_SIGNATURE;
    }

    /**
     * @dev Validate that user authorized this state transition
     */
    function _validateUserAuthorization(
        bytes32 stateHash,
        bytes32 channelId,
        bytes memory userSig
    ) internal view returns (bool) {
        ChannelState storage ch = channels[channelId];
        if (!ch.active) return false;

        // Recover signer from the state hash
        address signer = stateHash.toEthSignedMessageHash().recover(userSig);
        return signer == ch.user;
    }

    // ============ Channel Operations ============

    /**
     * @notice Called when a channel is created with this contract as participant
     * @dev In practice, this would be called by the Custody contract or via callback
     */
    function onChannelCreated(
        bytes32 channelId,
        address user,
        address token,
        uint256 amount
    ) external {
        // TODO: In production, verify caller is the Custody contract

        channels[channelId] = ChannelState({
            user: user,
            token: token,
            deposited: amount,
            allocated: amount,
            version: 0,
            active: true
        });

        emit ChannelOpened(channelId, user, token, amount);
    }

    /**
     * @notice User requests to send a reaction (off-chain intent)
     * @dev Pre-approves the state hash so isValidSignature returns true
     */
    function requestReaction(
        bytes32 channelId,
        address recipient,
        uint256 amount,
        uint256 newVersion,
        bytes calldata stateData,  // Application-specific data
        bytes calldata userSignature
    ) external {
        ChannelState storage ch = channels[channelId];
        require(ch.active, "Channel not active");

        // Verify user signed this intent
        bytes32 intentHash = keccak256(abi.encode(
            channelId, recipient, amount, newVersion
        ));
        address signer = intentHash.toEthSignedMessageHash().recover(userSignature);
        require(signer == ch.user, "Invalid user signature");

        // Check user has sufficient allocation
        uint256 available = ch.allocated - pendingReactions[channelId];
        require(available >= amount, "Insufficient allocation");

        // Update pending
        pendingReactions[channelId] += amount;
        uint256 newUserAllocation = ch.allocated - amount;

        // Build allocations array (EXACT Nitrolite format)
        Allocation[] memory allocations = _buildAllocations(
            ch.user,
            address(this),  // Pool contract
            ch.token,
            newUserAllocation,
            amount  // Pool receives the reaction amount
        );

        // Calculate state hash using EXACT Nitrolite encoding
        bytes32 stateHash = _calculateOperateStateHash(
            channelId,
            newVersion,
            stateData,
            allocations
        );

        approvedStates[stateHash] = true;

        emit ReactionApproved(channelId, recipient, amount);
        emit StateApproved(stateHash);
    }

    /**
     * @notice Approve a partial withdrawal via resize
     * @dev User wants to withdraw some funds without closing channel
     */
    function approvePartialWithdrawal(
        bytes32 channelId,
        uint256 withdrawAmount,
        uint256 newVersion,
        bytes calldata stateData,
        bytes calldata userSignature
    ) external {
        ChannelState storage ch = channels[channelId];
        require(ch.active, "Channel not active");

        // Verify user signed withdrawal request
        bytes32 withdrawHash = keccak256(abi.encode(
            "WITHDRAW", channelId, withdrawAmount, newVersion
        ));
        address signer = withdrawHash.toEthSignedMessageHash().recover(userSignature);
        require(signer == ch.user, "Invalid user signature");

        // Check sufficient funds (after pending reactions)
        uint256 available = ch.allocated - pendingReactions[channelId];
        require(available >= withdrawAmount, "Insufficient available");

        // Update allocation
        ch.allocated -= withdrawAmount;
        ch.version = newVersion;

        // Build allocations for resize state
        Allocation[] memory allocations = _buildAllocations(
            ch.user,
            address(this),
            ch.token,
            ch.allocated,  // New user allocation after withdrawal
            0  // Pool allocation unchanged
        );

        // Approve the resize state hash (RESIZE intent = 2)
        bytes32 resizeStateHash = _calculateResizeStateHash(
            channelId,
            newVersion,
            stateData,
            allocations
        );

        approvedStates[resizeStateHash] = true;

        emit PartialWithdrawalApproved(channelId, withdrawAmount);
        emit StateApproved(resizeStateHash);
    }

    /**
     * @notice Approve channel closure
     */
    function approveClose(
        bytes32 channelId,
        uint256 finalUserAmount,
        uint256 finalVersion,
        bytes calldata stateData,
        bytes calldata userSignature
    ) external {
        ChannelState storage ch = channels[channelId];
        require(ch.active, "Channel not active");

        // Verify user signed close request
        bytes32 closeHash = keccak256(abi.encode(
            "CLOSE", channelId, finalUserAmount, finalVersion
        ));
        address signer = closeHash.toEthSignedMessageHash().recover(userSignature);
        require(signer == ch.user, "Invalid user signature");

        // Mark channel as closing
        ch.active = false;

        // Build final allocations
        Allocation[] memory allocations = _buildAllocations(
            ch.user,
            address(this),
            ch.token,
            finalUserAmount,
            ch.deposited - finalUserAmount  // Remaining to pool
        );

        // Approve the final state hash (FINALIZE intent = 3)
        bytes32 finalStateHash = _calculateFinalStateHash(
            channelId,
            finalVersion,
            stateData,
            allocations
        );

        approvedStates[finalStateHash] = true;

        emit StateApproved(finalStateHash);
    }

    // ============ State Hash Calculations ============
    // EXACT format from Nitrolite Utils.sol:
    // keccak256(abi.encode(channelId, intent, version, data, allocations))

    struct Allocation {
        address destination;
        address token;
        uint256 amount;
    }

    enum StateIntent {
        OPERATE,    // 0
        INITIALIZE, // 1
        RESIZE,     // 2
        FINALIZE    // 3
    }

    function _calculateStateHash(
        bytes32 channelId,
        StateIntent intent,
        uint256 version,
        bytes memory data,
        Allocation[] memory allocations
    ) internal pure returns (bytes32) {
        // EXACT match to Nitrolite's getPackedState()
        return keccak256(abi.encode(
            channelId,
            intent,
            version,
            data,
            allocations
        ));
    }

    function _buildAllocations(
        address user,
        address pool,
        address token,
        uint256 userAmount,
        uint256 poolAmount
    ) internal pure returns (Allocation[] memory) {
        Allocation[] memory allocs = new Allocation[](2);
        allocs[0] = Allocation({
            destination: user,
            token: token,
            amount: userAmount
        });
        allocs[1] = Allocation({
            destination: pool,
            token: token,
            amount: poolAmount
        });
        return allocs;
    }

    // Helper for common operations
    function _calculateOperateStateHash(
        bytes32 channelId,
        uint256 version,
        bytes memory data,
        Allocation[] memory allocations
    ) internal pure returns (bytes32) {
        return _calculateStateHash(channelId, StateIntent.OPERATE, version, data, allocations);
    }

    function _calculateResizeStateHash(
        bytes32 channelId,
        uint256 version,
        bytes memory data,
        Allocation[] memory allocations
    ) internal pure returns (bytes32) {
        return _calculateStateHash(channelId, StateIntent.RESIZE, version, data, allocations);
    }

    function _calculateFinalStateHash(
        bytes32 channelId,
        uint256 version,
        bytes memory data,
        Allocation[] memory allocations
    ) internal pure returns (bytes32) {
        return _calculateStateHash(channelId, StateIntent.FINALIZE, version, data, allocations);
    }

    // ============ View Functions ============

    function getChannelState(bytes32 channelId) external view returns (
        address user,
        address token,
        uint256 deposited,
        uint256 allocated,
        uint256 pending,
        uint256 available,
        bool active
    ) {
        ChannelState storage ch = channels[channelId];
        return (
            ch.user,
            ch.token,
            ch.deposited,
            ch.allocated,
            pendingReactions[channelId],
            ch.allocated - pendingReactions[channelId],
            ch.active
        );
    }

    function isStateApproved(bytes32 stateHash) external view returns (bool) {
        return approvedStates[stateHash];
    }
}
```

---

## TypeScript Integration

### Opening Channel with Contract Participant

```typescript
import { NitroliteClient } from '@erc7824/nitrolite';
import { createWalletClient, http } from 'viem';

const REACTION_POOL_ADDRESS = '0x...'; // Your deployed contract

async function openChannelWithContract(
  client: NitroliteClient,
  userAddress: string,
  tokenAddress: string,
  depositAmount: bigint
) {
  // 1. Deposit funds to custody
  const depositTx = await client.deposit(depositAmount);
  console.log('Deposited:', depositTx);

  // 2. Create channel where participant[1] is the contract
  const { channelId, initialState } = await client.createChannel({
    initialAllocationAmounts: [depositAmount, 0n], // All to user initially
    stateData: '0x', // Empty initial data
  });

  // Note: The channel is created between user and the adjudicator's counterparty
  // For contract participation, your Custody contract setup must include
  // the ReactionPool as the "broker" participant

  console.log('Channel created:', channelId);
  return { channelId, initialState };
}
```

### Requesting a Reaction (Off-chain)

```typescript
async function requestReaction(
  signer: WalletClient,
  reactionPoolContract: Contract,
  channelId: string,
  recipient: string,
  amount: bigint,
  newVersion: bigint
) {
  // 1. User signs the intent
  const intentHash = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }],
      [channelId, recipient, amount, newVersion]
    )
  );

  const userSignature = await signer.signMessage({
    message: { raw: intentHash }
  });

  // 2. Call contract to approve the state
  await reactionPoolContract.write.requestReaction([
    channelId,
    recipient,
    amount,
    newVersion,
    userSignature
  ]);

  // 3. Contract now has approved the state hash
  // Yellow will call isValidSignature() and get MAGIC_VALUE

  // 4. Update Yellow session state
  // ... send state update to ClearNode
}
```

### Partial Withdrawal via Resize

```typescript
async function partialWithdraw(
  client: NitroliteClient,
  signer: WalletClient,
  reactionPoolContract: Contract,
  channelId: string,
  withdrawAmount: bigint,
  currentVersion: bigint
) {
  const newVersion = currentVersion + 1n;

  // 1. User signs withdrawal request
  const withdrawHash = keccak256(
    encodeAbiParameters(
      [{ type: 'string' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'uint256' }],
      ['WITHDRAW', channelId, withdrawAmount, newVersion]
    )
  );

  const userSignature = await signer.signMessage({
    message: { raw: withdrawHash }
  });

  // 2. Contract approves the resize state
  await reactionPoolContract.write.approvePartialWithdrawal([
    channelId,
    withdrawAmount,
    newVersion,
    userSignature
  ]);

  // 3. Get server signature on resize state (from ClearNode)
  const serverSignature = await getServerSignatureForResize(channelId, newVersion);

  // 4. Execute resize on-chain
  const currentAllocation = await getCurrentAllocation(channelId);
  const newAllocation = currentAllocation - withdrawAmount;

  await client.resizeChannel({
    resizeState: {
      channelId,
      stateData: '0x',
      allocations: [
        { destination: userAddress, token: tokenAddress, amount: newAllocation },
        { destination: REACTION_POOL_ADDRESS, token: tokenAddress, amount: 0n }
      ],
      version: newVersion,
      intent: StateIntent.RESIZE,
      serverSignature
    },
    proofStates: []
  });

  // 5. Withdraw the released funds from custody
  await client.withdrawal(withdrawAmount);

  console.log('Partial withdrawal complete. Channel still open!');
}
```

---

## Inter-Channel Transfers (Workaround)

Since direct transfers aren't supported, use App Sessions within a channel:

```typescript
// Instead of Channel A → Channel B transfer, use a single channel with app sessions

// User deposits once
await client.deposit(1000n);

// Create ONE channel
const { channelId } = await client.createChannel(...);

// Use app sessions for different "contexts" (reactions to different posts)
const session1 = await createAppSession({
  protocol: 'reaction-v1',
  participants: [user, reactionPool],
  context: { postId: 'tweet_123' }
});

const session2 = await createAppSession({
  protocol: 'reaction-v1',
  participants: [user, reactionPool],
  context: { postId: 'tweet_456' }
});

// "Transfer" between contexts = close session1, credit session2
await closeAppSession(session1, {
  allocations: [{ user: 50n }, { pool: 50n }]
});

// Pool credits user in session2
await updateAppSession(session2, {
  allocations: [{ user: 150n }, { pool: 0n }]  // User got 50 from session1
});
```

---

## Questions to Resolve

1. **StateHash encoding**: Need to verify exact packedState format Yellow uses
2. **Custody contract integration**: How does ReactionPool register as valid participant?
3. **Server signature for resize**: Who provides this - ClearNode or your backend?

---

## Files to Create

```
poc/
├── contracts/
│   ├── ReactionPool.sol          # ERC-1271 contract participant
│   ├── interfaces/
│   │   └── IERC1271.sol
│   └── test/
│       └── ReactionPool.t.sol
├── scripts/
│   ├── deploy.ts                 # Deploy to testnet
│   ├── openChannel.ts            # PoC: open channel with contract
│   ├── sendReaction.ts           # PoC: send reaction off-chain
│   └── partialWithdraw.ts        # PoC: resize without closing
├── package.json
└── foundry.toml
```

---

## How to Connect to Yellow (Base Sepolia)

### 1. Install SDK

```bash
npm install @erc7824/nitrolite viem
```

### 2. Set Up Client

```typescript
import { NitroliteClient } from '@erc7824/nitrolite';
import { createWalletClient, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const CONTRACTS = {
  custody: "0x019B65A265EB3363822f2752141b3dF16131b262" as const,
  adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2" as const,
};

const account = privateKeyToAccount('0x...');

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http()
});

const nitroliteClient = new NitroliteClient({
  publicClient,
  walletClient,
  chainId: 84532,
  addresses: {
    custody: CONTRACTS.custody,
    adjudicator: CONTRACTS.adjudicator,
    token: '0x...',        // Your test token
    guestAddress: '0x...'  // ReactionPool contract
  }
});
```

### 3. Connect to ClearNode

```typescript
const ws = new WebSocket('wss://clearnet.yellow.com/ws');

ws.onopen = async () => {
  // Auth flow - sign challenge with EIP-712
  // Get JWT for subsequent requests
};
```

---

## Verification Steps

### 1. Deploy ReactionPool to Base Sepolia

```bash
forge create ReactionPool --rpc-url base-sepolia --private-key $PK
```

### 2. Deposit to Custody contract

```typescript
await nitroliteClient.deposit(1000000n); // 1 USDC
```

### 3. Create channel with ReactionPool as participant

```typescript
const { channelId } = await nitroliteClient.createChannel({
  initialAllocationAmounts: [1000000n, 0n],
  stateData: '0x'
});
```

### 4. Test isValidSignature

```typescript
// Call contract directly
const result = await reactionPool.read.isValidSignature([stateHash, '0x']);
assert(result === '0x1626ba7e'); // MAGIC_VALUE
```

### 5. Partial withdraw via resize

```typescript
await nitroliteClient.resizeChannel({ ... });
// Verify channel still ACTIVE
```

### 6. Close channel - final settlement

```typescript
await nitroliteClient.closeChannel({ ... });
```

---

## Answers to Your Specific Questions

### Q1: Can a contract open/close a channel via ERC-1271?

**Yes.** The contract implements `isValidSignature(bytes32 hash, bytes signature)`. When Yellow needs the contract's "signature", it calls this function. If it returns `0x1626ba7e`, Yellow accepts it as signed.

### Q2: Can we partially withdraw without closing?

**Yes.** Use `resizeChannel()`:

```typescript
await client.resizeChannel({
  resizeState: {
    ...newAllocations,
    intent: StateIntent.RESIZE
  },
  proofStates: []
});
```

Channel remains ACTIVE, just with different allocations.

### Q3: Can we transfer between channels?

**Not directly.** Options:
- Use app sessions within one channel (recommended)
- Close source → withdraw → deposit → open destination (gas heavy)
- Wait for virtual channels support (future Nitrolite)

### Q4: Should we permission closure to min amount or inactivity?

**Recommendation: Both:**

```solidity
function approveClose(...) external {
    require(
        ch.allocated < MIN_AMOUNT ||
        block.timestamp > ch.lastActivity + INACTIVITY_PERIOD,
        "Cannot close yet"
    );
    // ... approve closure
}
```
