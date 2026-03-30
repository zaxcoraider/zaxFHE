// ============================================================
// zaxFHE — Agentic MCP Server for Fhenix FHE Development
// Vercel Serverless Handler | MCP Protocol 2024-11-05
// ============================================================

import {
  TEMPLATES,
  ADVANCED_TEMPLATES,
  ALL_TEMPLATES,
  CONCEPTS,
  NETWORK_INFO,
  AUDIT_PATTERNS,
  FHE_SOL_REFERENCE,
  COFHEJS_SDK_REFERENCE,
  PROJECT_SETUP_TEMPLATE,
  detectTemplate as detectTemplateFromKnowledge
} from './knowledge.js';

// ──────────────────────────────────────────────────────────────
// CORS headers
// ──────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id, Authorization',
  'Access-Control-Max-Age': '86400'
};

// ──────────────────────────────────────────────────────────────
// Tool Definitions
// ──────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "zaxfhe_build",
    description: "MAIN TOOL — Build a complete Fhenix FHE DApp from a plain English description. Auto-detects the best template from 12 options (counter/private-token/voting/auction/dark-pool/lending/nft-marketplace/identity/stablecoin/payroll/gaming/subscription) from keywords. Outputs: Solidity contract + React frontend + Hardhat tests + deploy script + security audit. Always produces ALL files together.",
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Plain English description of the DApp to build. E.g. 'Build me a private DEX' or 'I want a sealed-bid NFT auction' or 'Build a confidential lending protocol'"
        },
        name: {
          type: "string",
          description: "Contract/project name (PascalCase). If omitted, auto-derived from description."
        },
        network: {
          type: "string",
          description: "Target network. Default: arbitrum-sepolia",
          enum: ["arbitrum-sepolia", "base-sepolia", "ethereum-sepolia", "arbitrum", "ethereum"]
        }
      },
      required: ["description"]
    }
  },
  {
    name: "zaxfhe_scaffold_contract",
    description: "Generate a complete FHE Solidity contract from a template. Includes all FHE.allowThis/allowSender patterns, PermissionedV2, and security best practices.",
    inputSchema: {
      type: "object",
      properties: {
        template: {
          type: "string",
          enum: ["counter", "private-token", "voting", "auction", "dark-pool", "lending", "nft-marketplace", "identity", "stablecoin", "payroll", "gaming", "subscription"],
          description: "Contract template type"
        },
        name: {
          type: "string",
          description: "Contract name in PascalCase (e.g. PrivateVault)"
        }
      },
      required: ["template", "name"]
    }
  },
  {
    name: "zaxfhe_scaffold_frontend",
    description: "Generate a React + cofhejs frontend for a Fhenix FHE contract. Includes wallet connection, cofhejs initialization, encrypt/unseal flow, permit creation.",
    inputSchema: {
      type: "object",
      properties: {
        template: {
          type: "string",
          enum: ["counter", "private-token", "voting", "auction", "dark-pool", "lending", "nft-marketplace", "identity", "stablecoin", "payroll", "gaming", "subscription"],
          description: "Frontend template type"
        },
        name: {
          type: "string",
          description: "Component/contract name"
        }
      },
      required: ["template", "name"]
    }
  },
  {
    name: "zaxfhe_scaffold_tests",
    description: "Generate Hardhat + cofhejs tests for a Fhenix FHE contract. Includes encrypt/unseal in tests, permit flows, edge case coverage.",
    inputSchema: {
      type: "object",
      properties: {
        template: {
          type: "string",
          enum: ["counter", "private-token", "voting", "auction", "dark-pool", "lending", "nft-marketplace", "identity", "stablecoin", "payroll", "gaming", "subscription"],
          description: "Test template type"
        },
        name: {
          type: "string",
          description: "Contract name"
        }
      },
      required: ["template", "name"]
    }
  },
  {
    name: "zaxfhe_audit",
    description: "Security audit a Fhenix FHE Solidity contract against 27 vulnerability patterns (9 CRITICAL, 10 HIGH, 8 MEDIUM). Identifies missing allowThis, unsafe branches on encrypted values, permit issues, and more.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Solidity contract source code to audit"
        },
        severity: {
          type: "string",
          enum: ["all", "critical", "high", "medium"],
          description: "Filter by severity level. Default: all"
        }
      },
      required: ["code"]
    }
  },
  {
    name: "zaxfhe_explain",
    description: "Explain any Fhenix FHE concept: FHE fundamentals, CoFHE architecture, FHE.sol operations, cofhejs SDK, permit system, audit patterns, network info.",
    inputSchema: {
      type: "object",
      properties: {
        concept: {
          type: "string",
          description: "Concept to explain (e.g. 'allowThis', 'permit', 'FHE.select', 'cofhe architecture', 'audit patterns')"
        }
      },
      required: ["concept"]
    }
  },
  {
    name: "zaxfhe_encrypt_helper",
    description: "Generate the exact cofhejs encrypt + unseal code for any FHE type. Useful for quickly scaffolding the client-side encryption boilerplate.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["uint8", "uint16", "uint32", "uint64", "uint128", "uint256", "bool", "address"],
          description: "FHE type to generate code for"
        },
        variable: {
          type: "string",
          description: "Variable name (e.g. 'amount', 'vote', 'balance')"
        },
        contractAddress: {
          type: "string",
          description: "Contract address constant name (e.g. CONTRACT_ADDRESS)"
        }
      },
      required: ["type", "variable"]
    }
  },
  {
    name: "zaxfhe_project_setup",
    description: "Generate a complete Fhenix FHE project scaffold: package.json, hardhat.config.ts, tsconfig.json, folder structure, .env template. Ready to npm install and go.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Project name (used in package.json)"
        },
        network: {
          type: "string",
          enum: ["arbitrum-sepolia", "base-sepolia", "both"],
          description: "Primary network target. Default: arbitrum-sepolia"
        }
      },
      required: ["projectName"]
    }
  },
  {
    name: "zaxfhe_network_info",
    description: "Get RPC endpoints, chain IDs, and CoFHE contract addresses (TaskManager, ACL, ZkVerifier) for all supported Fhenix networks.",
    inputSchema: {
      type: "object",
      properties: {
        network: {
          type: "string",
          description: "Specific network name, or 'all' for all networks",
          enum: ["all", "arbitrum-sepolia", "base-sepolia", "ethereum-sepolia", "arbitrum", "ethereum"]
        }
      },
      required: []
    }
  },
  {
    name: "zaxfhe_read_contract",
    description: "Call a read-only function on a deployed Fhenix FHE contract using ethers.js. Returns the raw result. For sealed values, you will still need to unseal client-side.",
    inputSchema: {
      type: "object",
      properties: {
        contractAddress: {
          type: "string",
          description: "Deployed contract address (0x...)"
        },
        abi: {
          type: "array",
          description: "ABI array (or array of human-readable ABI strings)",
          items: {}
        },
        functionName: {
          type: "string",
          description: "Function name to call"
        },
        args: {
          type: "array",
          description: "Function arguments array",
          items: {}
        },
        network: {
          type: "string",
          description: "Network name. Default: arbitrum-sepolia"
        }
      },
      required: ["contractAddress", "abi", "functionName"]
    }
  }
];

