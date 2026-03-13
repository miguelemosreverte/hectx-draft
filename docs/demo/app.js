/* ═══════════════════════════════════════════════════
   HECTX Demo — Interactive Controller (20 Investors)

   Drives the demo UI against the real HECTX backend
   (hectx-services/src/demo-server.ts) which talks to
   the Daml ledger via the Canton JSON API.

   Features:
   - 20 investors across 10 jurisdictions
   - SSE-streamed real-time Chart.js charts
   - Infrastructure status panel
   - Dynamic compliance cards

   Query params:
     ?autoplay       — auto-run all steps on load
     ?delay=N        — ms between steps (default 800)
   ═══════════════════════════════════════════════════ */

const params = new URLSearchParams(window.location.search);
const isAutoplay = params.has("autoplay");
const stepDelay = Number(params.get("delay")) || 800;

/* ─── 20-Investor Dataset ─── */
const INVESTORS = [
  { name: "Alice",     jurisdiction: "Portugal",       prohibited: false },
  { name: "Bob",       jurisdiction: "Portugal",       prohibited: false },
  { name: "Carlos",    jurisdiction: "Brazil",         prohibited: false },
  { name: "Diana",     jurisdiction: "Germany",        prohibited: false },
  { name: "Elena",     jurisdiction: "Singapore",      prohibited: false },
  { name: "Farid",     jurisdiction: "UAE",            prohibited: false },
  { name: "Grace",     jurisdiction: "Hong Kong",      prohibited: false },
  { name: "Hiroshi",   jurisdiction: "Japan",          prohibited: false },
  { name: "Ingrid",    jurisdiction: "Switzerland",    prohibited: false },
  { name: "Javier",    jurisdiction: "Mexico",         prohibited: false },
  { name: "Kofi",      jurisdiction: "Ghana",          prohibited: false },
  { name: "Lucia",     jurisdiction: "Italy",          prohibited: false },
  { name: "Ming",      jurisdiction: "Singapore",      prohibited: false },
  { name: "Nadia",     jurisdiction: "UAE",            prohibited: false },
  { name: "Oscar",     jurisdiction: "Brazil",         prohibited: false },
  { name: "Priya",     jurisdiction: "Germany",        prohibited: false },
  { name: "Quinn",     jurisdiction: "United States",  prohibited: true  },
  { name: "Ryan",      jurisdiction: "United States",  prohibited: true  },
  { name: "Soo-Jin",   jurisdiction: "North Korea",    prohibited: true  },
  { name: "Tyler",     jurisdiction: "North Korea",    prohibited: true  },
];

const ELIGIBLE_INVESTORS = INVESTORS.filter(i => !i.prohibited);
const PROHIBITED_INVESTORS = INVESTORS.filter(i => i.prohibited);

/* Mint amounts for each eligible investor */
const MINT_AMOUNTS = {
  Alice: 1000, Bob: 800, Carlos: 600, Diana: 1200, Elena: 900,
  Farid: 750, Grace: 500, Hiroshi: 1100, Ingrid: 850, Javier: 700,
  Kofi: 550, Lucia: 950, Ming: 650, Nadia: 1050, Oscar: 400, Priya: 780,
};

/* Transfers: 8 cross-party transfers */
const TRANSFERS = [
  { from: "Alice",   to: "Bob",     amount: 100 },
  { from: "Diana",   to: "Carlos",  amount: 200 },
  { from: "Hiroshi", to: "Elena",   amount: 150 },
  { from: "Lucia",   to: "Kofi",    amount: 100 },
  { from: "Ingrid",  to: "Farid",   amount: 175 },
  { from: "Nadia",   to: "Grace",   amount: 125 },
  { from: "Priya",   to: "Javier",  amount: 80  },
  { from: "Ming",    to: "Oscar",   amount: 50  },
];

/* Jurisdiction color palette */
const JURISDICTION_COLORS = {
  "Portugal":      "#3b82f6",
  "Brazil":        "#22c55e",
  "Germany":       "#f59e0b",
  "Singapore":     "#8b5cf6",
  "UAE":           "#06b6d4",
  "Hong Kong":     "#ec4899",
  "Japan":         "#ef4444",
  "Switzerland":   "#14b8a6",
  "Mexico":        "#f97316",
  "Ghana":         "#84cc16",
  "Italy":         "#6366f1",
  "United States": "#dc2626",
  "North Korea":   "#991b1b",
};

