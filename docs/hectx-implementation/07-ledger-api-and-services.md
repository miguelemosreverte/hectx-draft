**Abstract**
Off-ledger operations are implemented as minimal JSON API clients in `hectx-services`. They create policies, publish NAV, mint, and transfer holdings using standard JSON API endpoints.

**Body**
I. Service Layout
I.a JSON API helper: `hectx-services/src/jsonApi.ts`.
I.b Admin bootstrap: `hectx-services/src/admin.ts`.
I.c Mint workflow: `hectx-services/src/mint.ts`.
I.d Transfer workflow: `hectx-services/src/transfer.ts`.

II. Execution
I.a Build services: `cd hectx-services && npm install && npm run build`.
I.b Run admin bootstrap: `JSON_API_URL=... ADMIN_PARTY=... npm run admin`.
I.c Run mint: `JSON_API_URL=... ADMIN_PARTY=... INVESTOR_PARTY=... REGISTRY_CID=... npm run mint`.
I.d Run transfer: `JSON_API_URL=... ADMIN_PARTY=... SENDER_PARTY=... RECEIVER_PARTY=... TRANSFER_FACTORY_CID=... HOLDING_CID=... npm run transfer`.

**References**
- `hectx-services/src/jsonApi.ts`
- `hectx-services/src/admin.ts`
- `hectx-services/src/mint.ts`
- `hectx-services/src/transfer.ts`
