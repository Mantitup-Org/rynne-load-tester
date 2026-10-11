/**
 * Phase 2: hit BFF and aggregate x-phase2-timing headers.
 * Usage: node scripts/phase2-timing-sample.mjs [url] [n] [concurrency] [--skip-session]
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const url = process.argv[2] || "http://127.0.0.1:3000/api/events";
const n = Number(process.argv[3] || 40);
const concurrency = Number(process.argv[4] || 10);
const skipSession = process.argv.includes("--skip-session");

function percentile(sorted, p) {
  if (!sorted.length) return NaN;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function one() {
  const headers = {};
  if (skipSession) headers["x-phase2-skip-session"] = "1";
  const res = await fetch(url, { headers });
  const raw = res.headers.get("x-phase2-timing");
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
  }
  if (!raw) {
    throw new Error("Missing x-phase2-timing — is LOADTEST_TIMING=1 set on Next?");
  }
  return JSON.parse(raw);
}

const results = [];
let i = 0;
async function worker() {
  while (i < n) {
    const idx = i++;
    results[idx] = await one();
  }
}

const t0 = Date.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const wallMs = Date.now() - t0;

const keys = ["sessionMs", "fetchMs", "jsonMs", "serializeMs", "totalMs"];
console.log(`\nPhase2 timing sample  url=${url}`);
console.log(`n=${n} concurrency=${concurrency} skipSession=${skipSession} wall=${wallMs}ms`);
console.log("");

for (const key of keys) {
  const vals = results.map((r) => Number(r[key])).filter(Number.isFinite).sort((a, b) => a - b);
  const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  console.log(
    `${key.padEnd(12)} n=${vals.length} avg=${avg.toFixed(1)} p50=${percentile(vals, 50).toFixed(1)} p90=${percentile(vals, 90).toFixed(1)} p99=${percentile(vals, 99).toFixed(1)}`
  );
}

const skipped = results.filter((r) => r.skippedSession).length;
console.log(`\nskippedSession count: ${skipped}/${results.length}`);
