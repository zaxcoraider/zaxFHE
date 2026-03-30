# zaxFHE

**Agentic MCP server that turns Claude Code into an expert Fhenix FHE developer.**

Connect once. Say "Hey zaxFHE, build me a private DEX." Get back a complete DApp — Solidity contract + React frontend + Hardhat tests + deploy script + security audit. All at once.

---

## Connect to Claude Code

```bash
claude mcp add zaxfhe --transport http https://YOUR_VERCEL_URL/mcp
```

Replace `YOUR_VERCEL_URL` with your actual Vercel deployment URL.

---

## Deploy to Vercel (3 steps)

1. **Push to GitHub** — push this repo to a GitHub repository
2. **Import on Vercel** — go to [vercel.com/new](https://vercel.com/new), import the repo, click Deploy
3. **Connect** — run the `claude mcp add` command above with your Vercel URL

No build step, no TypeScript compilation, no environment variables needed.

---

## Tools (10 total)

| Tool | Description |
|------|-------------|
| `zaxfhe_build` | **MAIN TOOL** — Full DApp from plain English. Auto-detects template. Outputs contract + frontend + tests + deploy + audit |
| `zaxfhe_scaffold_contract` | Generate FHE Solidity contract from template (counter/private-token/voting/auction/dark-pool/lending/nft-marketplace/identity/stablecoin) |
| `zaxfhe_scaffold_frontend` | Generate React + cofhejs frontend |
| `zaxfhe_scaffold_tests` | Generate Hardhat + cofhejs tests |
| `zaxfhe_audit` | Security audit against 27 FHE vulnerability patterns (9 CRITICAL, 10 HIGH, 8 MEDIUM) |
| `zaxfhe_explain` | Explain any FHE/Fhenix concept from the knowledge base |
| `zaxfhe_encrypt_helper` | Generate exact cofhejs encrypt/unseal code for any type |
| `zaxfhe_project_setup` | Full Hardhat project scaffold (package.json, hardhat.config.ts, folder structure) |
| `zaxfhe_network_info` | RPC endpoints, chain IDs, CoFHE contract addresses for all networks |
| `zaxfhe_read_contract` | Call read-only functions on deployed contracts using ethers.js |

---

## Example Prompts

Once connected, try any of these:

```
Hey zaxFHE, build me a private DEX
```
```
Hey zaxFHE, build me a sealed-bid NFT auction called CryptoAuction
```
```
Hey zaxFHE, build me a private voting system for my DAO
```
```
Hey zaxFHE, build me a confidential ERC20 token called ShadowToken
```
```
Hey zaxFHE, build me a private counter
```
```
zaxFHE audit this contract: [paste Solidity code]
```
```
zaxFHE explain FHE.allowThis and why it's critical
```
```
zaxFHE explain the CoFHE architecture
```
```
zaxFHE give me the cofhejs encrypt/unseal code for uint128 balance
```
```
zaxFHE set up a Hardhat project called PrivateBank on arbitrum-sepolia
```

---

## Supported Networks

| Network | Chain ID | Type | CoFHE |
|---------|----------|------|-------|
| Arbitrum Sepolia | 421614 | Testnet | ✅ |
| Base Sepolia | 84532 | Testnet | ✅ |
| Ethereum Sepolia | 11155111 | Testnet | — |
| Arbitrum One | 42161 | Mainnet | — |
| Ethereum | 1 | Mainnet | — |

---

## What zaxFHE Knows

- **FHE Fundamentals** — how homomorphic encryption works, Fhenix's threshold scheme
- **CoFHE Architecture** — off-chain coprocessor pipeline, TaskManager, handle lifecycle
- **FHE.sol Complete API** — all types (euint8/16/32/64/128/256, ebool, eaddress), all operations (arithmetic, comparison, logical, select, type conversion), all access control methods
- **cofhejs SDK** — initialize, encrypt, createPermit, getPermission, unseal, all Encryptable types
- **PermissionedV2 + Permit System** — how permits work, onlySender, delegation patterns
- **27 Audit Patterns** — 9 CRITICAL, 10 HIGH, 8 MEDIUM vulnerability patterns with fixes
- **9 Contract Templates** — counter, private-token, voting, auction, dark-pool, lending, nft-marketplace, identity, stablecoin (all production-ready)

---

## Security Rules (enforced in all generated code)

1. **ALWAYS** `FHE.allowThis(handle)` after every encrypted assignment
2. **ALWAYS** `FHE.allowSender(handle)` or `FHE.allow(handle, addr)` for user-readable values
3. **NEVER** `if/else` on encrypted values — use `FHE.select(condition, ifTrue, ifFalse)`
4. **ALWAYS** `PermissionedV2` + `onlySender(permission)` on view functions returning sealed data
5. **ALWAYS** guard `FHE.sub()` with `FHE.gte()` to prevent underflow wrapping
6. **ALWAYS** convert `InEuintX` with `FHE.asEuintX()` before use

---

## Architecture

```
zaxFHE/
├── api/
│   ├── mcp.js         ← MCP JSON-RPC 2.0 handler (Vercel serverless)
│   └── knowledge.js   ← Complete Fhenix/FHE knowledge base + 4 contract templates
├── vercel.json        ← Routes /mcp → /api/mcp + CORS headers
├── package.json       ← ethers dependency, ES module
└── README.md
```

**No database. No auth. No build step.** Pure stateless serverless — deploy and connect.

---

## License

MIT