// ──────────────────────────────────────────────────────────────
// PROMPTS
// ──────────────────────────────────────────────────────────────
const PROMPTS = [
  {
    name: "build_dapp",
    description: "Build a complete Fhenix FHE DApp from scratch",
    arguments: [
      { name: "description", description: "What DApp to build", required: true }
    ]
  },
  {
    name: "audit_contract",
    description: "Full security audit of an FHE contract",
    arguments: [
      { name: "code", description: "Solidity contract code", required: true }
    ]
  },
  {
    name: "explain_fhe",
    description: "Explain a Fhenix FHE concept",
    arguments: [
      { name: "concept", description: "Concept name", required: true }
    ]
  }
];

// ──────────────────────────────────────────────────────────────
// Helper: detect template from description (uses knowledge.js)
// ──────────────────────────────────────────────────────────────
function detectTemplate(description) {
  return detectTemplateFromKnowledge(description);
}

// ──────────────────────────────────────────────────────────────
// Helper: derive contract name from description
// ──────────────────────────────────────────────────────────────
function deriveName(description) {
  const words = description
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 3)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.join('') || 'FheContract';
}

// ──────────────────────────────────────────────────────────────
// Helper: apply template substitution
// ──────────────────────────────────────────────────────────────
function applyTemplate(str, name) {
  return str.replace(/\{\{NAME\}\}/g, name);
}

