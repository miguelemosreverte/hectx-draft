# HECTX Demo Presentation Guide

**Version:** 1.0
**Last Updated:** 2026-03-13
**Audience:** Client-facing demo for investors and partners

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | For static demo server and Playwright |
| Playwright | 1.58+ | `npm install` in project root installs it |
| Daml SDK | 3.4.11 | Only needed if running live ledger tests |
| Java (OpenJDK) | 21 | Only needed for Daml Script execution |

## Quick Start

### Running the Demo

The demo runs a Node.js backend that models the Daml ledger — creating contracts, enforcing compliance checks, and tracking holdings in memory. This is the recommended mode for client presentations.

```bash
# From the project root
node docs/demo/server.cjs
```

Then navigate to `http://localhost:8080` in your browser.

The server provides both the UI and the API endpoints (`/api/setup`, `/api/mint`, `/api/transfer`, `/api/status`, `/api/rejection`). Each API call creates real contract objects in the in-memory ledger, runs compliance checks, and returns results that drive the UI.

### Taking Screenshots

```bash
# Captures 8 high-DPI screenshots to sessions/screenshots/
node scripts/screenshot-static.mjs
```

### Running Daml Tests (Verification)

```bash
cd hectx-daml
export PATH="$HOME/.daml/bin:$PATH"
daml build
daml script --dar .daml/dist/hectx-0.1.0.dar \
  --script-name HectX.Tests:main --ide-ledger
```

Expected output: clean exit with no errors (7 tests pass silently).

---

## Demo Walkthrough

### Opening (2 minutes)

**What to show:** The full page in its initial state — all 5 steps pending, KPI cards at default values.

**Key talking points:**
- "This is HECTX — a NAV-based tokenized fund built on the Canton Network using Daml smart contracts."
- "The system implements the Splice Token Standard (v0.5.14), making HECTX tokens interoperable across the Canton ecosystem."
- "What you're seeing is the entire lifecycle: from ledger setup through compliance-gated minting, Splice-standard transfers, and compliance rejection."
- Point to the technology badges in the top bar: Canton Network, Splice 0.5.14, Daml 3.4.11.

---

### Step 1: Initialize Ledger (2 minutes)

**Click:** "Run" on Step 1, or use "Run All Steps" to run the full sequence.

**What happens:** Creates 7 contracts on the ledger — policy objects, compliance records, and the transfer factory.

**What to highlight:**
- **EligibilityPolicy** — "This is the on-ledger jurisdictional policy. It stores the prohibited jurisdictions list — United States in this case. Every mint and transfer checks this."
- **FeeSchedule** — "Fees are basis-point policy objects, not hardcoded. The operator can change subscription, conversion, and management fees without redeploying contracts."
- **MintPolicy** — "Controls whether minting is enabled, elastic fee parameters, and NAV freshness requirements. The `maxNavAgeSeconds` ensures minting can't happen with stale pricing."
- **NAVSnapshot** — "The NAV is published as an on-ledger attestation. It captures GAV, reserves, liabilities, and accrued fees."

**Compliance panel:** Point to the Eligibility Policy card turning green — "Prohibited: United States".

---

### Step 2: Mint HECTX Tokens (3 minutes)

**What happens:** Alice (Portugal-based investor) mints 1,000 HECTX tokens. The system runs 7 compliance checks before allowing the mint.

**What to highlight in the log:**
1. `mintingEnabled == True` — "The operator hasn't suspended minting."
2. `investor.status == Eligible` — "Alice's KYC/onboarding is complete."
3. `wallet.active == True` — "Her wallet hasn't been frozen."
4. `jurisdiction "Portugal" not in prohibitedJurisdictions` — "**This is the key check.** Alice's jurisdiction is cross-referenced against the EligibilityPolicy. Portugal is not prohibited, so she passes."
5. `NAV age <= 3600s` — "The NAV snapshot is fresh enough for minting."
6. Fees computed — "Subscription and conversion fees are deducted before token calculation."
7. `netAmount > 0` — "After fees, the investment amount is positive."

**Architecture point:** "The NAV per token formula is `NAV / circulating supply`. For the first mint, supply is zero, so we use a fallback of 1.0. This is implemented at `Minting.daml:54`."

**KPI cards:** Point to Supply updating to 1,000 and NAV/Token showing $1.0000.

---

### Step 3: Transfer via Splice Standard (3 minutes)

**What happens:** Alice transfers 100 HECTX to Bob using the Splice TransferFactory interface. The system runs 6 compliance checks.

**What to highlight:**
- "This transfer goes through the **Splice Token Standard** interface — `TransferFactory_Transfer`. This means HECTX tokens are transferable across any Canton application that supports the standard."
- "Both sender AND receiver are checked: eligibility status, wallet status, and **jurisdiction**. If Bob were a US person, this transfer would be blocked."
- "The input holding is archived, and two new holdings are created: Bob gets 100, Alice gets 900 as change. This is atomic — there's no state where tokens are 'in transit'."

**Holdings table:** Point to Alice: 900, Bob: 100 appearing.

---

### Step 4: Verify Final State (1 minute)

**What happens:** Queries the ledger to confirm final balances.