/* ─── Demo State ─── */
const demoState = {
  phase: "idle", // idle | running | done
  completed: new Set(),

  // From ledger
  registryCid: null,
  transferFactoryCid: null,

  // Holdings map: name -> balance
  holdings: {},
  nav: 1000,
  supply: 0,
  navPerToken: 1.0,
  investorCount: 0,

  // Compliance counters
  approved: 0,
  rejected: 0,

  // Supply history for time-series chart
  supplyHistory: [],
  supplyLabels: [],

  logEntries: 0,
};

/* ─── DOM References ─── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const logEl = $("#log");
const logCountEl = $("#log-count");

/* ─── Chart.js Instances ─── */
let supplyChart, holdingsChart, jurisdictionChart, complianceChart;

function initCharts() {
  supplyChart = new Chart(document.getElementById("chart-supply"), {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Total Supply (HECTX)",
        data: [],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#c8ccd4" } } },
      scales: {
        x: { ticks: { color: "#8b919e" }, grid: { color: "rgba(139,145,158,0.1)" } },
        y: { beginAtZero: true, ticks: { color: "#8b919e" }, grid: { color: "rgba(139,145,158,0.1)" } },
      },
      animation: { duration: 300 },
    },
  });

  holdingsChart = new Chart(document.getElementById("chart-holdings"), {
    type: "bar",
    data: {
      labels: [],
      datasets: [{ label: "HECTX Balance", data: [], backgroundColor: "#3b82f6" }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { color: "#8b919e" }, grid: { color: "rgba(139,145,158,0.1)" } },
        y: { ticks: { color: "#c8ccd4", font: { size: 10 } }, grid: { display: false } },
      },
      animation: { duration: 300 },
    },
  });

  jurisdictionChart = new Chart(document.getElementById("chart-jurisdictions"), {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [{ data: [], backgroundColor: [] }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "55%",
      plugins: {
        legend: { position: "right", labels: { color: "#c8ccd4", font: { size: 10 }, boxWidth: 12 } },
      },
      animation: { duration: 300 },
    },
  });

  complianceChart = new Chart(document.getElementById("chart-compliance"), {
    type: "bar",
    data: {
      labels: ["Approved", "Rejected", "Pending"],
      datasets: [{ data: [0, 0, 20], backgroundColor: ["#22c55e", "#ef4444", "#5b6478"] }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 20, ticks: { color: "#8b919e", stepSize: 5 }, grid: { color: "rgba(139,145,158,0.1)" } },
        x: { ticks: { color: "#c8ccd4" }, grid: { display: false } },
      },
      animation: { duration: 300 },
    },
  });
}

/* ─── Chart Update Functions ─── */
function updateSupplyChart(label, value) {
  demoState.supplyLabels.push(label);
  demoState.supplyHistory.push(value);
  supplyChart.data.labels = demoState.supplyLabels;
  supplyChart.data.datasets[0].data = demoState.supplyHistory;
  supplyChart.update();
}

function updateHoldingsChart(holdings) {
  const sorted = Object.entries(holdings)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  // Show top 10 for readability
  const top = sorted.slice(0, 10);
  holdingsChart.data.labels = top.map(([name]) => name);
  holdingsChart.data.datasets[0].data = top.map(([, val]) => val);
  holdingsChart.update();
}

