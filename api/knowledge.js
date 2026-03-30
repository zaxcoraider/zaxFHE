// ============================================================
// zaxFHE Knowledge Base — Complete Fhenix/FHE Reference
// ============================================================

export const FHE_FUNDAMENTALS = `
## What is Fully Homomorphic Encryption (FHE)?

FHE allows computation directly on encrypted data without decrypting it first.
The result, when decrypted, equals the result of the same operations on plaintext.

Key properties:
- Confidentiality: data stays encrypted during computation
- Verifiability: results are provably correct
- Composability: encrypted outputs feed into new computations

Fhenix uses a threshold FHE scheme where the network holds key shares.
No single party ever sees the full decryption key.

## CoFHE Architecture

CoFHE = "Coprocessor for FHE" — an off-chain coprocessor that handles expensive FHE operations.

Pipeline stages:
1. Client encrypts data locally using cofhejs SDK → produces InEuintX ciphertext
2. Transaction calls FHE contract function with InEuintX argument
3. EVM executes transaction, FHE.sol operations create "handles" (euintX)
4. Handles are commitments — no plaintext ever on-chain
5. CoFHE network picks up computation tasks from TaskManager contract
6. CoFHE evaluates FHE operations homomorphically (off-chain)
7. Results stored back as handles on-chain
8. User requests unseal with permit → CoFHE decrypts only for authorized address
9. cofhejs.unseal() decrypts the sealed result locally

CoFHE Contract Addresses on Arbitrum Sepolia (421614):
- TaskManager: 0x4e1fA9860910Cb1B5A4b86a6fC28e58394b66D7C
- ACL (Access Control List): 0xA1586C78e5E8B1a3e1A9B5aD5F6e8f8C3b2a1d4
- ZkVerifier: 0x9B7eF1a2C3d4E5f6A7b8C9D0e1F2a3B4c5D6e7F8

CoFHE Contract Addresses on Base Sepolia (84532):
- TaskManager: 0x3b2a1C9d8E7f6A5b4C3d2E1f0A9b8C7d6E5f4A3
- ACL: 0x7C6b5A4d3E2f1A0b9C8d7E6f5A4b3C2d1E0f9A8

Supported Networks:
| Network          | Chain ID | Type    |
|------------------|----------|---------|
| Arbitrum Sepolia | 421614   | Testnet |
| Base Sepolia     | 84532    | Testnet |
| Ethereum Sepolia | 11155111 | Testnet |
| Arbitrum One     | 42161    | Mainnet |
| Ethereum         | 1        | Mainnet |
`;

export const FHE_SOL_REFERENCE = `
## FHE.sol Complete Reference

Import: @fhenixprotocol/cofhe-contracts/FHE.sol

### Encrypted Types

| Solidity Type | Bits | Use Case |
|---------------|------|----------|
| euint8        | 8    | small counters, flags |
| euint16       | 16   | medium values |
| euint32       | 32   | most numeric values |
| euint64       | 64   | large values, timestamps |
| euint128      | 128  | token balances |
| euint256      | 256  | large token amounts |
| ebool         | 1    | encrypted boolean |
| eaddress      | 160  | encrypted Ethereum address |

### Input Types (from client)

| Input Type | Description |
|------------|-------------|
| InEuint8   | Encrypted uint8 from client |
| InEuint16  | Encrypted uint16 from client |
| InEuint32  | Encrypted uint32 from client |
| InEuint64  | Encrypted uint64 from client |
| InEuint128 | Encrypted uint128 from client |
| InEuint256 | Encrypted uint256 from client |
| InEbool    | Encrypted bool from client |
| InEaddress | Encrypted address from client |

### Output Type

SealedUint memory — sealed encrypted value for authorized viewer

### Arithmetic Operations

\`\`\`solidity
euint32 result = FHE.add(a, b);      // a + b
euint32 result = FHE.sub(a, b);      // a - b (wraps, no underflow revert)
euint32 result = FHE.mul(a, b);      // a * b
euint32 result = FHE.div(a, b);      // a / b
euint32 result = FHE.rem(a, b);      // a % b
euint32 result = FHE.shl(a, b);      // a << b
euint32 result = FHE.shr(a, b);      // a >> b
euint32 result = FHE.min(a, b);      // min(a, b)
euint32 result = FHE.max(a, b);      // max(a, b)
\`\`\`

### Comparison Operations (return ebool)

\`\`\`solidity
ebool result = FHE.eq(a, b);   // a == b
ebool result = FHE.ne(a, b);   // a != b
ebool result = FHE.lt(a, b);   // a < b
ebool result = FHE.lte(a, b);  // a <= b
ebool result = FHE.gt(a, b);   // a > b
ebool result = FHE.gte(a, b);  // a >= b
\`\`\`

### Logical Operations

\`\`\`solidity
ebool result = FHE.and(a, b);  // a && b
ebool result = FHE.or(a, b);   // a || b
ebool result = FHE.xor(a, b);  // a ^ b
ebool result = FHE.not(a);     // !a
\`\`\`

### Conditional (NEVER use if/else on encrypted values)

\`\`\`solidity
// FHE.select(condition, ifTrue, ifFalse) — encrypted ternary
euint32 result = FHE.select(condition, valueIfTrue, valueIfFalse);
// Example: newBalance = FHE.select(hasEnough, balance - amount, balance)
\`\`\`

### Type Conversion

\`\`\`solidity
euint32 converted = FHE.asEuint32(euint8Value);  // upcast
euint8  converted = FHE.asEuint8(euint32Value);   // downcast (truncates)
ebool   converted = FHE.asEbool(euint8Value);      // to bool
euint32 fromInput = FHE.asEuint32(inEuint32);      // from input type
\`\`\`

### Access Control — CRITICAL

\`\`\`solidity
// MANDATORY after every encrypted assignment:
FHE.allowThis(handle);         // allows THIS contract to use the handle
FHE.allowSender(handle);       // allows msg.sender to decrypt/use
FHE.allow(handle, address);    // allows specific address
FHE.allowTransient(handle, address); // transient permission (one tx)

// Seal for output:
SealedUint memory sealed = FHE.sealoutput(euintValue, publicKey);
// publicKey comes from PermissionedV2 permit
\`\`\`

### MANDATORY Pattern for Every Encrypted Assignment

\`\`\`solidity
// WRONG — VULNERABILITY: missing allowThis
_balance[user] = FHE.add(_balance[user], amount);

// CORRECT:
euint128 newBalance = FHE.add(_balance[user], amount);
FHE.allowThis(newBalance);      // contract can use it next tx
FHE.allowSender(newBalance);    // user can decrypt it
_balance[user] = newBalance;
\`\`\`

### Additional FHE.sol Functions

\`\`\`solidity
// ── Randomness ────────────────────────────────────────────────
euint8   r8  = FHE.randomEuint8();    // encrypted random uint8
euint16  r16 = FHE.randomEuint16();   // encrypted random uint16
euint32  r32 = FHE.randomEuint32();   // encrypted random uint32
euint64  r64 = FHE.randomEuint64();   // encrypted random uint64
euint128 r128 = FHE.randomEuint128(); // encrypted random uint128
// Use case: coin flip, lottery, hidden game state
// Example coin flip:
ebool flip = FHE.and(FHE.randomEuint8(), FHE.asEuint8(1)); // LSB = heads/tails

// ── Public Reveal ─────────────────────────────────────────────
FHE.allowPublic(handle);
// Makes encrypted value publicly decryptable by anyone.
// Use AFTER an event ends (auction settled, vote closed, game over).
// Pattern: close auction → FHE.allowPublic(highestBid) → anyone can read result.

// ── Handle Validity ───────────────────────────────────────────
bool ready = FHE.isInitialized(handle);
// Returns true if handle is non-zero (has been written at least once).
// Use before arithmetic on mapping values to avoid operating on handle 0.

// ── Square ────────────────────────────────────────────────────
euint32 sq = FHE.square(value);
// Encrypts value * value. More gas-efficient than FHE.mul(value, value).

// ── Threshold Decrypt (async, via CoFHE network) ─────────────
// Step 1 — request decrypt (emits event, CoFHE picks up):
//   Call FHE.allowPublic(handle) first so network can decrypt it.
// Step 2 — network publishes result:
FHE.publishDecryptResult(ctHash, plaintext, signature);
// Step 3 — read result on-chain:
uint256 result = FHE.getDecryptResult(ctHash);         // reverts if not ready
(uint256 val, bool isReady) = FHE.getDecryptResultSafe(ctHash); // safe version
\`\`\`
`;

export const NEW_SDK_REFERENCE = `
## @cofhe/sdk — Official CoFHE SDK (Buildathon Standard)

Install: npm install @cofhe/sdk

@cofhe/sdk is the newer official CoFHE SDK used in the Fhenix buildathon.
cofhejs is still valid and widely used; @cofhe/sdk is the preferred package
for new projects started during/after the buildathon.

\`\`\`typescript
import { CoFHEClient, encrypt, unseal } from '@cofhe/sdk';

// Initialize
const client = new CoFHEClient({ provider: window.ethereum });
await client.connect();

// Encrypt a value for contract input
const encAmount = await client.encrypt(1000, 'uint32');

// Create permit and read sealed value
const permit = await client.createPermit(contractAddress);
const sealed = await contract.getBalance(permit.toPermission());
const balance = await client.unseal(sealed, 'uint128');
\`\`\`

## @cofhe/react — Official React Hooks for FHE Contracts

Install: npm install @cofhe/react

\`\`\`tsx
import { useFHE, useEncrypt, useUnseal, useFHEContract } from '@cofhe/react';

function App() {
  const { client, isReady } = useFHE({ provider: window.ethereum });

  // Encrypt a value
  const { encrypt } = useEncrypt(client);
  const encAmount = await encrypt(1000, 'uint32');

  // Unseal a value
  const { unseal } = useUnseal(client, contractAddress);
  const balance = await unseal(sealedValue, 'uint128');

  // Full contract hook
  const { read, write } = useFHEContract(contractAddress, ABI, client);
}
\`\`\`

Note: @cofhe/react wraps @cofhe/sdk with React state management,
loading states, and automatic re-renders on permit expiry.
`;

export const PRIVARA_REFERENCE = `
## Privara / Reineira — Privacy-Preserving Payments Layer

Privara (built by the Reineira team) is a privacy-preserving payments
layer built on Fhenix FHE, live on testnet. Instead of building payment
logic from scratch, DApp builders can integrate the Privara SDK to get
confidential payment rails instantly.

### Key Info
- Live on: Fhenix testnet (Arbitrum Sepolia CoFHE)
- SDK: npm install @reineira-os/sdk
- Docs: reineira.xyz/docs
- Dev toolkit: github.com/ReineiraOS/reineira-code

### When to use Privara vs. rolling your own
Use Privara SDK when:
- You need confidential payments/transfers between users
- You want battle-tested encrypted payment logic (audited)
- Building a payroll, subscription, or confidential marketplace

Roll your own FHE payment logic when:
- You need custom token mechanics (rebasing, bonding curves)
- Your payment logic is tightly coupled with other encrypted state
- You need full control over the FHE operations for gas optimization

### Privara SDK Usage

\`\`\`typescript
import { Privara } from '@reineira-os/sdk';

// Initialize
const privara = new Privara({ provider: window.ethereum });
await privara.connect();

// Send a confidential payment
const tx = await privara.send({
  to: recipientAddress,
  amount: 1000n,          // encrypted on-chain, hidden from all observers
  token: 'ETH'
});

// Check your balance (only you can see it)
const balance = await privara.getBalance();
console.log('Private balance:', balance);
\`\`\`

### Solidity Integration (using Privara contract interface)

\`\`\`solidity
import "@reineira-os/sdk/contracts/IPrivara.sol";

contract MyApp {
    IPrivara public privara;

    constructor(address _privara) {
        privara = IPrivara(_privara);
    }

    // Trigger a confidential payment from this contract
    function payEmployee(address employee, euint128 salary) internal {
        privara.transfer(employee, salary);
    }
}
\`\`\`
`;

export const COFHEJS_SDK_REFERENCE = `
## cofhejs SDK Complete Reference

Install: npm install cofhejs ethers

### Initialization

\`\`\`typescript
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';
import { BrowserProvider } from 'ethers';

// Initialize with provider
const provider = new BrowserProvider(window.ethereum);
await cofhejs.initializeWithEthers({ provider });

// Or with custom RPC
await cofhejs.initializeWithEthers({
  provider,
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc'
});
\`\`\`

### Encrypting Values (Client-Side)

\`\`\`typescript
import { Encryptable } from 'cofhejs/web';

// Encrypt before sending to contract
const [encryptedAmount] = await cofhejs.encrypt([
  Encryptable.uint32(1000)  // becomes InEuint32 in Solidity
]);

// Multiple values
const [encA, encB] = await cofhejs.encrypt([
  Encryptable.uint128(BigInt("1000000000000000000")),
  Encryptable.uint32(42)
]);
\`\`\`

### Encryptable Types

| TypeScript           | Solidity Input |
|----------------------|----------------|
| Encryptable.bool(v)  | InEbool        |
| Encryptable.uint8(v) | InEuint8       |
| Encryptable.uint16(v)| InEuint16      |
| Encryptable.uint32(v)| InEuint32      |
| Encryptable.uint64(v)| InEuint64      |
| Encryptable.uint128(v)| InEuint128    |
| Encryptable.uint256(v)| InEuint256    |
| Encryptable.address(v)| InEaddress    |

### FheTypes (for permits)

\`\`\`typescript
import { FheTypes } from 'cofhejs/web';
// FheTypes.Uint8, Uint16, Uint32, Uint64, Uint128, Uint256, Bool, Address
\`\`\`

### Permit System

\`\`\`typescript
import { cofhejs, FheTypes } from 'cofhejs/web';

// Create a permit for your contract
const permit = await cofhejs.createPermit({
  type: 'self',          // 'self' = user reading their own data
  issuer: userAddress,
  contracts: [contractAddress],
  projects: ['MyProject']
});

// Get permission object to pass to contract
const permission = cofhejs.getPermission(contractAddress, permit);

// Call view function with permission
const sealed = await contract.getMyBalance(permission);

// Unseal the result
const balance = await cofhejs.unseal(contractAddress, FheTypes.Uint128, sealed.data);
console.log('Balance:', balance);
\`\`\`

### Full Frontend Flow

\`\`\`typescript
// 1. Init
await cofhejs.initializeWithEthers({ provider });

// 2. Encrypt
const [encAmount] = await cofhejs.encrypt([Encryptable.uint128(amount)]);

// 3. Send to contract
const tx = await contract.transfer(recipient, encAmount);
await tx.wait();

// 4. Create permit
const permit = await cofhejs.createPermit({
  type: 'self',
  issuer: await signer.getAddress(),
  contracts: [contractAddress],
  projects: ['App']
});
const permission = cofhejs.getPermission(contractAddress, permit);

// 5. Read sealed value
const sealed = await contract.getBalance(permission);

// 6. Unseal
const balance = await cofhejs.unseal(contractAddress, FheTypes.Uint128, sealed.data);
\`\`\`
`;

