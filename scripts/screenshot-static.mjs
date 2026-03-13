#!/usr/bin/env node
/**
 * Screenshot the demo UI served as static files (no backend needed).
 * Uses a simple HTTP server to render and capture the UI.
 * Session 4: Added rejection scenario capture.
 */

import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEMO_DIR = path.join(ROOT, "docs", "demo");
const OUT_DIR = path.join(ROOT, "sessions", "screenshots");

fs.mkdirSync(OUT_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

// Simple static file server
function startStaticServer(dir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // For API calls, return mock data
      if (req.url.startsWith("/api/")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ready: false }));
        return;
      }
      const filePath = path.join(dir, req.url === "/" ? "index.html" : req.url);
      const ext = path.extname(filePath);
      const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" };
      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": types[ext] || "text/plain" });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(port, () => resolve(server));
  });
}

// Inject the completed happy-path state
function injectCompletedState() {
  // Mark steps 1-4 as done
  ["setup", "mint", "transfer", "verify"].forEach(name => {
    const el = document.querySelector(`#step-${name}`);
    if (el) el.classList.add("done");
  });

  // Policy compliance
  const dotPolicy = document.querySelector("#dot-policy");
  if (dotPolicy) dotPolicy.className = "status-dot active";
  document.querySelector("#val-prohibited").textContent = "United States";
  document.querySelector("#val-restricted").textContent = "BR, EEA, HK, MY, SG, CH, UK";

  // Alice compliance
  const dotAlice = document.querySelector("#dot-alice");
  if (dotAlice) dotAlice.className = "status-dot active";
  document.querySelector("#val-alice-jurisdiction").textContent = "Portugal";
  document.querySelector("#val-alice-status").textContent = "Eligible";
  document.querySelector("#val-alice-wallet").textContent = "Active";

  // Bob compliance
  const dotBob = document.querySelector("#dot-bob");
  if (dotBob) dotBob.className = "status-dot active";
  document.querySelector("#val-bob-jurisdiction").textContent = "Portugal";
  document.querySelector("#val-bob-status").textContent = "Eligible";
  document.querySelector("#val-bob-wallet").textContent = "Active";

  // Step results
  const results = {
    setup: "Registry:  #1:0\nFactory:   #7:0",
    mint: "MintRequest: #8:0\nOutcome:     Minted\nAmount:      1,000.00 HECTX\nNAV/token:   $1.0000\nFees:        sub: 0 bps, conv: 0 bps, elastic: N/A",
    transfer: "Interface:   TransferFactory_Transfer (Splice)\nSender:      Alice \u2192 Bob\nAmount:      100.00 HECTX\nCompliance:  6 checks passed (incl. jurisdiction)",
    verify: "Alice balance:   900 HECTX\nBob balance:     100 HECTX\nHoldings count:  2\nTotal supply:    1,000 HECTX"
  };

  for (const [name, text] of Object.entries(results)) {
    const detail = document.querySelector(`#detail-${name}`);
    if (detail) {
      const r = document.createElement("div");
      r.className = "step-result";
      r.textContent = text;
      detail.appendChild(r);
    }
  }

  // Green contract tags on completed steps
  document.querySelectorAll(".step.done .contract-tag").forEach(t => {
    t.style.borderColor = "rgba(34, 197, 94, 0.25)";
    t.style.color = "#22c55e";
    t.style.background = "rgba(34, 197, 94, 0.1)";
  });

  // KPIs
  document.querySelector("#kpi-nav").textContent = "$1,000.00";
  document.querySelector("#kpi-supply").textContent = "1,000";
  document.querySelector("#kpi-price").textContent = "$1.0000";
  document.querySelector("#kpi-holders").textContent = "2";

  // Holdings table
  const tbody = document.querySelector("#holdings-body");
  tbody.innerHTML = `
    <tr>
      <td>Alice</td>
      <td class="amount-cell">900.00</td>
      <td><span class="contract-tag" style="border-color:rgba(34,197,94,0.25);color:#22c55e;background:rgba(34,197,94,0.1)">HECTX</span></td>
      <td><span class="status-pill implemented">Active</span></td>
    </tr>
    <tr>
      <td>Bob</td>
      <td class="amount-cell">100.00</td>
      <td><span class="contract-tag" style="border-color:rgba(34,197,94,0.25);color:#22c55e;background:rgba(34,197,94,0.1)">HECTX</span></td>
      <td><span class="status-pill implemented">Active</span></td>
    </tr>`;

  // Run-all button
  const btn = document.querySelector("#run-all");
  btn.textContent = "Complete";
  btn.disabled = true;

  // Log entries
  const logEl = document.querySelector("#log");
  const entries = [
    { msg: "\u2550\u2550\u2550 Starting full HECTX demo scenario \u2550\u2550\u2550", cls: "log-info" },
    { msg: "Initializing ledger \u2014 creating policies, compliance records, and factory...", cls: "log-info" },
    { msg: "EligibilityPolicy created \u2014 prohibited: [United States]", cls: "log-success" },
    { msg: "FeeSchedule created \u2014 subscription: 0 bps, conversion: 0 bps", cls: "log-success" },
    { msg: "MintPolicy created \u2014 enabled: true, elastic: inactive, maxAge: 3600s", cls: "log-success" },
    { msg: "HectXRegistry created \u2014 CID: #1:0", cls: "log-success" },
    { msg: "NAVSnapshot created \u2014 NAV: $1,000, GAV: $1,000, reserves: $1,000", cls: "log-success" },
    { msg: "HectXTransferFactory created \u2014 Splice TransferFactory interface", cls: "log-success" },
    { msg: "Participant (Alice) created \u2014 jurisdiction: Portugal, status: Eligible", cls: "log-success" },
    { msg: "WalletApproval (Alice) created \u2014 active: true", cls: "log-success" },
    { msg: "MintRequest submitted \u2014 investor: Alice, amount: 1,000.00", cls: "log-info" },
    { msg: "ApproveMint executed \u2014 7 compliance checks passed:", cls: "log-success" },
    { msg: "  \u2713 mintingEnabled == True", cls: "log-success" },
    { msg: "  \u2713 investor.status == Eligible", cls: "log-success" },
    { msg: "  \u2713 wallet.active == True", cls: "log-success" },
    { msg: '  \u2713 jurisdiction "Portugal" not in prohibitedJurisdictions', cls: "log-success" },
    { msg: "  \u2713 NAV age \u2264 3600s", cls: "log-success" },
    { msg: "  \u2713 fees computed (sub: 0 bps, conv: 0 bps, elastic: N/A)", cls: "log-success" },
    { msg: "  \u2713 netAmount = 1,000.00 > 0", cls: "log-success" },
    { msg: "HectXHolding created \u2014 Alice: 1,000.00 HECTX", cls: "log-success" },
    { msg: "Supply updated \u2014 0 \u2192 1,000.00", cls: "log-info" },
    { msg: "Participant (Bob) created \u2014 jurisdiction: Portugal, status: Eligible", cls: "log-success" },
    { msg: "WalletApproval (Bob) created \u2014 active: true", cls: "log-success" },
    { msg: "TransferFactory_Transfer executed \u2014 6 compliance checks passed:", cls: "log-success" },
    { msg: "  \u2713 sender.status == Eligible", cls: "log-success" },
    { msg: "  \u2713 receiver.status == Eligible", cls: "log-success" },
    { msg: "  \u2713 sender wallet active", cls: "log-success" },
    { msg: "  \u2713 receiver wallet active", cls: "log-success" },
    { msg: '  \u2713 sender jurisdiction "Portugal" not prohibited', cls: "log-success" },
    { msg: '  \u2713 receiver jurisdiction "Portugal" not prohibited', cls: "log-success" },
    { msg: "Input holding archived \u2014 Alice: 1,000.00", cls: "log-info" },
    { msg: "Receiver holding created \u2014 Bob: 100.00 HECTX", cls: "log-success" },
    { msg: "Change holding created \u2014 Alice: 900.00 HECTX", cls: "log-success" },
    { msg: "Final state verified:", cls: "log-success" },
    { msg: "  Alice: 900 HECTX", cls: "log-success" },
    { msg: "  Bob:   100 HECTX", cls: "log-success" },
    { msg: "  Holdings: 2 contracts on ledger", cls: "log-success" },
    { msg: "  Supply invariant: 900 + 100 = 1000 \u2713", cls: "log-success" },
  ];
  logEl.innerHTML = "";
  entries.forEach(e => {
    const div = document.createElement("div");
    div.innerHTML = `<span class="log-time">[14:30:00]</span> <span class="${e.cls}">${e.msg}</span>`;
    logEl.appendChild(div);
  });
  document.querySelector("#log-count").textContent = `${entries.length} entries`;
}

