import { create, getConfig } from "./jsonApi.js";

const admin = process.env.ADMIN_PARTY;
if (!admin) throw new Error("ADMIN_PARTY is required");

const instrumentId = {
  admin,
  id: "HECTX",
};

const run = async () => {
  const cfg = getConfig();

  const elig = await create(cfg, "HectX.Policy:EligibilityPolicy", {
    eligibilityAdmin: admin,
    prohibitedJurisdictions: ["United States"],
    restrictedJurisdictions: {},
  });

  const fees = await create(cfg, "HectX.Policy:FeeSchedule", {
    feeAdmin: admin,
    subscriptionFeeBps: "0.0",
    conversionFeeBps: "0.0",
    managementFeeBps: "0.0",
  });

  const mintPolicy = await create(cfg, "HectX.Policy:MintPolicy", {
    mintPolicyAdmin: admin,
    mintingEnabled: true,
    elasticFeeActive: false,
    elasticFeeBps: "100.0",
    maxNavAgeSeconds: 3600,
  });

  const registry = await create(cfg, "HectX.Registry:HectXRegistry", {
    admin,
    instrumentId,
    eligibilityPolicyCid: elig.contractId,
    feeScheduleCid: fees.contractId,
    mintPolicyCid: mintPolicy.contractId,
  });

  const supply = await create(cfg, "HectX.NAV:Supply", {
    supplyAdmin: admin,
    totalSupply: "0.0",
  });

  const now = new Date().toISOString();
  const nav = await create(cfg, "HectX.NAV:NAVSnapshot", {
    navAdmin: admin,
    nav: "1000.0",
    gav: "1000.0",
    reserves: "1000.0",
    liabilities: "0.0",
    accruedFees: "0.0",
    timestamp: now,
  });

  const tf = await create(cfg, "HectX.Transfers:HectXTransferFactory", {
    admin,
    factoryInstrumentId: instrumentId,
  });

  console.log({ elig, fees, mintPolicy, registry, supply, nav, tf });
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