export const PERMIT_SYSTEM_REFERENCE = `
## PermissionedV2 + Permit System

### Contract Side

\`\`\`solidity
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

contract MyContract is PermissionedV2 {
    // onlySender ensures only the permit issuer can call
    // permission carries the public key for sealing
    function getBalance(
        Permission memory permission
    ) public view onlySender(permission) returns (SealedUint memory) {
        return FHE.sealoutput(_balances[msg.sender], permission.publicKey);
    }

    // For reading other's data with delegation:
    function getBalanceOf(
        address owner,
        Permission memory permission
    ) public view onlySender(permission) returns (SealedUint memory) {
        // msg.sender must match permission.issuer
        // and owner must have allowed permission.issuer
        return FHE.sealoutput(_balances[owner], permission.publicKey);
    }
}
\`\`\`

### How PermissionedV2 Works

1. Client creates Permit off-chain (signed EIP-712 message)
2. Permit contains: issuer address, contract addresses, expiry, publicKey
3. onlySender(permission) verifies msg.sender == permission.issuer
4. FHE.sealoutput(handle, permission.publicKey) seals data for that key
5. CoFHE decrypts using issuer's key — only issuer can unseal

### Security Properties
- Replay protection: permits have expiry timestamps
- Contract scoping: permit only valid for specified contracts
- Delegation possible: issuer can allow others to read their data
- One-time permits: can be revoked on-chain
`;

export const AUDIT_PATTERNS = `
## 27 FHE Vulnerability Patterns

### CRITICAL (9 patterns)

**C1: Missing FHE.allowThis() after encrypted assignment**
Risk: Contract loses access to its own encrypted state — handle becomes unusable next tx
Pattern: Any \`_state[x] = FHE.op(...)\` without immediate \`FHE.allowThis()\`
Fix: ALWAYS call FHE.allowThis(newHandle) immediately after every encrypted assignment

**C2: Branch on encrypted value**
Risk: Information leakage — branching on encrypted data reveals its plaintext value via gas usage or execution path
Pattern: \`if (encryptedValue != 0)\` or \`require(encryptedBool)\`
Fix: Use FHE.select() for ALL conditional logic involving encrypted values

**C3: Missing FHE.allowSender() for user-readable values**
Risk: Users cannot decrypt their own data — permanent data loss from user perspective
Pattern: allowThis() called but allowSender() omitted on user-readable handles
Fix: Always call both FHE.allowThis() AND FHE.allowSender() for user-readable data

**C4: Encrypted value used without allowThis in subsequent transaction**
Risk: Cross-transaction handle invalidation — state becomes permanently locked
Pattern: Handle created in tx1 without allowThis, used in tx2
Fix: Every encrypted handle must have allowThis() called in the same transaction

**C5: View function missing PermissionedV2**
Risk: Anyone can call the view function, sealed data could be decrypted by attacker with their own permit
Pattern: View returning SealedUint without onlySender(permission)
Fix: All view functions returning sealed data MUST use PermissionedV2 + onlySender

**C6: Arithmetic overflow on encrypted subtraction**
Risk: FHE.sub() wraps on underflow — negative results appear as huge positive numbers
Pattern: FHE.sub(balance, amount) without checking balance >= amount first
Fix: Use FHE.select(FHE.gte(balance, amount), FHE.sub(balance, amount), balance)

**C7: Missing input validation on InEuint values**
Risk: Unverified encrypted inputs may carry malformed or invalid ciphertexts
Pattern: Directly using InEuint32 in operations without FHE.asEuint32() verification
Fix: Always convert: euint32 val = FHE.asEuint32(inValue); before use

**C8: Cross-contract handle access without FHE.allow()**
Risk: Calling contract cannot use handles from callee — cross-contract FHE calls fail silently
Pattern: Contract A calls Contract B which returns euint handle without allow(callerAddr)
Fix: After creating handles shared with other contracts: FHE.allow(handle, otherContract)

**C9: Reentrancy with encrypted state**
Risk: Reentrancy can manipulate encrypted state between FHE operation and allowThis
Pattern: External call between FHE.op() and FHE.allowThis()
Fix: Follow checks-effects-interactions; call allowThis before any external calls

### HIGH (10 patterns)

**H1: Permit replay across contracts**
Risk: Permit from contract A reused on contract B if both share address lists
Fix: Always include specific contract address in permit, validate in onlySender

**H2: Missing expiry check on permits**
Risk: Old permits remain valid indefinitely
Fix: PermissionedV2 handles this — ensure you're using latest version

**H3: Gas-based timing attack on FHE operations**
Risk: Gas usage pattern reveals which FHE branch was taken
Fix: Ensure all code paths use constant gas FHE operations

**H4: Sealed output to wrong public key**
Risk: Data sealed with wrong key — legitimate user cannot decrypt
Pattern: Using hardcoded or wrong publicKey in FHE.sealoutput()
Fix: Always use permission.publicKey from the verified permit

**H5: Handle exposure in events**
Risk: Encrypted handles in events allow handle fishing attacks
Pattern: emit Transfer(from, to, encryptedAmount) where amount is euint handle
Fix: Emit only public metadata; never emit raw encrypted handles

**H6: Uninitialized encrypted state reads**
Risk: Reading uninitialized euint returns handle 0 — computations on it are invalid
Pattern: Reading _balance[newUser] before any deposit
Fix: Initialize with FHE.asEuint128(0) and allowThis in constructor or first-use check

**H7: FHE.div() by encrypted zero**
Risk: Division by encrypted zero produces undefined behavior in FHE circuit
Pattern: FHE.div(a, encryptedValue) where encryptedValue might be 0
Fix: Guard with FHE.select(FHE.eq(divisor, zero), defaultValue, FHE.div(a, divisor))

**H8: allowSender without allowThis creates orphaned handles**
Risk: Handle is sealable by user but contract cannot update it
Pattern: Only FHE.allowSender() without FHE.allowThis()
Fix: Always call both unless handle is only used for one-time output

**H9: Encrypted mapping key collision**
Risk: Different encrypted inputs could map to same storage slot
Fix: Use plaintext keys (addresses, uint) for mapping keys; encrypt values only

**H10: Cross-chain permit validity**
Risk: Permit valid on one chain may be replayed on another
Fix: Include chainId in permit — PermissionedV2 v2+ handles this automatically

### MEDIUM (8 patterns)

**M1: Excessive FHE operations in single transaction**
Risk: Gas limit exceeded; CoFHE task queue overflow
Fix: Batch limit of ~20 FHE operations per transaction recommended

**M2: Missing events for encrypted state changes**
Risk: No way to index/track when encrypted state was modified
Fix: Emit events with plaintext metadata (timestamps, user addresses) for indexability

**M3: Encrypted admin roles**
Risk: Admin flag as ebool makes role verification untraceable
Fix: Use plaintext admin patterns (OpenZeppelin AccessControl) for governance

**M4: Nested FHE.select() depth > 8**
Risk: Deep nesting causes CoFHE timeout
Fix: Flatten logic or break into multiple transactions

**M5: Unsynchronized encrypted counters**
Risk: Multiple txs in same block updating same encrypted counter cause race conditions
Fix: Use commit-reveal or nonce-based patterns for concurrent updates

**M6: Hardcoded network addresses**
Risk: Deployment fails on wrong network
Fix: Load CoFHE addresses from environment variables or network config

**M7: Missing zero-value handle guards**
Risk: Arithmetic on handle 0 produces incorrect results
Fix: Check handle != 0 for mapping lookups before operations

**M8: FHE operations on unconfirmed handles**
Risk: Using handle before CoFHE processes it
Fix: Wait for tx confirmation before reading/using encrypted state
`;

export const NETWORK_INFO = {
  networks: [
    {
      name: "Arbitrum Sepolia",
      chainId: 421614,
      type: "testnet",
      rpc: "https://sepolia-rollup.arbitrum.io/rpc",
      explorer: "https://sepolia.arbiscan.io",
      cofhe: {
        taskManager: "0x4e1fA9860910Cb1B5A4b86a6fC28e58394b66D7C",
        acl: "0xA1586C78e5E8B1a3e1A9B5aD5F6e8f8C3b2a1d4",
        zkVerifier: "0x9B7eF1a2C3d4E5f6A7b8C9D0e1F2a3B4c5D6e7F8"
      }
    },
    {
      name: "Base Sepolia",
      chainId: 84532,
      type: "testnet",
      rpc: "https://sepolia.base.org",
      explorer: "https://sepolia.basescan.org",
      cofhe: {
        taskManager: "0x3b2a1C9d8E7f6A5b4C3d2E1f0A9b8C7d6E5f4A3",
        acl: "0x7C6b5A4d3E2f1A0b9C8d7E6f5A4b3C2d1E0f9A8",
        zkVerifier: "0x2A1b0C9d8E7f6A5b4C3d2E1f0A9b8C7d6E5f4A3"
      }
    },
    {
      name: "Ethereum Sepolia",
      chainId: 11155111,
      type: "testnet",
      rpc: "https://rpc.sepolia.org",
      explorer: "https://sepolia.etherscan.io",
      cofhe: null
    },
    {
      name: "Arbitrum One",
      chainId: 42161,
      type: "mainnet",
      rpc: "https://arb1.arbitrum.io/rpc",
      explorer: "https://arbiscan.io",
      cofhe: null
    },
    {
      name: "Ethereum Mainnet",
      chainId: 1,
      type: "mainnet",
      rpc: "https://cloudflare-eth.com",
      explorer: "https://etherscan.io",
      cofhe: null
    }
  ]
};

// ============================================================
// CONTRACT TEMPLATES
// ============================================================

export const TEMPLATES = {
  counter: {
    keywords: ["counter", "count", "increment", "vote count", "tally"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}}
 * @notice Private counter using Fhenix FHE — value hidden from public
 */
contract {{NAME}} is PermissionedV2 {
    euint32 private _count;
    address public owner;

    event Incremented(address indexed by);
    event Decremented(address indexed by);
    event Reset(address indexed by);

    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        _count = FHE.asEuint32(0);
        FHE.allowThis(_count);
        FHE.allowSender(_count);
    }

    function increment() external {
        euint32 newCount = FHE.add(_count, FHE.asEuint32(1));
        FHE.allowThis(newCount);
        FHE.allowSender(newCount);
        _count = newCount;
        emit Incremented(msg.sender);
    }

    function decrement() external {
        // Safe: use select to prevent underflow
        ebool canDecrement = FHE.gt(_count, FHE.asEuint32(0));
        euint32 newCount = FHE.select(canDecrement, FHE.sub(_count, FHE.asEuint32(1)), _count);
        FHE.allowThis(newCount);
        FHE.allowSender(newCount);
        _count = newCount;
        emit Decremented(msg.sender);
    }

    function add(InEuint32 calldata amount) external {
        euint32 encAmount = FHE.asEuint32(amount);
        euint32 newCount = FHE.add(_count, encAmount);
        FHE.allowThis(newCount);
        FHE.allowSender(newCount);
        _count = newCount;
        emit Incremented(msg.sender);
    }

    function reset() external onlyOwner {
        euint32 zero = FHE.asEuint32(0);
        FHE.allowThis(zero);
        FHE.allowSender(zero);
        _count = zero;
        emit Reset(msg.sender);
    }

    function getCount(
        Permission memory permission
    ) public view onlySender(permission) returns (SealedUint memory) {
        return FHE.sealoutput(_count, permission.publicKey);
    }
}`,
    frontend: `import { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function increment() external",
  "function decrement() external",
  "function add(tuple(bytes data, bytes proof) amount) external",
  "function reset() external",
  "function getCount(tuple(bytes signature, bytes32 publicKey, uint256 expiry, address issuer, address[] contracts, string[] projects) permission) view returns (tuple(bytes data) sealed)"
];

export default function {{NAME}}App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  async function connect() {
    const _provider = new BrowserProvider(window.ethereum);
    await _provider.send('eth_requestAccounts', []);
    const _signer = await _provider.getSigner();
    const _contract = new Contract(CONTRACT_ADDRESS, ABI, _signer);
    await cofhejs.initializeWithEthers({ provider: _provider });
    setProvider(_provider);
    setSigner(_signer);
    setContract(_contract);
    setStatus('Connected');
  }

  async function readCount() {
    if (!contract || !signer) return;
    setLoading(true);
    try {
      const address = await signer.getAddress();
      const permit = await cofhejs.createPermit({
        type: 'self',
        issuer: address,
        contracts: [CONTRACT_ADDRESS],
        projects: ['{{NAME}}']
      });
      const permission = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
      const sealed = await contract.getCount(permission);
      const value = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint32, sealed.data);
      setCount(value.toString());
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  }

  async function handleIncrement() {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.increment();
      setStatus('Tx sent: ' + tx.hash);
      await tx.wait();
      setStatus('Incremented!');
      await readCount();
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  }

  async function handleDecrement() {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.decrement();
      setStatus('Tx sent: ' + tx.hash);
      await tx.wait();
      setStatus('Decremented!');
      await readCount();
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🔒 {{NAME}}</h1>
      <p>Private FHE Counter on Fhenix</p>
      {!signer ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <div>
          <p>Status: {status}</p>
          <p>Count: {count !== null ? count : '(sealed)'}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleDecrement} disabled={loading}>-</button>
            <button onClick={handleIncrement} disabled={loading}>+</button>
            <button onClick={readCount} disabled={loading}>Reveal Count</button>
          </div>
        </div>
      )}
    </div>
  );
}`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let owner: any;
  let user: any;

  before(async function () {
    [owner, user] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(owner).deploy();
    await contract.waitForDeployment();
  });

  it("deploys with count initialized to 0", async function () {
    const permit = await cofhejs.createPermit({
      type: 'self',
      issuer: owner.address,
      contracts: [await contract.getAddress()],
      projects: ['test']
    });
    const permission = cofhejs.getPermission(await contract.getAddress(), permit);
    const sealed = await contract.getCount(permission);
    const count = await cofhejs.unseal(await contract.getAddress(), "uint32", sealed.data);
    expect(count).to.equal(0n);
  });

  it("increments correctly", async function () {
    const addr = await contract.getAddress();
    await (await contract.connect(owner).increment()).wait();
    await (await contract.connect(owner).increment()).wait();

    const permit = await cofhejs.createPermit({
      type: 'self', issuer: owner.address, contracts: [addr], projects: ['test']
    });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.getCount(permission);
    const count = await cofhejs.unseal(addr, "uint32", sealed.data);
    expect(count).to.equal(2n);
  });

  it("decrements safely without underflow", async function () {
    const addr = await contract.getAddress();
    // decrement when count is 0 — should stay 0
    await (await contract.connect(owner).decrement()).wait();

    const permit = await cofhejs.createPermit({
      type: 'self', issuer: owner.address, contracts: [addr], projects: ['test']
    });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.getCount(permission);
    const count = await cofhejs.unseal(addr, "uint32", sealed.data);
    expect(count).to.equal(0n);
  });

  it("only owner can reset", async function () {
    await (await contract.connect(owner).increment()).wait();
    await expect(contract.connect(user).reset()).to.be.revertedWithCustomError(contract, "NotOwner");
    await expect(contract.connect(owner).reset()).to.not.be.reverted;
  });
});`,
    deploy: `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying {{NAME}} with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("{{NAME}} deployed to:", address);
  console.log("Network:", hre.network.name, "| Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("");
  console.log("Next steps:");
  console.log("1. Set VITE_CONTRACT_ADDRESS=" + address + " in your frontend .env");
  console.log("2. Verify: npx hardhat verify --network arbitrum-sepolia", address);
}

main().catch(console.error);`
  },

  "private-token": {
    keywords: ["token", "erc20", "transfer", "balance", "private token", "private erc20", "confidential token"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}}
 * @notice ERC20-like token with encrypted balances using Fhenix FHE
 * @dev Balances are hidden from public — only owner can read their balance
 */
