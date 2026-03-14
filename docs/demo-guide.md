# HECTX Demo Guide

**Version:** 2.0
**Last Updated:** 2026-03-13
**Audience:** Developers running the demo, and presenters doing client-facing walkthroughs

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Docker | 24+ | Runs the Splice localnet (Canton + Postgres + validator UIs) |
| Node.js | 18+ | Demo server and Playwright |
| Hurl | 6+ | E2E test runner (`brew install hurl`) |
| Daml SDK | 3.4.11 | Only needed to rebuild Daml contracts |
| Java (OpenJDK) | 21 | Only needed for `daml script` execution |

> **macOS with Colima:** If you use Colima instead of Docker Desktop, the scripts auto-detect `~/.colima/docker.sock` via `scripts/docker-env.sh`.

---

## Quick Start

### 1. Start the Canton localnet

```bash
./scripts/localnet-up.sh
```

This runs `docker compose up` with the Splice 0.5.14 localnet — Canton participant (JSON API on port **2975**), Postgres, SV node, validator, and web UIs. Wait until all containers report healthy:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

You should see `canton`, `splice`, `postgres`, and several `*-web-ui` containers all showing `healthy`.

### 2. Build and start the demo server

```bash
cd hectx-services
npm install
npm run build
node dist/demo-server.js
```

The demo server starts on **http://localhost:5177**. It serves the UI at `/` and exposes the API endpoints that talk to the real Canton ledger.

### 3. Open the demo

Open **http://localhost:5177** in a browser. Click **"Run All Steps"** or run each step individually.

### 3D Infographic

The demo includes a Three.js 3D infographic at **http://localhost:5177/infographic.html**. It visualizes the full HECTX lifecycle from a top-down view:

- **Investor discs** arranged by jurisdiction around a central ledger prism
- **Gold arcs** for mints, **teal arcs** for transfers, **red bounce-back arcs** for compliance rejections
- **Per-investor balance bars** that grow as tokens are minted and shift during transfers
- **Compliance check rings** cascade outward from each investor during minting (green = pass, red = fail)
- **Transfer network** — persistent ground connections between transacting parties
- **Step explanation panel** (left) — describes what each step demonstrates
- **Transaction log** (right) — scrolling real-time log of backend operations

The infographic connects to the same SSE streaming endpoints as the main dashboard. Click **"Run All Steps"** and watch the full demo unfold in 3D. Drag to orbit, scroll to zoom.

Autoplay mode: `http://localhost:5177/infographic.html?autoplay&delay=800`

### One-liner (localnet + demo server)

```bash
./scripts/demo-run.sh
```

This does steps 1-2 in sequence: brings up the localnet, installs dependencies, builds, and starts the demo server.

### Stopping

```bash
# Stop the localnet (removes containers and volumes)
./scripts/localnet-down.sh
```

---

## API Endpoints

The demo server exposes these endpoints, each executing real Daml contract operations:

| Endpoint | Method | What it does |
|----------|--------|-------------|
| `/api/status` | GET | Returns current ledger state: parties, balances, supply, holdings count |
| `/api/setup` | POST | Allocates parties, grants CanActAs rights, creates 7 contracts (EligibilityPolicy, FeeSchedule, MintPolicy, Registry, Supply, NAVSnapshot, TransferFactory) |
| `/api/mint` | POST | Alice mints 1,000 HECTX — runs 7 compliance checks, creates MintRequest + ApproveMint |
| `/api/transfer` | POST | Alice transfers 100 HECTX to Bob via Splice TransferFactory interface |
| `/api/rejection` | POST | Charlie (US jurisdiction) attempts to mint — blocked by EligibilityPolicy |
| `/api/reset` | POST | Clears server state and generates new session suffix for party isolation |

### Session isolation

Each `/api/reset` generates a random 4-character suffix appended to party names (e.g., `Alice_x7k2`). This ensures repeated runs don't collide with stale contracts from previous sessions on the same ledger.

---

## Running E2E Tests

### Full pipeline (localnet + server + tests + teardown)

```bash
./scripts/demo-e2e.sh
```

### Against a running server

```bash
cd hectx-services
hurl --test --variable base_url=http://localhost:5177 tests/demo.hurl
```

The Hurl test runs all 5 steps (20 investors, 16 mints, 8 transfers, 4 rejections), verifies balances and supply invariant, resets, and verifies the reset. Expect ~60s and 8 HTTP requests.

### Expected timing breakdown

All time is spent waiting for Canton to commit transactions — this is the real ledger, not a mock.

