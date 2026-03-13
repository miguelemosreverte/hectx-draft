# HECTX Requirements Traceability Matrix

**Version:** 1.0
**Date:** 2026-03-13
**Scope:** All requirements from `docs/hectx-overview/` chapters mapped to Daml implementation in `hectx-daml/daml/HectX/`

---

## Status Legend

| Status | Meaning |
|--------|---------|
| **Implemented** | Fully implemented in Daml with test evidence |
| **Partial** | Structure exists but enforcement or coverage is incomplete |
| **Off-Ledger** | Intentionally handled outside the smart contract layer |
| **Not Implemented** | No on-ledger implementation exists |

---

## 1. Product Definition (Chapter 01)

| ID | Requirement | Source | Implementation | Status | Source Code | Test Evidence |
|----|-------------|--------|----------------|--------|-------------|---------------|
| PRD-01 | NAV-based token; value tied to vehicle NAV | `01-product-overview.md` I.a | Token value derived from NAVSnapshot at mint time | **Implemented** | `Minting.daml:54` | `Tests.daml:90` (mint at NAV) |
| PRD-02 | Indirect economic claim, not direct ownership | `01-product-overview.md` I.b | No ownership representation in contracts — by design | **Implemented** | `Holding.daml:8-16` (amount only, no ownership rights) | N/A (design) |
| PRD-03 | No redemption, voting, or information rights | `01-product-overview.md` III.b | No redemption or governance choices exist | **Implemented** | No redemption template exists | N/A (design) |
| PRD-04 | Liquidity via secondary trading and buybacks | `01-product-overview.md` IV.a-b | Transfer mechanism exists; buyback not implemented | **Partial** | `Transfers.daml:99-127` | `Tests.daml:109-134` |

## 2. Universe & Portfolio (Chapter 02)

| ID | Requirement | Source | Implementation | Status | Source Code | Test Evidence |
|----|-------------|--------|----------------|--------|-------------|---------------|
| UNI-01 | Curated universe of private, pre-IPO companies | `02-universe-and-portfolio.md` I.a | No portfolio model on ledger | **Not Implemented** | — | — |
| UNI-02 | Company eligibility criteria | `02-universe-and-portfolio.md` II.a-c | No company eligibility logic | **Not Implemented** | — | — |
| UNI-03 | Diversification targets and concentration limits | `02-universe-and-portfolio.md` IV.a-b | No portfolio construction logic | **Not Implemented** | — | — |
| UNI-04 | Reserve sleeve for subscriptions | `02-universe-and-portfolio.md` IV.c | NAVSnapshot tracks reserves field | **Partial** | `NAV.daml:11` | — |

## 3. Eligibility & Onboarding (Chapter 03)

| ID | Requirement | Source | Implementation | Status | Source Code | Test Evidence |
|----|-------------|--------|----------------|--------|-------------|---------------|
| ELG-01 | Non-US investors; US persons prohibited | `03-eligibility.md` I.a-b | EligibilityPolicy.prohibitedJurisdictions enforced at mint (`Minting.daml:51`) and transfer (`Transfers.daml:60-61`) | **Implemented** | `Policy.daml:18`, `Minting.daml:51`, `Transfers.daml:60-61` | `Tests.daml:test_jurisdiction_rejection` |
| ELG-02 | 22 prohibited jurisdictions enumerated | `03-eligibility.md` II.a-v | EligibilityPolicy accepts arbitrary list; enforcement active. Test covers "United States" | **Implemented** | `Policy.daml:18`, `Minting.daml:51` | `Tests.daml:test_jurisdiction_rejection` |
| ELG-03 | 7 restricted jurisdictions with thresholds | `03-eligibility.md` III.a-g | RestrictedRule data type exists with minNetWorth/minAssets/minIncome; **threshold enforcement not yet implemented** | **Partial** | `Policy.daml:7-12` | — |
| ELG-04 | KYC/KYB, sanctions screening | `03-eligibility.md` IV.b | Assumed off-ledger; Participant record created manually by admin | **Off-Ledger** | `Compliance.daml:7-18` | `Tests.daml:74-76` |
| ELG-05 | Wallet registration and approval | `03-eligibility.md` IV.c | WalletApproval template with active toggle | **Implemented** | `Compliance.daml:29-46` | `Tests.daml:79-81` |
| ELG-06 | Terms acceptance audit trail | `03-eligibility.md` IV.d | Not implemented | **Not Implemented** | — | — |
| ELG-07 | Periodic re-verification | `03-eligibility.md` V.a | UpdateStatus choice exists; no automated trigger | **Partial** | `Compliance.daml:20-25` | — |
| ELG-08 | Freeze/block non-compliant transfers | `03-eligibility.md` V.b | Status check at mint/transfer; SetActive choice to disable wallet | **Implemented** | `Minting.daml:48-49`, `Transfers.daml:52-55` | `Tests.daml:48-49` (status=Eligible required) |
| ELG-09 | 50%+ ownership by prohibited persons → ineligible | `03-eligibility.md` I.d | Not implemented | **Not Implemented** | — | — |