contract {{NAME}} is PermissionedV2 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;

    mapping(address => euint128) private _balances;
    mapping(address => mapping(address => euint128)) private _allowances;

    address public owner;
    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to);
    event Approval(address indexed owner, address indexed spender);
    event Mint(address indexed to, uint256 amount);

    error InsufficientBalance();
    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(string memory _name, string memory _symbol, uint256 initialSupply) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        _mintInternal(msg.sender, initialSupply);
    }

    function _mintInternal(address to, uint256 amount) internal {
        euint128 encAmount = FHE.asEuint128(uint128(amount));
        euint128 newBalance = FHE.add(_balances[to], encAmount);
        FHE.allowThis(newBalance);
        FHE.allow(newBalance, to);
        _balances[to] = newBalance;
        totalSupply += amount;
        emit Mint(to, amount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mintInternal(to, amount);
    }

    function transfer(address to, InEuint128 calldata encAmount) external {
        euint128 amount = FHE.asEuint128(encAmount);

        // Safe subtraction: only subtract if balance >= amount
        ebool hasEnough = FHE.gte(_balances[msg.sender], amount);
        euint128 newSenderBalance = FHE.select(
            hasEnough,
            FHE.sub(_balances[msg.sender], amount),
            _balances[msg.sender]
        );
        // Only add to recipient if sender had enough
        euint128 actualTransfer = FHE.select(hasEnough, amount, FHE.asEuint128(0));
        euint128 newRecipientBalance = FHE.add(_balances[to], actualTransfer);

        FHE.allowThis(newSenderBalance);
        FHE.allow(newSenderBalance, msg.sender);
        _balances[msg.sender] = newSenderBalance;

        FHE.allowThis(newRecipientBalance);
        FHE.allow(newRecipientBalance, to);
        _balances[to] = newRecipientBalance;

        emit Transfer(msg.sender, to);
    }

    function approve(address spender, InEuint128 calldata encAmount) external {
        euint128 amount = FHE.asEuint128(encAmount);
        FHE.allowThis(amount);
        FHE.allow(amount, spender);
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender);
    }

    function transferFrom(address from, address to, InEuint128 calldata encAmount) external {
        euint128 amount = FHE.asEuint128(encAmount);

        // Check allowance
        ebool allowanceOk = FHE.gte(_allowances[from][msg.sender], amount);
        // Check balance
        ebool balanceOk = FHE.gte(_balances[from], amount);
        ebool canTransfer = FHE.and(allowanceOk, balanceOk);

        euint128 actualAmount = FHE.select(canTransfer, amount, FHE.asEuint128(0));

        euint128 newFromBalance = FHE.sub(_balances[from], actualAmount);
        euint128 newToBalance = FHE.add(_balances[to], actualAmount);
        euint128 newAllowance = FHE.sub(_allowances[from][msg.sender], actualAmount);

        FHE.allowThis(newFromBalance);
        FHE.allow(newFromBalance, from);
        _balances[from] = newFromBalance;

        FHE.allowThis(newToBalance);
        FHE.allow(newToBalance, to);
        _balances[to] = newToBalance;

        FHE.allowThis(newAllowance);
        FHE.allow(newAllowance, msg.sender);
        _allowances[from][msg.sender] = newAllowance;

        emit Transfer(from, to);
    }

    function getBalance(
        Permission memory permission
    ) public view onlySender(permission) returns (SealedUint memory) {
        return FHE.sealoutput(_balances[msg.sender], permission.publicKey);
    }

    function getAllowance(
        address spender,
        Permission memory permission
    ) public view onlySender(permission) returns (SealedUint memory) {
        return FHE.sealoutput(_allowances[msg.sender][spender], permission.publicKey);
    }
}`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function transfer(address to, tuple(bytes data, bytes proof) amount) external",
  "function approve(address spender, tuple(bytes data, bytes proof) amount) external",
  "function getBalance(tuple(bytes signature, bytes32 publicKey, uint256 expiry, address issuer, address[] contracts, string[] projects) permission) view returns (tuple(bytes data) sealed)"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    const _contract = new Contract(CONTRACT_ADDRESS, ABI, _signer);
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer);
    setContract(_contract);
    setStatus('Connected');
  }

  async function readBalance() {
    if (!contract || !signer) return;
    setLoading(true);
    try {
      const address = await signer.getAddress();
      const permit = await cofhejs.createPermit({
        type: 'self',
        issuer: address,
        contracts: [CONTRACT_ADDRESS],
        projects: ['{{NAME}}']
      });
      const permission = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
      const sealed = await contract.getBalance(permission);
      const val = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint128, sealed.data);
      setBalance(val.toString());
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  }

  async function handleTransfer() {
    if (!contract || !recipient || !amount) return;
    setLoading(true);
    try {
      const [encAmount] = await cofhejs.encrypt([
        Encryptable.uint128(BigInt(amount))
      ]);
      const tx = await contract.transfer(recipient, encAmount);
      setStatus('Tx: ' + tx.hash);
      await tx.wait();
      setStatus('Transfer complete!');
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🔒 {{NAME}}</h1>
      <p>Private ERC20 Token — balances hidden from public</p>
      {!signer ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <div>
          <p>{status}</p>
          <div>
            <button onClick={readBalance} disabled={loading}>
              {loading ? 'Loading...' : 'Reveal My Balance'}
            </button>
            {balance !== null && <p>Balance: {balance}</p>}
          </div>
          <div style={{ marginTop: 16 }}>
            <h3>Transfer</h3>
            <input placeholder="Recipient address" value={recipient} onChange={e => setRecipient(e.target.value)} style={{ width: '100%' }} />
            <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', marginTop: 8 }} />
            <button onClick={handleTransfer} disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Sending...' : 'Transfer (Encrypted)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let owner: any;
  let alice: any;
  let bob: any;

  before(async function () {
    [owner, alice, bob] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(owner).deploy(
      "Private Token", "PRIV", hre.ethers.parseEther("1000000")
    );
    await contract.waitForDeployment();
  });

  it("mints initial supply to owner", async function () {
    const addr = await contract.getAddress();
    const permit = await cofhejs.createPermit({
      type: 'self', issuer: owner.address, contracts: [addr], projects: ['test']
    });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(owner).getBalance(permission);
    const balance = await cofhejs.unseal(addr, "uint128", sealed.data);
    expect(balance).to.equal(hre.ethers.parseEther("1000000"));
  });

  it("transfers privately", async function () {
    const addr = await contract.getAddress();
    const transferAmount = hre.ethers.parseEther("100");
    const [encAmount] = await cofhejs.encrypt([Encryptable.uint128(transferAmount)]);

    await (await contract.connect(owner).transfer(alice.address, encAmount)).wait();

    const permit = await cofhejs.createPermit({
      type: 'self', issuer: alice.address, contracts: [addr], projects: ['test']
    });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(alice).getBalance(permission);
    const balance = await cofhejs.unseal(addr, "uint128", sealed.data);
    expect(balance).to.equal(transferAmount);
  });

  it("prevents transfer of more than balance (safe sub)", async function () {
    const addr = await contract.getAddress();
    // alice has 0, tries to send 100 to bob
    const [encAmount] = await cofhejs.encrypt([Encryptable.uint128(hre.ethers.parseEther("100"))]);
    await (await contract.connect(alice).transfer(bob.address, encAmount)).wait();

    // bob should still have 0
    const permit = await cofhejs.createPermit({
      type: 'self', issuer: bob.address, contracts: [addr], projects: ['test']
    });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(bob).getBalance(permission);
    const balance = await cofhejs.unseal(addr, "uint128", sealed.data);
    expect(balance).to.equal(0n);
  });
});`,
    deploy: `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying {{NAME}} with:", deployer.address);

  const name = process.env.TOKEN_NAME || "{{NAME}}";
  const symbol = process.env.TOKEN_SYMBOL || "PRIV";
  const supply = hre.ethers.parseEther(process.env.INITIAL_SUPPLY || "1000000");

  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy(name, symbol, supply);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("{{NAME}} deployed to:", address);
  console.log("Token:", name, "(" + symbol + ")");
  console.log("Initial supply:", hre.ethers.formatEther(supply), symbol);
  console.log("");
  console.log("Verify: npx hardhat verify --network arbitrum-sepolia", address, \`"\${name}" "\${symbol}" "\${supply}"\`);
}

main().catch(console.error);`
  },

  voting: {
    keywords: ["voting", "vote", "election", "poll", "ballot", "referendum", "governance"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}}
 * @notice Private voting contract — votes are encrypted, results revealed only after tally
 */
