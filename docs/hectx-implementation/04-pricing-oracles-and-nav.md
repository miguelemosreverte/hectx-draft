**Abstract**
This chapter documents the NAV input pipeline implemented in the prototype. NAV is published as `NAVSnapshot` and validated during mint approvals.

**Body**
I. NAV Inputs
I.a NAV is recorded in `NAVSnapshot` with `nav`, `gav`, `reserves`, `liabilities`, and `accruedFees`.
I.b `Supply` tracks circulating supply for NAV-per-token computation.

II. Mint-Time Guardrails
II.a Minting enforces NAV freshness using `MintPolicy.maxNavAgeSeconds`.
II.b NAV-per-token uses pre-mint supply; if total supply is 0, NAV-per-token defaults to 1.0 in code.

III. Concrete Implementation
III.a NAV templates: `hectx-daml/daml/HectX/NAV.daml`.
III.b Mint-time checks: `hectx-daml/daml/HectX/Minting.daml`.

**References**
- `hectx-daml/daml/HectX/NAV.daml`
- `hectx-daml/daml/HectX/Minting.daml`
