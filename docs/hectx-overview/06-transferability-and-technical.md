**Abstract**
HectX transferability is permissioned: transfers are allowed only between approved wallets and can be paused for compliance or operational reasons. Technically, HectX is deployed on the Canton Network, a permissioned blockchain using Digital Asset’s Daml-based infrastructure.

**Body**
I. Transferability (High-Level)
I.a HectX is transferable across supported blockchains, subject to compliance restrictions and wallet approvals.
I.b Transfers to unapproved wallets are blocked.
I.c Hecto may restrict or pause transfers for compliance, legal, or operational reasons.

II. Compliance Gates
II.a Both sender and receiver must be approved and active.
II.b Transfers are frozen if either party fails ongoing compliance checks.
II.c Transferability does not imply redemption rights or off-chain settlement obligations.

III. Technical Architecture
III.a HectX is deployed on the Canton Network, a permissioned blockchain designed for regulated financial assets.
III.b The platform is built on Digital Asset’s Daml smart contract stack and audited open-source components.
III.c Token operations are governed by policy controls and data-oracle inputs for NAV and compliance.

IV. Implementation Reconciliation Note
IV.a The transferability page describes “supported blockchains,” while the technical page specifies Canton as the current network.
IV.b Implementation should treat Canton as the only supported blockchain unless Hecto publishes additional supported networks.

**References**
- HectX transferability: https://hecto-1.gitbook.io/hectx-docs/hextx/transferability
- HectX technical: https://hecto-1.gitbook.io/hectx-docs/hextx/technical
- HectX glossary (compliance perimeter): https://hecto-1.gitbook.io/hectx-docs/hextx/glossary
