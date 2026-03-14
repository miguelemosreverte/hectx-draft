import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { exec } from "child_process";
import { promisify } from "util";
import { ApiConfig, allocateParty, grantActAs, create, exercise, queryACS } from "./jsonApi.js";

const execAsync = promisify(exec);

// ─── Emitter pattern ───
type Emitter = (event: string, data: any) => void;
const noopEmit: Emitter = () => {};

// ─── Investor dataset: 20 investors, 10 jurisdictions ───
const INVESTORS = [
  // Approved — 16 investors across 8 jurisdictions
  { name: "Alice",  jurisdiction: "Portugal",       amount: 2000, prohibited: false },
  { name: "Sofia",  jurisdiction: "Portugal",       amount: 800,  prohibited: false },
  { name: "Liam",   jurisdiction: "Ireland",        amount: 1500, prohibited: false },
  { name: "Maeve",  jurisdiction: "Ireland",        amount: 600,  prohibited: false },
  { name: "Felix",  jurisdiction: "Luxembourg",     amount: 3000, prohibited: false },
  { name: "Marc",   jurisdiction: "Luxembourg",     amount: 400,  prohibited: false },
  { name: "Wei",    jurisdiction: "Singapore",      amount: 1200, prohibited: false },
  { name: "Mei",    jurisdiction: "Singapore",      amount: 900,  prohibited: false },
  { name: "James",  jurisdiction: "Cayman Islands", amount: 2500, prohibited: false },
  { name: "Diana",  jurisdiction: "Cayman Islands", amount: 950,  prohibited: false },
  { name: "Hans",   jurisdiction: "Switzerland",    amount: 1800, prohibited: false },
  { name: "Clara",  jurisdiction: "Switzerland",    amount: 700,  prohibited: false },
  { name: "Erik",   jurisdiction: "Germany",        amount: 1000, prohibited: false },
  { name: "Anna",   jurisdiction: "Germany",        amount: 1100, prohibited: false },
  { name: "Oliver", jurisdiction: "United Kingdom", amount: 1600, prohibited: false },
  { name: "Emma",   jurisdiction: "United Kingdom", amount: 500,  prohibited: false },
  // Prohibited — 4 investors across 2 jurisdictions
  { name: "Charlie", jurisdiction: "United States", amount: 500,  prohibited: true },
  { name: "Dylan",   jurisdiction: "United States", amount: 750,  prohibited: true },
  { name: "Kwang",   jurisdiction: "North Korea",   amount: 1000, prohibited: true },
  { name: "Jiyeon",  jurisdiction: "North Korea",   amount: 300,  prohibited: true },
] as const;

const PROHIBITED_JURISDICTIONS = ["United States", "North Korea"];

const TRANSFERS = [
  { from: "Alice", to: "Liam",  amount: 200 },
  { from: "Felix", to: "Hans",  amount: 500 },
  { from: "Wei",   to: "Oliver", amount: 150 },
  { from: "James", to: "Erik",  amount: 300 },
  { from: "Liam",  to: "Sofia", amount: 100 },
  { from: "Clara", to: "Emma",  amount: 200 },
  { from: "Anna",  to: "Mei",   amount: 150 },
  { from: "Hans",  to: "Alice", amount: 250 },
] as const;

// ─── State ───
type DemoState = {
  adminParty?: string;
  parties: Record<string, string>;       // investor name -> party id
  registryCid?: string;
  eligibilityPolicyCid?: string;
  transferFactoryCid?: string;
  navSnapshotCid?: string;
  supplyCid?: string;
  participants: Record<string, string>;   // party id -> participant CID
  wallets: Record<string, string>;        // party id -> wallet CID
  holdings: Record<string, number>;       // investor name -> balance
  totalSupply: number;
};

const state: DemoState = { parties: {}, participants: {}, wallets: {}, holdings: {}, totalSupply: 0 };

const CANTON_URL = process.env.CANTON_URL ?? "http://localhost:2975";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "unsafe";
const AUTH_AUDIENCE = process.env.AUTH_AUDIENCE ?? "https://canton.network.global";
const PACKAGE_ID =
  process.env.PACKAGE_ID ?? "c6f68e336612d57e6044a31f491f338a29691d53ce4233743e62b2ddc50adaaa";
const USER_ID = process.env.USER_ID ?? "ledger-api-user";
const PORT = Number(process.env.DEMO_PORT ?? 5177);

