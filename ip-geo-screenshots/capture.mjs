/**
 * Usage:
 *   npm install
 *   npx playwright install chromium
 *   node capture.mjs 159.146.21.214
 *
 * Screenshots go to ./shots/YYYY-MM-DD/
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ip = process.argv[2]?.trim();
if (!ip) {
  console.error("Usage: node capture.mjs <ip-address>");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "shots", new Date().toISOString().slice(0, 10));
fs.mkdirSync(outDir, { recursive: true });
const slug = ip.replace(/[^a-zA-Z0-9]+/g, "_");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureMaxmind(page) {
  await page.goto("https://www.maxmind.com/en/geoip-web-services-demo", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });
  const ta = page.locator("#geoip-demo-form__textarea");
  await ta.waitFor({ state: "visible", timeout: 20000 });
  await ta.fill(ip);

  const nav = page
    .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 })
    .catch(() => null);
  await page.click("button.js-geoip-demo-btn");
  await nav;

  await delay(2000);
  const wrap = page.locator(".geoip-demo-form__table-wrapper").first();
  await wrap.waitFor({ state: "visible", timeout: 45000 });
  await wrap.screenshot({ path: path.join(outDir, `maxmind-${slug}.png`) });
}

async function captureDbIp(page) {
  const url = `https://db-ip.com/${encodeURIComponent(ip)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  const head = page.locator(".title.head").first();
  await head.waitFor({ state: "visible", timeout: 20000 });
  await head.screenshot({ path: path.join(outDir, `db-ip-${slug}.png`) });
}

/** Heading + first ~6 rows of the Geolocation Data table (viewport clip). */
async function captureIp2LocationSnippet(page) {
  await page.goto("https://www.ip2location.com/demo", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });
  await page.locator('input[name="ipAddress"]').waitFor({ state: "visible", timeout: 20000 });
  await page.fill('input[name="ipAddress"]', ip);
  const nav = page
    .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 90000 })
    .catch(() => null);
  await page.click("#btn-click");
  await nav;
  await delay(800);

  const clip = await page.evaluate(() => {
    const h3List = Array.from(document.querySelectorAll("h3.mt-3"));
    const h3 = h3List.find(h => (h.textContent || "").trim().includes("Geolocation Data"));
    if (!h3) return null;
    const col = h3.closest(".col-md-6");
    if (!col) return null;
    const table = col.querySelector("table");
    if (!table) return null;
    const rows = Array.from(table.querySelectorAll("tr")).slice(0, 7);
    const rects = [h3.getBoundingClientRect(), ...rows.map(tr => tr.getBoundingClientRect())];
    const top = Math.min(...rects.map(r => r.top));
    const bottom = Math.max(...rects.map(r => r.bottom));
    const left = Math.min(...rects.map(r => r.left));
    const right = Math.max(...rects.map(r => r.right));
    const pad = 6;
    return {
      x: Math.max(0, left - pad),
      y: Math.max(0, top - pad),
      width: right - left + pad * 2,
      height: bottom - top + pad * 2
    };
  });

  if (!clip || clip.width < 20 || clip.height < 20) {
    throw new Error(
      "IP2Location: could not compute Geolocation snippet clip (selectors changed?)"
    );
  }

  await page.screenshot({
    path: path.join(outDir, `ip2location-geo-snippet-${slug}.png`),
    clip
  });
}

const browser = await chromium.launch({
  headless: true
});

const tasks = [
  { label: "MaxMind", run: captureMaxmind },
  { label: "db-ip", run: captureDbIp },
  { label: "IP2Location", run: captureIp2LocationSnippet }
];

/** @type {{ label: string, message: string }[]} */
const errors = [];

try {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();

  for (const { label, run } of tasks) {
    process.stdout.write(`${label}… `);
    try {
      await run(page);
      console.log("ok");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log("FAILED");
      console.error(`  [${label}] ${message}`);
      errors.push({ label, message });
    }
  }

  console.log(`\nOutput folder: ${outDir}`);
  if (errors.length) {
    console.error(
      `\nCompleted with ${errors.length}/${tasks.length} error(s); other captures were still attempted.`
    );
  } else {
    console.log("All captures succeeded.");
  }
} finally {
  await browser.close();
}

process.exit(errors.length === tasks.length ? 1 : 0);