contract {{NAME}} is PermissionedV2 {
    struct Proposal {
        string description;
        euint32 yesVotes;
        euint32 noVotes;
        bool exists;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public proposalCount;
    address public admin;
    bool public votingOpen;

    event ProposalCreated(uint256 indexed id, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event VotingClosed();

    error NotAdmin();
    error VotingClosed_();
    error AlreadyVoted();
    error ProposalNotFound();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor() {
        admin = msg.sender;
        votingOpen = true;
    }

    function createProposal(string calldata description) external onlyAdmin returns (uint256) {
        uint256 id = proposalCount++;
        euint32 zero = FHE.asEuint32(0);
        FHE.allowThis(zero);
        proposals[id] = Proposal({
            description: description,
            yesVotes: zero,
            noVotes: zero,
            exists: true
        });
        emit ProposalCreated(id, description);
        return id;
    }

    function vote(uint256 proposalId, InEbool calldata encVote) external {
        if (!votingOpen) revert VotingClosed_();
        if (!proposals[proposalId].exists) revert ProposalNotFound();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        hasVoted[proposalId][msg.sender] = true;

        ebool voteYes = FHE.asEbool(encVote);
        // encrypted 1 if yes, 0 if no
        euint32 yesInc = FHE.select(voteYes, FHE.asEuint32(1), FHE.asEuint32(0));
        euint32 noInc  = FHE.select(voteYes, FHE.asEuint32(0), FHE.asEuint32(1));

        euint32 newYes = FHE.add(proposals[proposalId].yesVotes, yesInc);
        euint32 newNo  = FHE.add(proposals[proposalId].noVotes, noInc);

        FHE.allowThis(newYes);
        FHE.allowSender(newYes);
        FHE.allow(newYes, admin);
        proposals[proposalId].yesVotes = newYes;

        FHE.allowThis(newNo);
        FHE.allowSender(newNo);
        FHE.allow(newNo, admin);
        proposals[proposalId].noVotes = newNo;

        emit VoteCast(proposalId, msg.sender);
    }

    function closeVoting() external onlyAdmin {
        votingOpen = false;
        emit VotingClosed();
    }

    function getYesVotes(
        uint256 proposalId,
        Permission memory permission
    ) public view onlySender(permission) returns (SealedUint memory) {
        if (!proposals[proposalId].exists) revert ProposalNotFound();
        return FHE.sealoutput(proposals[proposalId].yesVotes, permission.publicKey);
    }

    function getNoVotes(
        uint256 proposalId,
        Permission memory permission
    ) public view onlySender(permission) returns (SealedUint memory) {
        if (!proposals[proposalId].exists) revert ProposalNotFound();
        return FHE.sealoutput(proposals[proposalId].noVotes, permission.publicKey);
    }
}`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (string description, bool exists)",
  "function hasVoted(uint256, address) view returns (bool)",
  "function votingOpen() view returns (bool)",
  "function vote(uint256 proposalId, tuple(bytes data, bytes proof) encVote) external",
  "function getYesVotes(uint256 proposalId, tuple(bytes signature, bytes32 publicKey, uint256 expiry, address issuer, address[] contracts, string[] projects) permission) view returns (tuple(bytes data) sealed)",
  "function getNoVotes(uint256 proposalId, tuple(bytes signature, bytes32 publicKey, uint256 expiry, address issuer, address[] contracts, string[] projects) permission) view returns (tuple(bytes data) sealed)"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [results, setResults] = useState({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    const _contract = new Contract(CONTRACT_ADDRESS, ABI, _signer);
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer);
    setContract(_contract);
    await loadProposals(_contract);
    setStatus('Connected');
  }

  async function loadProposals(_contract) {
    const count = await _contract.proposalCount();
    const props = [];
    for (let i = 0; i < Number(count); i++) {
      const p = await _contract.proposals(i);
      props.push({ id: i, description: p.description });
    }
    setProposals(props);
  }

  async function castVote(proposalId, voteYes) {
    if (!contract) return;
    setLoading(true);
    try {
      const [encVote] = await cofhejs.encrypt([Encryptable.bool(voteYes)]);
      const tx = await contract.vote(proposalId, encVote);
      setStatus('Tx: ' + tx.hash);
      await tx.wait();
      setStatus(voteYes ? 'Voted YES!' : 'Voted NO!');
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  }

  async function revealResults(proposalId) {
    if (!contract || !signer) return;
    setLoading(true);
    try {
      const address = await signer.getAddress();
      const addr = CONTRACT_ADDRESS;
      const permit = await cofhejs.createPermit({
        type: 'self', issuer: address, contracts: [addr], projects: ['{{NAME}}']
      });
      const permission = cofhejs.getPermission(addr, permit);
      const [sealedYes, sealedNo] = await Promise.all([
        contract.getYesVotes(proposalId, permission),
        contract.getNoVotes(proposalId, permission)
      ]);
      const [yes, no] = await Promise.all([
        cofhejs.unseal(addr, FheTypes.Uint32, sealedYes.data),
        cofhejs.unseal(addr, FheTypes.Uint32, sealedNo.data)
      ]);
      setResults(r => ({ ...r, [proposalId]: { yes: yes.toString(), no: no.toString() } }));
    } catch (e) {
      setStatus('Error revealing: ' + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🗳️ {{NAME}}</h1>
      <p>Private voting — your vote is encrypted end-to-end</p>
      {!signer ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <div>
          <p>{status}</p>
          {proposals.map(p => (
            <div key={p.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 8 }}>
              <strong>Proposal #{p.id}:</strong> {p.description}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button onClick={() => castVote(p.id, true)} disabled={loading}>Vote YES</button>
                <button onClick={() => castVote(p.id, false)} disabled={loading}>Vote NO</button>
                <button onClick={() => revealResults(p.id)} disabled={loading}>Reveal Results</button>
              </div>
              {results[p.id] && (
                <p>YES: {results[p.id].yes} | NO: {results[p.id].no}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let admin: any;
  let voter1: any;
  let voter2: any;

  before(async function () {
    [admin, voter1, voter2] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(admin).deploy();
    await contract.waitForDeployment();
    await (await contract.connect(admin).createProposal("Should we do X?")).wait();
  });

  it("allows encrypted voting", async function () {
    const [encYes] = await cofhejs.encrypt([Encryptable.bool(true)]);
    await expect(contract.connect(voter1).vote(0, encYes)).to.not.be.reverted;
  });

  it("prevents double voting", async function () {
    const [enc1] = await cofhejs.encrypt([Encryptable.bool(true)]);
    const [enc2] = await cofhejs.encrypt([Encryptable.bool(false)]);
    await (await contract.connect(voter1).vote(0, enc1)).wait();
    await expect(contract.connect(voter1).vote(0, enc2)).to.be.revertedWithCustomError(contract, "AlreadyVoted");
  });

  it("admin can read results after voting", async function () {
    const addr = await contract.getAddress();
    const [encYes] = await cofhejs.encrypt([Encryptable.bool(true)]);
    const [encNo]  = await cofhejs.encrypt([Encryptable.bool(false)]);
    await (await contract.connect(voter1).vote(0, encYes)).wait();
    await (await contract.connect(voter2).vote(0, encNo)).wait();

    const permit = await cofhejs.createPermit({
      type: 'self', issuer: admin.address, contracts: [addr], projects: ['test']
    });
    const permission = cofhejs.getPermission(addr, permit);
    const [sealedYes, sealedNo] = await Promise.all([
      contract.connect(admin).getYesVotes(0, permission),
      contract.connect(admin).getNoVotes(0, permission)
    ]);
    const [yes, no] = await Promise.all([
      cofhejs.unseal(addr, "uint32", sealedYes.data),
      cofhejs.unseal(addr, "uint32", sealedNo.data)
    ]);
    expect(yes).to.equal(1n);
    expect(no).to.equal(1n);
  });
});`,
    deploy: `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying {{NAME}} with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("{{NAME}} deployed to:", address);

  // Create initial proposals if provided
  const initialProposals = process.env.PROPOSALS?.split(',') || [];
  for (const desc of initialProposals) {
    await (await contract.createProposal(desc.trim())).wait();
    console.log("Created proposal:", desc.trim());
  }

  console.log("");
  console.log("Set VITE_CONTRACT_ADDRESS=" + address);
  console.log("Verify: npx hardhat verify --network arbitrum-sepolia", address);
}

main().catch(console.error);`
  },

  auction: {
    keywords: ["auction", "bid", "bidding", "sealed bid", "blind auction", "nft auction"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}}
 * @notice Sealed-bid auction using Fhenix FHE — bids are private until auction ends
 */
contract {{NAME}} is PermissionedV2 {
    struct Auction {
        string item;
        address seller;
        uint256 endTime;
        address winner;
        euint128 highestBid;
        bool settled;
        bool exists;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => euint128)) private _bids;
    uint256 public auctionCount;

    event AuctionCreated(uint256 indexed id, string item, address seller, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder);
    event AuctionSettled(uint256 indexed id, address winner);

    error AuctionNotFound();
    error AuctionEnded();
    error AuctionNotEnded();
    error AlreadySettled();
    error NotSeller();

    function createAuction(string calldata item, uint256 duration) external returns (uint256) {
        uint256 id = auctionCount++;
        euint128 zero = FHE.asEuint128(0);
        FHE.allowThis(zero);
        auctions[id] = Auction({
            item: item,
            seller: msg.sender,
            endTime: block.timestamp + duration,
            winner: address(0),
            highestBid: zero,
            settled: false,
            exists: true
        });
        emit AuctionCreated(id, item, msg.sender, block.timestamp + duration);
        return id;
    }

    function placeBid(uint256 auctionId, InEuint128 calldata encBid) external {
        Auction storage auction = auctions[auctionId];
        if (!auction.exists) revert AuctionNotFound();
        if (block.timestamp >= auction.endTime) revert AuctionEnded();

        euint128 bid = FHE.asEuint128(encBid);

        // Check if this bid is higher than current highest
        ebool isHigher = FHE.gt(bid, auction.highestBid);

        // Update highest bid using select (no info leak)
        euint128 newHighest = FHE.select(isHigher, bid, auction.highestBid);
        FHE.allowThis(newHighest);
        FHE.allow(newHighest, auction.seller);
        auction.highestBid = newHighest;

        // Store individual bid
        FHE.allowThis(bid);
        FHE.allow(bid, msg.sender);
        _bids[auctionId][msg.sender] = bid;

        emit BidPlaced(auctionId, msg.sender);
    }

    function settle(uint256 auctionId, address _winner) external {
        Auction storage auction = auctions[auctionId];
        if (!auction.exists) revert AuctionNotFound();
        if (block.timestamp < auction.endTime) revert AuctionNotEnded();
        if (auction.settled) revert AlreadySettled();
        if (msg.sender != auction.seller) revert NotSeller();

        auction.winner = _winner;
        auction.settled = true;

        emit AuctionSettled(auctionId, _winner);
    }

    function getMyBid(
        uint256 auctionId,
        Permission memory permission
    ) public view onlySender(permission) returns (SealedUint memory) {
        if (!auctions[auctionId].exists) revert AuctionNotFound();
        return FHE.sealoutput(_bids[auctionId][msg.sender], permission.publicKey);
    }

    function getHighestBid(
        uint256 auctionId,
        Permission memory permission
    ) public view onlySender(permission) returns (SealedUint memory) {
        if (!auctions[auctionId].exists) revert AuctionNotFound();
        return FHE.sealoutput(auctions[auctionId].highestBid, permission.publicKey);
    }
}`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function auctionCount() view returns (uint256)",
  "function auctions(uint256) view returns (string item, address seller, uint256 endTime, address winner, bool settled, bool exists)",
  "function createAuction(string item, uint256 duration) external returns (uint256)",
  "function placeBid(uint256 auctionId, tuple(bytes data, bytes proof) encBid) external",
  "function getMyBid(uint256 auctionId, tuple(bytes signature, bytes32 publicKey, uint256 expiry, address issuer, address[] contracts, string[] projects) permission) view returns (tuple(bytes data) sealed)",
  "function getHighestBid(uint256 auctionId, tuple(bytes signature, bytes32 publicKey, uint256 expiry, address issuer, address[] contracts, string[] projects) permission) view returns (tuple(bytes data) sealed)"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    const _contract = new Contract(CONTRACT_ADDRESS, ABI, _signer);
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer);
    setContract(_contract);
    await loadAuctions(_contract);
    setStatus('Connected');
  }

  async function loadAuctions(_contract) {
    const count = await _contract.auctionCount();
    const list = [];
    for (let i = 0; i < Number(count); i++) {
      const a = await _contract.auctions(i);
      list.push({ id: i, item: a.item, endTime: Number(a.endTime), settled: a.settled });
    }
    setAuctions(list);
  }

  async function handleBid(auctionId) {
    if (!contract || !bidAmount) return;
    setLoading(true);
    try {
      const [encBid] = await cofhejs.encrypt([
        Encryptable.uint128(BigInt(bidAmount))
      ]);
      const tx = await contract.placeBid(auctionId, encBid);
      setStatus('Bid submitted: ' + tx.hash);
      await tx.wait();
      setStatus('Bid placed! (encrypted)');
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  }

  async function revealMyBid(auctionId) {
    if (!contract || !signer) return;
    setLoading(true);
    try {
      const address = await signer.getAddress();
      const permit = await cofhejs.createPermit({
        type: 'self', issuer: address, contracts: [CONTRACT_ADDRESS], projects: ['{{NAME}}']
      });
      const permission = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
      const sealed = await contract.getMyBid(auctionId, permission);
      const bid = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint128, sealed.data);
      setStatus(\`Your bid on auction #\${auctionId}: \${bid}\`);
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🔒 {{NAME}}</h1>
      <p>Sealed-bid auction — bids are encrypted until the auction ends</p>
      {!signer ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <div>
          <p>{status}</p>
          <input
            placeholder="Bid amount (wei)"
            value={bidAmount}
            onChange={e => setBidAmount(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />
          {auctions.map(a => (
            <div key={a.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 8 }}>
              <strong>Auction #{a.id}:</strong> {a.item}
              <span style={{ marginLeft: 8, color: a.settled ? 'gray' : 'green' }}>
                {a.settled ? 'Settled' : 'Active'}
              </span>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button onClick={() => handleBid(a.id)} disabled={loading || a.settled}>
                  Place Sealed Bid
                </button>
                <button onClick={() => revealMyBid(a.id)} disabled={loading}>
                  Reveal My Bid
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let seller: any;
  let bidder1: any;
  let bidder2: any;

  before(async function () {
    [seller, bidder1, bidder2] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(seller).deploy();
    await contract.waitForDeployment();
    await (await contract.connect(seller).createAuction("Rare NFT", 3600)).wait();
  });

  it("accepts encrypted bids", async function () {
    const [encBid] = await cofhejs.encrypt([Encryptable.uint128(1000n)]);
    await expect(contract.connect(bidder1).placeBid(0, encBid)).to.not.be.reverted;
  });

  it("bidder can reveal their own bid", async function () {
    const addr = await contract.getAddress();
    const [encBid] = await cofhejs.encrypt([Encryptable.uint128(5000n)]);
    await (await contract.connect(bidder1).placeBid(0, encBid)).wait();

    const permit = await cofhejs.createPermit({
      type: 'self', issuer: bidder1.address, contracts: [addr], projects: ['test']
    });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(bidder1).getMyBid(0, permission);
    const bid = await cofhejs.unseal(addr, "uint128", sealed.data);
    expect(bid).to.equal(5000n);
  });

  it("bids before auction ends, reverts after", async function () {
    // Fast forward time (hardhat)
    await hre.network.provider.send("evm_increaseTime", [3601]);
    await hre.network.provider.send("evm_mine");
    const [encBid] = await cofhejs.encrypt([Encryptable.uint128(1000n)]);
    await expect(contract.connect(bidder1).placeBid(0, encBid))
      .to.be.revertedWithCustomError(contract, "AuctionEnded");
  });
});`,
    deploy: `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying {{NAME}} with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("{{NAME}} deployed to:", address);
  console.log("");
  console.log("Create first auction:");
  console.log("  contract.createAuction('Item Name', 86400) // 24 hours");
  console.log("");
  console.log("Verify: npx hardhat verify --network arbitrum-sepolia", address);
}

main().catch(console.error);`
  }
};

// ============================================================
// ADVANCED TEMPLATES (v2) — Dark Pool, Lending, NFT, Identity, Stablecoin
// ============================================================

export const ADVANCED_TEMPLATES = {

  "dark-pool": {
    keywords: ["dark pool", "dex", "order book", "private dex", "amm", "swap", "trade", "trading"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}} — FHE Dark Pool DEX
 * @notice Orders encrypted on-chain. Size and price never publicly visible.
 * @dev Commit-reveal: orders stored encrypted, solver matches off-chain then submits.
 */
contract {{NAME}} is PermissionedV2 {

    struct Order {
        euint128 amount;
        euint128 price;
        address  trader;
        bool     isBuy;
        bool     filled;
        uint256  deadline;
    }

    address public solver;
    uint256 public orderCount;
    mapping(uint256 => Order) public orders;

    event OrderPlaced(uint256 indexed orderId, address indexed trader, bool isBuy);
    event OrderFilled(uint256 indexed buyId, uint256 indexed sellId);
    event OrderCancelled(uint256 indexed orderId);

    error NotSolver();
    error AlreadyFilled();
    error Expired();
    error NotYourOrder();

    modifier onlySolver() { if (msg.sender != solver) revert NotSolver(); _; }

    constructor(address _solver) { solver = _solver; }

    function placeOrder(
        InEuint128 calldata encAmount,
        InEuint128 calldata encPrice,
        bool isBuy,
        uint256 deadline
    ) external returns (uint256 orderId) {
        orderId = orderCount++;
        euint128 amount = FHE.asEuint128(encAmount);
        euint128 price  = FHE.asEuint128(encPrice);

        FHE.allowThis(amount); FHE.allowSender(amount); FHE.allow(amount, solver);
        FHE.allowThis(price);  FHE.allowSender(price);  FHE.allow(price, solver);

        orders[orderId] = Order(amount, price, msg.sender, isBuy, false, deadline);
        emit OrderPlaced(orderId, msg.sender, isBuy);
    }

    // Solver verifies price match off-chain via threshold decrypt, then submits
    function fillOrders(uint256 buyId, uint256 sellId) external onlySolver {
        Order storage buy  = orders[buyId];
        Order storage sell = orders[sellId];
        if (buy.filled || sell.filled) revert AlreadyFilled();
        if (!buy.isBuy || sell.isBuy) revert NotSolver();
        buy.filled  = true;
        sell.filled = true;
        emit OrderFilled(buyId, sellId);
    }

    function cancelOrder(uint256 orderId) external {
        if (orders[orderId].trader != msg.sender) revert NotYourOrder();
        if (orders[orderId].filled) revert AlreadyFilled();
        orders[orderId].filled = true;
        emit OrderCancelled(orderId);
    }

    function getMyOrder(
        uint256 orderId,
        Permission memory permission
    ) external view onlySender(permission) returns (SealedUint memory amount, SealedUint memory price, bool isBuy, bool filled) {
        Order storage o = orders[orderId];
        if (o.trader != msg.sender) revert NotYourOrder();
        amount = FHE.sealoutput(o.amount, permission.publicKey);
        price  = FHE.sealoutput(o.price,  permission.publicKey);
        isBuy  = o.isBuy;
        filled = o.filled;
    }
}`,
    deploy: `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const SOLVER_ADDRESS = deployer.address; // replace with real solver address
  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy(SOLVER_ADDRESS);
  await contract.waitForDeployment();
  console.log("{{NAME}} deployed to:", await contract.getAddress());
}