// Session suffix to isolate each run's parties from stale ledger data
let sessionSuffix = Math.random().toString(36).slice(2, 6);

const adminToken = () =>
  jwt.sign({ sub: USER_ID, admin: true }, AUTH_SECRET, {
    algorithm: "HS256",
    audience: AUTH_AUDIENCE,
    expiresIn: "24h",
  });

const cfg = (): ApiConfig => ({
  baseUrl: CANTON_URL,
  token: adminToken(),
  userId: USER_ID,
  packageId: PACKAGE_ID,
});

const tid = (mod: string, tmpl: string) => `${PACKAGE_ID}:${mod}:${tmpl}`;

// ─── Helpers ───

/** Run an array of async tasks in batches */
async function batchRun<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(fn));
  }
}

/** SSE helper: write a named event if the response is still open */
function sseWrite(res: Response, event: string, data: any): void {
  if ((res as any).destroyed) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Create an Emitter bound to an express Response for SSE */
function sseEmitter(res: Response): Emitter {
  return (event: string, data: any) => sseWrite(res, event, data);
}

/** Set SSE response headers */
function sseHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

// ─── Step functions ───

async function runSetup(emit: Emitter): Promise<any> {
  const c = cfg();
  const act: string[] = [];

  // 1. Allocate admin party
  const admin = await allocateParty(c, `Hecto${sessionSuffix}`);
  await grantActAs(c, admin);
  state.adminParty = admin;
  act.push(admin);

  // 2. Allocate all 20 investor parties in batches of 10
  const allInvestors = [...INVESTORS];
  await batchRun(allInvestors, 10, async (inv) => {
    const party = await allocateParty(c, `${inv.name}${sessionSuffix}`);
    state.parties[inv.name] = party;
    emit("progress", { type: "party_allocated", investor: inv.name, jurisdiction: inv.jurisdiction });
  });

  // 3. Grant actAs for all 20 in batches of 10
  await batchRun(allInvestors, 10, async (inv) => {
    await grantActAs(c, state.parties[inv.name]);
    emit("progress", { type: "actas_granted", investor: inv.name });
  });

  const instrumentId = { admin, id: "HECTX" };

  // 4. Create contracts
  const elig = await create(
    c,
    tid("HectX.Policy", "EligibilityPolicy"),
    { eligibilityAdmin: admin, prohibitedJurisdictions: PROHIBITED_JURISDICTIONS, restrictedJurisdictions: {} },
    act,
  );
  state.eligibilityPolicyCid = elig.contractId;
  emit("progress", { type: "contract_created", contract: "EligibilityPolicy", cid: elig.contractId });

  const fees = await create(
    c,
    tid("HectX.Policy", "FeeSchedule"),
    { feeAdmin: admin, subscriptionFeeBps: "0.0", conversionFeeBps: "0.0", managementFeeBps: "0.0" },
    act,
  );
  emit("progress", { type: "contract_created", contract: "FeeSchedule", cid: fees.contractId });

  const mintPolicy = await create(
    c,
    tid("HectX.Policy", "MintPolicy"),
    {
      mintPolicyAdmin: admin,
      mintingEnabled: true,
      elasticFeeActive: false,
      elasticFeeBps: "100.0",
      maxNavAgeSeconds: 3600,
    },
    act,
  );
  emit("progress", { type: "contract_created", contract: "MintPolicy", cid: mintPolicy.contractId });

  const registry = await create(
    c,
    tid("HectX.Registry", "HectXRegistry"),
    {
      admin,
      instrumentId,
      eligibilityPolicyCid: elig.contractId,
      feeScheduleCid: fees.contractId,
      mintPolicyCid: mintPolicy.contractId,
    },
    act,
  );
  state.registryCid = registry.contractId;
  emit("progress", { type: "contract_created", contract: "HectXRegistry", cid: registry.contractId });

  const supply = await create(
    c,
    tid("HectX.NAV", "Supply"),
    { supplyAdmin: admin, totalSupply: "1000000.0" },
    act,
  );
  state.supplyCid = supply.contractId;
  emit("progress", { type: "contract_created", contract: "Supply", cid: supply.contractId });

  const nav = await create(
    c,
    tid("HectX.NAV", "NAVSnapshot"),
    {
      navAdmin: admin,
      nav: "1000000.0",
      gav: "1000000.0",
      reserves: "1000000.0",
      liabilities: "0.0",
      accruedFees: "0.0",
      timestamp: new Date().toISOString(),
    },
    act,
  );
  state.navSnapshotCid = nav.contractId;
  emit("progress", { type: "contract_created", contract: "NAVSnapshot", cid: nav.contractId });

  const tf = await create(
    c,
    tid("HectX.Transfers", "HectXTransferFactory"),
    {
      admin,
      factoryInstrumentId: instrumentId,
      eligibilityPolicyCid: elig.contractId,
      knownParticipants: [],
      knownWallets: [],
      observers: [],
    },
    act,
  );
  state.transferFactoryCid = tf.contractId;
  emit("progress", { type: "contract_created", contract: "HectXTransferFactory", cid: tf.contractId });

  const jurisdictions = [...new Set(INVESTORS.map((i) => i.jurisdiction))];
  const summary = {
    ok: true,
    registryCid: registry.contractId,
    transferFactoryCid: tf.contractId,
    investorCount: 20,
    jurisdictionCount: jurisdictions.length,
  };
  return summary;
}

async function runMint(emit: Emitter): Promise<any> {
  if (!state.adminParty || !state.registryCid || !state.navSnapshotCid || !state.supplyCid) {
    throw new Error("setup required");
  }
  const admin = state.adminParty;
  const c = cfg();
  const act = [admin];

  const approved = INVESTORS.filter((i) => !i.prohibited);

  // 1. Create Participant records in batches of 8
  await batchRun(approved, 8, async (inv) => {
    const party = state.parties[inv.name];
    const p = await create(
      c,
      tid("HectX.Compliance", "Participant"),
      {
        participantAdmin: admin,
        party,
        observers: [party],
        jurisdiction: inv.jurisdiction,
        isAccredited: true,
        status: "Eligible",
      },
      act,
    );
    state.participants[party] = p.contractId;
    emit("progress", { type: "participant_created", investor: inv.name, jurisdiction: inv.jurisdiction });
  });

  // 2. Create WalletApproval records in batches of 8
  await batchRun(approved, 8, async (inv) => {
    const party = state.parties[inv.name];
    const w = await create(
      c,
      tid("HectX.Compliance", "WalletApproval"),
      { walletAdmin: admin, owner: party, observers: [party], active: true },
      act,
    );
    state.wallets[party] = w.contractId;
    emit("progress", { type: "wallet_created", investor: inv.name });
  });

  // 3. Sequential mints — Supply is a singleton
  let totalSupply = 0;
  for (const inv of approved) {
    const party = state.parties[inv.name];

    // Create MintRequest (signatory is investor)
    const mintReq = await create(
      c,
      tid("HectX.Minting", "MintRequest"),
      { requestAdmin: admin, investor: party, amount: `${inv.amount}.0`, requestedAt: new Date().toISOString() },
      [party],
    );
    emit("progress", { type: "mint_requested", investor: inv.name, amount: inv.amount });

    // Exercise ApproveMint
    const result = await exercise(
      c,
      tid("HectX.Minting", "MintRequest"),
      mintReq.contractId,
      "ApproveMint",
      {
        registryCid: state.registryCid,
        marketPrice: "1.0",
        navSnapshotCid: state.navSnapshotCid,
        supplyCid: state.supplyCid,
        participantCid: state.participants[party],
        walletApprovalCid: state.wallets[party],
      },
      act,
    );

    // Track new Supply CID and actual total supply
    const newSupply = result.events.find(
      (e: any) => e.CreatedEvent?.templateId?.includes("HectX.NAV:Supply"),
    )?.CreatedEvent;
    if (newSupply) {
      state.supplyCid = newSupply.contractId;
      totalSupply = Number(newSupply.createArgument?.totalSupply ?? totalSupply);
      state.totalSupply = totalSupply;
    }

    // Read actual minted amount from HectXHolding CreatedEvent
    const newHolding = result.events.find(
      (e: any) => e.CreatedEvent?.templateId?.includes("HectX.Holding:HectXHolding")
        && e.CreatedEvent?.createArgument?.owner === party,
    )?.CreatedEvent;
    const actualMinted = newHolding ? Number(newHolding.createArgument.amount) : inv.amount;
    state.holdings[inv.name] = (state.holdings[inv.name] ?? 0) + actualMinted;

    emit("progress", {
      type: "mint_approved",
      investor: inv.name,
      jurisdiction: inv.jurisdiction,
      amount: actualMinted,
      totalSupply,
      holdings: { ...state.holdings },
    });
  }

  return {
    ok: true,
    totalMinted: approved.length,
    totalSupply,
    holdings: { ...state.holdings },
  };
}

async function runTransfer(emit: Emitter): Promise<any> {
  if (!state.adminParty || !state.transferFactoryCid) {
    throw new Error("setup required");
  }
  const admin = state.adminParty;
  const c = cfg();
  const act = [admin];
  const instrumentId = { admin, id: "HECTX" };

  const approved = INVESTORS.filter((i) => !i.prohibited);

  // 1. Register all 16 approved investors in TransferFactory sequentially
  let factoryCid = state.transferFactoryCid!;
  for (const inv of approved) {
    const party = state.parties[inv.name];
    const regResult = await exercise(
      c,
      tid("HectX.Transfers", "HectXTransferFactory"),
      factoryCid,
      "RegisterParty",
      { party, participantCid: state.participants[party], walletCid: state.wallets[party] },
      act,
    );
    const newFactory = regResult.events.find(
      (e: any) => e.CreatedEvent?.templateId?.includes("HectX.Transfers:HectXTransferFactory"),
    )?.CreatedEvent;
    if (newFactory) factoryCid = newFactory.contractId;

    emit("progress", { type: "party_registered", investor: inv.name, jurisdiction: inv.jurisdiction });
  }
  state.transferFactoryCid = factoryCid;

  // 2. Execute 8 transfers sequentially
  for (const tx of TRANSFERS) {
    const senderParty = state.parties[tx.from];
    const receiverParty = state.parties[tx.to];

    // Query ACS for sender's holdings (query as sender, not admin — avoids 200-element limit)
    const senderHoldings = await queryACS(c, tid("HectX.Holding", "HectXHolding"), senderParty);
    const holdingCids = senderHoldings.map((evt: any) => evt.contractId);

    if (holdingCids.length === 0) {
      throw new Error(`no holdings for ${tx.from}`);
    }

    // ExecuteTransfer — uses the current transferFactoryCid
    const txResult = await exercise(
      c,
      tid("HectX.Transfers", "HectXTransferFactory"),
      state.transferFactoryCid!,
      "ExecuteTransfer",
      {
        expectedAdmin: admin,
        transfer: {
          sender: senderParty,
          receiver: receiverParty,
          amount: `${tx.amount}.0`,
          instrumentId,
          requestedAt: "1970-01-01T00:00:00Z",
          executeBefore: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          inputHoldingCids: holdingCids,
          meta: { values: {} },
        },
        extraArgs: { context: { values: {} }, meta: { values: {} } },
      },
      act,
    );

    // Refresh balances — query each party individually (avoids 200-element ACS limit)
    const [sAfter, rAfter] = await Promise.all([
      queryACS(c, tid("HectX.Holding", "HectXHolding"), senderParty),
      queryACS(c, tid("HectX.Holding", "HectXHolding"), receiverParty),
    ]);
    state.holdings[tx.from] = sAfter.reduce((sum: number, evt: any) => sum + Number(evt.createArgument?.amount ?? 0), 0);
    state.holdings[tx.to] = rAfter.reduce((sum: number, evt: any) => sum + Number(evt.createArgument?.amount ?? 0), 0);

    emit("progress", {
      type: "transfer_executed",
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      holdings: { ...state.holdings },
    });
  }

  return {
    ok: true,
    transferCount: TRANSFERS.length,
    holdings: { ...state.holdings },
  };
}

async function runRejection(emit: Emitter): Promise<any> {
  if (!state.adminParty || !state.registryCid || !state.navSnapshotCid || !state.supplyCid) {
    throw new Error("setup required");
  }
  const admin = state.adminParty;
  const c = cfg();
  const act = [admin];

  const prohibited = INVESTORS.filter((i) => i.prohibited);
  const rejections: { investor: string; jurisdiction: string; reason: string }[] = [];

  for (const inv of prohibited) {
    // Allocate party with session suffix
    const party = await allocateParty(c, `${inv.name}${sessionSuffix}`);
    state.parties[inv.name] = party;
    await grantActAs(c, party);

    // Create Participant
    const p = await create(
      c,
      tid("HectX.Compliance", "Participant"),
      {
        participantAdmin: admin,
        party,
        observers: [party],
        jurisdiction: inv.jurisdiction,
        isAccredited: true,
        status: "Eligible",
      },
      act,
    );
    state.participants[party] = p.contractId;

    // Create WalletApproval
    const w = await create(
      c,
      tid("HectX.Compliance", "WalletApproval"),
      { walletAdmin: admin, owner: party, observers: [party], active: true },
      act,
    );
    state.wallets[party] = w.contractId;

    // Create MintRequest (signatory is investor)
    const mintReq = await create(
      c,
      tid("HectX.Minting", "MintRequest"),
      { requestAdmin: admin, investor: party, amount: `${inv.amount}.0`, requestedAt: new Date().toISOString() },
      [party],
    );

    // Attempt ApproveMint — expect failure
    // Use tracked Supply CID (avoids 200-element ACS limit on admin-wide query)
    const supplyCid = state.supplyCid!;

    let reason = "investor jurisdiction prohibited";
    try {
      await exercise(
        c,
        tid("HectX.Minting", "MintRequest"),
        mintReq.contractId,
        "ApproveMint",
        {
          registryCid: state.registryCid,
          marketPrice: "1.0",
          navSnapshotCid: state.navSnapshotCid,
          supplyCid,
          participantCid: state.participants[party],
          walletApprovalCid: state.wallets[party],
        },
        act,
      );
      // If we get here, jurisdiction enforcement failed
      reason = "jurisdiction enforcement failed — mint was not blocked";
    } catch (mintErr: any) {
      reason = mintErr?.message ?? "investor jurisdiction prohibited";
    }

    const rejection = { investor: inv.name, jurisdiction: inv.jurisdiction, reason };
    rejections.push(rejection);
    emit("progress", { type: "mint_blocked", ...rejection });
  }

  return { ok: true, rejections };
}

// ─── Express app ───
const app = express();
app.use(express.json());
app.use(express.static(new URL("../../docs/demo", import.meta.url).pathname));

// ─── GET /api/status ───
app.get("/api/status", async (_req: Request, res: Response) => {
  if (!state.adminParty) return res.json({ ready: false });
  try {
    const c = cfg();
    const admin = state.adminParty;

    // Query each investor's holdings individually (avoids 200-element ACS limit)
    const holdingTemplate = tid("HectX.Holding", "HectXHolding");
    const partyEntries = Object.entries(state.parties);
    const results = await Promise.all(
      partyEntries.map(async ([name, partyId]) => {
        const h = await queryACS(c, holdingTemplate, partyId);
        const balance = h.reduce((sum: number, evt: any) => sum + Number(evt.createArgument?.amount ?? 0), 0);
        return { name, balance, count: h.length };
      }),
    );
    const balances: Record<string, number> = {};
    let count = 0;
    for (const r of results) {
      if (r.balance > 0) balances[r.name] = r.balance;
      count += r.count;
    }

    // Use tracked totalSupply (avoids 200-element ACS limit on admin-wide Supply query)
    const totalSupply = state.totalSupply;

    const approvedJurisdictions = [...new Set(
      INVESTORS.filter((i) => !i.prohibited).map((i) => i.jurisdiction),
    )];
    const prohibitedJurisdictionsList = [...new Set(
      INVESTORS.filter((i) => i.prohibited).map((i) => i.jurisdiction),
    )];

    res.json({
      ready: true,
      parties: { admin, ...state.parties },
      balances,
      totalSupply,
      holdingsCount: count,
      jurisdictions: {
        approved: approvedJurisdictions,
        prohibited: prohibitedJurisdictionsList,
      },
    });
  } catch (err: any) {
    console.error("status error:", err);
    res.status(500).json({ ready: false, error: err?.message ?? String(err) });
  }
});

// ─── POST /api/setup ───
app.post("/api/setup", async (_req: Request, res: Response) => {
  try {
    const summary = await runSetup(noopEmit);
    res.json(summary);
  } catch (err: any) {
    console.error("setup error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ─── GET /api/setup/stream ───
app.get("/api/setup/stream", async (_req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const summary = await runSetup(sseEmitter(res));
    sseWrite(res, "complete", { ok: true, summary });
  } catch (err: any) {
    console.error("setup stream error:", err);
    sseWrite(res, "error", { ok: false, error: err?.message ?? String(err) });
  }
  res.end();
});

// ─── POST /api/mint ───
app.post("/api/mint", async (_req: Request, res: Response) => {
  try {
    const summary = await runMint(noopEmit);
    res.json(summary);
  } catch (err: any) {
    console.error("mint error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ─── GET /api/mint/stream ───
app.get("/api/mint/stream", async (_req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const summary = await runMint(sseEmitter(res));
    sseWrite(res, "complete", { ok: true, summary });
  } catch (err: any) {
    console.error("mint stream error:", err);
    sseWrite(res, "error", { ok: false, error: err?.message ?? String(err) });
  }
  res.end();
});

// ─── POST /api/transfer ───
app.post("/api/transfer", async (_req: Request, res: Response) => {
  try {
    const summary = await runTransfer(noopEmit);
    res.json(summary);
  } catch (err: any) {
    console.error("transfer error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ─── GET /api/transfer/stream ───
app.get("/api/transfer/stream", async (_req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const summary = await runTransfer(sseEmitter(res));
    sseWrite(res, "complete", { ok: true, summary });
  } catch (err: any) {
    console.error("transfer stream error:", err);
    sseWrite(res, "error", { ok: false, error: err?.message ?? String(err) });
  }
  res.end();
});

// ─── POST /api/rejection ───
app.post("/api/rejection", async (_req: Request, res: Response) => {
  try {
    const summary = await runRejection(noopEmit);
    res.json(summary);
  } catch (err: any) {
    console.error("rejection error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ─── GET /api/rejection/stream ───
app.get("/api/rejection/stream", async (_req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const summary = await runRejection(sseEmitter(res));
    sseWrite(res, "complete", { ok: true, summary });
  } catch (err: any) {
    console.error("rejection stream error:", err);
    sseWrite(res, "error", { ok: false, error: err?.message ?? String(err) });
  }
  res.end();
});

// ─── GET /api/infra ───
app.get("/api/infra", async (_req: Request, res: Response) => {
  const urls = [
    { name: "HECTX Demo", url: "http://localhost:5177", login: null },
    { name: "Wallet (App User)", url: "http://wallet.localhost:2000", login: "app-user" },
    { name: "ANS (App User)", url: "http://ans.localhost:2000", login: "app-user" },
    { name: "Wallet (App Provider)", url: "http://wallet.localhost:3000", login: "app-provider" },
    { name: "ANS (App Provider)", url: "http://ans.localhost:3000", login: "app-provider" },
    { name: "Wallet (Super Validator)", url: "http://wallet.localhost:4000", login: "sv" },
    { name: "SV Dashboard", url: "http://sv.localhost:4000", login: "sv" },
    { name: "Scan (Ledger Explorer)", url: "http://scan.localhost:4000", login: null },
  ];

  try {
    // Check container status
    let containers: { name: string; status: string; ports: string[] }[] = [];
    try {
      const { stdout } = await execAsync("docker ps --format json");
      const lines = stdout.trim().split("\n").filter(Boolean);
      containers = lines.map((line) => {
        const c = JSON.parse(line);
        return {
          name: c.Names ?? c.Name ?? "",
          status: c.Status?.toLowerCase().includes("healthy") ? "healthy" : c.State ?? "unknown",
          ports: (c.Ports ?? "").split(",").map((p: string) => {
            const match = p.match(/:(\d+)->/);
            return match ? match[1] : p.trim();
          }).filter(Boolean),
        };
      });
    } catch {
      // docker not available or not running
    }

    // Check URL accessibility with short timeouts
    const urlResults = await Promise.all(
      urls.map(async (u) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          const response = await fetch(u.url, { signal: controller.signal });
          clearTimeout(timeout);
          return { ...u, accessible: response.status < 500 };
        } catch {
          return { ...u, accessible: false };
        }
      }),
    );

    res.json({
      containers,
      urls: urlResults,
      canton: {
        endpoint: CANTON_URL,
        packageId: PACKAGE_ID,
      },
    });
  } catch (err: any) {
    console.error("infra error:", err);
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

// ─── POST /api/reset ───
app.post("/api/reset", (_req: Request, res: Response) => {
  state.adminParty = undefined;
  state.registryCid = undefined;
  state.eligibilityPolicyCid = undefined;
  state.transferFactoryCid = undefined;
  state.navSnapshotCid = undefined;
  state.supplyCid = undefined;
  state.parties = {};
  state.participants = {};
  state.wallets = {};
  state.holdings = {};
  state.totalSupply = 0;
  sessionSuffix = Math.random().toString(36).slice(2, 6);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`HECTX demo server on http://localhost:${PORT}`);
  console.log(`Canton: ${CANTON_URL}  Package: ${PACKAGE_ID}`);
  console.log(`Investors: ${INVESTORS.length} across ${new Set(INVESTORS.map((i) => i.jurisdiction)).size} jurisdictions`);
});
