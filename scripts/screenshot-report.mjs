import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const [,, inputHtml, outputPng] = process.argv;

if (!inputHtml || !outputPng) {
  console.error("Usage: node scripts/screenshot-report.mjs <input.html> <output.png>");
  process.exit(1);
}

const fileUrl = new URL(`file://${path.resolve(inputHtml)}`);

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(fileUrl.href, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "*{scroll-behavior:auto !important;}" });
  await page.waitForTimeout(300);
  await page.screenshot({ path: outputPng, fullPage: true });
  await browser.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
