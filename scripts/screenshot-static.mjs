#!/usr/bin/env node
/**
 * Screenshot the demo UI served as static files (no backend needed).
 * Uses a simple file:// protocol to render and capture the UI.
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
      if (req.url === "/api/status") {
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

    // 2. Simulate completed state by injecting JS
    console.log("2. Simulating completed demo state...");
    await page.evaluate(() => {
      // Simulate setup done
      const setupEl = document.querySelector("#step-setup");
      if (setupEl) setupEl.classList.add("done");
      const dotPolicy = document.querySelector("#dot-policy");
      if (dotPolicy) dotPolicy.className = "status-dot active";
      document.querySelector("#val-prohibited").textContent = "United States";
      document.querySelector("#val-restricted").textContent = "BR, EEA, HK, MY, SG, CH, UK";

      // Setup result
      const detailSetup = document.querySelector("#detail-setup");
      if (detailSetup) {
        const r = document.createElement("div");
        r.className = "step-result";
        r.textContent = "Registry:  #1:0\nFactory:   #7:0";
        detailSetup.appendChild(r);
        detailSetup.querySelectorAll(".contract-tag").forEach(t => {
          t.style.borderColor = "rgba(34, 197, 94, 0.25)";
          t.style.color = "#22c55e";
          t.style.background = "rgba(34, 197, 94, 0.1)";
        });
      }

      // Simulate mint done
      const mintEl = document.querySelector("#step-mint");
      if (mintEl) mintEl.classList.add("done");
      const dotAlice = document.querySelector("#dot-alice");
      if (dotAlice) dotAlice.className = "status-dot active";
      document.querySelector("#val-alice-jurisdiction").textContent = "Portugal";
      document.querySelector("#val-alice-status").textContent = "Eligible";
      document.querySelector("#val-alice-wallet").textContent = "Active";

      const detailMint = document.querySelector("#detail-mint");
      if (detailMint) {
        const r = document.createElement("div");
        r.className = "step-result";
        r.textContent = "MintRequest: #8:0\nOutcome:     Minted\nAmount:      1,000.00 HECTX\nNAV/token:   $1.0000";
        detailMint.appendChild(r);
        detailMint.querySelectorAll(".contract-tag").forEach(t => {
          t.style.borderColor = "rgba(34, 197, 94, 0.25)";
          t.style.color = "#22c55e";
          t.style.background = "rgba(34, 197, 94, 0.1)";
        });
      }

      // Simulate transfer done
      const transferEl = document.querySelector("#step-transfer");
      if (transferEl) transferEl.classList.add("done");
      const dotBob = document.querySelector("#dot-bob");
      if (dotBob) dotBob.className = "status-dot active";
      document.querySelector("#val-bob-jurisdiction").textContent = "Portugal";
      document.querySelector("#val-bob-status").textContent = "Eligible";
      document.querySelector("#val-bob-wallet").textContent = "Active";

      const detailTransfer = document.querySelector("#detail-transfer");
      if (detailTransfer) {
        const r = document.createElement("div");
        r.className = "step-result";
        r.textContent = "Interface:   TransferFactory_Transfer (Splice)\nSender:      Alice → Bob\nAmount:      100.00 HECTX\nCompliance:  4 checks passed";
        detailTransfer.appendChild(r);
        detailTransfer.querySelectorAll(".contract-tag").forEach(t => {
          t.style.borderColor = "rgba(34, 197, 94, 0.25)";
          t.style.color = "#22c55e";
          t.style.background = "rgba(34, 197, 94, 0.1)";
        });
      }

      // Simulate verify done
      const verifyEl = document.querySelector("#step-verify");
      if (verifyEl) verifyEl.classList.add("done");
      const detailVerify = document.querySelector("#detail-verify");
      if (detailVerify) {
        const r = document.createElement("div");
        r.className = "step-result";
        r.textContent = "Alice balance:   900 HECTX\nBob balance:     100 HECTX\nHoldings count:  2\nTotal supply:    1,000 HECTX";
        detailVerify.appendChild(r);
      }

      // Update KPIs
      document.querySelector("#kpi-nav").textContent = "$1,000.00";
      document.querySelector("#kpi-supply").textContent = "1,000";
      document.querySelector("#kpi-price").textContent = "$1.0000";
      document.querySelector("#kpi-holders").textContent = "2";

      // Update holdings table
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

      // Update run-all button
      const btn = document.querySelector("#run-all");
      btn.textContent = "Complete";
      btn.disabled = true;

      // Add log entries
      const logEl = document.querySelector("#log");
      const entries = [
        { msg: "═══ Starting full HECTX demo scenario ═══", cls: "log-info" },
        { msg: "Initializing ledger — creating policies, compliance records, and factory...", cls: "log-info" },
        { msg: "EligibilityPolicy created — prohibited: [United States]", cls: "log-success" },
        { msg: "FeeSchedule created — subscription: 0 bps, conversion: 0 bps", cls: "log-success" },
        { msg: "MintPolicy created — enabled: true, elastic: inactive, maxAge: 3600s", cls: "log-success" },
        { msg: "HectXRegistry created — CID: #1:0", cls: "log-success" },
        { msg: "NAVSnapshot created — NAV: $1,000, GAV: $1,000, reserves: $1,000", cls: "log-success" },
        { msg: "HectXTransferFactory created — Splice TransferFactory interface", cls: "log-success" },
        { msg: "Participant (Alice) created — jurisdiction: Portugal, status: Eligible", cls: "log-success" },
        { msg: "WalletApproval (Alice) created — active: true", cls: "log-success" },
        { msg: "MintRequest submitted — investor: Alice, amount: 1,000.00", cls: "log-info" },
        { msg: "ApproveMint executed — 6 compliance checks passed:", cls: "log-success" },
        { msg: "  ✓ mintingEnabled == True", cls: "log-success" },
        { msg: "  ✓ investor.status == Eligible", cls: "log-success" },
        { msg: "  ✓ wallet.active == True", cls: "log-success" },
        { msg: "  ✓ NAV age ≤ 3600s", cls: "log-success" },
        { msg: "  ✓ fees computed (sub: 0, conv: 0, elastic: 0)", cls: "log-success" },
        { msg: "  ✓ netAmount > 0", cls: "log-success" },
        { msg: "HectXHolding created — Alice: 1,000.00 HECTX", cls: "log-success" },
        { msg: "Supply updated — 0 → 1,000.00", cls: "log-info" },
        { msg: "Participant (Bob) created — jurisdiction: Portugal, status: Eligible", cls: "log-success" },
        { msg: "WalletApproval (Bob) created — active: true", cls: "log-success" },
        { msg: "TransferFactory_Transfer executed — compliance checks:", cls: "log-success" },
        { msg: "  ✓ sender.status == Eligible", cls: "log-success" },
        { msg: "  ✓ receiver.status == Eligible", cls: "log-success" },
        { msg: "  ✓ sender wallet active", cls: "log-success" },
        { msg: "  ✓ receiver wallet active", cls: "log-success" },
        { msg: "Input holding archived — Alice: 1,000.00", cls: "log-info" },
        { msg: "Receiver holding created — Bob: 100.00 HECTX", cls: "log-success" },
        { msg: "Change holding created — Alice: 900.00 HECTX", cls: "log-success" },
        { msg: "Final state verified:", cls: "log-success" },
        { msg: "  Alice: 900 HECTX", cls: "log-success" },
        { msg: "  Bob:   100 HECTX", cls: "log-success" },
        { msg: "  Holdings: 2 contracts on ledger", cls: "log-success" },
        { msg: "  Supply invariant: 900 + 100 = 1000 ✓", cls: "log-success" },
        { msg: "═══ Demo scenario complete ═══", cls: "log-info" },
      ];
      logEl.innerHTML = "";
      entries.forEach(e => {
        const div = document.createElement("div");
        div.innerHTML = `<span class="log-time">[14:30:00]</span> <span class="${e.cls}">${e.msg}</span>`;
        logEl.appendChild(div);
      });
      document.querySelector("#log-count").textContent = `${entries.length} entries`;
    });

    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, `${timestamp}_02-completed.png`), fullPage: true });
    console.log(`   -> ${timestamp}_02-completed.png`);

    // 3. Zoom into the architecture table
    console.log("3. Capturing architecture decision table...");
    const archPanel = page.locator("#panel-architecture");
    await archPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await archPanel.screenshot({ path: path.join(OUT_DIR, `${timestamp}_03-architecture-table.png`) });
    console.log(`   -> ${timestamp}_03-architecture-table.png`);

    // 4. Zoom into compliance panel
    console.log("4. Capturing compliance panel...");
    const compPanel = page.locator("#panel-compliance");
    await compPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await compPanel.screenshot({ path: path.join(OUT_DIR, `${timestamp}_04-compliance-panel.png`) });
    console.log(`   -> ${timestamp}_04-compliance-panel.png`);

    // 5. Zoom into workflow + holdings
    console.log("5. Capturing workflow and holdings...");
    const holdingsPanel = page.locator("#panel-holdings");
    await holdingsPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await holdingsPanel.screenshot({ path: path.join(OUT_DIR, `${timestamp}_05-holdings-table.png`) });
    console.log(`   -> ${timestamp}_05-holdings-table.png`);

    console.log("\nAll screenshots captured successfully.");
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
