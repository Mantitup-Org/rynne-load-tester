/**
 * Rynne capacity bench CLI (autocannon).
 *
 * Capacity benchmark, not a production traffic simulator.
 * Does NOT claim 1M RPS — measures what the target actually sustains.
 *
 * Example:
 *   npm run bench -- --url=http://127.0.0.1:8787/health --method=GET --connections=50 --duration=30 --workers=2
 */

import autocannon from "autocannon";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { assertSafeTarget } from "./safety.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const RESULTS_DIR = path.join(ROOT, "results");

dotenv.config({ path: path.join(ROOT, ".env") });
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

export function parseArgs(argv) {
  const start = argv.findIndex((a) => a.startsWith("--"));
  const flags = start >= 0 ? argv.slice(start) : argv;

  const get = (name) => {
    const eq = flags.find((a) => a.startsWith(`--${name}=`));
    if (eq) return eq.slice(name.length + 3);
    const idx = flags.indexOf(`--${name}`);
    if (idx >= 0 && flags[idx + 1] && !flags[idx + 1].startsWith("--")) {
      return flags[idx + 1];
    }
    return undefined;
  };
  const flag = (name) => flags.includes(`--${name}`);

  const headers = {};
  for (const arg of flags) {
    if (!arg.startsWith("--header=")) continue;
    const raw = arg.slice("--header=".length);
    const i = raw.indexOf(":");
    if (i <= 0) continue;
    headers[raw.slice(0, i).trim()] = raw.slice(i + 1).trim();
  }

  const url = get("url");
  if (!url) {
    throw new Error(
      "Missing --url (e.g. --url=http://127.0.0.1:8787/health)"
    );
  }

  return {
    allowProduction: flag("allow-production"),
    body: get("body"),
    connections: Number(get("connections") ?? 50),
    duration: Number(get("duration") ?? 30),
    headers,
    label: get("label"),
    method: (get("method") ?? "GET").toUpperCase(),
    pipelining: Number(get("pipelining") ?? 1),
    url,
    workers: Number(get("workers") ?? 2),
  };
}

export async function runBench(opts) {
  assertSafeTarget(opts.url, Boolean(opts.allowProduction));

  if (
    !Number.isFinite(opts.connections) ||
    opts.connections < 1 ||
    !Number.isFinite(opts.duration) ||
    opts.duration < 1
  ) {
    throw new Error("connections and duration must be positive numbers");
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const startedAt = new Date().toISOString();
  const label =
    opts.label ??
    `${opts.method} ${new URL(opts.url).pathname} c${opts.connections}`;

  console.log("");
  console.log("=== Rynne load tester (capacity benchmark) ===");
  console.log(`Label:       ${label}`);
  console.log(`URL:         ${opts.url}`);
  console.log(`Method:      ${opts.method}`);
  console.log(`Connections: ${opts.connections}`);
  console.log(`Duration:    ${opts.duration}s`);
  console.log(`Workers:     ${opts.workers}`);
  console.log(`Pipelining:  ${opts.pipelining}`);
  console.log("==============================================");
  console.log("");

  const result = await autocannon({
    body: opts.body,
    connections: opts.connections,
    duration: opts.duration,
    headers: opts.headers,
    method: opts.method,
    pipelining: opts.pipelining,
    url: opts.url,
    workers: opts.workers,
  });

  const stamp = startedAt.replace(/[:.]/g, "-");
  const safeLabel = label.replace(/[^\w.-]+/g, "_").slice(0, 80);
  const resultPath = path.join(RESULTS_DIR, `${stamp}_${safeLabel}.json`);

  const summary = {
    achievedRps: Number(result.requests?.average ?? 0),
    connections: opts.connections,
    durationSec: opts.duration,
    errors: Number(result.errors ?? 0),
    label,
    latency: {
      average: Number(result.latency?.average ?? 0),
      max: Number(result.latency?.max ?? 0),
      p50: Number(result.latency?.p50 ?? 0),
      // autocannon does not emit p95; p90 is the nearest reported percentile
      p90: Number(result.latency?.p90 ?? 0),
      p95: Number(result.latency?.p90 ?? 0),
      p99: Number(result.latency?.p99 ?? 0),
    },
    method: opts.method,
    non2xx: Number(result.non2xx ?? 0),
    pipelining: opts.pipelining,
    resultPath,
    startedAt,
    statusCodeStats: result.statusCodeStats ?? {},
    timeouts: Number(result.timeouts ?? 0),
    throughputBytesPerSec: Number(result.throughput?.average ?? 0),
    url: opts.url,
    workers: opts.workers,
  };

  const payload = {
    meta: {
      harness: "rynne-load-tester",
      note: "Capacity benchmark, not a production traffic simulator. Not a 1M RPS claim.",
      reference: "https://github.com/agile8118/1m-rps-tester",
      startedAt,
    },
    options: {
      connections: opts.connections,
      duration: opts.duration,
      headerNames: Object.keys(opts.headers),
      label,
      method: opts.method,
      pipelining: opts.pipelining,
      url: opts.url,
      workers: opts.workers,
    },
    raw: result,
    summary,
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log("--- Summary ---");
  console.log(`Throughput:  ${summary.achievedRps.toFixed(1)} req/s`);
  console.log(`Latency p50: ${summary.latency.p50} ms`);
  console.log(`Latency p90: ${summary.latency.p90} ms (autocannon; used as p95 proxy)`);
  console.log(`Latency p99: ${summary.latency.p99} ms`);
  console.log(`Latency max: ${summary.latency.max} ms`);
  console.log(`Errors:      ${summary.errors}`);
  console.log(`Timeouts:    ${summary.timeouts}`);
  console.log(`Non-2xx:     ${summary.non2xx}`);
  console.log(`Status codes: ${JSON.stringify(summary.statusCodeStats)}`);
  console.log(`JSON: ${resultPath}`);
  console.log("");

  return summary;
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  runBench(parseArgs(process.argv.slice(2))).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