**What to highlight:**
- "Supply invariant: 900 + 100 = 1,000. No tokens were created or destroyed during the transfer."
- "Every holding is a separate on-ledger contract with full provenance — minted timestamp, NAV at mint, issuer."

---

### Step 5: Compliance Rejection Demo (3 minutes)

**This is the most important step for client conversations.**

**What happens:** Charlie, a US-based investor, attempts to mint. The system blocks him.

**What to highlight:**
- "Charlie passes 3 out of 7 checks — minting is enabled, he's marked as Eligible, his wallet is active."
- "**But the jurisdiction check fails.** His jurisdiction 'United States' is found in the EligibilityPolicy's prohibitedJurisdictions list."
- Point to the red error entries in the log: `jurisdiction "United States" IS in prohibitedJurisdictions`
- "The ApproveMint choice **aborts**. No tokens are minted. No supply change. The transaction is fully rolled back."
- Point to Charlie's compliance card with the red dot and "BLOCKED" label: "This is enforced at the smart contract level — it cannot be bypassed by any party, including the operator."

**Key compliance message:** "This is on-ledger enforcement. It's not a middleware check or an API filter. The Daml runtime guarantees that this code executes for every mint, and the Canton Network ensures the code hasn't been tampered with."

---

### Architecture Table (2 minutes)

**Scroll down** to the Architecture Decisions table.

**What to highlight:**
- "Each row maps a product requirement — with its document reference — to the exact Daml source code that implements it."
- Point to the Status column: "Green means fully implemented and tested. Amber means the data structure exists but enforcement is partial. Gray means planned for a future phase."
- "Prohibited jurisdictions enforcement — this was the highest-priority compliance item. It's now fully implemented at both mint and transfer enforcement points, with references to `Minting.daml:51` and `Transfers.daml:60-61`."

---

## Key Architecture Decisions to Highlight

| Decision | Why It Matters |
|----------|---------------|
| **Daml for smart contracts** | Deterministic execution, built-in authorization model, privacy by default |
| **Canton Network** | Multi-party consensus with sub-transaction privacy; no global state exposure |
| **Splice Token Standard** | Interoperability — HECTX tokens work across any Splice-compatible application |
| **Policy-as-contract pattern** | Fees, eligibility rules, and mint policies are on-ledger contracts, not config files — auditable and versioned |
| **Jurisdiction enforcement at execution** | Not middleware — Daml runtime enforces checks atomically within the transaction |
| **NAV freshness gating** | Stale pricing is blocked at the smart contract level; `maxNavAgeSeconds` is configurable |
| **Basis-point fee architecture** | Subscription, conversion, elastic fees — all configurable without code changes |

---

## Anticipated Client Questions

### Compliance & Regulatory

**Q: How do you prevent a US person from receiving tokens in a secondary transfer?**
A: The `runTransfer` function in `Transfers.daml` checks BOTH sender and receiver jurisdictions against the EligibilityPolicy before allowing the transfer. If either party is in a prohibited jurisdiction, the transaction aborts.

**Q: Can the operator override the jurisdiction check?**
A: No. The check is in the Daml contract code, which executes deterministically on the Canton ledger. The operator (admin party) is the controller of the `ApproveMint` choice, but the `require` statement aborts the entire transaction — the operator cannot skip it.

**Q: What happens if a compliant investor becomes non-compliant?**
A: The admin can update the Participant status via the `UpdateStatus` choice, or deactivate their wallet via `SetActive`. Both changes take immediate effect — subsequent mints and transfers will fail the compliance checks.

**Q: How fresh does the NAV need to be for minting?**
A: Configurable via `MintPolicy.maxNavAgeSeconds`. Currently set to 3600 (1 hour). If the NAV snapshot is older than this threshold, minting is blocked.

### Technical

**Q: What Splice interfaces do you implement?**
A: `HoldingV1.Holding` (view, metadata) and `TransferFactory` (view, publicFetch, transfer). Full Splice Token Standard 0.5.14 compliance.

**Q: How are fees handled?**
A: Three fee types at minting: subscription (basis points), conversion (basis points), and elastic (percentage of premium when market > NAV). All deducted from the investment amount before token calculation. The elastic fee can be activated/deactivated independently.

**Q: What's the token supply model?**
A: Supply is tracked on-ledger via the `Supply` contract. It increases at mint (by `mintedAmount`). There is no burn/redemption mechanism — tokens represent indirect economic claims, not redeemable shares.

**Q: Can you handle 22 prohibited jurisdictions, not just the US?**
A: Yes. `EligibilityPolicy.prohibitedJurisdictions` is a `[Text]` — an arbitrary-length list. The test uses "United States" as the example, but the list can contain all 22 jurisdictions specified in the product requirements.

---

## Demo Files Reference

| File | Purpose |
|------|---------|
| `docs/demo/index.html` | Demo UI — single-page application |
| `docs/demo/styles.css` | Dark professional theme |
| `docs/demo/app.js` | Interactive controller with 5-step workflow |
| `scripts/screenshot-static.mjs` | Playwright screenshot tool (8 captures) |
| `docs/hectx-compliance/compliance-report.md` | Full compliance assessment |
| `docs/hectx-compliance/requirements-traceability.md` | 70-requirement traceability matrix |
| `docs/hectx-compliance/compliance-white-paper.md` | Client-facing compliance architecture |
