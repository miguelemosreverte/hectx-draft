**Abstract**
This chapter defines the operational path from LocalNet to deployment: build, run, and operate the HectX Daml package with Splice 0.5.14.

**Body**
I. Version Alignment
I.a Splice release: 0.5.14 (vendored).
I.b Daml SDK: 3.3.0-snapshot.20250502.13767.0.v2fc6c7e2.

II. Build And Deploy
II.a Build Daml DARs with `scripts/build-daml.sh`.
II.b Upload the DAR to the target ledger participant.
II.c Initialize policies and registry using `hectx-services/src/admin.ts`.

III. Operational Controls
III.a Monitor NAV updates and minting approvals via `MintReceipt` contracts.
III.b Audit transfer activity via holdings and transfer factory activity.

**References**
- `scripts/build-daml.sh`
- `hectx-services/src/admin.ts`
- `hectx-daml/daml/HectX/Minting.daml`
