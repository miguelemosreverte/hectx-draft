import { exercise, getConfig } from "./jsonApi.js";

const admin = process.env.ADMIN_PARTY;
const sender = process.env.SENDER_PARTY;
const receiver = process.env.RECEIVER_PARTY;
const transferFactoryCid = process.env.TRANSFER_FACTORY_CID;
const holdingCid = process.env.HOLDING_CID;
const amount = process.env.AMOUNT ?? "100.0";

if (!admin) throw new Error("ADMIN_PARTY is required");
if (!sender) throw new Error("SENDER_PARTY is required");
if (!receiver) throw new Error("RECEIVER_PARTY is required");
if (!transferFactoryCid) throw new Error("TRANSFER_FACTORY_CID is required");
if (!holdingCid) throw new Error("HOLDING_CID is required");

const run = async () => {
  const cfg = getConfig();
  const now = new Date().toISOString();

  const transfer = {
    sender,
    receiver,
    amount,
    instrumentId: { admin, id: "HECTX" },
    requestedAt: now,
    executeBefore: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    inputHoldingCids: [holdingCid],
    meta: { values: {} },
  };

  const extraArgs = {
    context: { values: {} },
    meta: { values: {} },
  };

  const res = await exercise(
    cfg,
    "HectX.Transfers:HectXTransferFactory",
    transferFactoryCid,
    "TransferFactory_Transfer",
    {
      expectedAdmin: admin,
      transfer,
      extraArgs,
    }
  );

  console.log(res);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
