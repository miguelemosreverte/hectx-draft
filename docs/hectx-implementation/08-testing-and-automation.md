**Abstract**
Testing is executed using Daml Script for fast, deterministic ledger logic validation and Splice LocalNet for integration-level checks. Scripts are included and runnable without placeholders.

**Body**
I. Build And Test (Fast)
I.a Build Splice DARs and HectX Daml package: `scripts/build-daml.sh`.
I.b Run Daml Script tests: `scripts/test-daml.sh`.

II. LocalNet (Integration)
II.a Start LocalNet: `scripts/localnet-up.sh`.
II.b Stop LocalNet: `scripts/localnet-down.sh`.

III. Test Coverage
III.a Minting flow and supply update: `hectx-daml/daml/HectX/Tests.daml`.
III.b Transfer flow and balance checks: `hectx-daml/daml/HectX/Tests.daml`.

**References**
- `scripts/build-daml.sh`
- `scripts/test-daml.sh`
- `scripts/localnet-up.sh`
- `scripts/localnet-down.sh`
- `hectx-daml/daml/HectX/Tests.daml`
