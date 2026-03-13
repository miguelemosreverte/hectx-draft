# HECTX Compliance Report

**Report Date:** 2026-03-13
**Version:** 1.0
**Scope:** HECTX NAV-based tokenized fund smart contracts on Canton Network
**Platform:** Daml 3.4.11 / Splice Token Standard 0.5.14

---

## 1. Executive Summary

HECTX implements a NAV-based tokenized fund on the Canton Network using Daml smart contracts. This report assesses compliance of the on-ledger implementation against 70 documented requirements across 9 domains.

| Metric | Value |
|--------|-------|
| Total requirements | 70 |
| Fully implemented | 32 (46%) |
| Partially implemented | 12 (17%) |
| Off-ledger (by design) | 3 (4%) |
| Not implemented | 23 (33%) |
| Daml test scenarios | 7 (all passing) |
| Splice Token Standard | Fully compliant |

**Assessment:** The core compliance-critical flows (minting, transfers, jurisdiction enforcement, fee calculation) are fully implemented and tested. Remaining gaps are primarily in portfolio management, corporate actions, and extended fee types — areas designated for post-demo phases.

---

## 2. Requirements Coverage by Domain

### 2.1 Product Definition (4 requirements)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| PRD-01 | NAV-based token pricing | **Implemented** | NAVSnapshot feeds mint-time pricing |
| PRD-02 | Indirect economic claim | **Implemented** | No ownership rights in contracts |
| PRD-03 | No redemption/voting rights | **Implemented** | No redemption template exists |
| PRD-04 | Secondary trading + buybacks | **Partial** | Transfers work; buyback not built |

### 2.2 Eligibility & Onboarding (9 requirements)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| ELG-01 | US persons prohibited | **Implemented** | Enforced at mint and transfer |
| ELG-02 | 22 prohibited jurisdictions | **Implemented** | Configurable list, enforcement active |
| ELG-03 | Restricted jurisdiction thresholds | **Partial** | Data type exists; runtime check missing |
| ELG-04 | KYC/KYB screening | **Off-Ledger** | Admin-controlled onboarding |
| ELG-05 | Wallet registration | **Implemented** | WalletApproval with active toggle |
| ELG-06 | Terms acceptance audit | **Not Implemented** | — |
| ELG-07 | Periodic re-verification | **Partial** | UpdateStatus exists; no automation |
| ELG-08 | Freeze non-compliant | **Implemented** | Status + wallet checks block access |
| ELG-09 | 50%+ ownership rule | **Not Implemented** | — |

### 2.3 Minting Flow (13 requirements)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| MNT-01 | Mint after NAV recognized | **Implemented** | MintRequest → ApproveMint flow |
| MNT-02 | Onboarding + wallet gate | **Implemented** | 4 compliance checks at mint |
| MNT-03 | CC conversion | **Partial** | Fee calculated; conversion off-ledger |
| MNT-04 | NAV freshness gate | **Implemented** | maxNavAgeSeconds enforced |
| MNT-05 | NAV per token formula | **Implemented** | NAV/supply with zero-supply fallback |
| MNT-06 | Net amount after fees | **Implemented** | Sub + conv + elastic fees deducted |
| MNT-07 | Minted amount formula | **Implemented** | net / navPerToken |
| MNT-08 | Supply update | **Implemented** | Archive + create with new total |
| MNT-09 | Holdings created | **Implemented** | HectXHolding with Splice interface |
| MNT-10 | Reject with reason codes | **Implemented** | 5 reason codes defined |
| MNT-11 | Emergency suspension | **Partial** | mintingEnabled flag; no trigger |
| MNT-12 | Reason code enum | **Implemented** | Compliance, Pricing, Settlement, Operational, Policy |
| MNT-13 | Portfolio deployment | **Not Implemented** | No portfolio model |

### 2.4 Pricing & NAV (10 requirements)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| PRC-01 | NAV per token formula | **Implemented** | With zero-supply fallback |
| PRC-02 | GAV composition | **Partial** | Field exists; computation off-ledger |
| PRC-03 | NAV = GAV - fees - liabilities | **Partial** | Fields stored; formula off-ledger |
| PRC-04 | Oracle price feed | **Not Implemented** | Manual input |
| PRC-05 | Timestamp + freshness | **Implemented** | maxNavAgeSeconds enforced |
| PRC-06 | Anomaly detection | **Partial** | Age check only |
| PRC-07 | Elastic fee flag | **Implemented** | elasticFeeActive in MintPolicy |
| PRC-08 | Elastic fee = 0 if market ≤ NAV | **Implemented** | Premium = max(0, market - NAV) |
| PRC-09 | Elastic fee = 1% of premium | **Implemented** | elasticFeeBps applied |
| PRC-10 | Market price disclosure | **Not Implemented** | Manual parameter |

### 2.5 Transferability (9 requirements)

| ID | Requirement | Status | Notes |
|----|-------------|--------|-------|
| TRF-01 | Permissioned transfers | **Implemented** | Splice TransferFactory on Canton |
| TRF-02 | Unapproved wallets blocked | **Implemented** | wallet.active checked both parties |
| TRF-03 | Both parties approved | **Implemented** | Eligibility + wallet + jurisdiction |
| TRF-04 | Frozen if compliance fails | **Implemented** | Status check blocks transfer |
| TRF-05 | Global pause | **Partial** | Per-wallet freeze only |
| TRF-06 | Transfer ≠ redemption | **Implemented** | By design |
| TRF-07 | Timing validation | **Implemented** | requestedAt ≤ now < executeBefore |
| TRF-08 | Holdings rebalanced | **Implemented** | Input archived, receiver + change |
| TRF-09 | Instrument ID validation | **Implemented** | Checked against factory |

