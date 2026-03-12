import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { create, exercise, query, JsonApiConfig } from "./jsonApi.js";

type DemoState = {
  adminParty?: string;
  aliceParty?: string;
  bobParty?: string;
  registryCid?: string;
  transferFactoryCid?: string;
  mintRequestCid?: string;
};

const state: DemoState = {};

const JSON_API_URL = process.env.JSON_API_URL ?? "http://json-ledger-api.localhost:2000";
const AUTH_AUDIENCE = process.env.AUTH_AUDIENCE ?? "https://canton.network.global";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "unsafe";
const PORT = Number(process.env.DEMO_PORT ?? 5177);

const buildToken = (claims: Record<string, unknown>) =>
  jwt.sign(claims, AUTH_SECRET, {
    algorithm: "HS256",
    audience: AUTH_AUDIENCE,
    expiresIn: "24h",
  });

const adminToken = () =>
  buildToken({
    sub: "demo-admin",
    "https://daml.com/ledger-api": {
      admin: true,
    },
  });

const partyToken = (party: string) =>
  buildToken({
    sub: `demo-${party}`,
    "https://daml.com/ledger-api": {
      actAs: [party],
      readAs: [party],
    },
  });

const cfgFor = (token?: string): JsonApiConfig => ({
  baseUrl: JSON_API_URL,
  token,
});