## 4. Minting Flow (Chapter 04)

| ID | Requirement | Source | Implementation | Status | Source Code | Test Evidence |
|----|-------------|--------|----------------|--------|-------------|---------------|
| MNT-01 | Mint after funds received, converted, NAV recognized | `04-minting-flow.md` I.a | MintRequest → ApproveMint flow | **Implemented** | `Minting.daml:22-86` | `Tests.daml:86-91` |
| MNT-02 | Onboarding complete and wallet approved | `04-minting-flow.md` II.a | Checks Participant.status == Eligible AND WalletApproval.active | **Implemented** | `Minting.daml:44-49` | `Tests.daml:74-81` |
| MNT-03 | CC conversion to base reserve asset | `04-minting-flow.md` II.c | Conversion fee calculated; actual conversion is off-ledger | **Partial** | `Minting.daml:56` | — |
| MNT-04 | NAV recognition gating | `04-minting-flow.md` II.d | NAVSnapshot fetched and freshness validated | **Implemented** | `Minting.daml:42,51-52` | `Tests.daml:71-72` |
| MNT-05 | Pre-mint NAV per token = NAV / supply | `04-minting-flow.md` III.a | Exact formula implemented; handles zero supply (defaults to 1.0) | **Implemented** | `Minting.daml:54` | `Tests.daml:61,90` |
| MNT-06 | Net subscription = amount − fees − costs | `04-minting-flow.md` III.b | Subscription, conversion, and elastic fees deducted | **Implemented** | `Minting.daml:55-59` | `Tests.daml:39-41` (0 bps test) |
| MNT-07 | Minted amount = net / NAV per token | `04-minting-flow.md` III.c | Exact formula | **Implemented** | `Minting.daml:62` | `Tests.daml:105` (1000.0 tokens) |
| MNT-08 | Supply updated after mint | `04-minting-flow.md` II.f (implied) | Old Supply archived, new Supply created with totalSupply + mintedAmount | **Implemented** | `Minting.daml:64-65` | `Tests.daml:61` |
| MNT-09 | Holdings created for investor | `04-minting-flow.md` II.e | HectXHolding created with Splice interface | **Implemented** | `Minting.daml:67-73` | `Tests.daml:99-105` |
| MNT-10 | Delay/reject for compliance flags | `04-minting-flow.md` IV.a | RejectMint choice with ReasonCode | **Implemented** | `Minting.daml:88-105` | — |
| MNT-11 | Emergency suspension | `04-minting-flow.md` IV.b | mintingEnabled flag can be set false; no emergency trigger | **Partial** | `Policy.daml:37`, `Minting.daml:47` | — |
| MNT-12 | Reason codes for delays/rejections | `04-minting-flow.md` IV.c | ReasonCode enum: Compliance, Pricing, Settlement, Operational, Policy | **Implemented** | `Types.daml:9-14` | — |
| MNT-13 | Portfolio deployment after minting | `04-minting-flow.md` I.b, II.g | No portfolio model | **Not Implemented** | — | — |

## 5. Pricing & NAV (Chapter 05)

| ID | Requirement | Source | Implementation | Status | Source Code | Test Evidence |
|----|-------------|--------|----------------|--------|-------------|---------------|
| PRC-01 | NAV per token = NAV / circulating supply | `05-pricing.md` I.a | Implemented with zero-supply fallback | **Implemented** | `Minting.daml:54` | `Tests.daml:90` |
| PRC-02 | GAV = sum stakes + cash + receivables | `05-pricing.md` I.c | GAV field exists in NAVSnapshot; computation off-ledger | **Partial** | `NAV.daml:10` | — |
| PRC-03 | NAV = GAV − fees − reserves − liabilities | `05-pricing.md` I.d | All fields exist in NAVSnapshot; computation off-ledger | **Partial** | `NAV.daml:9-14` | `Tests.daml:64-72` |
| PRC-04 | Notice as primary valuation source | `05-pricing.md` II.a | No oracle integration | **Not Implemented** | — | — |
| PRC-05 | Timestamp and freshness enforcement | `05-pricing.md` III.b | NAVSnapshot has timestamp; maxNavAgeSeconds enforced at mint | **Implemented** | `Minting.daml:51-52`, `Policy.daml:40` | `Tests.daml:49` (3600s) |
| PRC-06 | Stale data / anomaly flags | `05-pricing.md` IV.a | NAV age check only; no anomaly detection | **Partial** | `Minting.daml:51-52` | — |
| PRC-07 | Elastic fee inactive at launch | `05-pricing.md` V.a | elasticFeeActive flag in MintPolicy | **Implemented** | `Policy.daml:38` | `Tests.daml:48` |
| PRC-08 | Elastic fee = 0 if market price ≤ NAV | `05-pricing.md` V.b | Premium calculated as max(0, market - NAV) | **Implemented** | `Minting.daml:57` | `Tests.daml:90` |
| PRC-09 | Elastic fee = 1% of premium if market > NAV | `05-pricing.md` V.c | elasticFeeBps applied to premium | **Implemented** | `Minting.daml:58` | `Tests.daml:48` (100 bps = 1%) |
| PRC-10 | Market price source disclosure | `05-pricing.md` V.d | Market price is manual argument; no feed | **Not Implemented** | `Minting.daml:35` (parameter) | — |

