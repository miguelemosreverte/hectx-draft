import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiConfig, allocateParty, grantActAs, create, exercise, queryACS } from "./jsonApi.js";

type DemoState = {
  adminParty?: string;
  aliceParty?: string;
  bobParty?: string;
  charlieParty?: string;
  registryCid?: string;
  eligibilityPolicyCid?: string;
  transferFactoryCid?: string;
  navSnapshotCid?: string;
  supplyCid?: string;
  participants: Record<string, string>;
  wallets: Record<string, string>;
};

const state: DemoState = { participants: {}, wallets: {} };

const CANTON_URL = process.env.CANTON_URL ?? "http://localhost:2975";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "unsafe";
const AUTH_AUDIENCE = process.env.AUTH_AUDIENCE ?? "https://canton.network.global";
const PACKAGE_ID =
  process.env.PACKAGE_ID ?? "0dde7290e4a6a457eb7b588ccebb9dea03061279d610f4dd93660e96ffd61448";
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

const ensureParty = async (hint: string): Promise<string> => {
  const c = cfg();
  const party = await allocateParty(c, hint);
  await grantActAs(c, party);
  return party;
};

const app = express();
app.use(express.json());
app.use(express.static(new URL("../../docs/demo", import.meta.url).pathname));

// ─── GET /api/status ───
app.get("/api/status", async (_req: Request, res: Response) => {
  if (!state.adminParty) return res.json({ ready: false });
  try {
    const c = cfg();
    const admin = state.adminParty;

    const holdings = await queryACS(c, tid("HectX.Holding", "HectXHolding"), admin);
    let aliceBalance = 0,
      bobBalance = 0,
      count = 0;
    for (const evt of holdings) {
      const args = evt.createArgument ?? {};
      count++;
      if (args.owner === state.aliceParty) aliceBalance += Number(args.amount ?? 0);
      if (args.owner === state.bobParty) bobBalance += Number(args.amount ?? 0);
    }

    const supplies = await queryACS(c, tid("HectX.NAV", "Supply"), admin);
    const totalSupply = Number(supplies[0]?.createArgument?.totalSupply ?? 0);

    res.json({
      ready: true,
      parties: { admin, alice: state.aliceParty, bob: state.bobParty },
      registryCid: state.registryCid,
      transferFactoryCid: state.transferFactoryCid,
      balances: { alice: aliceBalance, bob: bobBalance },
      totalSupply,
      holdingsCount: count,
    });
  } catch (err: any) {
    console.error("status error:", err);
    res.status(500).json({ ready: false, error: err?.message ?? String(err) });
  }
});

