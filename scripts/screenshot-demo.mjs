#!/usr/bin/env node
/**
 * HECTX Demo Screenshot Tool
 *
 * Takes Playwright screenshots of the demo UI at each workflow step.
 * Requires the demo server to be running at DEMO_URL (default: http://localhost:5177).
 *
 * Usage:
 *   node scripts/screenshot-demo.mjs [--url http://localhost:5177] [--out sessions/screenshots]
 *
 * Steps captured:
 *   1. Initial state (before any actions)
 *   2. After setup (policies + compliance created)
 *   3. After mint (Alice receives tokens)
 *   4. After transfer (Alice→Bob transfer complete)
 *   5. Full page final state
 */

import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Parse args
const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};

const DEMO_URL = getArg("--url", process.env.DEMO_URL ?? "http://localhost:5177");
const OUT_DIR = path.resolve(ROOT, getArg("--out", "sessions/screenshots"));

// Ensure output dir exists
fs.mkdirSync(OUT_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

async function screenshot(page, name, opts = {}) {
  const filename = `${timestamp}_${name}.png`;
  const filepath = path.join(OUT_DIR, filename);
  await page.screenshot({
    path: filepath,
    fullPage: opts.fullPage ?? false,
    ...opts,
  });
  console.log(`  Screenshot: ${filename}`);
  return filepath;
}

async function waitForLog(page, text, timeout = 15000) {
  await page.waitForFunction(
    (t) => {
      const log = document.getElementById("log");
      return log && log.textContent.includes(t);
    },
    text,
    { timeout }
  );
}

async function main() {
  console.log(`HECTX Demo Screenshot Tool`);
  console.log(`  URL:    ${DEMO_URL}`);
  console.log(`  Output: ${OUT_DIR}`);
  console.log();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    // Navigate to demo
    console.log("1. Loading demo page...");
    await page.goto(DEMO_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(500);
    await screenshot(page, "01-initial", { fullPage: true });

    // Step 1: Setup
    console.log("2. Running setup...");
    await page.click('[data-step="setup"]');
    await waitForLog(page, "Policies and compliance");
    await page.waitForTimeout(500);
    await screenshot(page, "02-after-setup", { fullPage: true });

    // Step 2: Mint
    console.log("3. Running mint...");
    await page.click('[data-step="mint-request"]');
    await waitForLog(page, "Mint approved");
    await page.waitForTimeout(500);
    await screenshot(page, "03-after-mint", { fullPage: true });

    // Step 3: Transfer
    console.log("4. Running transfer...");
    await page.click('[data-step="transfer"]');
    await waitForLog(page, "Transfer executed");
    await page.waitForTimeout(500);
    await screenshot(page, "04-after-transfer", { fullPage: true });

    // Full page final
    console.log("5. Final full-page capture...");
    await screenshot(page, "05-final-full", { fullPage: true });

    console.log();
    console.log("All screenshots captured successfully.");
  } catch (err) {
    console.error(`Screenshot error: ${err.message}`);
    // Take error screenshot for debugging
    try {
      await screenshot(page, "error-state", { fullPage: true });
    } catch (_) {}
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