## 6. Transferability (Chapter 06)

| ID | Requirement | Source | Implementation | Status | Source Code | Test Evidence |
|----|-------------|--------|----------------|--------|-------------|---------------|
| TRF-01 | Permissioned transfers on Canton | `06-transferability.md` I.a, III.a | HectXTransferFactory implements Splice TransferFactory on Canton | **Implemented** | `Transfers.daml:99-127` | `Tests.daml:109-134` |
| TRF-02 | Transfers to unapproved wallets blocked | `06-transferability.md` I.b | WalletApproval.active checked for both parties | **Implemented** | `Transfers.daml:54-55` | `Tests.daml:79-81` |
| TRF-03 | Both sender and receiver must be approved | `06-transferability.md` II.a | Participant.status == Eligible AND wallet.active checked | **Implemented** | `Transfers.daml:52-55` | `Tests.daml:127-134` |
| TRF-04 | Transfers frozen if compliance fails | `06-transferability.md` II.b | Eligibility check blocks transfer if status ≠ Eligible | **Implemented** | `Transfers.daml:52-53` | — |
| TRF-05 | Restrict/pause transfers | `06-transferability.md` I.c | Admin can SetActive=false on wallets; no global pause | **Partial** | `Compliance.daml:41-46` | — |
| TRF-06 | Transferability ≠ redemption | `06-transferability.md` II.c | No redemption mechanism exists | **Implemented** | N/A (by design) | — |
| TRF-07 | Timing validation (requestedAt ≤ now < executeBefore) | Splice standard | Enforced in runTransfer | **Implemented** | `Transfers.daml:30-31` | `Tests.daml:108-115` |
| TRF-08 | Holdings rebalanced (receiver gets amount, sender gets change) | Splice standard | Input archived, receiver + change holdings created | **Implemented** | `Transfers.daml:68-91` | `Tests.daml:136-150` |
| TRF-09 | Instrument ID validation | Splice standard | Checked against factory instrument ID | **Implemented** | `Transfers.daml:32,65` | `Tests.daml:113` |

## 7. Corporate Actions (Chapter 07)

| ID | Requirement | Source | Implementation | Status | Source Code | Test Evidence |
|----|-------------|--------|----------------|--------|-------------|---------------|
| CRP-01 | IPO/direct listing handling | `07-corporate-actions.md` I.a | No implementation | **Not Implemented** | — | — |
| CRP-02 | M&A/tender/liquidity event handling | `07-corporate-actions.md` I.b | No implementation | **Not Implemented** | — | — |
| CRP-03 | Valuation updates for corporate actions | `07-corporate-actions.md` II.a | NAVSnapshot can be recreated; no event-driven update | **Partial** | `NAV.daml:6-18` | — |
| CRP-04 | Hold/sell/rebalance positions | `07-corporate-actions.md` II.b | No portfolio model | **Not Implemented** | — | — |
| CRP-05 | Proceeds allocation policy | `07-corporate-actions.md` II.c | No implementation | **Not Implemented** | — | — |
| CRP-06 | Discretionary buybacks | `07-corporate-actions.md` III.b | No buyback mechanism | **Not Implemented** | — | — |

## 8. Fees, Taxes & Legal (Chapter 08)