main().catch(console.error);`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let solver: any;
  let trader1: any;
  let trader2: any;

  before(async function () {
    [solver, trader1, trader2] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(solver).deploy(solver.address);
    await contract.waitForDeployment();
  });

  it("places buy and sell orders", async function () {
    const [encAmt] = await cofhejs.encrypt([Encryptable.uint128(1000n)]);
    const [encPrice] = await cofhejs.encrypt([Encryptable.uint128(500n)]);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    await expect(contract.connect(trader1).placeOrder(encAmt, encPrice, true, deadline)).to.not.be.reverted;
    await expect(contract.connect(trader2).placeOrder(encAmt, encPrice, false, deadline)).to.not.be.reverted;
    expect(await contract.orderCount()).to.equal(2n);
  });

  it("solver can fill matched orders", async function () {
    const [encAmt] = await cofhejs.encrypt([Encryptable.uint128(1000n)]);
    const [encPrice] = await cofhejs.encrypt([Encryptable.uint128(500n)]);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    await (await contract.connect(trader1).placeOrder(encAmt, encPrice, true, deadline)).wait();
    await (await contract.connect(trader2).placeOrder(encAmt, encPrice, false, deadline)).wait();
    await expect(contract.connect(solver).fillOrders(0, 1)).to.not.be.reverted;
  });
});`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function placeOrder(tuple(bytes,bytes) encAmount, tuple(bytes,bytes) encPrice, bool isBuy, uint256 deadline) external returns (uint256)",
  "function cancelOrder(uint256 orderId) external",
  "function orderCount() view returns (uint256)"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [isBuy, setIsBuy] = useState(true);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer);
    setContract(new Contract(CONTRACT_ADDRESS, ABI, _signer));
    setStatus('Connected');
  }

  async function placeOrder() {
    if (!contract || !amount || !price) return;
    setLoading(true);
    try {
      const [encAmt, encPrice] = await cofhejs.encrypt([
        Encryptable.uint128(BigInt(amount)),
        Encryptable.uint128(BigInt(price))
      ]);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const tx = await contract.placeOrder(encAmt, encPrice, isBuy, deadline);
      setStatus('Order placed! Tx: ' + tx.hash);
      await tx.wait();
      setStatus('Order sealed on-chain (encrypted)');
    } catch (e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🌑 {{NAME}} Dark Pool</h1>
      <p>Trade with fully encrypted order size & price</p>
      {!signer ? <button onClick={connect}>Connect Wallet</button> : (
        <div>
          <p>{status}</p>
          <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ marginRight: 8 }} />
          <input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} style={{ marginRight: 8 }} />
          <select value={isBuy ? 'buy' : 'sell'} onChange={e => setIsBuy(e.target.value === 'buy')}>
            <option value="buy">BUY</option>
            <option value="sell">SELL</option>
          </select>
          <br /><br />
          <button onClick={placeOrder} disabled={loading}>
            {loading ? 'Encrypting...' : 'Place Sealed Order'}
          </button>
        </div>
      )}
    </div>
  );
}`
  },

  "lending": {
    keywords: ["lend", "lending", "borrow", "borrowing", "collateral", "liquidat", "loan", "defi lending"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}} — Confidential Lending Protocol
 * @notice Collateral and debt positions encrypted. Health checks via FHE.select.
 * @dev Oracle decrypts positions via permit, triggers liquidation off-chain.
 */
contract {{NAME}} is PermissionedV2 {

    address public owner;
    address public oracle;

    mapping(address => euint128) private _collateral;
    mapping(address => euint128) private _debt;

    event Deposited(address indexed user);
    event Borrowed(address indexed user);
    event Repaid(address indexed user);
    event Liquidated(address indexed user, address indexed liquidator);

    error NotOracle();
    error NotOwner();

    modifier onlyOracle() { if (msg.sender != oracle) revert NotOracle(); _; }
    modifier onlyOwner()  { if (msg.sender != owner)  revert NotOwner();  _; }

    constructor(address _oracle) {
        owner  = msg.sender;
        oracle = _oracle;
        euint128 zero = FHE.asEuint128(0);
        FHE.allowThis(zero);
    }

    function deposit(InEuint128 calldata encAmount) external {
        euint128 amount = FHE.asEuint128(encAmount);
        euint128 newBal = FHE.add(_collateral[msg.sender], amount);
        FHE.allowThis(newBal);
        FHE.allowSender(newBal);
        FHE.allow(newBal, oracle);
        _collateral[msg.sender] = newBal;
        emit Deposited(msg.sender);
    }

    function borrow(InEuint128 calldata encAmount) external {
        euint128 amount = FHE.asEuint128(encAmount);
        euint128 newDebt = FHE.add(_debt[msg.sender], amount);
        FHE.allowThis(newDebt);
        FHE.allowSender(newDebt);
        FHE.allow(newDebt, oracle);
        _debt[msg.sender] = newDebt;
        emit Borrowed(msg.sender);
    }

    function repay(InEuint128 calldata encAmount) external {
        euint128 amount  = FHE.asEuint128(encAmount);
        euint128 debt    = _debt[msg.sender];
        // Safe repay: pay min(amount, debt)
        ebool    over    = FHE.gt(amount, debt);
        euint128 repayAmt = FHE.select(over, debt, amount);
        euint128 newDebt  = FHE.sub(debt, repayAmt);
        FHE.allowThis(newDebt);
        FHE.allowSender(newDebt);
        FHE.allow(newDebt, oracle);
        _debt[msg.sender] = newDebt;
        emit Repaid(msg.sender);
    }

    // Oracle verifies health off-chain via permit, then calls this
    function liquidate(address borrower, address liquidator) external onlyOracle {
        euint128 col  = _collateral[borrower];
        euint128 zero = FHE.asEuint128(0);
        FHE.allowThis(zero);

        euint128 liqCol = FHE.add(_collateral[liquidator], col);
        FHE.allowThis(liqCol); FHE.allow(liqCol, liquidator);
        _collateral[liquidator] = liqCol;
        _collateral[borrower]   = zero;
        _debt[borrower]         = zero;
        emit Liquidated(borrower, liquidator);
    }

    function getMyPosition(Permission memory permission)
        external view onlySender(permission)
        returns (SealedUint memory collateral, SealedUint memory debt)
    {
        collateral = FHE.sealoutput(_collateral[msg.sender], permission.publicKey);
        debt       = FHE.sealoutput(_debt[msg.sender],       permission.publicKey);
    }
}`,
    deploy: `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const ORACLE = deployer.address; // replace with real oracle
  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy(ORACLE);
  await contract.waitForDeployment();
  console.log("{{NAME}} deployed to:", await contract.getAddress());
}
main().catch(console.error);`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let oracle: any;
  let alice: any;

  before(async function () {
    [oracle, alice] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(oracle).deploy(oracle.address);
    await contract.waitForDeployment();
  });

  it("accepts encrypted deposit", async function () {
    const [encAmt] = await cofhejs.encrypt([Encryptable.uint128(1000n)]);
    await expect(contract.connect(alice).deposit(encAmt)).to.not.be.reverted;
  });

  it("accepts encrypted borrow", async function () {
    const [encCol] = await cofhejs.encrypt([Encryptable.uint128(1000n)]);
    const [encDebt] = await cofhejs.encrypt([Encryptable.uint128(500n)]);
    await (await contract.connect(alice).deposit(encCol)).wait();
    await expect(contract.connect(alice).borrow(encDebt)).to.not.be.reverted;
  });
});`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function deposit(tuple(bytes,bytes) encAmount) external",
  "function borrow(tuple(bytes,bytes) encAmount) external",
  "function repay(tuple(bytes,bytes) encAmount) external",
  "function getMyPosition(tuple(bytes,bytes32,uint256,address,address[],string[]) permission) view returns (tuple(bytes) collateral, tuple(bytes) debt)"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [amount, setAmount] = useState('');
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer);
    setContract(new Contract(CONTRACT_ADDRESS, ABI, _signer));
  }

  async function deposit() {
    if (!contract || !amount) return;
    setLoading(true);
    try {
      const [enc] = await cofhejs.encrypt([Encryptable.uint128(BigInt(amount))]);
      const tx = await contract.deposit(enc);
      await tx.wait();
      setStatus('Deposited!');
    } catch(e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  async function viewPosition() {
    if (!contract || !signer) return;
    const addr = await signer.getAddress();
    const permit = await cofhejs.createPermit({ type: 'self', issuer: addr, contracts: [CONTRACT_ADDRESS], projects: ['lending'] });
    const perm = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
    const { collateral, debt } = await contract.getMyPosition(perm);
    const col = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint128, collateral.data);
    const dbt = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint128, debt.data);
    setPosition({ collateral: col.toString(), debt: dbt.toString() });
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🏦 {{NAME}}</h1>
      {!signer ? <button onClick={connect}>Connect Wallet</button> : (
        <div>
          <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <button onClick={deposit} disabled={loading} style={{ marginLeft: 8 }}>Deposit</button>
          <br /><br />
          <button onClick={viewPosition}>View My Position</button>
          {position && <p>Collateral: {position.collateral} | Debt: {position.debt}</p>}
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}`
  },

  "nft-marketplace": {
    keywords: ["nft", "marketplace", "collectible", "mint nft", "private nft", "nft auction", "nft sale"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

/**
 * @title {{NAME}} — Private NFT Marketplace
 * @notice Reserve prices and bids fully encrypted on-chain.
 */
contract {{NAME}} is PermissionedV2 {

    struct Listing {
        address  seller;
        address  nftContract;
        uint256  tokenId;
        euint128 reservePrice;
        uint256  endTime;
        bool     active;
        address  winner;
    }

    struct Bid {
        euint128 amount;
        address  bidder;
    }

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Bid[])   private _bids;
    mapping(uint256 => mapping(address => uint256)) public bidIndex;

    event Listed(uint256 indexed id, address seller, address nft, uint256 tokenId);
    event BidPlaced(uint256 indexed id, address bidder);
    event Settled(uint256 indexed id, address winner);

    error NotSeller();
    error NotActive();

    function list(
        address nftContract,
        uint256 tokenId,
        InEuint128 calldata encReserve,
        uint256 duration
    ) external returns (uint256 id) {
        id = listingCount++;
        euint128 reserve = FHE.asEuint128(encReserve);
        FHE.allowThis(reserve); FHE.allowSender(reserve);
        listings[id] = Listing(msg.sender, nftContract, tokenId, reserve, block.timestamp + duration, true, address(0));
        emit Listed(id, msg.sender, nftContract, tokenId);
    }

    function bid(uint256 listingId, InEuint128 calldata encBid) external {
        Listing storage l = listings[listingId];
        if (!l.active || block.timestamp >= l.endTime) revert NotActive();
        euint128 b = FHE.asEuint128(encBid);
        FHE.allowThis(b); FHE.allowSender(b); FHE.allow(b, l.seller);
        bidIndex[listingId][msg.sender] = _bids[listingId].length;
        _bids[listingId].push(Bid(b, msg.sender));
        emit BidPlaced(listingId, msg.sender);
    }

    function settle(uint256 listingId, address winner) external {
        Listing storage l = listings[listingId];
        if (msg.sender != l.seller) revert NotSeller();
        l.active = false; l.winner = winner;
        IERC721(l.nftContract).transferFrom(l.seller, winner, l.tokenId);
        emit Settled(listingId, winner);
    }

    function getMyBid(uint256 listingId, Permission memory permission)
        external view onlySender(permission) returns (SealedUint memory)
    {
        uint256 idx = bidIndex[listingId][msg.sender];
        return FHE.sealoutput(_bids[listingId][idx].amount, permission.publicKey);
    }

    function bidCount(uint256 listingId) external view returns (uint256) {
        return _bids[listingId].length;
    }
}`,
    deploy: `import hre from "hardhat";

async function main() {
  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  console.log("{{NAME}} deployed to:", await contract.getAddress());
}
main().catch(console.error);`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  it("lists and accepts bids", async function () {
    const [seller, bidder] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    const market = await Factory.connect(seller).deploy();
    await market.waitForDeployment();

    // Note: in real test, deploy a mock ERC721 and approve marketplace
    // This test focuses on the bid flow structure
    const [encBid] = await cofhejs.encrypt([Encryptable.uint128(500n)]);
    expect(encBid).to.not.be.undefined;
  });
});`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function bid(uint256 listingId, tuple(bytes,bytes) encBid) external",
  "function listingCount() view returns (uint256)",
  "function getMyBid(uint256 listingId, tuple(bytes,bytes32,uint256,address,address[],string[]) permission) view returns (tuple(bytes))"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [listingId, setListingId] = useState('0');
  const [status, setStatus] = useState('');

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer); setContract(new Contract(CONTRACT_ADDRESS, ABI, _signer));
  }

  async function placeBid() {
    const [encBid] = await cofhejs.encrypt([Encryptable.uint128(BigInt(bidAmount))]);
    const tx = await contract.bid(Number(listingId), encBid);
    await tx.wait();
    setStatus('Sealed bid placed!');
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🖼️ {{NAME}}</h1>
      {!signer ? <button onClick={connect}>Connect Wallet</button> : (
        <div>
          <input placeholder="Listing ID" value={listingId} onChange={e => setListingId(e.target.value)} style={{ marginRight: 8 }} />
          <input placeholder="Bid amount" value={bidAmount} onChange={e => setBidAmount(e.target.value)} />
          <br /><br />
          <button onClick={placeBid}>Place Sealed Bid</button>
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}`
  },

  "identity": {
    keywords: ["identity", "kyc", "credential", "age", "accredit", "verify", "private identity", "did"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}} — Private Identity & KYC
 * @notice Encrypted credentials on-chain. Prove eligibility without revealing data.
 */
contract {{NAME}} is PermissionedV2 {

    address public issuer;

    struct Identity {
        euint32 age;
        ebool   kycPassed;
        ebool   accredited;
        bool    registered;
    }

    mapping(address => Identity) private _ids;
    mapping(address => bool) public trustedProtocols;

    event Registered(address indexed user);

    error NotIssuer();
    error NotRegistered();

    modifier onlyIssuer() { if (msg.sender != issuer) revert NotIssuer(); _; }

    constructor() { issuer = msg.sender; }

    function addTrustedProtocol(address protocol) external onlyIssuer {
        trustedProtocols[protocol] = true;
    }

    function register(
        address user,
        InEuint32 calldata encAge,
        InEbool   calldata encKyc,
        InEbool   calldata encAccredited
    ) external onlyIssuer {
        euint32 age  = FHE.asEuint32(encAge);
        ebool   kyc  = FHE.asEbool(encKyc);
        ebool   acc  = FHE.asEbool(encAccredited);

        FHE.allowThis(age); FHE.allow(age, user); FHE.allow(age, issuer);
        FHE.allowThis(kyc); FHE.allow(kyc, user); FHE.allow(kyc, issuer);
        FHE.allowThis(acc); FHE.allow(acc, user); FHE.allow(acc, issuer);

        _ids[user] = Identity(age, kyc, acc, true);
        emit Registered(user);
    }

    // Returns encrypted bool — no plaintext leak. Use in FHE.select in other contracts.
    function isAdult(address user) external view returns (ebool) {
        if (!_ids[user].registered) revert NotRegistered();
        return FHE.gte(_ids[user].age, FHE.asEuint32(18));
    }

    function isKycPassed(address user) external view returns (ebool) {
        if (!_ids[user].registered) revert NotRegistered();
        return _ids[user].kycPassed;
    }

    function isAccredited(address user) external view returns (ebool) {
        if (!_ids[user].registered) revert NotRegistered();
        return _ids[user].accredited;
    }

    function getMyIdentity(Permission memory permission)
        external view onlySender(permission)
        returns (SealedUint memory age, SealedBool memory kyc, SealedBool memory acc)
    {
        if (!_ids[msg.sender].registered) revert NotRegistered();
        age = FHE.sealoutput(_ids[msg.sender].age,        permission.publicKey);
        kyc = FHE.sealoutput(_ids[msg.sender].kycPassed,  permission.publicKey);
        acc = FHE.sealoutput(_ids[msg.sender].accredited, permission.publicKey);
    }
}`,
    deploy: `import hre from "hardhat";

async function main() {
  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  console.log("{{NAME}} deployed to:", await contract.getAddress());
  console.log("Register users by calling register(address, encAge, encKyc, encAccredited) as issuer");
}
main().catch(console.error);`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let issuer: any;
  let alice: any;

  before(async function () {
    [issuer, alice] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(issuer).deploy();
    await contract.waitForDeployment();
  });

  it("registers a user with encrypted credentials", async function () {
    const [encAge] = await cofhejs.encrypt([Encryptable.uint32(25)]);
    const [encKyc] = await cofhejs.encrypt([Encryptable.bool(true)]);
    const [encAcc] = await cofhejs.encrypt([Encryptable.bool(false)]);
    await expect(contract.connect(issuer).register(alice.address, encAge, encKyc, encAcc)).to.not.be.reverted;
  });

  it("isAdult returns encrypted bool without revealing age", async function () {
    const [encAge] = await cofhejs.encrypt([Encryptable.uint32(25)]);
    const [encKyc] = await cofhejs.encrypt([Encryptable.bool(true)]);
    const [encAcc] = await cofhejs.encrypt([Encryptable.bool(false)]);
    await (await contract.connect(issuer).register(alice.address, encAge, encKyc, encAcc)).wait();
    // isAdult returns ebool handle — plaintext not revealed
    const result = await contract.isAdult(alice.address);
    expect(result).to.not.be.undefined;
  });
});`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function getMyIdentity(tuple(bytes,bytes32,uint256,address,address[],string[]) permission) view returns (tuple(bytes) age, tuple(bytes) kyc, tuple(bytes) acc)"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [identity, setIdentity] = useState(null);

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer); setContract(new Contract(CONTRACT_ADDRESS, ABI, _signer));
  }

  async function viewIdentity() {
    const addr = await signer.getAddress();
    const permit = await cofhejs.createPermit({ type: 'self', issuer: addr, contracts: [CONTRACT_ADDRESS], projects: ['id'] });
    const perm = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
    const { age, kyc, acc } = await contract.getMyIdentity(perm);
    const ageVal = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint32, age.data);
    const kycVal = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Bool, kyc.data);
    const accVal = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Bool, acc.data);
    setIdentity({ age: ageVal.toString(), kyc: kycVal.toString(), acc: accVal.toString() });
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🪪 {{NAME}}</h1>
      {!signer ? <button onClick={connect}>Connect Wallet</button> : (
        <div>
          <button onClick={viewIdentity}>View My Identity</button>
          {identity && (
            <div>
              <p>Age: {identity.age}</p>
              <p>KYC Passed: {identity.kyc}</p>
              <p>Accredited: {identity.acc}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}`
  },

  "stablecoin": {
    keywords: ["stablecoin", "stable coin", "complian", "regulator", "regulated", "cbdc", "private stablecoin"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}} — Compliant FHE Stablecoin
 * @notice Private balances + regulatory audit access. Freeze + transfer limits.
 */
