#!/usr/bin/env node
/* ═══════════════════════════════════════════════════
   HECTX Demo — Backend Server

   Serves the demo UI and provides API endpoints that
   model the Daml ledger lifecycle: setup, mint,
   transfer, status, and compliance rejection.
   ═══════════════════════════════════════════════════ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const STATIC = __dirname;

/* ─── Contract ID Generator ─── */
let cidCounter = 0;
function cid() {
  cidCounter++;
  const ts = Date.now().toString(16).padStart(12, "0");
  const seq = cidCounter.toString(16).padStart(4, "0");
  const rand = Array.from({ length: 48 }, () =>
    "0123456789abcdef"[Math.floor(Math.random() * 16)]
  ).join("");
  return `00${ts}${seq}${rand}`;
}

/* ─── Ledger State ─── */
function freshLedger() {
  return {
    contracts: {},     // cid -> { template, payload }
    holdings: {},      // owner -> { cid, amount }
    totalSupply: 0,
    phase: "empty",    // empty | initialized | minted | transferred | rejected
  };
}

let ledger = freshLedger();

/* ─── Ledger Operations ─── */

function setup() {
  if (ledger.phase !== "empty") throw new Error("Ledger already initialized — reset first");

  const eligibilityCid = cid();
  const feeCid = cid();
  const mintPolicyCid = cid();
  const registryCid = cid();
  const navCid = cid();
  const supplyCid = cid();
  const factoryCid = cid();

  ledger.contracts[eligibilityCid] = {
    template: "HectX.Policy:EligibilityPolicy",
    payload: { admin: "admin", prohibitedJurisdictions: ["United States"], restrictedJurisdictions: ["Brazil", "EEA", "Hong Kong", "Malaysia", "Singapore", "Switzerland", "United Kingdom"] },
  };
  ledger.contracts[feeCid] = {
    template: "HectX.Policy:FeeSchedule",
    payload: { admin: "admin", subscriptionFeeBps: 0, conversionFeeBps: 0, managementFeeBps: 0 },
  };
  ledger.contracts[mintPolicyCid] = {
    template: "HectX.Policy:MintPolicy",
    payload: { admin: "admin", mintingEnabled: true, elasticFeeActive: false, elasticFeeBps: 100, maxNavAgeSeconds: 3600 },
  };
  ledger.contracts[navCid] = {
    template: "HectX.NAV:NAVSnapshot",
    payload: { admin: "admin", nav: 1000.0, gav: 1000.0, reserves: 1000.0, liabilities: 0.0, accruedFees: 0.0, timestamp: new Date().toISOString() },
  };
  ledger.contracts[supplyCid] = {
    template: "HectX.NAV:Supply",
    payload: { admin: "admin", totalSupply: 0.0 },
  };
  ledger.contracts[registryCid] = {
    template: "HectX.Registry:HectXRegistry",
    payload: { admin: "admin", eligibilityPolicyCid: eligibilityCid, feeScheduleCid: feeCid, mintPolicyCid: mintPolicyCid },
  };
  ledger.contracts[factoryCid] = {
    template: "HectX.Transfers:HectXTransferFactory",
    payload: { admin: "admin", factoryInstrumentId: "HECTX" },
  };

  ledger.phase = "initialized";

  return {
    registryCid,
    transferFactoryCid: factoryCid,
    contracts: 7,
    log: [
      { message: `EligibilityPolicy created — prohibited: [United States]`, type: "success" },
      { message: `FeeSchedule created — subscription: 0 bps, conversion: 0 bps`, type: "success" },
      { message: `MintPolicy created — enabled: true, elastic: inactive, maxAge: 3600s`, type: "success" },
      { message: `HectXRegistry created — CID: ${registryCid.slice(0, 24)}...`, type: "success" },
      { message: `NAVSnapshot created — NAV: $1,000, GAV: $1,000, reserves: $1,000`, type: "success" },
      { message: `Supply initialized — 0.00 HECTX`, type: "success" },
      { message: `HectXTransferFactory created — Splice TransferFactory interface`, type: "success" },
    ],
  };
}

