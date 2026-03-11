**Abstract**
Compliance is enforced by on-ledger registries of participants and wallet approvals. Transfers and minting are blocked unless both parties are eligible and wallets are active.

**Body**
I. Compliance Perimeter
I.a `Participant` holds eligibility status per party.
I.b `WalletApproval` enables or disables holding and receiving tokens.

II. Enforcement Points
II.a Mint approval checks `Participant` and `WalletApproval`.
II.b Transfer factory checks both sender and receiver eligibility and wallet activity.

III. Concrete Implementation
III.a Eligibility status: `hectx-daml/daml/HectX/Compliance.daml`.
III.b Transfer checks: `hectx-daml/daml/HectX/Transfers.daml`.

**References**
- `hectx-daml/daml/HectX/Compliance.daml`
- `hectx-daml/daml/HectX/Transfers.daml`