// Inject the rejection scenario on top of completed state
function injectRejectionScenario() {
  // Mark step 5 as rejected
  const rejEl = document.querySelector("#step-rejection");
  if (rejEl) rejEl.classList.add("rejected");

  // Show Charlie card
  const card = document.querySelector("#card-charlie");
  if (card) {
    card.style.display = "";
    card.classList.add("rejected");
  }

  // Charlie compliance data
  const dotCharlie = document.querySelector("#dot-charlie");
  if (dotCharlie) dotCharlie.className = "status-dot rejected";
  document.querySelector("#val-charlie-jurisdiction").textContent = "United States";
  document.querySelector("#val-charlie-status").textContent = "Eligible";
  document.querySelector("#val-charlie-wallet").textContent = "Active";
  document.querySelector("#val-charlie-mint").textContent = "BLOCKED";

  // Step result
  const detail = document.querySelector("#detail-rejection");
  if (detail) {
    const r = document.createElement("div");
    r.className = "step-result";
    r.textContent = "Investor:    Charlie (US)\nJurisdiction: United States\nPolicy check: FAILED \u2014 prohibited jurisdiction\nOutcome:     MintRequest REJECTED\nTokens:      0 (no change to supply)";
    detail.appendChild(r);
    detail.querySelectorAll(".contract-tag").forEach(t => {
      t.style.borderColor = "rgba(239, 68, 68, 0.25)";
      t.style.color = "#ef4444";
      t.style.background = "rgba(239, 68, 68, 0.08)";
    });
  }

  // Add rejection log entries
  const logEl = document.querySelector("#log");
  const entries = [
    { msg: "\u2550\u2550\u2550 Compliance Rejection Scenario \u2550\u2550\u2550", cls: "log-info" },
    { msg: "Creating Charlie (US-based investor) \u2014 jurisdiction: United States", cls: "log-info" },
    { msg: "Participant (Charlie) created \u2014 jurisdiction: United States, status: Eligible", cls: "log-success" },
    { msg: "WalletApproval (Charlie) created \u2014 active: true", cls: "log-success" },
    { msg: "MintRequest submitted \u2014 investor: Charlie, amount: 500.00", cls: "log-info" },
    { msg: "ApproveMint executing \u2014 compliance checks:", cls: "log-info" },
    { msg: "  \u2713 mintingEnabled == True", cls: "log-success" },
    { msg: "  \u2713 investor.status == Eligible", cls: "log-success" },
    { msg: "  \u2713 wallet.active == True", cls: "log-success" },
    { msg: '  \u2717 jurisdiction "United States" IS in prohibitedJurisdictions', cls: "log-error" },
    { msg: 'ApproveMint ABORTED \u2014 "investor jurisdiction prohibited"', cls: "log-error" },
    { msg: "MintRequest rolled back \u2014 no tokens minted, no supply change", cls: "log-error" },
    { msg: "Compliance enforcement verified \u2014 prohibited jurisdiction blocks on-ledger", cls: "log-success" },
    { msg: "\u2550\u2550\u2550 Full demo scenario complete \u2550\u2550\u2550", cls: "log-info" },
  ];
  entries.forEach(e => {
    const div = document.createElement("div");
    div.innerHTML = `<span class="log-time">[14:30:05]</span> <span class="${e.cls}">${e.msg}</span>`;
    logEl.appendChild(div);
  });

  // Update log count
  const currentCount = parseInt(document.querySelector("#log-count").textContent) || 0;
  document.querySelector("#log-count").textContent = `${currentCount + entries.length} entries`;
}