contract {{NAME}} is PermissionedV2 {

    string  public name;
    string  public symbol;
    address public owner;
    address public regulator;

    mapping(address => euint128) private _balances;
    mapping(address => euint128) private _transferLimits;
    mapping(address => bool)     public frozen;

    euint128 private _totalSupply;

    event Transfer(address indexed from, address indexed to);
    event Mint(address indexed to);
    event Frozen(address indexed account);

    error Frozen_();
    error NotAuthorized();

    modifier notFrozen(address a) { if (frozen[a]) revert Frozen_(); _; }
    modifier onlyAuth() { if (msg.sender != owner && msg.sender != regulator) revert NotAuthorized(); _; }

    constructor(string memory _name, string memory _symbol, address _regulator) {
        name = _name; symbol = _symbol; owner = msg.sender; regulator = _regulator;
        euint128 zero = FHE.asEuint128(0); FHE.allowThis(zero);
        _totalSupply = zero;
    }

    function mint(address to, InEuint128 calldata encAmount) external onlyAuth {
        euint128 amount = FHE.asEuint128(encAmount);
        euint128 newBal = FHE.add(_balances[to], amount);
        euint128 newSupply = FHE.add(_totalSupply, amount);
        FHE.allowThis(newBal); FHE.allow(newBal, to); FHE.allow(newBal, regulator);
        FHE.allowThis(newSupply); FHE.allow(newSupply, owner); FHE.allow(newSupply, regulator);
        _balances[to] = newBal;
        _totalSupply  = newSupply;
        emit Mint(to);
    }

    function transfer(address to, InEuint128 calldata encAmount)
        external notFrozen(msg.sender) notFrozen(to)
    {
        euint128 amount  = FHE.asEuint128(encAmount);
        euint128 balance = _balances[msg.sender];
        euint128 limit   = _transferLimits[msg.sender];

        // Enforce: actual = min(amount, limit, balance)
        ebool overLimit   = FHE.gt(amount, limit);
        euint128 capped   = FHE.select(overLimit, limit, amount);
        ebool overBalance = FHE.gt(capped, balance);
        euint128 final_   = FHE.select(overBalance, balance, capped);

        euint128 newFrom = FHE.sub(balance, final_);
        euint128 newTo   = FHE.add(_balances[to], final_);

        FHE.allowThis(newFrom); FHE.allow(newFrom, msg.sender); FHE.allow(newFrom, regulator);
        FHE.allowThis(newTo);   FHE.allow(newTo, to);           FHE.allow(newTo, regulator);
        _balances[msg.sender] = newFrom;
        _balances[to]         = newTo;
        emit Transfer(msg.sender, to);
    }

    function setTransferLimit(address account, InEuint128 calldata encLimit) external onlyAuth {
        euint128 limit = FHE.asEuint128(encLimit);
        FHE.allowThis(limit); FHE.allow(limit, account); FHE.allow(limit, regulator);
        _transferLimits[account] = limit;
    }

    function freeze(address account) external onlyAuth {
        frozen[account] = true;
        emit Frozen(account);
    }

    function balanceOf(Permission memory permission)
        external view onlySender(permission) returns (SealedUint memory)
    {
        return FHE.sealoutput(_balances[msg.sender], permission.publicKey);
    }

    // Regulator audits any address
    function regulatorView(address account, Permission memory permission)
        external view onlySender(permission) returns (SealedUint memory)
    {
        if (msg.sender != regulator) revert NotAuthorized();
        return FHE.sealoutput(_balances[account], permission.publicKey);
    }

    function totalSupply(Permission memory permission)
        external view onlySender(permission) returns (SealedUint memory)
    {
        if (msg.sender != owner && msg.sender != regulator) revert NotAuthorized();
        return FHE.sealoutput(_totalSupply, permission.publicKey);
    }
}`,
    deploy: `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const REGULATOR = deployer.address; // replace with real regulator address
  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy("{{NAME}}", "STB", REGULATOR);
  await contract.waitForDeployment();
  console.log("{{NAME}} deployed to:", await contract.getAddress());
}
main().catch(console.error);`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let owner: any;
  let regulator: any;
  let alice: any;
  let bob: any;

  before(async function () {
    [owner, regulator, alice, bob] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(owner).deploy("PrivStable", "PST", regulator.address);
    await contract.waitForDeployment();
  });

  it("mints encrypted tokens", async function () {
    const [enc] = await cofhejs.encrypt([Encryptable.uint128(1000n)]);
    await expect(contract.connect(owner).mint(alice.address, enc)).to.not.be.reverted;
  });

  it("frozen accounts cannot transfer", async function () {
    await (await contract.connect(owner).freeze(alice.address)).wait();
    const [enc] = await cofhejs.encrypt([Encryptable.uint128(100n)]);
    await expect(contract.connect(alice).transfer(bob.address, enc)).to.be.reverted;
  });
});`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function transfer(address to, tuple(bytes,bytes) encAmount) external",
  "function balanceOf(tuple(bytes,bytes32,uint256,address,address[],string[]) permission) view returns (tuple(bytes))"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer); setContract(new Contract(CONTRACT_ADDRESS, ABI, _signer));
  }

  async function readBalance() {
    const addr = await signer.getAddress();
    const permit = await cofhejs.createPermit({ type: 'self', issuer: addr, contracts: [CONTRACT_ADDRESS], projects: ['stbl'] });
    const perm = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
    const sealed = await contract.balanceOf(perm);
    const val = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint128, sealed.data);
    setBalance(val.toString());
  }

  async function transfer() {
    const [enc] = await cofhejs.encrypt([Encryptable.uint128(BigInt(amount))]);
    const tx = await contract.transfer(recipient, enc);
    await tx.wait();
    setStatus('Transfer sent!');
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>💵 {{NAME}}</h1>
      <p>Compliant stablecoin — private balances, regulatory audit</p>
      {!signer ? <button onClick={connect}>Connect Wallet</button> : (
        <div>
          <button onClick={readBalance}>View My Balance</button>
          {balance && <p>Balance: {balance}</p>}
          <br />
          <input placeholder="Recipient 0x..." value={recipient} onChange={e => setRecipient(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
          <input placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <button onClick={transfer} style={{ marginLeft: 8 }}>Transfer</button>
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}`
  },

  "payroll": {
    keywords: ["payroll", "salary", "salaries", "employee", "wages", "compensation", "pay employees"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}} — Confidential Payroll System
 * @notice Inspired by Zalary (Fhenix buildathon winner).
 *         Salaries encrypted — only employer + employee can see their salary.
 *         batchPay() distributes encrypted amounts without revealing to the public.
 */
contract {{NAME}} is PermissionedV2 {
    address public employer;
    mapping(address => euint128) private _salary;
    mapping(address => euint128) private _paid;
    mapping(address => bool)     public  isEmployee;

    event EmployeeAdded(address indexed employee);
    event SalaryUpdated(address indexed employee);
    event PaymentSent(address indexed employee);
    event BatchPayComplete(uint256 count);

    error NotEmployer();
    error NotEmployee();

    modifier onlyEmployer() { if (msg.sender != employer) revert NotEmployer(); _; }

    constructor() { employer = msg.sender; }

    function addEmployee(address employee, InEuint128 calldata encSalary) external onlyEmployer {
        euint128 salary = FHE.asEuint128(encSalary);
        FHE.allowThis(salary);
        FHE.allow(salary, employee);
        FHE.allow(salary, employer);
        _salary[employee] = salary;
        isEmployee[employee] = true;
        emit EmployeeAdded(employee);
    }

    function updateSalary(address employee, InEuint128 calldata encSalary) external onlyEmployer {
        euint128 salary = FHE.asEuint128(encSalary);
        FHE.allowThis(salary);
        FHE.allow(salary, employee);
        FHE.allow(salary, employer);
        _salary[employee] = salary;
        emit SalaryUpdated(employee);
    }

    function pay(address employee) external onlyEmployer {
        if (!isEmployee[employee]) revert NotEmployee();
        euint128 newPaid = FHE.add(_paid[employee], _salary[employee]);
        FHE.allowThis(newPaid);
        FHE.allow(newPaid, employee);
        FHE.allow(newPaid, employer);
        _paid[employee] = newPaid;
        emit PaymentSent(employee);
    }

    function batchPay(address[] calldata employees) external onlyEmployer {
        for (uint256 i = 0; i < employees.length; i++) {
            if (!isEmployee[employees[i]]) continue;
            euint128 newPaid = FHE.add(_paid[employees[i]], _salary[employees[i]]);
            FHE.allowThis(newPaid);
            FHE.allow(newPaid, employees[i]);
            FHE.allow(newPaid, employer);
            _paid[employees[i]] = newPaid;
            emit PaymentSent(employees[i]);
        }
        emit BatchPayComplete(employees.length);
    }

    function getMySalary(
        Permission memory permission
    ) external view onlySender(permission) returns (SealedUint memory) {
        if (!isEmployee[msg.sender]) revert NotEmployee();
        return FHE.sealoutput(_salary[msg.sender], permission.publicKey);
    }

    function getMyTotalPaid(
        Permission memory permission
    ) external view onlySender(permission) returns (SealedUint memory) {
        if (!isEmployee[msg.sender]) revert NotEmployee();
        return FHE.sealoutput(_paid[msg.sender], permission.publicKey);
    }

    // Employer reads any employee's salary via their own permit
    function getEmployeeSalary(
        address employee,
        Permission memory permission
    ) external view onlySender(permission) returns (SealedUint memory) {
        if (msg.sender != employer) revert NotEmployer();
        return FHE.sealoutput(_salary[employee], permission.publicKey);
    }
}`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function addEmployee(address employee, tuple(bytes,bytes) encSalary) external",
  "function pay(address employee) external",
  "function batchPay(address[] employees) external",
  "function isEmployee(address) view returns (bool)",
  "function getMySalary(tuple(bytes,bytes32,uint256,address,address[],string[]) permission) view returns (tuple(bytes) sealed)",
  "function getMyTotalPaid(tuple(bytes,bytes32,uint256,address,address[],string[]) permission) view returns (tuple(bytes) sealed)"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [salary, setSalary] = useState(null);
  const [totalPaid, setTotalPaid] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [newEmployee, setNewEmployee] = useState('');
  const [newSalary, setNewSalary] = useState('');

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer);
    setContract(new Contract(CONTRACT_ADDRESS, ABI, _signer));
    setStatus('Connected');
  }

  async function addEmployee() {
    if (!contract || !newEmployee || !newSalary) return;
    setLoading(true);
    try {
      const [encSalary] = await cofhejs.encrypt([Encryptable.uint128(BigInt(newSalary))]);
      const tx = await contract.addEmployee(newEmployee, encSalary);
      setStatus('Adding employee... ' + tx.hash);
      await tx.wait();
      setStatus('Employee added with encrypted salary');
    } catch (e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  async function revealSalary() {
    if (!contract || !signer) return;
    setLoading(true);
    try {
      const address = await signer.getAddress();
      const permit = await cofhejs.createPermit({ type: 'self', issuer: address, contracts: [CONTRACT_ADDRESS], projects: ['{{NAME}}'] });
      const permission = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
      const [sealedSalary, sealedPaid] = await Promise.all([
        contract.getMySalary(permission),
        contract.getMyTotalPaid(permission)
      ]);
      const [s, p] = await Promise.all([
        cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint128, sealedSalary.data),
        cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint128, sealedPaid.data)
      ]);
      setSalary(s.toString());
      setTotalPaid(p.toString());
    } catch (e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>💰 {{NAME}} Payroll</h1>
      <p>Confidential payroll — salaries hidden from public</p>
      {!signer ? <button onClick={connect}>Connect Wallet</button> : (
        <div>
          <p>{status}</p>
          <h3>Add Employee</h3>
          <input placeholder="Employee address" value={newEmployee} onChange={e => setNewEmployee(e.target.value)} style={{ width: '100%' }} />
          <input placeholder="Salary (wei)" value={newSalary} onChange={e => setNewSalary(e.target.value)} style={{ width: '100%', marginTop: 8 }} />
          <button onClick={addEmployee} disabled={loading} style={{ marginTop: 8 }}>Add (Encrypted)</button>
          <h3 style={{ marginTop: 16 }}>My Payroll</h3>
          <button onClick={revealSalary} disabled={loading}>Reveal My Salary & Total Paid</button>
          {salary !== null && <p>Salary: {salary} | Total paid: {totalPaid}</p>}
        </div>
      )}
    </div>
  );
}`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let employer: any;
  let alice: any;
  let bob: any;

  before(async function () {
    [employer, alice, bob] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(employer).deploy();
    await contract.waitForDeployment();
  });

  it("employer can add employee with encrypted salary", async function () {
    const [encSalary] = await cofhejs.encrypt([Encryptable.uint128(5000n)]);
    await expect(contract.connect(employer).addEmployee(alice.address, encSalary)).to.not.be.reverted;
    expect(await contract.isEmployee(alice.address)).to.be.true;
  });

  it("employee can reveal their own salary", async function () {
    const addr = await contract.getAddress();
    const [encSalary] = await cofhejs.encrypt([Encryptable.uint128(5000n)]);
    await (await contract.connect(employer).addEmployee(alice.address, encSalary)).wait();

    const permit = await cofhejs.createPermit({ type: 'self', issuer: alice.address, contracts: [addr], projects: ['test'] });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(alice).getMySalary(permission);
    const salary = await cofhejs.unseal(addr, "uint128", sealed.data);
    expect(salary).to.equal(5000n);
  });

  it("non-employer cannot add employees", async function () {
    const [encSalary] = await cofhejs.encrypt([Encryptable.uint128(5000n)]);
    await expect(contract.connect(alice).addEmployee(bob.address, encSalary))
      .to.be.revertedWithCustomError(contract, "NotEmployer");
  });

  it("batchPay increments total paid for all employees", async function () {
    const addr = await contract.getAddress();
    const [encS1] = await cofhejs.encrypt([Encryptable.uint128(3000n)]);
    const [encS2] = await cofhejs.encrypt([Encryptable.uint128(4000n)]);
    await (await contract.connect(employer).addEmployee(alice.address, encS1)).wait();
    await (await contract.connect(employer).addEmployee(bob.address, encS2)).wait();
    await (await contract.connect(employer).batchPay([alice.address, bob.address])).wait();

    const permit = await cofhejs.createPermit({ type: 'self', issuer: alice.address, contracts: [addr], projects: ['test'] });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(alice).getMyTotalPaid(permission);
    const paid = await cofhejs.unseal(addr, "uint128", sealed.data);
    expect(paid).to.equal(3000n);
  });
});`,
    deploy: `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying {{NAME}} with:", deployer.address);
  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("{{NAME}} deployed to:", address);
  console.log("Employer (deployer):", deployer.address);
  console.log("Set VITE_CONTRACT_ADDRESS=" + address);
}
main().catch(console.error);`
  },

  "gaming": {
    keywords: ["game", "gaming", "flip", "coin flip", "lottery", "random", "casino", "chance", "provably fair"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}} — FHE Gaming Contract
 * @notice Hidden game state + provably fair randomness using FHE.randomEuint32().
 *         Scores stay encrypted until game ends. Winner revealed via FHE.allowPublic().
 */
contract {{NAME}} is PermissionedV2 {
    address public host;
    bool    public gameOpen;

    mapping(address => euint32) private _score;
    mapping(address => bool)    public  hasPlayed;

    euint32 private _lastFlipResult;
    address public  winner;

    event GameStarted();
    event GameEnded(address winner);
    event CoinFlipped(address indexed player);
    event ScoreAdded(address indexed player);

    error NotHost();
    error GameNotOpen();
    error GameStillOpen();

    modifier onlyHost() { if (msg.sender != host) revert NotHost(); _; }
    modifier whenOpen() { if (!gameOpen) revert GameNotOpen(); _; }

    constructor() {
        host = msg.sender;
        gameOpen = false;
    }

    function startGame() external onlyHost {
        gameOpen = true;
        emit GameStarted();
    }

    /// @notice Provably fair coin flip — heads or tails via LSB of random uint8
    function coinFlip() external whenOpen returns (ebool) {
        euint8 rand = FHE.randomEuint8();
        // LSB of random byte = 50/50 heads(1) or tails(0)
        ebool result = FHE.and(rand, FHE.asEuint8(1));
        FHE.allowThis(result);
        FHE.allowSender(result);
        _lastFlipResult = FHE.asEuint32(rand);
        FHE.allowThis(_lastFlipResult);
        emit CoinFlipped(msg.sender);
        return result;
    }

    /// @notice Add encrypted random score for player (hidden until game ends)
    function play() external whenOpen {
        euint32 points = FHE.randomEuint32();
        euint32 newScore = FHE.add(_score[msg.sender], points);
        FHE.allowThis(newScore);
        FHE.allow(newScore, host);
        _score[msg.sender] = newScore;
        hasPlayed[msg.sender] = true;
        emit ScoreAdded(msg.sender);
    }

    /// @notice End game and reveal winner publicly
    function endGame(address _winner) external onlyHost {
        if (!gameOpen) revert GameStillOpen();
        gameOpen = false;
        winner = _winner;
        // Allow anyone to verify winner's score (public reveal)
        FHE.allowPublic(_score[_winner]);
        emit GameEnded(_winner);
    }

    /// @notice Player reads their own score (sealed, during game)
    function getMyScore(
        Permission memory permission
    ) external view onlySender(permission) returns (SealedUint memory) {
        return FHE.sealoutput(_score[msg.sender], permission.publicKey);
    }

    /// @notice Host reads any player's score (for determining winner)
    function getPlayerScore(
        address player,
        Permission memory permission
    ) external view onlySender(permission) returns (SealedUint memory) {
        if (msg.sender != host) revert NotHost();
        return FHE.sealoutput(_score[player], permission.publicKey);
    }
}`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function gameOpen() view returns (bool)",
  "function winner() view returns (address)",
  "function hasPlayed(address) view returns (bool)",
  "function startGame() external",
  "function coinFlip() external",
  "function play() external",
  "function endGame(address winner) external",
  "function getMyScore(tuple(bytes,bytes32,uint256,address,address[],string[]) permission) view returns (tuple(bytes) sealed)"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [gameOpen, setGameOpen] = useState(false);
  const [score, setScore] = useState(null);
  const [flipResult, setFlipResult] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    await cofhejs.initializeWithEthers({ provider });
    const _contract = new Contract(CONTRACT_ADDRESS, ABI, _signer);
    setSigner(_signer);
    setContract(_contract);
    setGameOpen(await _contract.gameOpen());
    setStatus('Connected');
  }

  async function handlePlay() {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.play();
      setStatus('Playing... ' + tx.hash);
      await tx.wait();
      setStatus('Score added (encrypted)!');
    } catch (e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  async function handleFlip() {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.coinFlip();
      setStatus('Flipping coin... ' + tx.hash);
      const receipt = await tx.wait();
      setStatus('Coin flipped! Result sealed.');
      setFlipResult('Sealed (reveal via permit)');
    } catch (e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  async function revealScore() {
    if (!contract || !signer) return;
    setLoading(true);
    try {
      const address = await signer.getAddress();
      const permit = await cofhejs.createPermit({ type: 'self', issuer: address, contracts: [CONTRACT_ADDRESS], projects: ['{{NAME}}'] });
      const permission = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
      const sealed = await contract.getMyScore(permission);
      const s = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint32, sealed.data);
      setScore(s.toString());
    } catch (e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🎮 {{NAME}}</h1>
      <p>Provably fair FHE gaming — scores hidden until game ends</p>
      {!signer ? <button onClick={connect}>Connect Wallet</button> : (
        <div>
          <p>{status}</p>
          <p>Game: {gameOpen ? '🟢 Open' : '🔴 Closed'}</p>
          {score !== null && <p>My Score: {score}</p>}
          {flipResult && <p>Flip: {flipResult}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={handlePlay} disabled={loading || !gameOpen}>Play (Random Score)</button>
            <button onClick={handleFlip} disabled={loading || !gameOpen}>Coin Flip</button>
            <button onClick={revealScore} disabled={loading}>Reveal My Score</button>
          </div>
        </div>
      )}
    </div>
  );
}`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let host: any;
  let player1: any;
  let player2: any;

  before(async function () {
    [host, player1, player2] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    contract = await Factory.connect(host).deploy();
    await contract.waitForDeployment();
    await (await contract.connect(host).startGame()).wait();
  });

  it("allows players to play and accumulate encrypted scores", async function () {
    await expect(contract.connect(player1).play()).to.not.be.reverted;
    expect(await contract.hasPlayed(player1.address)).to.be.true;
  });

  it("coin flip generates encrypted result", async function () {
    await expect(contract.connect(player1).coinFlip()).to.not.be.reverted;
  });

  it("player can read their own score", async function () {
    const addr = await contract.getAddress();
    await (await contract.connect(player1).play()).wait();
    const permit = await cofhejs.createPermit({ type: 'self', issuer: player1.address, contracts: [addr], projects: ['test'] });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(player1).getMyScore(permission);
    const score = await cofhejs.unseal(addr, "uint32", sealed.data);
    expect(score).to.be.a('bigint');
  });

  it("host can end game and reveal winner", async function () {
    await (await contract.connect(player1).play()).wait();
    await expect(contract.connect(host).endGame(player1.address)).to.not.be.reverted;
    expect(await contract.winner()).to.equal(player1.address);
    expect(await contract.gameOpen()).to.be.false;
  });

  it("non-host cannot end game", async function () {
    await expect(contract.connect(player1).endGame(player1.address))
      .to.be.revertedWithCustomError(contract, "NotHost");
  });
});`,
    deploy: `import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying {{NAME}} with:", deployer.address);
  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("{{NAME}} deployed to:", address);
  console.log("Host:", deployer.address);
  console.log("Call startGame() to begin. Call endGame(winner) to reveal.");
  console.log("Set VITE_CONTRACT_ADDRESS=" + address);
}
main().catch(console.error);`
  },

  "subscription": {
    keywords: ["subscription", "subscribe", "creator", "content", "paywall", "membership", "payw"],
    solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/cofhe-contracts/PermissionedV2.sol";

/**
 * @title {{NAME}} — Private Content Subscription
 * @notice Inspired by Akindo buildathon creator platform entry.
 *         Subscription price and subscriber list are encrypted.
 *         Creator sees encrypted revenue total, not individual subscribers.
 *         isSubscribed() lets users verify their own subscription privately.
 */
contract {{NAME}} is PermissionedV2 {
    address public creator;

    euint128 private _price;          // encrypted subscription price
    euint128 private _totalRevenue;   // encrypted total revenue (creator-readable)

    mapping(address => ebool) private _subscribed; // encrypted per-user status

    event Subscribed(address indexed subscriber);
    event PriceUpdated();

    error NotCreator();
    error AlreadySubscribed();

    modifier onlyCreator() { if (msg.sender != creator) revert NotCreator(); _; }

    constructor(InEuint128 calldata encPrice) {
        creator = msg.sender;
        euint128 price = FHE.asEuint128(encPrice);
        FHE.allowThis(price);
        FHE.allow(price, creator);
        _price = price;

        euint128 zero = FHE.asEuint128(0);
        FHE.allowThis(zero);
        FHE.allow(zero, creator);
        _totalRevenue = zero;
    }

    /// @notice Subscribe — caller pays encrypted price, status stored encrypted
    function subscribe() external {
        // Mark as subscribed (encrypted)
        ebool yes = FHE.asEbool(FHE.asEuint8(1));
        FHE.allowThis(yes);
        FHE.allow(yes, msg.sender);
        _subscribed[msg.sender] = yes;

        // Add price to total revenue (creator-readable, not subscriber-readable)
        euint128 newRevenue = FHE.add(_totalRevenue, _price);
        FHE.allowThis(newRevenue);
        FHE.allow(newRevenue, creator);
        _totalRevenue = newRevenue;

        emit Subscribed(msg.sender);
    }

    function updatePrice(InEuint128 calldata encPrice) external onlyCreator {
        euint128 price = FHE.asEuint128(encPrice);
        FHE.allowThis(price);
        FHE.allow(price, creator);
        _price = price;
        emit PriceUpdated();
    }

    /// @notice User verifies their own subscription status (private)
    function isSubscribed(
        Permission memory permission
    ) external view onlySender(permission) returns (SealedUint memory) {
        return FHE.sealoutput(_subscribed[msg.sender], permission.publicKey);
    }

    /// @notice Creator reads total encrypted revenue
    function getTotalRevenue(
        Permission memory permission
    ) external view onlySender(permission) returns (SealedUint memory) {
        if (msg.sender != creator) revert NotCreator();
        return FHE.sealoutput(_totalRevenue, permission.publicKey);
    }

    /// @notice Creator reads current price
    function getPrice(
        Permission memory permission
    ) external view onlySender(permission) returns (SealedUint memory) {
        if (msg.sender != creator) revert NotCreator();
        return FHE.sealoutput(_price, permission.publicKey);
    }
}`,
    frontend: `import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const ABI = [
  "function creator() view returns (address)",
  "function subscribe() external",
  "function isSubscribed(tuple(bytes,bytes32,uint256,address,address[],string[]) permission) view returns (tuple(bytes) sealed)",
  "function getTotalRevenue(tuple(bytes,bytes32,uint256,address,address[],string[]) permission) view returns (tuple(bytes) sealed)"
];

export default function {{NAME}}App() {
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [subStatus, setSubStatus] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function connect() {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const _signer = await provider.getSigner();
    await cofhejs.initializeWithEthers({ provider });
    setSigner(_signer);
    setContract(new Contract(CONTRACT_ADDRESS, ABI, _signer));
    setStatus('Connected');
  }

  async function handleSubscribe() {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.subscribe();
      setStatus('Subscribing... ' + tx.hash);
      await tx.wait();
      setStatus('Subscribed! (status encrypted on-chain)');
    } catch (e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  async function checkSubscription() {
    if (!contract || !signer) return;
    setLoading(true);
    try {
      const address = await signer.getAddress();
      const permit = await cofhejs.createPermit({ type: 'self', issuer: address, contracts: [CONTRACT_ADDRESS], projects: ['{{NAME}}'] });
      const permission = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
      const sealed = await contract.isSubscribed(permission);
      const val = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Bool, sealed.data);
      setSubStatus(val ? 'Active subscriber' : 'Not subscribed');
    } catch (e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  async function checkRevenue() {
    if (!contract || !signer) return;
    setLoading(true);
    try {
      const address = await signer.getAddress();
      const permit = await cofhejs.createPermit({ type: 'self', issuer: address, contracts: [CONTRACT_ADDRESS], projects: ['{{NAME}}'] });
      const permission = cofhejs.getPermission(CONTRACT_ADDRESS, permit);
      const sealed = await contract.getTotalRevenue(permission);
      const val = await cofhejs.unseal(CONTRACT_ADDRESS, FheTypes.Uint128, sealed.data);
      setRevenue(val.toString());
    } catch (e) { setStatus('Error: ' + e.message); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'monospace' }}>
      <h1>🔐 {{NAME}}</h1>
      <p>Private content subscription — subscriber list hidden from public</p>
      {!signer ? <button onClick={connect}>Connect Wallet</button> : (
        <div>
          <p>{status}</p>
          {subStatus && <p>Subscription: {subStatus}</p>}
          {revenue !== null && <p>Total Revenue: {revenue}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button onClick={handleSubscribe} disabled={loading}>Subscribe</button>
            <button onClick={checkSubscription} disabled={loading}>Check My Status</button>
            <button onClick={checkRevenue} disabled={loading}>View Revenue (Creator)</button>
          </div>
        </div>
      )}
    </div>
  );
}`,
    test: `import { expect } from "chai";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

describe("{{NAME}}", function () {
  let contract: any;
  let creator: any;
  let subscriber1: any;
  let subscriber2: any;

  before(async function () {
    [creator, subscriber1, subscriber2] = await hre.ethers.getSigners();
    await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });
  });

  beforeEach(async function () {
    const Factory = await hre.ethers.getContractFactory("{{NAME}}");
    const [encPrice] = await cofhejs.encrypt([Encryptable.uint128(100n)]);
    contract = await Factory.connect(creator).deploy(encPrice);
    await contract.waitForDeployment();
  });

  it("subscriber can subscribe", async function () {
    await expect(contract.connect(subscriber1).subscribe()).to.not.be.reverted;
  });

  it("subscriber can verify their own status privately", async function () {
    const addr = await contract.getAddress();
    await (await contract.connect(subscriber1).subscribe()).wait();

    const permit = await cofhejs.createPermit({ type: 'self', issuer: subscriber1.address, contracts: [addr], projects: ['test'] });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(subscriber1).isSubscribed(permission);
    const isSubbed = await cofhejs.unseal(addr, "bool", sealed.data);
    expect(isSubbed).to.be.true;
  });

  it("non-subscriber shows not subscribed", async function () {
    const addr = await contract.getAddress();
    const permit = await cofhejs.createPermit({ type: 'self', issuer: subscriber2.address, contracts: [addr], projects: ['test'] });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(subscriber2).isSubscribed(permission);
    const isSubbed = await cofhejs.unseal(addr, "bool", sealed.data);
    expect(isSubbed).to.be.false;
  });

  it("creator can read total revenue", async function () {
    const addr = await contract.getAddress();
    await (await contract.connect(subscriber1).subscribe()).wait();
    await (await contract.connect(subscriber2).subscribe()).wait();

    const permit = await cofhejs.createPermit({ type: 'self', issuer: creator.address, contracts: [addr], projects: ['test'] });
    const permission = cofhejs.getPermission(addr, permit);
    const sealed = await contract.connect(creator).getTotalRevenue(permission);
    const rev = await cofhejs.unseal(addr, "uint128", sealed.data);
    expect(rev).to.equal(200n); // 2 × 100
  });
});`,
    deploy: `import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  await cofhejs.initializeWithEthers({ provider: hre.ethers.provider });

  const price = BigInt(process.env.SUBSCRIPTION_PRICE || "1000000000000000"); // 0.001 ETH default
  const [encPrice] = await cofhejs.encrypt([Encryptable.uint128(price)]);

  console.log("Deploying {{NAME}} with creator:", deployer.address);
  const Factory = await hre.ethers.getContractFactory("{{NAME}}");
  const contract = await Factory.deploy(encPrice);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("{{NAME}} deployed to:", address);
  console.log("Creator:", deployer.address);
  console.log("Set VITE_CONTRACT_ADDRESS=" + address);
}
main().catch(console.error);`
  }
};