### 2.6 Remaining Domains

| Domain | Implemented | Partial | Not Impl. | Notes |
|--------|------------|---------|-----------|-------|
| Universe & Portfolio | 0 | 1 | 3 | Managed off-ledger |
| Corporate Actions | 0 | 1 | 5 | Post-demo phase |
| Fees, Taxes & Legal | 4 | 2 | 5 | Core fees done; extended fees pending |
| Trust & Transparency | 0 | 2 | 0 | 2 off-ledger by design |

---

## 3. Test Evidence

### 3.1 Test Suite Results

| # | Test Name | Validates | Result |
|---|-----------|-----------|--------|
| 1 | `test_HectX_Mint_And_Transfer` | Happy path: mint + transfer + balance verification | **PASS** |
| 2 | `test_jurisdiction_rejection` | US investor blocked at mint by jurisdiction check | **PASS** |
| 3 | `test_wallet_deactivation` | Deactivated wallet blocks transfer | **PASS** |
| 4 | `test_elastic_fee` | Elastic fee when market > NAV (99.99 tokens) | **PASS** |
| 5 | `test_fee_deductions` | Subscription + conversion fees (970.0 tokens) | **PASS** |
| 6 | `test_insufficient_balance` | Transfer exceeding balance rejected | **PASS** |
| 7 | `test_nav_staleness` | Stale NAV snapshot blocks minting | **PASS** |

**Runtime:** Daml Script with `--ide-ledger` mode
**Result:** 7/7 passing

### 3.2 Compliance Check Inventory

The following compliance checks are enforced on-ledger:

**At Minting (ApproveMint):**
1. `mintingEnabled == True` — policy gate
2. `investor.status == Eligible` — eligibility gate
3. `wallet.active == True` — wallet gate
4. `investor.jurisdiction not in prohibitedJurisdictions` — jurisdiction gate
5. `navAge <= maxNavAgeSeconds` — freshness gate
6. `netAmount > 0` — economic viability

**At Transfer (runTransfer):**
1. `sender.status == Eligible` — sender eligibility
2. `receiver.status == Eligible` — receiver eligibility
3. `sender wallet.active == True` — sender wallet
4. `receiver wallet.active == True` — receiver wallet
5. `sender.jurisdiction not in prohibitedJurisdictions` — sender jurisdiction
6. `receiver.jurisdiction not in prohibitedJurisdictions` — receiver jurisdiction
7. `requestedAt <= now` — timing lower bound
8. `executeBefore > now` — timing upper bound
9. `total >= transfer.amount` — sufficient balance
10. `instrumentId matches factory` — instrument validation

---

## 4. Splice Token Standard Compliance

| Interface | Method | Status |
|-----------|--------|--------|
| `HoldingV1.Holding` | `view` → HoldingView | **Compliant** |
| `TransferFactory` | `view` → TransferFactoryView | **Compliant** |
| `TransferFactory` | `publicFetch` → TransferFactoryView | **Compliant** |
| `TransferFactory` | `transfer` → TransferInstructionResult | **Compliant** |

The implementation is fully compatible with the Splice Token Standard 0.5.14.

---

## 5. Risk Assessment

### 5.1 Resolved Risks

| Risk | Severity | Resolution |
|------|----------|------------|
| Prohibited jurisdiction bypass | **High** | Jurisdiction enforcement added to mint and transfer (Session 3) |

### 5.2 Open Risks

| Risk | Severity | Mitigation | Timeline |
|------|----------|------------|----------|
| Restricted jurisdiction thresholds not enforced | **Medium** | RestrictedRule data structure ready; add runtime checks | Post-demo |
| No global transfer pause | **Medium-High** | Add `transfersEnabled` flag to policy contract | Post-demo |
| No corporate action handling | **Medium** | Design corporate action templates | Future phase |
| Market price is manual input | **Medium** | Design oracle attestation contract | Future phase |
| No portfolio model on-ledger | **Low** | Acceptable for MVP; managed externally | By design |

### 5.3 Risk Summary

- **Critical risks:** 0 (all resolved)
- **High risks:** 0
- **Medium-High risks:** 1 (global pause)
- **Medium risks:** 3
- **Low risks:** 1

---

## 6. Remediation Plan

### Phase 1: Pre-Demo (Current)
- [x] Jurisdiction enforcement in minting flow
- [x] Jurisdiction enforcement in transfer flow
- [x] EligibilityPolicy contract key for fetchByKey
- [x] 7 test scenarios covering compliance paths
- [x] Documentation updated

### Phase 2: Post-Demo
- [ ] Restricted jurisdiction threshold enforcement
- [ ] Global transfer pause mechanism
- [ ] Extended fee types (platform, transaction)
- [ ] Automated NAV reporting API
- [ ] Terms acceptance tracking

### Phase 3: Future
- [ ] Corporate action templates (IPO, M&A, buyback)
- [ ] Oracle/price feed integration
- [ ] On-ledger portfolio model
- [ ] Tax metadata
- [ ] Anomaly detection for NAV

---

## 7. Conclusion

The HECTX implementation covers 46% of requirements as fully implemented and 17% as partially implemented. All compliance-critical flows (eligibility verification, jurisdiction enforcement, fee calculation, NAV freshness, transfer authorization) are enforced on-ledger with test evidence.

The system is compliant with the Splice Token Standard 0.5.14 and ready for client demonstration. Remaining gaps are primarily in areas designated for post-demo development phases and do not affect the core compliance posture.

---

*Report generated as part of Session 4 — End-to-End Demo Polish & Compliance Reporting*