const ensureParty = async (hint: string): Promise<string> => {
  const res = await fetch(`${JSON_API_URL}/v1/parties`);
  if (res.ok) {
    const existing = await res.json();
    const found = existing?.parties?.find((p: any) => p.displayName === hint || p.identifierHint === hint);
    if (found?.party) return found.party;
  }
  const allocRes = await fetch(`${JSON_API_URL}/v1/parties/allocate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify({ identifierHint: hint, displayName: hint }),
  });
  if (!allocRes.ok) {
    const text = await allocRes.text();
    throw new Error(`party allocate failed ${allocRes.status}: ${text}`);
  }
  const alloc = await allocRes.json();
  return alloc.party;
};

const instrumentIdFor = (admin: string) => ({ admin, id: "HECTX" });

const app = express();
app.use(express.json());
app.use(express.static(new URL("../../docs/demo", import.meta.url).pathname));

app.get("/api/status", async (_req: Request, res: Response) => {
  if (!state.adminParty) return res.json({ ready: false });
  const adminCfg = cfgFor(partyToken(state.adminParty));
  const holdingsRes = await query(adminCfg, "HectX.Holding:HectXHolding", {});
  const rows = holdingsRes?.result ?? [];
  let aliceBalance = 0;
  let bobBalance = 0;
  for (const row of rows) {
    const payload = row.payload ?? {};
    if (payload.owner === state.aliceParty) aliceBalance += Number(payload.amount ?? 0);
    if (payload.owner === state.bobParty) bobBalance += Number(payload.amount ?? 0);
  }
  res.json({
    ready: true,
    parties: {
      admin: state.adminParty,
      alice: state.aliceParty,
      bob: state.bobParty,
    },
    registryCid: state.registryCid,
    transferFactoryCid: state.transferFactoryCid,
    balances: {
      alice: aliceBalance,
      bob: bobBalance,
    },
    holdingsCount: rows.length,
  });
});

app.post("/api/setup", async (_req: Request, res: Response) => {
  try {
    const admin = await ensureParty("Hecto");
    const alice = await ensureParty("Alice");
    const bob = await ensureParty("Bob");
    state.adminParty = admin;
    state.aliceParty = alice;
    state.bobParty = bob;

    const adminCfg = cfgFor(partyToken(admin));
    const instrumentId = instrumentIdFor(admin);

    const elig = await create(adminCfg, "HectX.Policy:EligibilityPolicy", {
      eligibilityAdmin: admin,
      prohibitedJurisdictions: ["United States"],
      restrictedJurisdictions: {},
    });
    const fees = await create(adminCfg, "HectX.Policy:FeeSchedule", {
      feeAdmin: admin,
      subscriptionFeeBps: "0.0",
      conversionFeeBps: "0.0",
      managementFeeBps: "0.0",
    });
    const mintPolicy = await create(adminCfg, "HectX.Policy:MintPolicy", {
      mintPolicyAdmin: admin,
      mintingEnabled: true,
      elasticFeeActive: false,
      elasticFeeBps: "100.0",
      maxNavAgeSeconds: 3600,
    });
    const registry = await create(adminCfg, "HectX.Registry:HectXRegistry", {
      admin,
      instrumentId,
      eligibilityPolicyCid: elig.contractId,
      feeScheduleCid: fees.contractId,
      mintPolicyCid: mintPolicy.contractId,
    });
    await create(adminCfg, "HectX.NAV:Supply", { supplyAdmin: admin, totalSupply: "0.0" });
    await create(adminCfg, "HectX.NAV:NAVSnapshot", {
      navAdmin: admin,
      nav: "1000.0",
      gav: "1000.0",
      reserves: "1000.0",
      liabilities: "0.0",
      accruedFees: "0.0",
      timestamp: new Date().toISOString(),
    });
    const tf = await create(adminCfg, "HectX.Transfers:HectXTransferFactory", {
      admin,
      factoryInstrumentId: instrumentId,
    });
    state.registryCid = registry.contractId;
    state.transferFactoryCid = tf.contractId;

    res.json({ ok: true, registryCid: registry.contractId, transferFactoryCid: tf.contractId });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

app.post("/api/mint", async (_req: Request, res: Response) => {
  try {
    if (!state.adminParty || !state.aliceParty || !state.registryCid) {
      return res.status(400).json({ ok: false, error: "setup required" });
    }
    const admin = state.adminParty;
    const alice = state.aliceParty;

    const adminCfg = cfgFor(partyToken(admin));
    const aliceCfg = cfgFor(partyToken(alice));

    await create(adminCfg, "HectX.Compliance:Participant", {
      participantAdmin: admin,
      party: alice,
      observers: [alice],
      jurisdiction: "Portugal",
      isAccredited: true,
      status: "Eligible",
    });
    await create(adminCfg, "HectX.Compliance:WalletApproval", {
      walletAdmin: admin,
      owner: alice,
      observers: [alice],
      active: true,
    });

    const req = await create(aliceCfg, "HectX.Minting:MintRequest", {
      requestAdmin: admin,
      investor: alice,
      amount: "1000.0",
      requestedAt: new Date().toISOString(),
    });
    state.mintRequestCid = req.contractId;

    const receipt = await exercise(adminCfg, "HectX.Minting:MintRequest", req.contractId, "ApproveMint", {
      registryCid: state.registryCid,
      marketPrice: "1.0",
    });

    res.json({ ok: true, requestCid: req.contractId, receipt });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

app.post("/api/transfer", async (_req: Request, res: Response) => {
  try {
    if (!state.adminParty || !state.aliceParty || !state.bobParty || !state.transferFactoryCid) {
      return res.status(400).json({ ok: false, error: "setup required" });
    }
    const admin = state.adminParty;
    const alice = state.aliceParty;
    const bob = state.bobParty;

    const adminCfg = cfgFor(partyToken(admin));
    const aliceCfg = cfgFor(partyToken(alice));

    await create(adminCfg, "HectX.Compliance:Participant", {
      participantAdmin: admin,
      party: bob,
      observers: [bob],
      jurisdiction: "Portugal",
      isAccredited: true,
      status: "Eligible",
    });
    await create(adminCfg, "HectX.Compliance:WalletApproval", {
      walletAdmin: admin,
      owner: bob,
      observers: [bob],
      active: true,
    });

    const holdings = await query(adminCfg, "HectX.Holding:HectXHolding", {
      owner: alice,
    });
    const holdingCid = holdings?.result?.[0]?.contractId;
    if (!holdingCid) {
      return res.status(400).json({ ok: false, error: "no holdings for alice" });
    }

    const transfer = {
      sender: alice,
      receiver: bob,
      amount: "100.0",
      instrumentId: instrumentIdFor(admin),
      requestedAt: "1970-01-01T00:00:00Z",
      executeBefore: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      inputHoldingCids: [holdingCid],
      meta: { values: {} },
    };
    const extraArgs = { context: { values: {} }, meta: { values: {} } };

    const resx = await exercise(
      aliceCfg,
      "HectX.Transfers:HectXTransferFactory",
      state.transferFactoryCid,
      "TransferFactory_Transfer",
      { expectedAdmin: admin, transfer, extraArgs }
    );
    res.json({ ok: true, result: resx });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`HECTX demo server listening on http://localhost:${PORT}`);
  console.log(`Using JSON API: ${JSON_API_URL}`);
});