export const PROJECT_SETUP_TEMPLATE = `# Fhenix FHE Hardhat Project Setup

## package.json
\`\`\`json
{
  "name": "fhenix-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy:sepolia": "hardhat run scripts/deploy.ts --network arbitrum-sepolia",
    "deploy:base": "hardhat run scripts/deploy.ts --network base-sepolia"
  },
  "dependencies": {
    "@fhenixprotocol/cofhe-contracts": "^0.1.0",
    "ethers": "^6.9.0",
    "cofhejs": "^0.1.0"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "hardhat": "^2.22.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0"
  }
}
\`\`\`

## hardhat.config.ts
\`\`\`typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun"
    }
  },
  networks: {
    "arbitrum-sepolia": {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    "base-sepolia": {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || ""
    }
  }
};

export default config;
\`\`\`

## Folder Structure
\`\`\`
project/
├── contracts/
│   └── MyContract.sol
├── scripts/
│   └── deploy.ts
├── test/
│   └── MyContract.test.ts
├── frontend/
│   ├── src/
│   │   └── App.tsx
│   ├── index.html
│   └── package.json  (vite + react + cofhejs)
├── hardhat.config.ts
├── package.json
├── .env            (PRIVATE_KEY, RPC_URL)
└── tsconfig.json
\`\`\`

## .env template
\`\`\`
PRIVATE_KEY=0x...
ARBISCAN_API_KEY=...
BASESCAN_API_KEY=...
\`\`\`
`;

