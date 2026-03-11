**Abstract**
This implementation plan delivers a working HectX prototype on Canton Network using Splice 0.5.14 and Daml SDK 3.3.0-snapshot.20250502.13767.0.v2fc6c7e2. It defines concrete Daml contracts, operational scripts, and automated tests that can be executed on LocalNet.

**Body**
I. Implementation Scope
I.a Implement HectX token logic as Daml smart contracts and supporting services.
I.b Use Splice Token Standard interfaces for holdings and transfers.

II. Technology Baseline
II.a Splice release: 0.5.14 (vendored in `vendor/splice`).
II.b Daml SDK: 3.3.0-snapshot.20250502.13767.0.v2fc6c7e2.

III. Execution Goal
III.a Produce a working implementation that runs on LocalNet and passes Daml Script tests.
III.b Provide repeatable build and test scripts with no placeholders.

**References**
- Splice repo (vendored): `vendor/splice`
- HectX Daml package: `hectx-daml`
- HectX services: `hectx-services`
- Operational scripts: `scripts/`