// ─── POST /api/setup ───
app.post("/api/setup", async (_req: Request, res: Response) => {
  try {
    const admin = await ensureParty(`Hecto${sessionSuffix}`);
    const alice = await ensureParty(`Alice${sessionSuffix}`);
    const bob = await ensureParty(`Bob${sessionSuffix}`);
    state.adminParty = admin;
    state.aliceParty = alice;
    state.bobParty = bob;

    const c = cfg();
    const act = [admin];
    const instrumentId = { admin, id: "HECTX" };

    const elig = await create(
      c,
      tid("HectX.Policy", "EligibilityPolicy"),
      { eligibilityAdmin: admin, prohibitedJurisdictions: ["United States"], restrictedJurisdictions: {} },
      act,
    );
    state.eligibilityPolicyCid = elig.contractId;

    const fees = await create(
      c,
      tid("HectX.Policy", "FeeSchedule"),
      { feeAdmin: admin, subscriptionFeeBps: "0.0", conversionFeeBps: "0.0", managementFeeBps: "0.0" },
      act,
    );

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

    const supply = await create(
      c,
      tid("HectX.NAV", "Supply"),
      { supplyAdmin: admin, totalSupply: "0.0" },
      act,
    );
    state.supplyCid = supply.contractId;

    const nav = await create(
      c,
      tid("HectX.NAV", "NAVSnapshot"),
      {
        navAdmin: admin,
        nav: "1000.0",
        gav: "1000.0",
        reserves: "1000.0",
        liabilities: "0.0",
        accruedFees: "0.0",
        timestamp: new Date().toISOString(),
      },
      act,
    );
    state.navSnapshotCid = nav.contractId;

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

    res.json({ ok: true, registryCid: registry.contractId, transferFactoryCid: tf.contractId });
  } catch (err: any) {
    console.error("setup error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ─── POST /api/mint ───
app.post("/api/mint", async (_req: Request, res: Response) => {
  try {
    if (!state.adminParty || !state.aliceParty || !state.registryCid || !state.navSnapshotCid || !state.supplyCid) {
      return res.status(400).json({ ok: false, error: "setup required" });
    }
    const admin = state.adminParty;
    const alice = state.aliceParty;
    const c = cfg();
    const act = [admin];

    const aliceP = await create(
      c,
      tid("HectX.Compliance", "Participant"),
      {
        participantAdmin: admin,
        party: alice,
        observers: [alice],
        jurisdiction: "Portugal",
        isAccredited: true,
        status: "Eligible",
      },
      act,
    );
    state.participants[alice] = aliceP.contractId;

    const aliceW = await create(
      c,
      tid("HectX.Compliance", "WalletApproval"),
      { walletAdmin: admin, owner: alice, observers: [alice], active: true },
      act,
    );
    state.wallets[alice] = aliceW.contractId;

    // MintRequest — signatory is investor (alice)
    const mintReq = await create(
      c,
      tid("HectX.Minting", "MintRequest"),
      { requestAdmin: admin, investor: alice, amount: "1000.0", requestedAt: new Date().toISOString() },
      [alice],
    );

    // ApproveMint — controller is requestAdmin (admin)
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
        participantCid: state.participants[alice],
        walletApprovalCid: state.wallets[alice],
      },
      act,
    );

    // Supply gets archived and recreated — track the new CID
    const newSupply = result.events.find(
      (e: any) => e.CreatedEvent?.templateId?.includes("HectX.NAV:Supply"),
    )?.CreatedEvent;
    if (newSupply) state.supplyCid = newSupply.contractId;

    res.json({ ok: true, requestCid: mintReq.contractId });
  } catch (err: any) {
    console.error("mint error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ─── POST /api/transfer ───
app.post("/api/transfer", async (_req: Request, res: Response) => {
  try {
    if (!state.adminParty || !state.aliceParty || !state.bobParty || !state.transferFactoryCid) {
      return res.status(400).json({ ok: false, error: "setup required" });
    }
    const admin = state.adminParty;
    const alice = state.aliceParty;
    const bob = state.bobParty;
    const c = cfg();
    const act = [admin];
    const instrumentId = { admin, id: "HECTX" };

    // Create bob's compliance records
    const bobP = await create(
      c,
      tid("HectX.Compliance", "Participant"),
      {
        participantAdmin: admin,
        party: bob,
        observers: [bob],
        jurisdiction: "Portugal",
        isAccredited: true,
        status: "Eligible",
      },
      act,
    );
    state.participants[bob] = bobP.contractId;

    const bobW = await create(
      c,
      tid("HectX.Compliance", "WalletApproval"),
      { walletAdmin: admin, owner: bob, observers: [bob], active: true },
      act,
    );
    state.wallets[bob] = bobW.contractId;

    // Register alice in the transfer factory
    let factoryCid = state.transferFactoryCid!;
    const regAlice = await exercise(
      c,
      tid("HectX.Transfers", "HectXTransferFactory"),
      factoryCid,
      "RegisterParty",
      { party: alice, participantCid: state.participants[alice], walletCid: state.wallets[alice] },
      act,
    );
    const f1 = regAlice.events.find(
      (e: any) => e.CreatedEvent?.templateId?.includes("HectX.Transfers:HectXTransferFactory"),
    )?.CreatedEvent;
    if (f1) factoryCid = f1.contractId;

    // Register bob in the transfer factory
    const regBob = await exercise(
      c,
      tid("HectX.Transfers", "HectXTransferFactory"),
      factoryCid,
      "RegisterParty",
      { party: bob, participantCid: state.participants[bob], walletCid: state.wallets[bob] },
      act,
    );
    const f2 = regBob.events.find(
      (e: any) => e.CreatedEvent?.templateId?.includes("HectX.Transfers:HectXTransferFactory"),
    )?.CreatedEvent;
    if (f2) factoryCid = f2.contractId;
    state.transferFactoryCid = factoryCid;

    // Query alice's holdings
    const holdings = await queryACS(c, tid("HectX.Holding", "HectXHolding"), admin);
    const aliceHoldings = holdings.filter((evt: any) => evt.createArgument?.owner === alice);
    if (aliceHoldings.length === 0) {
      return res.status(400).json({ ok: false, error: "no holdings for alice" });
    }
    const holdingCids = aliceHoldings.map((evt: any) => evt.contractId);

    // Execute the transfer
    await exercise(
      c,
      tid("HectX.Transfers", "HectXTransferFactory"),
      factoryCid,
      "ExecuteTransfer",
      {
        expectedAdmin: admin,
        transfer: {
          sender: alice,
          receiver: bob,
          amount: "100.0",
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

    res.json({ ok: true });
  } catch (err: any) {
    console.error("transfer error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ─── POST /api/rejection ───
app.post("/api/rejection", async (_req: Request, res: Response) => {
  try {
    if (!state.adminParty || !state.registryCid || !state.navSnapshotCid || !state.supplyCid) {
      return res.status(400).json({ ok: false, error: "setup required" });
    }
    const admin = state.adminParty;
    const c = cfg();
    const act = [admin];

    const charlie = await ensureParty(`Charlie${sessionSuffix}`);
    state.charlieParty = charlie;

    const charlieP = await create(
      c,
      tid("HectX.Compliance", "Participant"),
      {
        participantAdmin: admin,
        party: charlie,
        observers: [charlie],
        jurisdiction: "United States",
        isAccredited: true,
        status: "Eligible",
      },
      act,
    );
    state.participants[charlie] = charlieP.contractId;

    const charlieW = await create(
      c,
      tid("HectX.Compliance", "WalletApproval"),
      { walletAdmin: admin, owner: charlie, observers: [charlie], active: true },
      act,
    );
    state.wallets[charlie] = charlieW.contractId;

    // MintRequest — signatory is charlie
    const mintReq = await create(
      c,
      tid("HectX.Minting", "MintRequest"),
      { requestAdmin: admin, investor: charlie, amount: "500.0", requestedAt: new Date().toISOString() },
      [charlie],
    );

    // Attempt approve — should fail due to jurisdiction enforcement
    try {
      // Re-query supply CID in case it changed
      const supplies = await queryACS(c, tid("HectX.NAV", "Supply"), admin);
      const supplyCid = supplies.length > 0 ? supplies[0].contractId : state.supplyCid!;

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
          participantCid: state.participants[charlie],
          walletApprovalCid: state.wallets[charlie],
        },
        act,
      );
      return res.status(500).json({ ok: false, error: "jurisdiction enforcement failed — mint was not blocked" });
    } catch (mintErr: any) {
      res.json({
        ok: true,
        blocked: true,
        investor: "Charlie",
        jurisdiction: "United States",
        reason: mintErr?.message ?? "investor jurisdiction prohibited",
      });
    }
  } catch (err: any) {
    console.error("rejection error:", err);
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

// ─── POST /api/reset ───
app.post("/api/reset", (_req: Request, res: Response) => {
  const keys = Object.keys(state) as (keyof DemoState)[];
  for (const k of keys) {
    if (k === "participants" || k === "wallets") {
      state[k] = {};
    } else {
      delete state[k];
    }
  }
  sessionSuffix = Math.random().toString(36).slice(2, 6);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`HECTX demo server on http://localhost:${PORT}`);
  console.log(`Canton: ${CANTON_URL}  Package: ${PACKAGE_ID}`);
});
