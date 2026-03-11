import { create, exercise, getConfig, JsonApiConfig } from "./jsonApi.js";

const admin = process.env.ADMIN_PARTY;
const investor = process.env.INVESTOR_PARTY;
const registryCid = process.env.REGISTRY_CID;
const marketPrice = process.env.MARKET_PRICE ?? "1.0";

if (!admin) throw new Error("ADMIN_PARTY is required");
if (!investor) throw new Error("INVESTOR_PARTY is required");
if (!registryCid) throw new Error("REGISTRY_CID is required");

const getConfigWithToken = (token?: string): JsonApiConfig => {
  const baseUrl = process.env.JSON_API_URL;
  if (!baseUrl) throw new Error("JSON_API_URL is required");
  return { baseUrl, token };
};

const run = async () => {
  const adminCfg = getConfig();
  const investorToken = process.env.INVESTOR_JSON_API_TOKEN;
  const investorCfg = investorToken ? getConfigWithToken(investorToken) : adminCfg;

  await create(adminCfg, "HectX.Compliance:Participant", {
    participantAdmin: admin,
    party: investor,
    observers: [investor],
    jurisdiction: "Portugal",
    isAccredited: true,
    status: "Eligible",
  });

  await create(adminCfg, "HectX.Compliance:WalletApproval", {
    walletAdmin: admin,
    owner: investor,
    observers: [investor],
    active: true,
  });

  const now = new Date().toISOString();
  const req = await create(investorCfg, "HectX.Minting:MintRequest", {
    requestAdmin: admin,
    investor,
    amount: "1000.0",
    requestedAt: now,
  });

  const receipt = await exercise(adminCfg, "HectX.Minting:MintRequest", req.contractId, "ApproveMint", {
    registryCid,
    marketPrice,
  });

  console.log({ req, receipt });
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