| Step | Endpoint | Time | What's happening |
|------|----------|------|-----------------|
| 1. Setup | `POST /api/setup` | ~8s | 20 party allocations + 20 actAs grants + 7 contract creates |
| 2. Mint | `POST /api/mint` | ~20s | 16 participant + wallet records, 16 sequential mints (Supply is singleton) |
| 3. Transfer | `POST /api/transfer` | ~18s | 16 RegisterParty calls + 8 transfers with ACS queries |
| 4. Verify | `GET /api/status` | <1s | Queries ACS for all balances |
| 5. Rejection | `POST /api/rejection` | ~12s | 4 prohibited investors: allocate, compliance, attempt mint (aborts) |
| 6-8 | Verify + Reset + Verify | <1s | Status checks and state clear |
| **Total** | | **~60s** | |

Setup parallelizes party allocations in batches of 10. Mints must be sequential because each `ApproveMint` updates the singleton Supply contract. Each Canton transaction commit takes ~400ms.

---

## Autoplay Mode (for GIF/video recording)

The UI supports query parameters for automated recording with Playwright or Selenium:

```
http://localhost:5177/?autoplay&delay=800
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `autoplay` | _(flag)_ | Automatically resets and runs all 5 steps on page load |
| `delay` | `800` | Milliseconds between steps |

### Detecting completion programmatically

The `<body>` element has a `data-demo-phase` attribute that reflects the current state:

| Value | Meaning |
|-------|---------|
| `idle` | Page loaded, waiting for user action |
| `running` | Steps are executing |
| `done` | All steps completed successfully |
| `error` | A step failed |

Example Playwright snippet:

```javascript
await page.goto("http://localhost:5177/?autoplay&delay=600");
await page.waitForAttribute("body", "data-demo-phase", "done", { timeout: 60000 });
```

---

## Running Daml Tests (standalone verification)

These run the contract logic in the Daml IDE ledger without needing Docker:

```bash
cd hectx-daml
export PATH="$HOME/.daml/bin:$PATH"
daml build
daml script --dar .daml/dist/hectx-0.2.0.dar \
  --script-name HectX.Tests:main --ide-ledger
```

Expected: clean exit with no errors (7 tests pass silently).

---

## Web UIs and Login Credentials

The Splice localnet runs in **unsafe auth mode** — no passwords, no OAuth. Each web UI shows a simple text field asking for a username. Type the username listed below and click "Log In".

| URL | UI | Login Username |
|-----|-----|---------------|
| `http://localhost:5177` | **HECTX Demo** | No login required |
| `http://wallet.localhost:2000` | Wallet (App User) | `app-user` |
| `http://ans.localhost:2000` | ANS (App User) | `app-user` |
| `http://wallet.localhost:3000` | Wallet (App Provider) | `app-provider` |
| `http://ans.localhost:3000` | ANS (App Provider) | `app-provider` |
| `http://wallet.localhost:4000` | Wallet (Super Validator) | `sv` |
| `http://sv.localhost:4000` | SV Dashboard | `sv` |
| `http://scan.localhost:4000` | Scan (Ledger Explorer) | No login required |

> **Note:** These are real Splice Network UIs running from the Canton localnet Docker containers. The Scan UI is particularly useful during the demo — it shows transactions landing on the ledger in real-time, proving this is not a mock.

---

## Port Reference

| Port | Service |
|------|---------|
| 2975 | Canton HTTP JSON Ledger API v2 (participant) |
| 5177 | HECTX demo server |
| 5432 | Postgres |
| 2000 | App User web UIs (wallet, ANS — via nginx) |
| 3000 | App Provider web UIs (wallet, ANS — via nginx) |
| 4000 | Super Validator web UIs (wallet, SV dashboard, scan — via nginx) |
| 2901-2902 | Canton admin/ledger API |

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

## Key Architecture Decisions

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

## Files Reference

| File | Purpose |
|------|---------|
| `docs/demo/index.html` | Demo UI — single-page application |
| `docs/demo/infographic.html` | Three.js 3D infographic (top-down view) |
| `docs/demo/styles.css` | Dark professional theme |
| `docs/demo/app.js` | Interactive controller with autoplay support |
| `hectx-services/src/demo-server.ts` | Backend — talks to Canton v2 JSON API |
| `hectx-services/src/jsonApi.ts` | Canton v2 HTTP JSON Ledger API client |
| `hectx-services/tests/demo.hurl` | E2E test (8 requests, all 5 steps + reset) |
| `scripts/demo-run.sh` | One-liner: localnet + build + server |
| `scripts/demo-e2e.sh` | One-liner: localnet + build + server + hurl tests + teardown |
| `scripts/localnet-up.sh` | Start Canton/Splice Docker containers |
| `scripts/localnet-down.sh` | Stop and remove containers + volumes |
| `scripts/docker-env.sh` | Sets `DOCKER_HOST` for Colima compatibility |
| `hectx-daml/daml/HectX/*.daml` | Daml smart contract source |