| ID | Requirement | Source | Implementation | Status | Source Code | Test Evidence |
|----|-------------|--------|----------------|--------|-------------|---------------|
| FEE-01 | Subscription fee | `08-fees.md` I.a | subscriptionFeeBps in FeeSchedule, applied at mint | **Implemented** | `Policy.daml:27`, `Minting.daml:55` | `Tests.daml:39` |
| FEE-02 | Conversion fee | `08-fees.md` I.a | conversionFeeBps in FeeSchedule, applied at mint | **Implemented** | `Policy.daml:28`, `Minting.daml:56` | `Tests.daml:40` |
| FEE-03 | Management fee | `08-fees.md` I.a | managementFeeBps in FeeSchedule | **Partial** | `Policy.daml:29` | — (not applied at mint; accrual only) |
| FEE-04 | Platform fee | `08-fees.md` I.a | Not implemented | **Not Implemented** | — | — |
| FEE-05 | Transaction fee | `08-fees.md` I.a | Not implemented | **Not Implemented** | — | — |
| FEE-06 | Third-party costs | `08-fees.md` I.b | Not implemented | **Not Implemented** | — | — |
| FEE-07 | Fees as configurable policy objects | `08-fees.md` II.a | FeeSchedule template with basis-point fields | **Implemented** | `Policy.daml:24-30` | `Tests.daml:37-41` |
| FEE-08 | Apply fees before mint, persist breakdown | `08-fees.md` II.b | Fees applied in ApproveMint; netAmount in MintReceipt | **Implemented** | `Minting.daml:55-62`, `Minting.daml:108-121` | `Tests.daml:90` |
| FEE-09 | CC conversion fees before NAV recognition | `08-fees.md` II.c | conversionFee deducted before mint; actual conversion off-ledger | **Partial** | `Minting.daml:56` | — |
| FEE-10 | Jurisdiction-aware tax metadata | `08-fees.md` III.a-b | Not implemented | **Not Implemented** | — | — |
| FEE-11 | No direct ownership / no voting rights | `08-fees.md` IV.a-b | No governance or ownership contracts | **Implemented** | N/A (by design) | — |

## 9. Trust & Transparency (Chapter 09)

| ID | Requirement | Source | Implementation | Status | Source Code | Test Evidence |
|----|-------------|--------|----------------|--------|-------------|---------------|
| TRS-01 | Regular NAV updates and disclosures | `09-trust.md` II.a | NAVSnapshot template exists; no reporting API | **Partial** | `NAV.daml:6-18` | — |
| TRS-02 | Valuation methodology disclosure | `09-trust.md` II.b | Documented in overview; no on-ledger mechanism | **Off-Ledger** | — | — |
| TRS-03 | Governance and risk documentation | `09-trust.md` III.a | Documented in overview only | **Off-Ledger** | — | — |
| TRS-04 | Auditability for NAV, minting, transfers | `09-trust.md` III.b | MintReceipt persists full breakdown; transfer results returned | **Partial** | `Minting.daml:108-121` | `Tests.daml:90` |

---

## Coverage Summary

| Area | Total | Implemented | Partial | Off-Ledger | Not Implemented |
|------|-------|-------------|---------|------------|-----------------|
| Product Definition | 4 | 3 | 1 | 0 | 0 |
| Universe & Portfolio | 4 | 0 | 1 | 0 | 3 |
| Eligibility & Onboarding | 9 | 2 | 3 | 1 | 3 |
| Minting Flow | 13 | 9 | 1 | 0 | 3 |
| Pricing & NAV | 10 | 5 | 2 | 0 | 3 |
| Transferability | 9 | 7 | 1 | 0 | 1 |
| Corporate Actions | 6 | 0 | 1 | 0 | 5 |
| Fees, Taxes & Legal | 11 | 4 | 2 | 0 | 5 |
| Trust & Transparency | 4 | 0 | 2 | 2 | 0 |
| **TOTAL** | **70** | **30 (43%)** | **14 (20%)** | **3 (4%)** | **23 (33%)** |

---

## Splice Token Standard Compliance

| Interface | Requirement | Implementation | Status |
|-----------|-------------|----------------|--------|
| `HoldingV1.Holding` | Implement `view` returning HoldingView | `HectXHolding` implements interface with owner, instrumentId, amount, lock=None, metadata | **Compliant** |
| `TransferFactory` | Implement `view`, `publicFetch`, `transfer` | `HectXTransferFactory` implements all three methods | **Compliant** |
| `TransferInstructionResult` | Return receiverHoldingCids + senderChangeCids | `runTransfer` returns correct structure | **Compliant** |
| Holdings metadata | Expose via `MetadataV1.Metadata` | mintedAt and navPerTokenAtMint exposed | **Compliant** |

---

## Critical Gaps for Client Demo

### High Priority (Compliance Risk)
1. **ELG-01/02**: Jurisdiction enforcement not active at mint/transfer enforcement points
2. **ELG-03**: Restricted jurisdiction thresholds stored but not validated
3. **TRF-05**: No global transfer pause mechanism

### Medium Priority (Feature Completeness)
4. **CRP-01 through CRP-06**: No corporate action handling
5. **FEE-04/05**: Missing platform and transaction fees
6. **PRC-04**: No oracle/price feed integration

### Lower Priority (Operational)
7. **UNI-01 through UNI-03**: No portfolio model (managed off-ledger for now)
8. **FEE-10**: No tax metadata
9. **TRS-01**: No automated reporting API
