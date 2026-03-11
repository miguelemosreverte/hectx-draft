**Abstract**
The prototype implements Splice Token Standard interfaces for holdings and transfers. This ensures compatibility with Splice wallet and tooling expectations.

**Body**
I. Interfaces Implemented
I.a `Splice.Api.Token.HoldingV1.Holding` via `HectXHolding`.
I.b `Splice.Api.Token.TransferInstructionV1.TransferFactory` via `HectXTransferFactory`.

II. Implementation Files
II.a Holding implementation: `hectx-daml/daml/HectX/Holding.daml`.
II.b Transfer factory implementation: `hectx-daml/daml/HectX/Transfers.daml`.

III. Token Standard Dependencies
III.a Metadata, Holding, and TransferInstruction DARs are built from `vendor/splice/token-standard`.

**References**
- `hectx-daml/daml/HectX/Holding.daml`
- `hectx-daml/daml/HectX/Transfers.daml`
- `scripts/build-splice-dars.sh`