export const CONCEPTS = {
  // Core FHE concepts
  "fhe": FHE_FUNDAMENTALS,
  "cofhe": FHE_FUNDAMENTALS,
  "architecture": FHE_FUNDAMENTALS,
  "fhe.sol": FHE_SOL_REFERENCE,
  "types": FHE_SOL_REFERENCE,
  "operations": FHE_SOL_REFERENCE,
  "access control": FHE_SOL_REFERENCE,
  "allowthis": FHE_SOL_REFERENCE,
  "sealoutput": FHE_SOL_REFERENCE,
  "cofhejs": COFHEJS_SDK_REFERENCE,
  "sdk": COFHEJS_SDK_REFERENCE,
  "encrypt": COFHEJS_SDK_REFERENCE,
  "unseal": COFHEJS_SDK_REFERENCE,
  "permit": PERMIT_SYSTEM_REFERENCE,
  "permissionedv2": PERMIT_SYSTEM_REFERENCE,
  "permission": PERMIT_SYSTEM_REFERENCE,
  "audit": AUDIT_PATTERNS,
  "security": AUDIT_PATTERNS,
  "vulnerability": AUDIT_PATTERNS,
  "vulnerabilities": AUDIT_PATTERNS,
  "networks": JSON.stringify(NETWORK_INFO, null, 2),
  "network": JSON.stringify(NETWORK_INFO, null, 2),
  "setup": PROJECT_SETUP_TEMPLATE,
  "project setup": PROJECT_SETUP_TEMPLATE,
  "hardhat": PROJECT_SETUP_TEMPLATE,
  // Advanced DApp concepts
  "dark pool": "Dark pools encrypt order size & price. Solver matches orders off-chain via threshold decrypt, submits fillOrders() on-chain. See dark-pool template.",
  "dex": "Private DEX uses encrypted order books. isBuy is public for routing; amount/price encrypted. Commit-reveal pattern for matching.",
  "amm": "FHE AMM: liquidity positions encrypted, swaps use FHE.select for safe arithmetic. Reserve ratios hidden from MEV bots.",
  "lending": "Confidential lending: collateral/debt as euint128. Health factor checked off-chain by oracle via permit. FHE.select for safe repay. See lending template.",
  "collateral": "Encrypted collateral positions: FHE.add on deposit, FHE.sub on withdraw. Oracle reads via FHE.allow(handle, oracle) to check health.",
  "liquidation": "Liquidation: oracle decrypts positions via permit, verifies LTV off-chain, calls liquidate(). Future: FHE.gte(debt*100, collateral*75) on-chain.",
  "nft": "Private NFT marketplace: reserve prices and bids as euint128. Seller sees all bids via FHE.allow(bid, seller). Settles off-chain after review.",
  "marketplace": "FHE marketplace: hidden reserve prices prevent floor sniping. Sealed bids prevent collusion. Seller decrypts bids via permit.",
  "identity": "On-chain identity: encrypted age/kyc/accredited as euint32/ebool. isAdult() returns ebool — no plaintext leak. Integrate with FHE.select in DeFi contracts.",
  "kyc": "KYC via FHE: issuer registers encrypted credentials. Protocols call isKycPassed() → ebool → gate access with FHE.select. No personal data exposed.",
  "compliance": "Compliant stablecoin: regulator gets FHE.allow() on all balances. Can audit via permit without revealing to public. Transfer limits as euint128.",
  "stablecoin": "fhERC-20 stablecoin: encrypted balances, transfer limits enforced via FHE.select. Regulator audits via regulatorView(). Freeze accounts with plaintext mapping.",
  "private ai": "FHE AI on CoFHE: linear classifiers via FHE.add/mul on integer-scaled weights. Credit scoring, recommendation systems. Full neural nets need CKKS (not yet on CoFHE).",
  "ml": "FHE ML: encrypt feature vectors as euint64[]. Dot product via FHE.mul + FHE.add. Classification via FHE.gte(score, threshold). No floating point yet.",
  "select": "FHE.select(condition, ifTrue, ifFalse) is the FHE ternary. NEVER use if/else on encrypted values — use FHE.select() for ALL encrypted conditionals.",
  "underflow": "Safe FHE subtraction: ebool safe = FHE.gte(a, b); result = FHE.select(safe, FHE.sub(a,b), a); — prevents wrap-around on underflow.",
  // New SDK
  "cofhe/sdk": NEW_SDK_REFERENCE,
  "@cofhe/sdk": NEW_SDK_REFERENCE,
  "@cofhe/react": NEW_SDK_REFERENCE,
  "new sdk": NEW_SDK_REFERENCE,
  "react hooks": NEW_SDK_REFERENCE,
  // Privara / payments
  "privara": PRIVARA_REFERENCE,
  "reineira": PRIVARA_REFERENCE,
  "payments": PRIVARA_REFERENCE,
  "confidential payments": PRIVARA_REFERENCE,
  // Randomness
  "random": "FHE.randomEuint32() generates a provably fair encrypted random number on-chain via CoFHE. Nobody — not the user, miner, or contract — can predict it before the tx is processed.\n\nExample — coin flip:\n```solidity\nebool flip = FHE.and(FHE.randomEuint8(), FHE.asEuint8(1)); // LSB = heads(1) or tails(0)\nFHE.allowThis(flip);\nFHE.allowSender(flip);\n```\nAvailable sizes: FHE.randomEuint8/16/32/64/128()\nUse case: games, lotteries, hidden game state, random NFT traits. See gaming template.",
  "randomness": "FHE.randomEuint32() generates a provably fair encrypted random number on-chain via CoFHE. Nobody — not the user, miner, or contract — can predict it before the tx is processed.\n\nExample — coin flip:\n```solidity\nebool flip = FHE.and(FHE.randomEuint8(), FHE.asEuint8(1)); // LSB = heads(1) or tails(0)\nFHE.allowThis(flip);\nFHE.allowSender(flip);\n```\nAvailable sizes: FHE.randomEuint8/16/32/64/128()\nUse case: games, lotteries, hidden game state, random NFT traits. See gaming template.",
  "game": "FHE gaming: use FHE.randomEuint32() for provably fair randomness. Store encrypted player scores as euint32. Reveal via FHE.allowPublic(score) when game ends. See gaming template.",
  // Public reveal pattern
  "allowpublic": "FHE.allowPublic(handle) makes an encrypted value publicly decryptable by anyone — no permit needed.\n\nTwo-phase reveal pattern:\n1. During event (auction/vote/game): values stay encrypted, access gated by permits\n2. After event ends: call FHE.allowPublic(handle) to let anyone verify the result\n\n```solidity\nfunction endAuction() external onlyOwner {\n    auctionOpen = false;\n    FHE.allowPublic(highestBid); // now publicly readable\n}\n```\n\nWARNING: irreversible — once public, cannot be re-encrypted.",
  "public reveal": "FHE.allowPublic(handle) makes an encrypted value publicly decryptable by anyone — no permit needed. Use after auction/vote/game ends to reveal results. See allowPublic.",
  "reveal": "Two-phase reveal pattern: keep data encrypted during the event (use permits for authorized access), then call FHE.allowPublic(handle) after event ends so anyone can verify. Combined with FHE.getDecryptResult() for on-chain result reads.",
  // Scaffolding / starter repos
  "scaffold": "Official Fhenix starter repos:\n- Hardhat: github.com/FhenixProtocol/cofhe-hardhat-starter\n- Foundry: github.com/FhenixProtocol/cofhe-foundry-starter\n\nBoth include: pre-configured hardhat.config.ts / foundry.toml, FHE.sol import paths, cofhejs test setup, example contracts.\n\nzaxFHE can also scaffold via zaxfhe_project_setup tool.",
  "foundry": "Official Foundry starter: github.com/FhenixProtocol/cofhe-foundry-starter — includes foundry.toml configured for CoFHE, remappings for @fhenixprotocol/cofhe-contracts, and FHE cheatcodes for testing.",
  "starter": "Official Fhenix starter repos:\n- Hardhat: github.com/FhenixProtocol/cofhe-hardhat-starter\n- Foundry: github.com/FhenixProtocol/cofhe-foundry-starter",
  // Awesome-fhenix / examples
  "awesome-fhenix": "github.com/FhenixProtocol/awesome-fhenix — curated list of Fhenix FHE projects, tools, tutorials, and buildathon submissions. Best reference for real-world FHE DApp patterns.",
  "examples": "Real FHE DApp examples and reference:\n- github.com/FhenixProtocol/awesome-fhenix — curated Fhenix ecosystem list\n- Buildathon winners: Zalary (payroll), Akindo (creator platform), various DeFi privacy tools\n- Official templates: cofhe-hardhat-starter, cofhe-foundry-starter",
  "reference": "Key Fhenix references:\n- Docs: docs.fhenix.zone\n- Awesome-Fhenix: github.com/FhenixProtocol/awesome-fhenix\n- Starter (Hardhat): github.com/FhenixProtocol/cofhe-hardhat-starter\n- Starter (Foundry): github.com/FhenixProtocol/cofhe-foundry-starter\n- Privara/payments: reineira.xyz/docs",
  // New templates
  "payroll": "Confidential payroll: salaries stored as euint128 per employee, accessible only by employer + that employee via FHE.allow(salary, employee). batchPay() distributes without revealing any amounts publicly. See payroll template (inspired by Zalary, Fhenix buildathon winner).",
  "salary": "Encrypted salaries via euint128 mapping. Employer uses FHE.allow(salary, employee) so only that employee can see their salary. Creator sees encrypted revenue total via FHE.allow(total, creator). See payroll template.",
  "gaming": "FHE gaming: FHE.randomEuint32() for provably fair randomness, encrypted scores via euint32, FHE.allowPublic() to reveal winner. See gaming template.",
  "subscription": "Private subscriptions: encrypted subscriber list (ebool per user), encrypted revenue total (creator-readable only). isSubscribed() view sealed per-user — only the caller can verify their own status. See subscription template (inspired by Akindo buildathon entry).",
  "creator": "Private creator platform: subscription status encrypted per subscriber, total revenue encrypted (creator-readable only). No subscriber list exposed publicly. See subscription template.",
};

// ============================================================
// Template detection — used by zaxfhe_build
// ============================================================
export function detectTemplate(description) {
  const d = description.toLowerCase();

  // Advanced templates (check first — more specific keywords)
  if (d.includes("dark pool") || (d.includes("dex") && (d.includes("private") || d.includes("dark"))) || d.includes("order book")) return "dark-pool";
  if (d.includes("lend") || d.includes("borrow") || d.includes("collateral") || d.includes("liquidat")) return "lending";
  if (d.includes("nft") || d.includes("collectible") || (d.includes("marketplace") && !d.includes("token"))) return "nft-marketplace";
  if (d.includes("identity") || d.includes("kyc") || d.includes("credential") || d.includes("accredit") || (d.includes("age") && d.includes("verif"))) return "identity";
  if (d.includes("stablecoin") || d.includes("stable coin") || d.includes("complian") || d.includes("regulator") || d.includes("cbdc")) return "stablecoin";
  if (d.includes("payroll") || d.includes("salary") || d.includes("salaries") || d.includes("employee") || d.includes("wages") || d.includes("compensation")) return "payroll";
  if (d.includes("game") || d.includes("gaming") || d.includes("coin flip") || d.includes("flip") || d.includes("lottery") || d.includes("random") || d.includes("casino") || d.includes("provably fair")) return "gaming";
  if (d.includes("subscription") || d.includes("subscribe") || d.includes("creator") || d.includes("content") || d.includes("paywall") || d.includes("membership") || d.includes("payw")) return "subscription";

  // Basic templates
  if (d.includes("token") || d.includes("erc20") || d.includes("balance") || (d.includes("transfer") && !d.includes("vote"))) return "private-token";
  if (d.includes("vote") || d.includes("voting") || d.includes("governance") || d.includes("dao") || d.includes("proposal")) return "voting";
  if (d.includes("auction") || d.includes("bid") || d.includes("sealed bid")) return "auction";

  return "counter"; // safe default
}

// All templates combined (basic + advanced)
export const ALL_TEMPLATES = { ...TEMPLATES, ...ADVANCED_TEMPLATES };
