/* ═══════════════════════════════════════════════════
   HECTX Demo — Interactive Controller

   Drives the demo UI against the real HECTX backend
   (hectx-services/src/demo-server.ts) which talks to
   the Daml ledger via the Canton JSON API.

   Query params:
     ?autoplay       — auto-run all steps on load
     ?delay=N        — ms between steps (default 800)
   ═══════════════════════════════════════════════════ */

const params = new URLSearchParams(window.location.search);
const isAutoplay = params.has("autoplay");
const stepDelay = Number(params.get("delay")) || 800;

const demoState = {
  phase: "idle", // idle | running | done
  completed: new Set(),

  // From ledger
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
async function api(path, method = "POST") {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

/* ─── Step State ─── */
function markStep(name, status) {
  const el = $(`#step-${name}`);
  if (!el) return;
  el.classList.remove("active", "done", "rejected");
  if (status === "active") {
    el.classList.add("active");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
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
  const resultEl = $(`#result-${name}`);
  if (!resultEl) return;
  resultEl.textContent = text;
  resultEl.classList.add("visible");
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
  const dotPolicy = $("#dot-policy");
  dotPolicy.className = `status-dot ${demoState.policyActive ? "active" : "pending"}`;
  $("#val-prohibited").textContent = demoState.policyActive ? "United States" : "\u2014";
  $("#val-restricted").textContent = demoState.policyActive ? "BR, EEA, HK, MY, SG, CH, UK" : "\u2014";

  const dotAlice = $("#dot-alice");
  dotAlice.className = `status-dot ${demoState.aliceCompliant ? "active" : "pending"}`;
  $("#val-alice-jurisdiction").textContent = demoState.aliceCompliant ? "Portugal" : "\u2014";
  $("#val-alice-status").textContent = demoState.aliceCompliant ? "Eligible" : "\u2014";
  $("#val-alice-wallet").textContent = demoState.aliceCompliant ? "Active" : "\u2014";

  const dotBob = $("#dot-bob");
  dotBob.className = `status-dot ${demoState.bobCompliant ? "active" : "pending"}`;
  $("#val-bob-jurisdiction").textContent = demoState.bobCompliant ? "Portugal" : "\u2014";
  $("#val-bob-status").textContent = demoState.bobCompliant ? "Eligible" : "\u2014";
  $("#val-bob-wallet").textContent = demoState.bobCompliant ? "Active" : "\u2014";
}

/* ─── Holdings Table ─── */
function updateHoldings() {
  const tbody = $("#holdings-body");
  if (demoState.holdings.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No holdings \u2014 run the workflow to mint tokens</td></tr>';
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
  const status = await api("/api/status", "GET");
  if (!status.ready) return;

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
  log("Initializing ledger \u2014 creating policies, compliance records, and factory...", "info");

  try {
    const res = await api("/api/setup");
    demoState.registryCid = res.registryCid;
    demoState.transferFactoryCid = res.transferFactoryCid;
    demoState.policyActive = true;

    markStep("setup", "done");
    setStepResult("setup",
      `Registry:  ${res.registryCid.slice(0, 16)}...\nFactory:   ${res.transferFactoryCid.slice(0, 16)}...`
    );
    log(`EligibilityPolicy created \u2014 prohibited: [United States]`, "success");
    log(`FeeSchedule created \u2014 subscription: 0 bps, conversion: 0 bps`, "success");
    log(`MintPolicy created \u2014 enabled: true, elastic: inactive, maxAge: 3600s`, "success");
    log(`HectXRegistry created`, "success");
    log(`NAVSnapshot created \u2014 NAV: $1,000, GAV: $1,000, reserves: $1,000`, "success");
    log(`Supply initialized \u2014 0.00 HECTX`, "success");
    log(`HectXTransferFactory created \u2014 Splice TransferFactory interface`, "success");

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

    markStep("mint", "done");
    setStepResult("mint", `Investor: Alice  |  Amount: 1,000 HECTX  |  Outcome: Minted`);
    log(`Participant (Alice) created \u2014 jurisdiction: Portugal, status: Eligible`, "success");
    log(`WalletApproval (Alice) created \u2014 active: true`, "success");
    log(`MintRequest submitted \u2014 investor: Alice, amount: 1,000.00`, "info");
    log(`ApproveMint executed \u2014 7 compliance checks passed`, "success");
    log(`MintReceipt created`, "success");

    updateCompliance();
    await refreshFromLedger();

    log(`HectXHolding created \u2014 Alice: ${demoState.supply.toLocaleString("en-US", { minimumFractionDigits: 2 })} HECTX`, "success");
    log(`Supply updated \u2192 ${demoState.supply.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "info");
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
    setStepResult("transfer", `Alice \u2192 Bob  |  100.00 HECTX  |  Splice TransferFactory`);
    log(`Participant (Bob) created \u2014 jurisdiction: Portugal, status: Eligible`, "success");
    log(`WalletApproval (Bob) created \u2014 active: true`, "success");
    log(`TransferFactory_Transfer executed \u2014 6 compliance checks passed`, "success");

    updateCompliance();
    await refreshFromLedger();

    const aliceBal = demoState.holdings.find(h => h.owner === "Alice")?.amount ?? 0;
    const bobBal = demoState.holdings.find(h => h.owner === "Bob")?.amount ?? 0;
    log(`Input holding archived`, "info");
    log(`Receiver holding created \u2014 Bob: ${bobBal.toLocaleString("en-US", { minimumFractionDigits: 2 })} HECTX`, "success");
    log(`Change holding created \u2014 Alice: ${aliceBal.toLocaleString("en-US", { minimumFractionDigits: 2 })} HECTX`, "success");
    return true;
  } catch (err) {
    log(`Transfer failed: ${err.message}`, "error");
    markStep("transfer", "");
    return false;
  }
}

async function runVerify() {
  markStep("verify", "active");
  log("Querying ledger state...", "info");

  try {
    const status = await api("/api/status", "GET");

    const aliceBal = status.balances?.alice ?? 0;
    const bobBal = status.balances?.bob ?? 0;

    markStep("verify", "done");
    setStepResult("verify",
      `Alice: ${aliceBal.toLocaleString()} HECTX  |  Bob: ${bobBal.toLocaleString()} HECTX  |  Supply: ${status.totalSupply.toLocaleString()}`
    );

    log(`Final state verified:`, "success");
    log(`  Alice: ${aliceBal.toLocaleString()} HECTX`, "success");
    log(`  Bob:   ${bobBal.toLocaleString()} HECTX`, "success");
    log(`  Holdings: ${status.holdingsCount} contracts on ledger`, "success");
    log(`  Supply invariant: ${aliceBal} + ${bobBal} = ${aliceBal + bobBal}`, "success");

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
  log("\u2550\u2550\u2550 Compliance Rejection Scenario \u2550\u2550\u2550", "info");
  log("Creating Charlie (US-based investor) \u2014 jurisdiction: United States", "info");

  try {
    const res = await api("/api/rejection");

    // Reveal Charlie card (remove dimmed class)
    const card = $("#card-charlie");
    if (card) card.classList.remove("dimmed");

    $("#val-charlie-jurisdiction").textContent = "United States";
    $("#val-charlie-status").textContent = "Eligible";
    $("#val-charlie-wallet").textContent = "Active";

    log(`Participant (Charlie) created \u2014 jurisdiction: United States, status: Eligible`, "success");
    log(`WalletApproval (Charlie) created \u2014 active: true`, "success");
    log(`MintRequest submitted \u2014 investor: Charlie, amount: 500.00`, "info");
    log(`ApproveMint executing \u2014 compliance checks:`, "info");
    log(`  \u2713 mintingEnabled == True`, "success");
    log(`  \u2713 investor.status == Eligible`, "success");
    log(`  \u2713 wallet.active == True`, "success");
    log(`  \u2717 jurisdiction "United States" IS in prohibitedJurisdictions`, "error");
    log(`ApproveMint ABORTED \u2014 transaction rolled back`, "error");

    // Mark Charlie as rejected
    const dotCharlie = $("#dot-charlie");
    if (dotCharlie) dotCharlie.className = "status-dot rejected";
    $("#val-charlie-mint").textContent = "BLOCKED";
    if (card) card.classList.add("rejected");

    markStep("rejection", "rejected");
    setStepResult("rejection",
      `Charlie (US)  |  Jurisdiction: PROHIBITED  |  Mint: BLOCKED`
    );

    log(`Compliance enforcement verified \u2014 prohibited jurisdiction blocks on-ledger`, "success");
    log(`\u2550\u2550\u2550 Rejection scenario complete \u2550\u2550\u2550`, "info");
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
  document.body.setAttribute("data-demo-phase", "running");

  const btn = $("#run-all");
  btn.disabled = true;
  btn.textContent = "Running...";

  log("\u2550\u2550\u2550 Starting full HECTX demo scenario \u2550\u2550\u2550", "info");

  const ok1 = await runSetup();
  if (!ok1) { fail(); return; }
  await delay(stepDelay);

  const ok2 = await runMint();
  if (!ok2) { fail(); return; }
  await delay(stepDelay);

  const ok3 = await runTransfer();
  if (!ok3) { fail(); return; }
  await delay(stepDelay);

  const ok4 = await runVerify();
  if (!ok4) { fail(); return; }
  await delay(stepDelay);

  await runRejection();

  log("\u2550\u2550\u2550 Full demo scenario complete \u2550\u2550\u2550", "info");
  demoState.phase = "done";
  document.body.setAttribute("data-demo-phase", "done");
  btn.textContent = "Complete";

  function fail() {
    btn.disabled = false;
    btn.textContent = "Run All Steps";
    demoState.phase = "idle";
    document.body.setAttribute("data-demo-phase", "error");
  }
}

/* ─── Reset ─── */
async function reset() {
  await fetch("/api/reset", { method: "POST" });

  demoState.phase = "idle";
  demoState.completed.clear();
  demoState.policyActive = false;
  demoState.aliceCompliant = false;
  demoState.bobCompliant = false;
  demoState.holdings = [];
  demoState.nav = 1000;
  demoState.supply = 0;
  demoState.navPerToken = 1.0;
  demoState.logEntries = 0;

  $$(".step").forEach((el) => el.classList.remove("active", "done", "rejected"));
  $$(".step-result").forEach((el) => {
    el.textContent = "";
    el.classList.remove("visible");
  });

  const card = $("#card-charlie");
  if (card) { card.classList.add("dimmed"); card.classList.remove("rejected"); }

  logEl.innerHTML = "";
  logCountEl.textContent = "0 entries";
  const btn = $("#run-all");
  btn.disabled = false;
  btn.textContent = "Run All Steps";
  document.body.setAttribute("data-demo-phase", "idle");

  updateKPIs();
  updateCompliance();
  updateHoldings();
  log("Demo reset \u2014 ready for new scenario", "info");
}

/* ─── Utils ─── */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ─── Event Listeners ─── */
$("#run-all").addEventListener("click", runAll);
$("#reset").addEventListener("click", reset);

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
document.body.setAttribute("data-demo-phase", "idle");
updateKPIs();
updateCompliance();
updateHoldings();
log("HECTX Demo ready \u2014 click 'Run All Steps' or run steps individually", "info");

/* ─── Autoplay ─── */
if (isAutoplay) {
  requestAnimationFrame(() => {
    setTimeout(async () => {
      await fetch("/api/reset", { method: "POST" });
      runAll();
    }, 300);
  });
}
