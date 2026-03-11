**Abstract**
This chapter defines the end-to-end architecture for the working HectX prototype: Daml contracts in `hectx-daml`, Node-based JSON API clients in `hectx-services`, and Splice LocalNet in `vendor/splice/cluster/compose/localnet`.

**Body**
I. System Components (High-Level)
I.a Canton Network LocalNet: `vendor/splice/cluster/compose/localnet`.
I.b Daml contracts: `hectx-daml/daml/HectX/*.daml`.
I.c Token Standard interfaces (vendored): `vendor/splice/token-standard/*`.
I.d JSON API clients: `hectx-services/src/*.ts`.

II. Data Flow Overview
II.a Admin service publishes NAV snapshots and policy contracts.
II.b Investor submits MintRequest; admin approves and mints holdings.
II.c Transfers are executed through the TransferFactory interface.

III. Deployment Targets
III.a LocalNet for development and automated tests.
III.b DevNet/TestNet can be added later using the same Daml package and API clients.

**References**
- `hectx-daml/daml/HectX/Registry.daml`
- `hectx-daml/daml/HectX/Minting.daml`
- `hectx-daml/daml/HectX/Transfers.daml`
- `hectx-services/src/admin.ts`
- `scripts/localnet-up.sh`
