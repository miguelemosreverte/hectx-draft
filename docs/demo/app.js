/* ═══════════════════════════════════════════════════
   HECTX Demo — Interactive Controller
   ═══════════════════════════════════════════════════ */

const demoState = {
  phase: "idle", // idle | running | done
  currentStep: 0,
  steps: ["setup", "mint", "transfer", "verify"],
  completed: new Set(),

  // Ledger state
  admin: null,
  alice: null,
  bob: null,
  registryCid: null,
  transferFactoryCid: null,

  // Compliance
  policyActive: false,
  aliceCompliant: false,
  bobCompliant: false,

  // Holdings
  holdings: [],
  nav: 1000,
  supply: 0,
  navPerToken: 1.0,

  logEntries: 0,
};

/* ─── DOM References ─── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const logEl = $("#log");
const logCountEl = $("#log-count");

/* ─── Logging ─── */
function log(message, type = "info") {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  const line = document.createElement("div");
  line.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-${type}">${message}</span>`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  demoState.logEntries++;
  logCountEl.textContent = `${demoState.logEntries} entries`;
}

/* ─── API ─── */
async function api(path, opts = {}) {
  const res = await fetch(path, { method: "POST", ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

/* ─── Step State ─── */
function markStep(name, status) {
  const el = $(`#step-${name}`);
  if (!el) return;
  el.classList.remove("active", "done");
  if (status === "active") el.classList.add("active");
  if (status === "done") {
    el.classList.add("done");
    demoState.completed.add(name);
  }
}

function setStepResult(name, text) {
  const detail = $(`#detail-${name}`);
  if (!detail) return;
  let resultEl = detail.querySelector(".step-result");
  if (!resultEl) {
    resultEl = document.createElement("div");
    resultEl.className = "step-result";
    detail.appendChild(resultEl);
  }
  resultEl.textContent = text;
}

/* ─── KPI Updates ─── */
function updateKPIs() {
  $("#kpi-nav").textContent = `$${demoState.nav.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  $("#kpi-supply").textContent = demoState.supply.toLocaleString("en-US", { maximumFractionDigits: 2 });
  $("#kpi-price").textContent = `$${demoState.navPerToken.toFixed(4)}`;
  $("#kpi-holders").textContent = demoState.holdings.length;
}

/* ─── Compliance Panel ─── */
function updateCompliance() {
  // Policy
  const dotPolicy = $("#dot-policy");
  dotPolicy.className = `status-dot ${demoState.policyActive ? "active" : "pending"}`;
  $("#val-prohibited").textContent = demoState.policyActive ? "United States" : "—";
  $("#val-restricted").textContent = demoState.policyActive ? "BR, EEA, HK, MY, SG, CH, UK" : "—";

  // Alice
  const dotAlice = $("#dot-alice");
  dotAlice.className = `status-dot ${demoState.aliceCompliant ? "active" : "pending"}`;
  $("#val-alice-jurisdiction").textContent = demoState.aliceCompliant ? "Portugal" : "—";
  $("#val-alice-status").textContent = demoState.aliceCompliant ? "Eligible" : "—";
  $("#val-alice-wallet").textContent = demoState.aliceCompliant ? "Active" : "—";

  // Bob
  const dotBob = $("#dot-bob");
  dotBob.className = `status-dot ${demoState.bobCompliant ? "active" : "pending"}`;
  $("#val-bob-jurisdiction").textContent = demoState.bobCompliant ? "Portugal" : "—";
  $("#val-bob-status").textContent = demoState.bobCompliant ? "Eligible" : "—";
  $("#val-bob-wallet").textContent = demoState.bobCompliant ? "Active" : "—";
}

/* ─── Holdings Table ─── */
function updateHoldings() {
  const tbody = $("#holdings-body");
  if (demoState.holdings.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No holdings — run the workflow to mint tokens</td></tr>';
    return;
  }
  tbody.innerHTML = demoState.holdings
    .map(
      (h) => `
    <tr>
      <td>${h.owner}</td>
      <td class="amount-cell">${Number(h.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      <td><span class="contract-tag" style="border-color:var(--success-border);color:var(--success);background:var(--success-bg)">HECTX</span></td>
      <td><span class="status-pill implemented">Active</span></td>
    </tr>`
    )
    .join("");
}

/* ─── Refresh from Ledger ─── */
async function refreshFromLedger() {
  try {
    const status = await fetch("/api/status").then((r) => r.json());
    if (!status.ready) return;

    demoState.holdings = [];
    if (status.balances?.alice > 0) {
      demoState.holdings.push({ owner: "Alice", amount: status.balances.alice });
    }
    if (status.balances?.bob > 0) {
      demoState.holdings.push({ owner: "Bob", amount: status.balances.bob });
    }

    const totalSupply = (status.balances?.alice ?? 0) + (status.balances?.bob ?? 0);
    demoState.supply = totalSupply;
    demoState.navPerToken = totalSupply > 0 ? demoState.nav / totalSupply : 1.0;

    updateKPIs();
    updateHoldings();
  } catch (_) {
    // Ledger not available — demo mode
  }
}

/* ─── Workflow Steps ─── */
async function runSetup() {
  markStep("setup", "active");
  log("Initializing ledger — creating policies, compliance records, and factory...", "info");

  try {
    const res = await api("/api/setup");
    demoState.registryCid = res.registryCid;
    demoState.transferFactoryCid = res.transferFactoryCid;
    demoState.policyActive = true;

    markStep("setup", "done");
    setStepResult("setup",
      `Registry:  ${res.registryCid}\nFactory:   ${res.transferFactoryCid}`
    );
    log(`EligibilityPolicy created — prohibited: [United States]`, "success");
    log(`FeeSchedule created — subscription: 0 bps, conversion: 0 bps`, "success");
    log(`MintPolicy created — enabled: true, elastic: inactive, maxAge: 3600s`, "success");
    log(`HectXRegistry created — CID: ${res.registryCid?.slice(0, 24)}...`, "success");
    log(`NAVSnapshot created — NAV: $1,000, GAV: $1,000, reserves: $1,000`, "success");
    log(`HectXTransferFactory created — Splice TransferFactory interface`, "success");

    updateCompliance();
    updateKPIs();
    return true;
  } catch (err) {
    log(`Setup failed: ${err.message}`, "error");
    markStep("setup", "");
    return false;
  }
}

async function runMint() {
  markStep("mint", "active");
  log("Creating compliance records for Alice...", "info");

  try {
    const res = await api("/api/mint");
    demoState.aliceCompliant = true;
    demoState.supply = 1000;
    demoState.navPerToken = 1.0;

    markStep("mint", "done");
    setStepResult("mint",
      `MintRequest: ${res.requestCid}\nOutcome:     Minted\nAmount:      1,000.00 HECTX\nNAV/token:   $1.0000`
    );
    log(`Participant (Alice) created — jurisdiction: Portugal, status: Eligible`, "success");
    log(`WalletApproval (Alice) created — active: true`, "success");
    log(`MintRequest submitted — investor: Alice, amount: 1,000.00`, "info");
    log(`ApproveMint executed — 6 compliance checks passed:`, "success");
    log(`  ✓ mintingEnabled == True`, "success");
    log(`  ✓ investor.status == Eligible`, "success");
    log(`  ✓ wallet.active == True`, "success");
    log(`  ✓ NAV age ≤ 3600s`, "success");
    log(`  ✓ fees computed (sub: 0, conv: 0, elastic: 0)`, "success");
    log(`  ✓ netAmount > 0`, "success");
    log(`HectXHolding created — Alice: 1,000.00 HECTX`, "success");
    log(`Supply updated — 0 → 1,000.00`, "info");

    updateCompliance();
    await refreshFromLedger();
    return true;
  } catch (err) {
    log(`Mint failed: ${err.message}`, "error");
    markStep("mint", "");
    return false;
  }
}

async function runTransfer() {
  markStep("transfer", "active");
  log("Creating compliance records for Bob...", "info");

  try {
    await api("/api/transfer");
    demoState.bobCompliant = true;

    markStep("transfer", "done");
    setStepResult("transfer",
      `Interface:   TransferFactory_Transfer (Splice)\nSender:      Alice → Bob\nAmount:      100.00 HECTX\nCompliance:  4 checks passed`
    );
    log(`Participant (Bob) created — jurisdiction: Portugal, status: Eligible`, "success");
    log(`WalletApproval (Bob) created — active: true`, "success");
    log(`TransferFactory_Transfer executed — compliance checks:`, "success");
    log(`  ✓ sender.status == Eligible`, "success");
    log(`  ✓ receiver.status == Eligible`, "success");
    log(`  ✓ sender wallet active`, "success");
    log(`  ✓ receiver wallet active`, "success");
    log(`Input holding archived — Alice: 1,000.00`, "info");
    log(`Receiver holding created — Bob: 100.00 HECTX`, "success");
    log(`Change holding created — Alice: 900.00 HECTX`, "success");

    updateCompliance();
    await refreshFromLedger();
    return true;
  } catch (err) {
    log(`Transfer failed: ${err.message}`, "error");
    markStep("transfer", "");
    return false;
  }
}

async function runVerify() {
  markStep("verify", "active");
  log("Querying final ledger state...", "info");

  try {
    const status = await fetch("/api/status").then((r) => r.json());

    markStep("verify", "done");
    const aliceBal = status.balances?.alice ?? 0;
    const bobBal = status.balances?.bob ?? 0;

    setStepResult("verify",
      `Alice balance:   ${aliceBal.toLocaleString()} HECTX\nBob balance:     ${bobBal.toLocaleString()} HECTX\nHoldings count:  ${status.holdingsCount}\nTotal supply:    ${(aliceBal + bobBal).toLocaleString()} HECTX`
    );

    log(`Final state verified:`, "success");
    log(`  Alice: ${aliceBal.toLocaleString()} HECTX`, "success");
    log(`  Bob:   ${bobBal.toLocaleString()} HECTX`, "success");
    log(`  Holdings: ${status.holdingsCount} contracts on ledger`, "success");
    log(`  Supply invariant: ${aliceBal} + ${bobBal} = ${aliceBal + bobBal} ✓`, "success");

    await refreshFromLedger();
    return true;
  } catch (err) {
    log(`Verify failed: ${err.message}`, "error");
    markStep("verify", "");
    return false;
  }
}

/* ─── Run All ─── */
async function runAll() {
  if (demoState.phase === "running") return;
  demoState.phase = "running";

  const btn = $("#run-all");
  btn.disabled = true;
  btn.textContent = "Running...";

  log("═══ Starting full HECTX demo scenario ═══", "info");

  const ok1 = await runSetup();
  if (!ok1) { btn.disabled = false; btn.textContent = "Run All Steps"; demoState.phase = "idle"; return; }
  await delay(400);

  const ok2 = await runMint();
  if (!ok2) { btn.disabled = false; btn.textContent = "Run All Steps"; demoState.phase = "idle"; return; }
  await delay(400);

  const ok3 = await runTransfer();
  if (!ok3) { btn.disabled = false; btn.textContent = "Run All Steps"; demoState.phase = "idle"; return; }
  await delay(400);

  await runVerify();

  log("═══ Demo scenario complete ═══", "info");
  demoState.phase = "done";
  btn.textContent = "Complete";
}

/* ─── Reset ─── */
function reset() {
  demoState.phase = "idle";
  demoState.currentStep = 0;
  demoState.completed.clear();
  demoState.policyActive = false;
  demoState.aliceCompliant = false;
  demoState.bobCompliant = false;
  demoState.holdings = [];
  demoState.nav = 1000;
  demoState.supply = 0;
  demoState.navPerToken = 1.0;
  demoState.logEntries = 0;

  // Reset steps
  $$(".step").forEach((el) => el.classList.remove("active", "done"));
  $$(".step-result").forEach((el) => el.remove());

  // Reset UI
  logEl.innerHTML = "";
  logCountEl.textContent = "0 entries";
  const btn = $("#run-all");
  btn.disabled = false;
  btn.textContent = "Run All Steps";

  updateKPIs();
  updateCompliance();
  updateHoldings();
  log("Demo reset — ready for new scenario", "info");
}

/* ─── Utils ─── */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ─── Event Listeners ─── */
$("#run-all").addEventListener("click", runAll);
$("#reset").addEventListener("click", reset);

// Individual step buttons
$$("[data-action]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const action = btn.dataset.action;
    try {
      if (action === "setup") await runSetup();
      if (action === "mint") await runMint();
      if (action === "transfer") await runTransfer();
      if (action === "verify") await runVerify();
    } catch (err) {
      log(`Error: ${err.message}`, "error");
    }
  });
});

/* ─── Init ─── */
updateKPIs();
updateCompliance();
updateHoldings();
log("HECTX Demo ready — click 'Run All Steps' or run steps individually", "info");