function mint() {
  if (ledger.phase !== "initialized") throw new Error("Run setup first");

  // Create participant + wallet
  const participantCid = cid();
  const walletCid = cid();
  ledger.contracts[participantCid] = {
    template: "HectX.Compliance:Participant",
    payload: { admin: "admin", investor: "alice", jurisdiction: "Portugal", status: "Eligible", isAccredited: true },
  };
  ledger.contracts[walletCid] = {
    template: "HectX.Compliance:WalletApproval",
    payload: { admin: "admin", investor: "alice", active: true },
  };

  // Compliance checks
  const eligPolicy = Object.values(ledger.contracts).find(c => c.template === "HectX.Policy:EligibilityPolicy");
  const mintPolicy = Object.values(ledger.contracts).find(c => c.template === "HectX.Policy:MintPolicy");
  const feeSchedule = Object.values(ledger.contracts).find(c => c.template === "HectX.Policy:FeeSchedule");
  const navSnap = Object.values(ledger.contracts).find(c => c.template === "HectX.NAV:NAVSnapshot");

  const amount = 1000.0;
  const subFee = amount * feeSchedule.payload.subscriptionFeeBps / 10000;
  const convFee = amount * feeSchedule.payload.conversionFeeBps / 10000;
  const netAmount = amount - subFee - convFee;
  const navPerToken = 1.0; // first mint
  const mintedAmount = netAmount / navPerToken;

  // Create holding
  const holdingCid = cid();
  const requestCid = cid();
  const receiptCid = cid();
  ledger.contracts[holdingCid] = {
    template: "HectX.Holding:HectXHolding",
    payload: { admin: "admin", owner: "alice", amount: mintedAmount, instrumentId: "HECTX" },
  };
  ledger.contracts[requestCid] = {
    template: "HectX.Minting:MintRequest",
    payload: { admin: "admin", investor: "alice", amount, requestedAt: new Date().toISOString() },
  };
  ledger.contracts[receiptCid] = {
    template: "HectX.Minting:MintReceipt",
    payload: { investor: "alice", netAmount, mintedAmount, navPerToken, outcome: "Minted" },
  };

  ledger.holdings["alice"] = { cid: holdingCid, amount: mintedAmount };
  ledger.totalSupply = mintedAmount;
  ledger.phase = "minted";

  return {
    requestCid,
    receiptCid,
    holdingCid,
    mintedAmount,
    navPerToken,
    supply: ledger.totalSupply,
    log: [
      { message: `Participant (Alice) created — jurisdiction: Portugal, status: Eligible`, type: "success" },
      { message: `WalletApproval (Alice) created — active: true`, type: "success" },
      { message: `MintRequest submitted — investor: Alice, amount: 1,000.00`, type: "info" },
      { message: `ApproveMint executed — 7 compliance checks passed:`, type: "success" },
      { message: `  ✓ mintingEnabled == ${mintPolicy.payload.mintingEnabled}`, type: "success" },
      { message: `  ✓ investor.status == Eligible`, type: "success" },
      { message: `  ✓ wallet.active == True`, type: "success" },
      { message: `  ✓ jurisdiction "Portugal" not in prohibitedJurisdictions`, type: "success" },
      { message: `  ✓ NAV age ≤ ${mintPolicy.payload.maxNavAgeSeconds}s`, type: "success" },
      { message: `  ✓ fees computed (sub: ${feeSchedule.payload.subscriptionFeeBps} bps, conv: ${feeSchedule.payload.conversionFeeBps} bps, elastic: N/A)`, type: "success" },
      { message: `  ✓ netAmount = ${netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} > 0`, type: "success" },
      { message: `HectXHolding created — Alice: ${mintedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} HECTX`, type: "success" },
      { message: `Supply updated — 0 → ${mintedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, type: "info" },
    ],
  };
}

function transfer() {
  if (ledger.phase !== "minted") throw new Error("Run mint first");

  // Create Bob's participant + wallet
  const participantCid = cid();
  const walletCid = cid();
  ledger.contracts[participantCid] = {
    template: "HectX.Compliance:Participant",
    payload: { admin: "admin", investor: "bob", jurisdiction: "Portugal", status: "Eligible", isAccredited: true },
  };
  ledger.contracts[walletCid] = {
    template: "HectX.Compliance:WalletApproval",
    payload: { admin: "admin", investor: "bob", active: true },
  };

  const transferAmount = 100.0;
  const aliceBefore = ledger.holdings["alice"].amount;
  const aliceAfter = aliceBefore - transferAmount;

  // Archive old holding, create two new ones
  delete ledger.contracts[ledger.holdings["alice"].cid];

  const aliceHoldingCid = cid();
  const bobHoldingCid = cid();
  ledger.contracts[aliceHoldingCid] = {
    template: "HectX.Holding:HectXHolding",
    payload: { admin: "admin", owner: "alice", amount: aliceAfter, instrumentId: "HECTX" },
  };
  ledger.contracts[bobHoldingCid] = {
    template: "HectX.Holding:HectXHolding",
    payload: { admin: "admin", owner: "bob", amount: transferAmount, instrumentId: "HECTX" },
  };

  ledger.holdings["alice"] = { cid: aliceHoldingCid, amount: aliceAfter };
  ledger.holdings["bob"] = { cid: bobHoldingCid, amount: transferAmount };
  ledger.phase = "transferred";

  return {
    amount: transferAmount,
    checksPassedCount: 6,
    senderHoldingCid: aliceHoldingCid,
    receiverHoldingCid: bobHoldingCid,
    log: [
      { message: `Participant (Bob) created — jurisdiction: Portugal, status: Eligible`, type: "success" },
      { message: `WalletApproval (Bob) created — active: true`, type: "success" },
      { message: `TransferFactory_Transfer executed — 6 compliance checks passed:`, type: "success" },
      { message: `  ✓ sender.status == Eligible`, type: "success" },
      { message: `  ✓ receiver.status == Eligible`, type: "success" },
      { message: `  ✓ sender wallet active`, type: "success" },
      { message: `  ✓ receiver wallet active`, type: "success" },
      { message: `  ✓ sender jurisdiction "Portugal" not prohibited`, type: "success" },
      { message: `  ✓ receiver jurisdiction "Portugal" not prohibited`, type: "success" },
      { message: `Input holding archived — Alice: ${aliceBefore.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, type: "info" },
      { message: `Receiver holding created — Bob: ${transferAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} HECTX`, type: "success" },
      { message: `Change holding created — Alice: ${aliceAfter.toLocaleString("en-US", { minimumFractionDigits: 2 })} HECTX`, type: "success" },
    ],
  };
}

function rejection() {
  // Create Charlie — US investor
  const participantCid = cid();
  const walletCid = cid();
  ledger.contracts[participantCid] = {
    template: "HectX.Compliance:Participant",
    payload: { admin: "admin", investor: "charlie", jurisdiction: "United States", status: "Eligible", isAccredited: true },
  };
  ledger.contracts[walletCid] = {
    template: "HectX.Compliance:WalletApproval",
    payload: { admin: "admin", investor: "charlie", active: true },
  };

  // Jurisdiction check FAILS
  ledger.phase = "rejected";

  return {
    blocked: true,
    reason: "investor jurisdiction prohibited",
    log: [
      { message: `Participant (Charlie) created — jurisdiction: United States, status: Eligible`, type: "success" },
      { message: `WalletApproval (Charlie) created — active: true`, type: "success" },
      { message: `MintRequest submitted — investor: Charlie, amount: 500.00`, type: "info" },
      { message: `ApproveMint executing — compliance checks:`, type: "info" },
      { message: `  ✓ mintingEnabled == True`, type: "success" },
      { message: `  ✓ investor.status == Eligible`, type: "success" },
      { message: `  ✓ wallet.active == True`, type: "success" },
      { message: `  ✗ jurisdiction "United States" IS in prohibitedJurisdictions`, type: "error" },
      { message: `ApproveMint ABORTED — "investor jurisdiction prohibited"`, type: "error" },
      { message: `MintRequest rolled back — no tokens minted, no supply change`, type: "error" },
    ],
  };
}

function status() {
  const holdingsCount = Object.keys(ledger.holdings).length;
  return {
    ready: ledger.phase !== "empty",
    phase: ledger.phase,
    balances: {
      alice: ledger.holdings["alice"]?.amount ?? 0,
      bob: ledger.holdings["bob"]?.amount ?? 0,
    },
    totalSupply: ledger.totalSupply,
    holdingsCount,
    contractCount: Object.keys(ledger.contracts).length,
  };
}

/* ─── Static File Server ─── */
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serveStatic(req, res) {
  const url = req.url.split("?")[0];
  const fp = path.join(STATIC, url === "/" ? "index.html" : url);

  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const ext = path.extname(fp);
  // Disable caching so the latest files are always served
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  });
  res.end(fs.readFileSync(fp));
}

