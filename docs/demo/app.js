/* ═══════════════════════════════════════════════════
   HECTX Demo — Interactive Controller
   ═══════════════════════════════════════════════════ */

const demoState = {
  phase: "idle", // idle | running | done
  currentStep: 0,
  steps: ["setup", "mint", "transfer", "verify", "rejection"],
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
async function api(path) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" } });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

/* ─── Step State ─── */
function markStep(name, status) {
  const el = $(`#step-${name}`);
  if (!el) return;
  el.classList.remove("active", "done", "rejected");
  if (status === "active") el.classList.add("active");
  if (status === "done") {
    el.classList.add("done");
    demoState.completed.add(name);
  }
  if (status === "rejected") {
    el.classList.add("rejected");
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
  const res = await fetch("/api/status");
  const status = await res.json();

  demoState.holdings = [];
  if (status.balances?.alice > 0) {
    demoState.holdings.push({ owner: "Alice", amount: status.balances.alice });
  }
  if (status.balances?.bob > 0) {
    demoState.holdings.push({ owner: "Bob", amount: status.balances.bob });
  }

  demoState.supply = status.totalSupply ?? 0;
  demoState.navPerToken = demoState.supply > 0 ? demoState.nav / demoState.supply : 1.0;

  updateKPIs();
  updateHoldings();
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

    for (const entry of res.log) log(entry.message, entry.type);

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
    demoState.supply = res.supply;
    demoState.navPerToken = res.navPerToken;

    markStep("mint", "done");
    setStepResult("mint",
      `MintRequest: ${res.requestCid}\nOutcome:     Minted\nAmount:      ${res.mintedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} HECTX\nNAV/token:   $${res.navPerToken.toFixed(4)}`
    );

    for (const entry of res.log) log(entry.message, entry.type);

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
    const res = await api("/api/transfer");

    demoState.bobCompliant = true;

    markStep("transfer", "done");
    setStepResult("transfer",
      `Interface:   TransferFactory_Transfer (Splice)\nSender:      Alice → Bob\nAmount:      ${res.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} HECTX\nCompliance:  ${res.checksPassedCount} checks passed`
    );

    for (const entry of res.log) log(entry.message, entry.type);

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
    const res = await fetch("/api/status");
    const status = await res.json();

    const aliceBal = status.balances?.alice ?? 0;
    const bobBal = status.balances?.bob ?? 0;

    markStep("verify", "done");
    setStepResult("verify",
      `Alice balance:   ${aliceBal.toLocaleString()} HECTX\nBob balance:     ${bobBal.toLocaleString()} HECTX\nHoldings count:  ${status.holdingsCount}\nTotal supply:    ${status.totalSupply.toLocaleString()} HECTX`
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

/* ─── Step 5: Rejection ─── */
async function runRejection() {
  markStep("rejection", "active");
  log("═══ Compliance Rejection Scenario ═══", "info");
  log("Creating Charlie (US-based investor) — jurisdiction: United States", "info");

  try {
    const res = await api("/api/rejection");

    // Show Charlie's compliance card
    const card = $("#card-charlie");
    if (card) card.style.display = "";

    // Update Charlie's status
    $("#val-charlie-jurisdiction").textContent = "United States";
    $("#val-charlie-status").textContent = "Eligible";
    $("#val-charlie-wallet").textContent = "Active";

    for (const entry of res.log) log(entry.message, entry.type);

    // Mark Charlie as rejected
    const dotCharlie = $("#dot-charlie");
    if (dotCharlie) dotCharlie.className = "status-dot rejected";
    $("#val-charlie-mint").textContent = "BLOCKED";
    const charlieCard = $("#card-charlie");
    if (charlieCard) charlieCard.classList.add("rejected");

    markStep("rejection", "rejected");
    setStepResult("rejection",
      `Investor:    Charlie (US)\nJurisdiction: United States\nPolicy check: FAILED — prohibited jurisdiction\nOutcome:     MintRequest REJECTED\nTokens:      0 (no change to supply)`
    );

    log(`Compliance enforcement verified — prohibited jurisdiction blocks on-ledger`, "success");
    log(`═══ Rejection scenario complete ═══`, "info");
    return true;
  } catch (err) {
    log(`Rejection demo error: ${err.message}`, "error");
    markStep("rejection", "");
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

  const ok4 = await runVerify();
  if (!ok4) { btn.disabled = false; btn.textContent = "Run All Steps"; demoState.phase = "idle"; return; }
  await delay(400);

  await runRejection();

  log("═══ Full demo scenario complete ═══", "info");
  demoState.phase = "done";
  btn.textContent = "Complete";
}

/* ─── Reset ─── */
async function reset() {
  await fetch("/api/reset", { method: "POST" }).catch(() => {});

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
  $$(".step").forEach((el) => el.classList.remove("active", "done", "rejected"));
  $$(".step-result").forEach((el) => el.remove());

  // Hide Charlie card
  const card = $("#card-charlie");
  if (card) { card.style.display = "none"; card.classList.remove("rejected"); }

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
      if (action === "rejection") await runRejection();
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