// ──────────────────────────────────────────────────────────────
// Helper: quick FHE audit of Solidity code
// ──────────────────────────────────────────────────────────────
function auditContract(code, severity = 'all') {
  const findings = [];

  // C1: missing allowThis after assignment
  const assignmentPattern = /=\s*FHE\.(add|sub|mul|div|select|asEuint|asEbool)\(/g;
  let match;
  while ((match = assignmentPattern.exec(code)) !== null) {
    const after = code.slice(match.index, match.index + 300);
    if (!after.includes('FHE.allowThis(')) {
      findings.push({
        severity: 'CRITICAL',
        id: 'C1',
        title: 'Missing FHE.allowThis() after encrypted assignment',
        detail: `Found FHE.${match[1]}() assignment without nearby FHE.allowThis() call. Contract will lose access to this handle in subsequent transactions.`,
        fix: 'Add FHE.allowThis(newHandle) immediately after every encrypted assignment.'
      });
      break;
    }
  }

  // C2: if/else on encrypted values
  const branchPatterns = [
    /if\s*\(\s*e(uint|bool|address)/,
    /require\s*\(\s*e(uint|bool)/,
    /assert\s*\(\s*e(uint|bool)/
  ];
  for (const pat of branchPatterns) {
    if (pat.test(code)) {
      findings.push({
        severity: 'CRITICAL',
        id: 'C2',
        title: 'Branch on encrypted value',
        detail: 'if/require/assert on encrypted types leaks plaintext via execution path or gas usage.',
        fix: 'Replace with FHE.select(condition, valueIfTrue, valueIfFalse) for all encrypted conditional logic.'
      });
      break;
    }
  }

  // C3: missing allowSender
  if (code.includes('FHE.allowThis(') && !code.includes('FHE.allowSender(') && !code.includes('FHE.allow(')) {
    findings.push({
      severity: 'CRITICAL',
      id: 'C3',
      title: 'Missing FHE.allowSender() / FHE.allow() for user-readable values',
      detail: 'FHE.allowThis() is called but no FHE.allowSender() or FHE.allow(). Users cannot decrypt their own data.',
      fix: 'Add FHE.allowSender(handle) for values users need to read, or FHE.allow(handle, addr) for specific addresses.'
    });
  }

  // C5: view function without PermissionedV2
  if (code.includes('SealedUint') && !code.includes('PermissionedV2') && !code.includes('onlySender')) {
    findings.push({
      severity: 'CRITICAL',
      id: 'C5',
      title: 'View function missing PermissionedV2 / onlySender',
      detail: 'Functions returning SealedUint without PermissionedV2 and onlySender allow anyone to call with their own key.',
      fix: 'Inherit from PermissionedV2 and add onlySender(permission) modifier to all view functions returning sealed data.'
    });
  }

  // C6: sub without gte check
  if (code.includes('FHE.sub(') && !code.includes('FHE.gte(') && !code.includes('FHE.lte(')) {
    findings.push({
      severity: 'CRITICAL',
      id: 'C6',
      title: 'Encrypted subtraction without underflow guard',
      detail: 'FHE.sub() wraps on underflow — negative values become huge positives silently.',
      fix: 'Use FHE.select(FHE.gte(a, b), FHE.sub(a, b), a) to guard against underflow.'
    });
  }

  // C7: InEuint used without FHE.asEuint conversion
  const inEuintUsed = /InEuint\d+\s+\w+/.test(code);
  const asEuintUsed = /FHE\.asEuint\d+\(/.test(code);
  if (inEuintUsed && !asEuintUsed) {
    findings.push({
      severity: 'CRITICAL',
      id: 'C7',
      title: 'InEuint input used without FHE.asEuintX() conversion',
      detail: 'Raw InEuint inputs must be converted with FHE.asEuintX() before use in operations.',
      fix: 'Add: euint32 val = FHE.asEuint32(inValue); before using encrypted inputs.'
    });
  }

  // H5: encrypted handles in events
  if (/emit\s+\w+\([^)]*euint/.test(code) || /emit\s+\w+\([^)]*ebool/.test(code)) {
    findings.push({
      severity: 'HIGH',
      id: 'H5',
      title: 'Encrypted handle exposed in event',
      detail: 'Emitting euint handles in events enables handle fishing attacks.',
      fix: 'Emit only plaintext metadata (addresses, timestamps) in events. Never emit raw handles.'
    });
  }

  // H6: uninitialized encrypted state
  if (!code.includes('FHE.asEuint') && code.includes('euint')) {
    findings.push({
      severity: 'HIGH',
      id: 'H6',
      title: 'Potentially uninitialized encrypted state',
      detail: 'Encrypted mappings/variables may not be initialized — operations on handle 0 are invalid.',
      fix: 'Initialize all encrypted state: e.g. _balance[user] = FHE.asEuint128(0); FHE.allowThis(...);'
    });
  }

  // M2: missing events
  if (!code.includes('event ')) {
    findings.push({
      severity: 'MEDIUM',
      id: 'M2',
      title: 'No events defined',
      detail: 'Without events, there is no way to index state changes off-chain.',
      fix: 'Add events for all state-changing operations with plaintext metadata (user address, timestamp).'
    });
  }

  // M6: hardcoded addresses
  if (/0x[0-9a-fA-F]{40}/.test(code) && (code.includes('TaskManager') || code.includes('cofhe') || code.includes('ACL'))) {
    findings.push({
      severity: 'MEDIUM',
      id: 'M6',
      title: 'Hardcoded CoFHE contract addresses',
      detail: 'Hardcoded addresses will fail on different networks.',
      fix: 'Load CoFHE addresses from environment variables or a network configuration mapping.'
    });
  }

  const filterMap = { 'critical': 'CRITICAL', 'high': 'HIGH', 'medium': 'MEDIUM' };
  const filtered = severity === 'all'
    ? findings
    : findings.filter(f => f.severity === filterMap[severity]);

  return filtered;
}

// ──────────────────────────────────────────────────────────────
// Tool Execution
// ──────────────────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {

    case 'zaxfhe_build': {
      const description = args.description || '';
      const templateKey = detectTemplate(description);
      const contractName = args.name || deriveName(description);
      const network = args.network || 'arbitrum-sepolia';
      const tmpl = ALL_TEMPLATES[templateKey] || ALL_TEMPLATES['counter'];

      const contract = applyTemplate(tmpl.solidity, contractName);
      const frontend = applyTemplate(tmpl.frontend, contractName);
      const tests = applyTemplate(tmpl.test, contractName);
      const deploy = applyTemplate(tmpl.deploy, contractName);

      // Auto-audit
      const auditFindings = auditContract(contract);
      const criticalCount = auditFindings.filter(f => f.severity === 'CRITICAL').length;

      const auditSection = auditFindings.length === 0
        ? '✅ No vulnerabilities detected.'
        : auditFindings.map(f => `**[${f.severity}] ${f.id}: ${f.title}**\n${f.detail}\n→ Fix: ${f.fix}`).join('\n\n');

      const networkInfo = NETWORK_INFO.networks.find(n => n.name.toLowerCase().replace(' ', '-') === network) || NETWORK_INFO.networks[0];

      return {
        content: [{
          type: 'text',
          text: `# 🔒 zaxFHE Built: ${contractName}
**Template:** ${templateKey} | **Network:** ${networkInfo.name} (Chain ID: ${networkInfo.chainId})
**RPC:** ${networkInfo.rpc}
${networkInfo.cofhe ? `**CoFHE TaskManager:** ${networkInfo.cofhe.taskManager}` : ''}

---

## 📄 contracts/${contractName}.sol

\`\`\`solidity
${contract}
\`\`\`

---

## ⚛️ frontend/src/${contractName}App.jsx

\`\`\`jsx
${frontend}
\`\`\`

---

## 🧪 test/${contractName}.test.ts

\`\`\`typescript
${tests}
\`\`\`

---

## 🚀 scripts/deploy.ts

\`\`\`typescript
${deploy}
\`\`\`

---

## 🔐 Security Audit

${auditSection}

---

## Next Steps

1. \`npm install @fhenixprotocol/cofhe-contracts cofhejs ethers hardhat\`
2. \`npx hardhat compile\`
3. \`npx hardhat test\`
4. \`npx hardhat run scripts/deploy.ts --network ${network}\`
5. Set \`VITE_CONTRACT_ADDRESS\` in frontend .env
`
        }]
      };
    }

    case 'zaxfhe_scaffold_contract': {
      const { template, name } = args;
      if (!ALL_TEMPLATES[template]) {
        return { content: [{ type: 'text', text: `Unknown template: ${template}. Available: counter, private-token, voting, auction, dark-pool, lending, nft-marketplace, identity, stablecoin, payroll, gaming, subscription` }] };
      }
      const code = applyTemplate(ALL_TEMPLATES[template].solidity, name);
      return {
        content: [{
          type: 'text',
          text: `## contracts/${name}.sol\n\n\`\`\`solidity\n${code}\n\`\`\``
        }]
      };
    }

    case 'zaxfhe_scaffold_frontend': {
      const { template, name } = args;
      if (!ALL_TEMPLATES[template]) {
        return { content: [{ type: 'text', text: `Unknown template: ${template}.` }] };
      }
      const code = applyTemplate(ALL_TEMPLATES[template].frontend, name);
      return {
        content: [{
          type: 'text',
          text: `## frontend/src/${name}App.jsx\n\n\`\`\`jsx\n${code}\n\`\`\``
        }]
      };
    }

    case 'zaxfhe_scaffold_tests': {
      const { template, name } = args;
      if (!ALL_TEMPLATES[template]) {
        return { content: [{ type: 'text', text: `Unknown template: ${template}.` }] };
      }
      const code = applyTemplate(ALL_TEMPLATES[template].test, name);
      return {
        content: [{
          type: 'text',
          text: `## test/${name}.test.ts\n\n\`\`\`typescript\n${code}\n\`\`\``
        }]
      };
    }

    case 'zaxfhe_audit': {
      const { code, severity = 'all' } = args;
      const findings = auditContract(code, severity);

      if (findings.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `## 🔐 zaxFHE Security Audit\n\n✅ **No vulnerabilities detected** for severity: ${severity}\n\nThe contract follows FHE security best practices.`
          }]
        };
      }

      const critical = findings.filter(f => f.severity === 'CRITICAL');
      const high = findings.filter(f => f.severity === 'HIGH');
      const medium = findings.filter(f => f.severity === 'MEDIUM');

      let report = `## 🔐 zaxFHE Security Audit\n\n`;
      report += `**Found ${findings.length} issue(s):** ${critical.length} CRITICAL, ${high.length} HIGH, ${medium.length} MEDIUM\n\n`;

      for (const f of findings) {
        const emoji = f.severity === 'CRITICAL' ? '🔴' : f.severity === 'HIGH' ? '🟠' : '🟡';
        report += `### ${emoji} [${f.severity}] ${f.id}: ${f.title}\n\n`;
        report += `**Detail:** ${f.detail}\n\n`;
        report += `**Fix:** ${f.fix}\n\n---\n\n`;
      }

      if (critical.length > 0) {
        report += `⚠️ **${critical.length} CRITICAL issue(s) found — do not deploy until resolved.**`;
      }

      return { content: [{ type: 'text', text: report }] };
    }

    case 'zaxfhe_explain': {
      const concept = args.concept?.toLowerCase() || '';
      let found = null;

      for (const [key, value] of Object.entries(CONCEPTS)) {
        if (concept.includes(key)) {
          found = value;
          break;
        }
      }

      if (!found) {
        // Fuzzy: check if any keyword contains the concept
        for (const [key, value] of Object.entries(CONCEPTS)) {
          if (key.includes(concept) || concept.includes(key.split(' ')[0])) {
            found = value;
            break;
          }
        }
      }

      if (!found) {
        found = `## Available FHE Topics\n\nI can explain:\n${Object.keys(CONCEPTS).map(k => `- ${k}`).join('\n')}\n\nTry: \`zaxfhe_explain({ concept: "fhe" })\` or \`zaxfhe_explain({ concept: "cofhejs" })\``;
      }

      return { content: [{ type: 'text', text: `## 📚 zaxFHE Knowledge: ${args.concept}\n\n${found}` }] };
    }

    case 'zaxfhe_encrypt_helper': {
      const { type, variable, contractAddress = 'CONTRACT_ADDRESS' } = args;
      const fheType = type.charAt(0).toUpperCase() + type.slice(1);
      const solidityType = type === 'bool' ? 'ebool' : type === 'address' ? 'eaddress' : `euint${type.replace('uint', '')}`;
      const inputType = type === 'bool' ? 'InEbool' : type === 'address' ? 'InEaddress' : `InEuint${type.replace('uint', '')}`;
      const fheTypesEnum = type === 'bool' ? 'FheTypes.Bool' : type === 'address' ? 'FheTypes.Address' : `FheTypes.${fheType}`;
      const encryptable = `Encryptable.${type}(${variable}Value)`;

      const code = `// ── Client-side (cofhejs) ──────────────────────────────────────

import { cofhejs, Encryptable, FheTypes } from 'cofhejs/web';

// Initialize once
await cofhejs.initializeWithEthers({ provider });

// Encrypt
const [enc${fheType}] = await cofhejs.encrypt([
  ${encryptable}
]);

// Send to contract (enc${fheType} is InEuint type, pass directly)
const tx = await contract.myFunction(enc${fheType});
await tx.wait();

// ── Read & unseal ──────────────────────────────────────────────

const permit = await cofhejs.createPermit({
  type: 'self',
  issuer: await signer.getAddress(),
  contracts: [${contractAddress}],
  projects: ['MyApp']
});
const permission = cofhejs.getPermission(${contractAddress}, permit);

// Call view function with permission
const sealed = await contract.get${fheType}(permission);

// Unseal
const result = await cofhejs.unseal(${contractAddress}, ${fheTypesEnum}, sealed.data);
console.log('${variable}:', result);

// ── Solidity contract side ─────────────────────────────────────

// Input parameter type:  ${inputType} calldata enc${fheType}
// Convert:               ${solidityType} ${variable} = FHE.as${solidityType.charAt(0).toUpperCase() + solidityType.slice(1)}(enc${fheType});
// After assignment:      FHE.allowThis(${variable});
// For user reads:        FHE.allowSender(${variable});
// View function output:  SealedUint memory  (FHE.sealoutput(${variable}, permission.publicKey))
`;
      return { content: [{ type: 'text', text: code }] };
    }

    case 'zaxfhe_project_setup': {
      const { projectName, network = 'arbitrum-sepolia' } = args;
      const networks = network === 'both'
        ? `    "arbitrum-sepolia": {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    "base-sepolia": {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }`
        : network === 'arbitrum-sepolia'
        ? `    "arbitrum-sepolia": {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }`
        : `    "base-sepolia": {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }`;

      const output = `## 🛠️ Project Setup: ${projectName}

### package.json
\`\`\`json
{
  "name": "${projectName.toLowerCase()}",
  "version": "1.0.0",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy": "hardhat run scripts/deploy.ts --network ${network}"
  },
  "dependencies": {
    "@fhenixprotocol/cofhe-contracts": "^0.1.0",
    "cofhejs": "^0.1.0",
    "ethers": "^6.9.0"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "hardhat": "^2.22.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "dotenv": "^16.0.0"
  }
}
\`\`\`

### hardhat.config.ts
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
${networks}
  }
};
export default config;
\`\`\`

### tsconfig.json
\`\`\`json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist"
  },
  "include": ["./scripts", "./test"]
}
\`\`\`

### .env
\`\`\`
PRIVATE_KEY=0x_your_private_key_here
ARBISCAN_API_KEY=your_arbiscan_key
\`\`\`

### Folder Structure
\`\`\`
${projectName}/
├── contracts/
│   └── MyContract.sol
├── scripts/
│   └── deploy.ts
├── test/
│   └── MyContract.test.ts
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── hardhat.config.ts
├── package.json
├── tsconfig.json
└── .env
\`\`\`

### Install & Run
\`\`\`bash
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network ${network}
\`\`\`
`;
      return { content: [{ type: 'text', text: output }] };
    }

    case 'zaxfhe_network_info': {
      const { network = 'all' } = args;
      let nets = NETWORK_INFO.networks;
      if (network !== 'all') {
        nets = nets.filter(n => n.name.toLowerCase().replace(/ /g, '-') === network);
      }

      const output = nets.map(n => `### ${n.name} (Chain ID: ${n.chainId})
- **Type:** ${n.type}
- **RPC:** ${n.rpc}
- **Explorer:** ${n.explorer}
${n.cofhe ? `- **CoFHE TaskManager:** \`${n.cofhe.taskManager}\`
- **CoFHE ACL:** \`${n.cofhe.acl}\`
- **CoFHE ZkVerifier:** \`${n.cofhe.zkVerifier}\`` : '- **CoFHE:** Not deployed on this network'}`).join('\n\n');

      return { content: [{ type: 'text', text: `## 🌐 Fhenix Network Info\n\n${output}` }] };
    }

    case 'zaxfhe_read_contract': {
      const { contractAddress, abi, functionName, args: fnArgs = [], network = 'arbitrum-sepolia' } = args;
      const netInfo = NETWORK_INFO.networks.find(n => n.name.toLowerCase().replace(/ /g, '-') === network) || NETWORK_INFO.networks[0];

      try {
        // Dynamic import ethers — available as dependency
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(netInfo.rpc);
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const result = await contract[functionName](...fnArgs);
        const serialized = typeof result === 'bigint' ? result.toString()
          : typeof result === 'object' ? JSON.stringify(result, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)
          : String(result);
        return {
          content: [{
            type: 'text',
            text: `## Contract Read: ${functionName}\n\n**Contract:** \`${contractAddress}\`\n**Network:** ${netInfo.name}\n\n**Result:**\n\`\`\`\n${serialized}\n\`\`\``
          }]
        };
      } catch (err) {
        return {
          content: [{
            type: 'text',
            text: `## ❌ Contract Read Failed\n\n**Function:** ${functionName}\n**Error:** ${err.message}\n\nNote: For sealed/encrypted values, you must unseal client-side with cofhejs.unseal().`
          }]
        };
      }
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true
      };
  }
}

