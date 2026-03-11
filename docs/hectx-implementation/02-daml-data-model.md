**Abstract**
This chapter defines the actual Daml data model used in the working prototype. All templates listed here exist under `hectx-daml/daml/HectX`.

**Body**
I. Daml Package Layout
I.a `hectx-daml/daml/HectX/Types.daml`
I.b `hectx-daml/daml/HectX/Policy.daml`
I.c `hectx-daml/daml/HectX/Compliance.daml`
I.d `hectx-daml/daml/HectX/NAV.daml`
I.e `hectx-daml/daml/HectX/Registry.daml`
I.f `hectx-daml/daml/HectX/Holding.daml`
I.g `hectx-daml/daml/HectX/Minting.daml`
I.h `hectx-daml/daml/HectX/Transfers.daml`

II. Core Templates
II.a `EligibilityPolicy`, `FeeSchedule`, `MintPolicy` (policy and fees).
II.b `Participant`, `WalletApproval` (eligibility and wallet gating).
II.c `NAVSnapshot`, `Supply` (NAV and circulating supply).
II.d `HectXRegistry` (instrument configuration and policy links).
II.e `HectXHolding` (token holding implementing Splice Holding interface).
II.f `MintRequest`, `MintReceipt` (minting lifecycle).
II.g `HectXTransferFactory` (transfer execution using Splice TransferFactory).

III. Build Configuration
III.a Daml SDK version is pinned in `hectx-daml/daml.yaml`.
III.b Splice Token Standard DARs are referenced as data-dependencies.

**References**
- `hectx-daml/daml.yaml`
- `scripts/build-daml.sh`
- `scripts/build-splice-dars.sh`