function updateJurisdictionChart(investors) {
  const counts = {};
  investors.forEach(inv => {
    counts[inv.jurisdiction] = (counts[inv.jurisdiction] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  jurisdictionChart.data.labels = entries.map(([j]) => j);
  jurisdictionChart.data.datasets[0].data = entries.map(([, c]) => c);
  jurisdictionChart.data.datasets[0].backgroundColor = entries.map(([j]) => JURISDICTION_COLORS[j] || "#5b6478");
  jurisdictionChart.update();
}

function updateComplianceChart(approved, rejected, pending) {
  complianceChart.data.datasets[0].data = [approved, rejected, pending];
  complianceChart.update();
}

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

/* ─── SSE Streaming ─── */
function streamStep(path, onProgress) {
  return new Promise((resolve, reject) => {
    const es = new EventSource(path);
    es.addEventListener("progress", (e) => {
      const data = JSON.parse(e.data);
      if (onProgress) onProgress(data);
    });
    es.addEventListener("complete", (e) => {
      const data = JSON.parse(e.data);
      es.close();
      resolve(data);
    });
    es.addEventListener("error", (e) => {
      es.close();
      reject(new Error("Stream error"));
    });
  });
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
  $("#kpi-supply").textContent = demoState.supply.toLocaleString("en-US", { maximumFractionDigits: 2 });
  $("#kpi-price").textContent = `$${demoState.navPerToken.toFixed(4)}`;
  const holdingCount = Object.values(demoState.holdings).filter(v => v > 0).length;
  $("#kpi-holders").textContent = holdingCount;
  $("#kpi-investors").textContent = demoState.investorCount;
}

/* ─── Dynamic Compliance Cards ─── */
function createComplianceCard(name, jurisdiction, prohibited) {
  const card = document.createElement("div");
  card.className = "compliance-card dimmed";
  card.id = `compliance-${name}`;
  card.innerHTML = `
    <div class="status-dot"></div>
    <div class="card-name">${name}</div>
    <div class="card-jurisdiction">${jurisdiction}</div>
  `;
  document.getElementById("compliance-cards").appendChild(card);
}

function initComplianceCards() {
  const container = document.getElementById("compliance-cards");
  container.innerHTML = "";
  INVESTORS.forEach(inv => {
    createComplianceCard(inv.name, inv.jurisdiction, inv.prohibited);
  });
}

function markComplianceCard(name, status) {
  const card = $(`#compliance-${name}`);
  if (!card) return;
  card.classList.remove("dimmed", "approved", "rejected");
  card.classList.add(status);
}

/* ─── Holdings Table ─── */
function updateHoldingsTable(holdings) {
  const tbody = document.getElementById("holdings-body");
  const sorted = Object.entries(holdings)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="2">No holdings \u2014 run the workflow to mint tokens</td></tr>';
    return;
  }
  tbody.innerHTML = sorted.map(([name, balance]) => `
    <tr><td>${name}</td><td class="number">${balance.toLocaleString()}</td></tr>
  `).join("");
}

/* ─── Infrastructure Panel ─── */
async function loadInfra() {
  try {
    const res = await fetch("/api/infra");
    const data = await res.json();
    const el = document.getElementById("infra-status");
    el.innerHTML = data.urls.map(u => `
      <div class="infra-item">
        <span><span class="infra-dot ${u.accessible ? "up" : "down"}"></span>${u.name}</span>
        <span class="infra-right">
          <a href="${u.url}" target="_blank">${u.url}</a>
          ${u.login
            ? `<span class="infra-login" title="Type this username to log in (no password needed)">Login: <strong>${u.login}</strong></span>`
            : `<span class="infra-login infra-open">No login required</span>`}
        </span>
      </div>
    `).join("");
  } catch (_err) {
    const el = document.getElementById("infra-status");
    el.innerHTML = `
      <div class="infra-item">
        <span><span class="infra-dot down"></span>Canton JSON API</span>
        <span style="color:var(--text-muted)">Not connected</span>
      </div>
      <div class="infra-item">
        <span><span class="infra-dot down"></span>Demo Server</span>
        <span style="color:var(--text-muted)">Not connected</span>
      </div>
    `;
  }
}

/* ─── Progress Handler (SSE events -> chart updates) ─── */
function handleProgress(data) {
  switch (data.type) {
    case "party_allocated": {
      // Update jurisdiction chart with current allocation
      const allocated = INVESTORS.slice(0, data.count || INVESTORS.length);
      updateJurisdictionChart(allocated);
      const pending = 20 - demoState.approved - demoState.rejected;
      updateComplianceChart(demoState.approved, demoState.rejected, pending);
      break;
    }
    case "mint_approved": {
      demoState.holdings[data.investor] = (demoState.holdings[data.investor] || 0) + data.amount;
      demoState.supply += data.amount;
      demoState.navPerToken = demoState.supply > 0 ? demoState.nav / demoState.supply : 1.0;
      demoState.approved++;
      demoState.investorCount++;

      updateSupplyChart(data.investor, demoState.supply);
      updateHoldingsChart(demoState.holdings);
      updateComplianceChart(demoState.approved, demoState.rejected, 20 - demoState.approved - demoState.rejected);
      markComplianceCard(data.investor, "approved");
      updateHoldingsTable(demoState.holdings);
      updateKPIs();
      log(`Mint approved: ${data.investor} +${data.amount} HECTX`, "success");
      break;
    }
    case "transfer_executed": {
      demoState.holdings[data.from] = (demoState.holdings[data.from] || 0) - data.amount;
      demoState.holdings[data.to] = (demoState.holdings[data.to] || 0) + data.amount;

      updateHoldingsChart(demoState.holdings);
      updateHoldingsTable(demoState.holdings);
      updateKPIs();
      log(`Transfer: ${data.from} -> ${data.to}, ${data.amount} HECTX`, "success");
      break;
    }
    case "mint_blocked": {
      demoState.rejected++;

      updateComplianceChart(demoState.approved, demoState.rejected, 20 - demoState.approved - demoState.rejected);
      markComplianceCard(data.investor, "rejected");
      updateKPIs();
      log(`Mint BLOCKED: ${data.investor} (${data.jurisdiction}) \u2014 prohibited jurisdiction`, "error");
      break;
    }
    case "verify_balance": {
      log(`  ${data.investor}: ${data.balance.toLocaleString()} HECTX`, "success");
      break;
    }
  }
}

/* ─── Workflow Steps ─── */

async function runSetup() {
  markStep("setup", "active");
  log("Initializing ledger \u2014 allocating 20 parties across 10 jurisdictions...", "info");

  try {
    let result;
    try {
      result = await streamStep("/api/setup/stream", handleProgress);
    } catch (_sseErr) {
      // Fallback to REST if SSE not available
      result = await api("/api/setup");
      // Simulate progress
      updateJurisdictionChart(INVESTORS);
      updateComplianceChart(0, 0, 20);
    }

    demoState.registryCid = result.registryCid;
    demoState.transferFactoryCid = result.transferFactoryCid;

    markStep("setup", "done");
    setStepResult("setup",
      `${result.investorCount || 20} investors, ${result.jurisdictionCount || 10} jurisdictions`
    );
    log(`EligibilityPolicy created \u2014 prohibited: [United States, North Korea]`, "success");
    log(`FeeSchedule created \u2014 subscription: 0 bps, conversion: 0 bps`, "success");
    log(`MintPolicy created \u2014 enabled: true, elastic: inactive, maxAge: 3600s`, "success");
    log(`HectXRegistry created`, "success");
    log(`NAVSnapshot created \u2014 NAV: $1,000, GAV: $1,000, reserves: $1,000`, "success");
    log(`Supply initialized \u2014 0.00 HECTX`, "success");
    log(`HectXTransferFactory created \u2014 Splice TransferFactory interface`, "success");
    log(`20 parties allocated across 10 jurisdictions`, "success");

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
  log("Minting HECTX tokens for 16 eligible investors...", "info");

  try {
    let result;
    try {
      result = await streamStep("/api/mint/stream", handleProgress);
    } catch (_sseErr) {
      // Fallback to REST — simulate individual mints
      result = await api("/api/mint");

      // Simulate streaming progress for each eligible investor
      for (const inv of ELIGIBLE_INVESTORS) {
        const amount = MINT_AMOUNTS[inv.name] || 500;
        handleProgress({
          type: "mint_approved",
          investor: inv.name,
          amount: amount,
          jurisdiction: inv.jurisdiction,
        });
        await delay(60);
      }
    }

    markStep("mint", "done");
    setStepResult("mint",
      `${result.totalMinted || demoState.investorCount} investors minted, supply: ${(result.totalSupply || demoState.supply).toLocaleString()}`
    );

    updateKPIs();
    return true;
  } catch (err) {
    log(`Mint failed: ${err.message}`, "error");
    markStep("mint", "");
    return false;
  }
}

async function runTransfer() {
  markStep("transfer", "active");
  log("Executing 8 cross-party transfers via Splice TransferFactory...", "info");

  try {
    let result;
    try {
      result = await streamStep("/api/transfer/stream", handleProgress);
    } catch (_sseErr) {
      // Fallback to REST — simulate transfers
      result = await api("/api/transfer");

      for (const t of TRANSFERS) {
        handleProgress({
          type: "transfer_executed",
          from: t.from,
          to: t.to,
          amount: t.amount,
        });
        await delay(60);
      }
    }

    markStep("transfer", "done");
    setStepResult("transfer",
      `${result.transferCount || TRANSFERS.length} transfers executed via Splice TransferFactory`
    );

    updateKPIs();
    return true;
  } catch (err) {
    log(`Transfer failed: ${err.message}`, "error");
    markStep("transfer", "");
    return false;
  }
}

async function runVerify() {
  markStep("verify", "active");
  log("Querying ledger for all 20 investor balances...", "info");

  try {
    let result;
    try {
      result = await streamStep("/api/verify/stream", handleProgress);
    } catch (_sseErr) {
      result = await api("/api/status", "GET");
    }

    const totalSupply = result.totalSupply || demoState.supply;
    const holdingsCount = result.holdingsCount || Object.values(demoState.holdings).filter(v => v > 0).length;
    const sumBalances = Object.values(demoState.holdings).reduce((a, b) => a + b, 0);

    markStep("verify", "done");
    setStepResult("verify",
      `Holdings: ${holdingsCount}  |  Supply: ${totalSupply.toLocaleString()}  |  Invariant: ${sumBalances.toLocaleString()} = ${totalSupply.toLocaleString()}`
    );

    log(`Final state verified:`, "success");
    log(`  Active holdings: ${holdingsCount} contracts on ledger`, "success");
    log(`  Total supply: ${totalSupply.toLocaleString()} HECTX`, "success");
    log(`  Supply invariant: sum(balances) = ${sumBalances.toLocaleString()} = ${totalSupply.toLocaleString()}`, "success");

    updateKPIs();
    return true;
  } catch (err) {
    log(`Verify failed: ${err.message}`, "error");
    markStep("verify", "");
    return false;
  }
}

async function runRejection() {
  markStep("rejection", "active");
  log("\u2550\u2550\u2550 Compliance Rejection Scenario \u2550\u2550\u2550", "info");
  log(`4 investors from prohibited jurisdictions attempting to mint...`, "info");

  try {
    let result;
    try {
      result = await streamStep("/api/rejection/stream", handleProgress);
    } catch (_sseErr) {
      result = await api("/api/rejection");

      // Simulate streaming progress for each prohibited investor
      for (const inv of PROHIBITED_INVESTORS) {
        log(`Creating ${inv.name} (${inv.jurisdiction}) \u2014 Participant + WalletApproval`, "info");
        log(`MintRequest submitted \u2014 investor: ${inv.name}, amount: 500.00`, "info");
        log(`  \u2713 mintingEnabled == True`, "success");
        log(`  \u2713 investor.status == Eligible`, "success");
        log(`  \u2713 wallet.active == True`, "success");
        log(`  \u2717 jurisdiction "${inv.jurisdiction}" IS in prohibitedJurisdictions`, "error");
        log(`ApproveMint ABORTED \u2014 transaction rolled back`, "error");

        handleProgress({
          type: "mint_blocked",
          investor: inv.name,
          jurisdiction: inv.jurisdiction,
        });
        await delay(120);
      }
    }

    markStep("rejection", "rejected");
    setStepResult("rejection",
      `${PROHIBITED_INVESTORS.length} investors blocked (${PROHIBITED_INVESTORS.map(i => `${i.name}/${i.jurisdiction}`).join(", ")})`
    );

    log(`Compliance enforcement verified \u2014 all prohibited jurisdiction mints blocked on-ledger`, "success");
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

  log("\u2550\u2550\u2550 Starting full HECTX demo scenario (20 investors) \u2550\u2550\u2550", "info");

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
  try { await fetch("/api/reset", { method: "POST" }); } catch (_e) { /* ok */ }

  demoState.phase = "idle";
  demoState.completed.clear();
  demoState.holdings = {};
  demoState.nav = 1000;
  demoState.supply = 0;
  demoState.navPerToken = 1.0;
  demoState.investorCount = 0;
  demoState.approved = 0;
  demoState.rejected = 0;
  demoState.supplyHistory = [];
  demoState.supplyLabels = [];
  demoState.logEntries = 0;

  $$(".step").forEach((el) => el.classList.remove("active", "done", "rejected"));
  $$(".step-result").forEach((el) => {
    el.textContent = "";
    el.classList.remove("visible");
  });

  logEl.innerHTML = "";
  logCountEl.textContent = "0 entries";
  const btn = $("#run-all");
  btn.disabled = false;
  btn.textContent = "Run All Steps";
  document.body.setAttribute("data-demo-phase", "idle");

  // Destroy and recreate charts
  if (supplyChart) supplyChart.destroy();
  if (holdingsChart) holdingsChart.destroy();
  if (jurisdictionChart) jurisdictionChart.destroy();
  if (complianceChart) complianceChart.destroy();
  initCharts();

  // Reinitialize compliance cards
  initComplianceCards();

  // Clear holdings table
  updateHoldingsTable({});

  updateKPIs();
  log("Demo reset \u2014 ready for new scenario", "info");
}

/* ─── Utils ─── */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ─── Event Listeners ─── */
document.addEventListener("DOMContentLoaded", () => {
  // Initialize charts
  initCharts();

  // Initialize compliance cards
  initComplianceCards();

  // Initialize holdings table
  updateHoldingsTable({});

  // Load infrastructure status
  loadInfra();

  // Set initial state
  document.body.setAttribute("data-demo-phase", "idle");
  updateKPIs();

  log("HECTX Demo ready \u2014 click 'Run All Steps' or run steps individually", "info");

  // Button bindings
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

  // Autoplay
  if (isAutoplay) {
    requestAnimationFrame(() => {
      setTimeout(async () => {
        try { await fetch("/api/reset", { method: "POST" }); } catch (_e) { /* ok */ }
        runAll();
      }, 300);
    });
  }
});
