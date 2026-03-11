**Abstract**
This chapter specifies the implemented workflows for onboarding, minting, and transfer operations. All referenced choices exist in the Daml package.

**Body**
I. Onboarding Workflow
I.a Admin creates `Participant` and `WalletApproval` for a party.
I.b Eligibility status is updated via `Participant.UpdateStatus`.

II. Minting Workflow
II.a Investor submits `MintRequest`.
II.b Admin exercises `MintRequest.ApproveMint` to compute NAV, apply fees, mint holdings, and update supply.
II.c Admin can exercise `MintRequest.RejectMint` with a reason code.

III. Transfer Workflow
III.a Sender exercises `HectXTransferFactory.TransferFactory_Transfer`.
III.b Holdings are rebalanced: receiver gets the transfer amount; sender receives change if applicable.

IV. Ledger Actions (Concrete Files)
IV.a Minting logic: `hectx-daml/daml/HectX/Minting.daml`.
IV.b Transfer logic: `hectx-daml/daml/HectX/Transfers.daml`.
IV.c Compliance gating: `hectx-daml/daml/HectX/Compliance.daml`.

**References**
- `hectx-daml/daml/HectX/Minting.daml`
- `hectx-daml/daml/HectX/Transfers.daml`
- `hectx-daml/daml/HectX/Compliance.daml`