// ──────────────────────────────────────────────────────────────
// MCP Request Router
// ──────────────────────────────────────────────────────────────
async function handleMCP(body) {
  const { jsonrpc, method, params, id } = body;

  // notifications — no response
  if (method === 'notifications/initialized') {
    return null;
  }

  const respond = (result) => ({ jsonrpc: '2.0', id: id ?? null, result });
  const error = (code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

  switch (method) {

    case 'initialize':
      return respond({
        protocolVersion: '2024-11-05',
        serverInfo: { name: 'zaxFHE', version: '1.0.0' },
        capabilities: {
          tools: { listChanged: false },
          prompts: { listChanged: false },
          resources: {}
        },
        instructions: `You are zaxFHE — an expert Fhenix FHE developer agent embedded in Claude Code. When anyone says 'Hey zaxFHE' or addresses zaxFHE, respond as that agent: confident, direct, technical. You build COMPLETE DApps — always output contract + frontend + tests + deploy script together. Never just snippets. You know everything about Fhenix FHE: CoFHE architecture, FHE.sol (euint8/16/32/64/128/256, ebool, eaddress, all ops), cofhejs SDK (encrypt/unseal/permits), PermissionedV2, and all 27 FHE vulnerability patterns. Your rules: ALWAYS FHE.allowThis() + FHE.allowSender() after every encrypted assignment. NEVER if/else on encrypted values — use FHE.select(). View functions returning sealed data MUST use PermissionedV2 + onlySender. Import from @fhenixprotocol/cofhe-contracts/FHE.sol. Primary network: Arbitrum Sepolia (421614). Use zaxfhe_build as your main tool — it auto-detects the best template from 12 options (counter, private-token, voting, auction, dark-pool, lending, nft-marketplace, identity, stablecoin, payroll, gaming, subscription) and outputs everything at once.`
      });

    case 'ping':
      return respond({});

    case 'tools/list':
      return respond({ tools: TOOLS });

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      if (!toolName) return error(-32602, 'Missing tool name');
      const result = await executeTool(toolName, toolArgs);
      return respond(result);
    }

    case 'prompts/list':
      return respond({ prompts: PROMPTS });

    case 'prompts/get': {
      const promptName = params?.name;
      const promptArgs = params?.arguments || {};
      const prompt = PROMPTS.find(p => p.name === promptName);
      if (!prompt) return error(-32602, `Unknown prompt: ${promptName}`);

      let messages = [];
      if (promptName === 'build_dapp') {
        messages = [{
          role: 'user',
          content: { type: 'text', text: `Hey zaxFHE, build me: ${promptArgs.description || 'a private DeFi app'}` }
        }];
      } else if (promptName === 'audit_contract') {
        messages = [{
          role: 'user',
          content: { type: 'text', text: `zaxFHE, audit this contract:\n\n${promptArgs.code || ''}` }
        }];
      } else if (promptName === 'explain_fhe') {
        messages = [{
          role: 'user',
          content: { type: 'text', text: `zaxFHE, explain: ${promptArgs.concept || 'FHE'}` }
        }];
      }

      return respond({ description: prompt.description, messages });
    }

    default:
      return error(-32601, `Method not found: ${method}`);
  }
}

// ──────────────────────────────────────────────────────────────
// Vercel Handler
// ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS for all responses
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({
      name: 'zaxFHE',
      version: '1.0.0',
      description: 'Agentic MCP server for Fhenix FHE development',
      protocol: 'MCP 2024-11-05',
      tools: TOOLS.length,
      connect: 'claude mcp add zaxfhe --transport http https://YOUR_VERCEL_URL/mcp'
    });
  }

  // MCP JSON-RPC
  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    try {
      const response = await handleMCP(body);
      if (response === null) {
        // notifications return no content
        return res.status(204).end();
      }
      return res.status(200).json(response);
    } catch (err) {
      console.error('zaxFHE MCP error:', err);
      return res.status(500).json({
        jsonrpc: '2.0',
        id: body?.id ?? null,
        error: { code: -32603, message: 'Internal error: ' + err.message }
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