async function main() {
  const PORT = 9876;
  const server = await startStaticServer(DEMO_DIR, PORT);
  console.log(`Static server on port ${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  try {
    // 1. Initial state
    console.log("1. Capturing initial state...");
    await page.goto(`http://localhost:${PORT}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `${timestamp}_01-initial.png`), fullPage: true });
    console.log(`   -> ${timestamp}_01-initial.png`);

    // 2. Simulate completed happy-path state
    console.log("2. Simulating completed demo state...");
    await page.evaluate(injectCompletedState);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `${timestamp}_02-completed.png`), fullPage: true });
    console.log(`   -> ${timestamp}_02-completed.png`);

    // 3. Architecture table close-up
    console.log("3. Capturing architecture decision table...");
    const archPanel = page.locator("#panel-architecture");
    await archPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await archPanel.screenshot({ path: path.join(OUT_DIR, `${timestamp}_03-architecture-table.png`) });
    console.log(`   -> ${timestamp}_03-architecture-table.png`);

    // 4. Compliance panel close-up
    console.log("4. Capturing compliance panel...");
    const compPanel = page.locator("#panel-compliance");
    await compPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await compPanel.screenshot({ path: path.join(OUT_DIR, `${timestamp}_04-compliance-panel.png`) });
    console.log(`   -> ${timestamp}_04-compliance-panel.png`);

    // 5. Holdings table close-up
    console.log("5. Capturing holdings table...");
    const holdingsPanel = page.locator("#panel-holdings");
    await holdingsPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await holdingsPanel.screenshot({ path: path.join(OUT_DIR, `${timestamp}_05-holdings-table.png`) });
    console.log(`   -> ${timestamp}_05-holdings-table.png`);

    // 6. Inject rejection scenario
    console.log("6. Simulating rejection scenario...");
    await page.evaluate(injectRejectionScenario);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `${timestamp}_06-rejection-full.png`), fullPage: true });
    console.log(`   -> ${timestamp}_06-rejection-full.png`);

    // 7. Rejection step close-up
    console.log("7. Capturing rejection step close-up...");
    const rejStep = page.locator("#step-rejection");
    await rejStep.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await rejStep.screenshot({ path: path.join(OUT_DIR, `${timestamp}_07-rejection-step.png`) });
    console.log(`   -> ${timestamp}_07-rejection-step.png`);

    // 8. Compliance panel with Charlie rejected
    console.log("8. Capturing compliance panel with rejection...");
    await compPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await compPanel.screenshot({ path: path.join(OUT_DIR, `${timestamp}_08-compliance-rejection.png`) });
    console.log(`   -> ${timestamp}_08-compliance-rejection.png`);

    console.log(`\nAll ${8} screenshots captured successfully.`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    try {
      await page.screenshot({ path: path.join(OUT_DIR, `${timestamp}_error.png`), fullPage: true });
      console.log(`   -> error screenshot saved`);
    } catch (_) {}
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
}

main();