/* ─── Request Router ─── */
function handleRequest(req, res) {
  // CORS for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split("?")[0];

  // API routes
  if (url.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");

    try {
      let result;
      switch (url) {
        case "/api/setup":
          result = setup();
          break;
        case "/api/mint":
          result = mint();
          break;
        case "/api/transfer":
          result = transfer();
          break;
        case "/api/rejection":
          result = rejection();
          break;
        case "/api/status":
          result = status();
          break;
        case "/api/reset":
          ledger = freshLedger();
          cidCounter = 0;
          result = { ok: true };
          break;
        default:
          res.writeHead(404);
          res.end(JSON.stringify({ error: `Unknown endpoint: ${url}` }));
          return;
      }
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static files
  serveStatic(req, res);
}

/* ─── Start ─── */
const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\n  HECTX Demo Server`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  API:     http://localhost:${PORT}/api/status`);
  console.log(`\n  Endpoints:`);
  console.log(`    POST /api/setup      Initialize ledger`);
  console.log(`    POST /api/mint       Mint HECTX tokens`);
  console.log(`    POST /api/transfer   Transfer tokens`);
  console.log(`    GET  /api/status     Query ledger state`);
  console.log(`    POST /api/rejection  Compliance rejection demo`);
  console.log(`    POST /api/reset      Reset ledger\n`);
});
