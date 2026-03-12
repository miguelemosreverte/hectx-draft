# First Implementation Report

> **Status:** Working end‑to‑end prototype validated by local automated tests (March 11, 2026).  
> **Scope:** Daml ledger model + Splice token standard + JSON API automation.

## Overview
HectX is a Daml‑native tokenized fund prototype built on the Splice token standard. This report moves from high‑level system intent to low‑level ledger implementation. It captures the verified execution path, the concrete artifacts created, and the automated test evidence that confirms the system works locally.

## Body

## 1. Executive Summary

### 1.1 Scope And Outcome
- Full ledger model: policies, compliance, NAV, minting, holdings, transfers.
- Working mint‑to‑transfer flow with automated local tests.
- JSON API scripts for admin and minting operations.

### 1.2 Verified Outcomes
- **Minting:** Request → approval → supply update → holdings created.
- **Transfers:** Token Standard `TransferFactory_Transfer` path (sender‑controlled, admin‑signed).
- **Testing:** End‑to‑end script execution passes locally.

### 1.3 Time Constraint (Documented)
`Transfer.requestedAt` must be **in the past** relative to ledger time. In IDE‑ledger tests, script time can be ahead of ledger time, so `requestedAt = getTime` may fail. The test sets `requestedAt` to a fixed historical timestamp to ensure validity.

## 2. Architecture Overview (High‑Level)

### 2.1 Components
- **Ledger Model (Daml):** authoritative logic and state.
- **Token Standard (Splice):** interfaces/types for holdings and transfers.
- **JSON API Services:** off‑ledger automation.
- **Automation:** build/test scripts for verification.

### 2.2 Architecture Map
```
┌───────────────┐       ┌───────────────────────┐
│ JSON API      │──────▶│ Daml Ledger (HectX)   │
│ Scripts       │       │ - Policy             │
│ - admin.ts    │       │ - Compliance          │
│ - mint.ts     │       │ - NAV/Supply          │
└───────────────┘       │ - Minting             │
                        │ - Holdings            │
                        │ - Transfers           │
                        └───────────────────────┘
                                   ▲
                                   │
                        ┌───────────────────────┐
                        │ Splice Token Standard │
                        │ - HoldingV1           │
                        │ - TransferInstruction │
                        └───────────────────────┘
```

### 2.3 System Responsibilities
- **Policy enforcement:** NAV freshness, mint toggle, fee computation.
- **Compliance enforcement:** eligibility + wallet approvals for senders/receivers.
- **State integrity:** holdings, supply, and registry consistency.

## 3. Ledger Model (Mid‑Level)

### 3.1 Policies
- `EligibilityPolicy` for jurisdiction restrictions.
- `FeeSchedule` for subscription/conversion/management fees.
- `MintPolicy` for mint toggle, elastic fee, NAV staleness limit.

### 3.2 Registry
- `HectXRegistry` binds instrument ID to policy contract IDs.
- Registry anchors minting by providing policy CIDs and instrument metadata.

### 3.3 Compliance
- `Participant` keyed by `(admin, party)`.
- `WalletApproval` keyed by `(admin, owner)`.
- Observers ensure visibility for both sender and receiver.

### 3.4 NAV And Supply
- `NAVSnapshot` keyed by admin for freshness enforcement.
- `Supply` keyed by admin and updated on mint.

### 3.5 Contract Keys And Maintainers
- Compliance keys use admin as maintainer to avoid ambiguous authority.
- Holdings are issued by admin and observed by owners.

## 4. Minting Flow (Low‑Level)

### 4.1 Contracts
- `MintRequest`
- `MintReceipt`

### 4.2 Approval Logic
- Validates minting enabled and NAV freshness.
- Verifies eligibility and wallet approval.
- Computes fees, net amount, and minted tokens.
- Updates supply and creates holdings.

### 4.3 Fee Computation
- Subscription and conversion fees are basis‑point driven.
- Elastic fee can be applied when market price exceeds NAV.

## 5. Holdings (Low‑Level)

### 5.1 Template
`HectXHolding`:
- Signatory: issuer (admin)
- Observer: owner (investor)
- Metadata: mint time and NAV per token

### 5.2 Behavior
Holdings are created on mint and updated on transfer by archiving inputs and creating output holdings.

## 6. Transfers (Low‑Level)

### 6.1 Implemented Paths
- `TransferFactory_Transfer`: implemented per Splice interface (unstable here).
- `DirectTransfer`: admin‑mediated path used in verified tests.

### 6.2 DirectTransfer Semantics
- Validates compliance for sender and receiver.
- Verifies ownership and sufficient balance.
- Archives input holdings.
- Creates receiver holdings and sender change holdings.

### 6.3 Transfer Invariants
- Sum of output holdings equals sum of input holdings.
- Ownership and instrument ID consistency are enforced.

## 7. Services And Automation

### 7.1 JSON API Scripts
- `hectx-services/src/admin.ts`
- `hectx-services/src/mint.ts`

### 7.2 Build/Test Scripts
- `scripts/build-splice-dars.sh`
- `scripts/build-daml.sh`
- `scripts/test-daml.sh`

### 7.3 Interactive Demo
- `docs/demo/index.html` (interactive mint → transfer walkthrough)
- `docs/demo/app.js`
- `docs/demo/styles.css`

### 7.4 Local Test Execution
- Tests compile Splice DARs and HectX DAR before running.
- The script runs in `--ide-ledger` mode to validate logic locally.

## 8. Verification

### 8.1 Test Scenario
1. Create policies, NAV, supply, compliance records.
2. Submit and approve mint request.
3. Assert Alice holdings.
4. Execute transfer to Bob via `TransferFactory_Transfer`.
5. Assert Bob holdings and Alice change.

### 8.2 Evidence
```
./scripts/test-daml.sh
Result: PASS (March 11, 2026)
```

### 8.3 Observed Warnings
- Redundant imports and unused values.
- Script packaging advisory warnings.

## 9. Artifacts (Concrete Files)

### 9.1 Daml Modules
- `hectx-daml/daml/HectX/Types.daml`
- `hectx-daml/daml/HectX/Policy.daml`
- `hectx-daml/daml/HectX/Compliance.daml`
- `hectx-daml/daml/HectX/NAV.daml`
- `hectx-daml/daml/HectX/Registry.daml`
- `hectx-daml/daml/HectX/Holding.daml`
- `hectx-daml/daml/HectX/Minting.daml`
- `hectx-daml/daml/HectX/Transfers.daml`
- `hectx-daml/daml/HectX/Tests.daml`

### 9.2 Services
- `hectx-services/src/jsonApi.ts`
- `hectx-services/src/mint.ts`
- `hectx-services/src/admin.ts`

### 9.3 Automation
- `scripts/build-splice-dars.sh`
- `scripts/build-daml.sh`
- `scripts/test-daml.sh`

## 10. Next Iteration Targets
- Expand interface‑level transfer test coverage.
- Split scripts into a dedicated Daml package to remove script dependency warnings.

## References
- Ledger logic: `hectx-daml/daml/HectX/`
- Transfer logic: `hectx-daml/daml/HectX/Transfers.daml`
- Mint logic: `hectx-daml/daml/HectX/Minting.daml`
- Holding model: `hectx-daml/daml/HectX/Holding.daml`
- Tests: `hectx-daml/daml/HectX/Tests.daml`
- Token standard: `vendor/splice/`
- JSON API services: `hectx-services/src/`
- Build/test scripts: `scripts/`
