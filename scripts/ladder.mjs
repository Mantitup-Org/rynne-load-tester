/**
 * Manual-gate ladder runner for Phase 1.
 * Stops if errors/timeouts/non2xx appear or p99 jumps sharply.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env") });

const scenario = process.argv[2];
const stages = (process.argv[3] || "50,100,250,500")
  .split(",")
  .map((n) => Number(n.trim()))
  .filter((n) => n > 0);

if (!scenario) {
  console.error("Usage: node scripts/ladder.mjs <scenario> [50,100,250,500]");
  process.exit(1);
}

const duration = process.env.LOADTEST_DURATION || "20";
const workers = process.env.LOADTEST_WORKERS || "2";
process.env.LOADTEST_ENV =
  process.env.LOADTEST_ENV ||
  "local-docker-postgres + node serve-local (not wrangler)";

function runStage(connections) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(ROOT, "src", "scenarios", `${scenario}.mjs`),
      ],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          LOADTEST_CONNECTIONS: String(connections),
          LOADTEST_DURATION: String(duration),
          LOADTEST_WORKERS: String(workers),
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let out = "";
    child.stdout.on("data", (d) => {
      const s = d.toString();
      out += s;
      process.stdout.write(s);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      out += s;
      process.stderr.write(s);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`scenario exited ${code}`));
        return;
      }
      const throughput = Number(
        (out.match(/Throughput:\s+([\d.]+)\s+req\/s/) || [])[1] || NaN
      );
      const p50 = Number((out.match(/Latency p50:\s+([\d.]+)/) || [])[1] || NaN);
      const p99 = Number((out.match(/Latency p99:\s+([\d.]+)/) || [])[1] || NaN);
      const errors = Number((out.match(/Errors:\s+(\d+)/) || [])[1] || NaN);
      const timeouts = Number((out.match(/Timeouts:\s+(\d+)/) || [])[1] || NaN);
      const non2xx = Number((out.match(/Non-2xx:\s+(\d+)/) || [])[1] || NaN);
      resolve({ connections, throughput, p50, p99, errors, timeouts, non2xx, out });
    });
  });
}

const results = [];
let prevP99 = null;

for (const c of stages) {
  console.log(`\n######## LADDER GATE: ${scenario} @ ${c} connections ########\n`);
  const r = await runStage(c);
  results.push(r);

  const bad =
    r.errors > 0 ||
    r.timeouts > 0 ||
    r.non2xx > 0 ||
    !Number.isFinite(r.throughput);

  if (bad) {
    console.error(
      `\nSTOP: errors/timeouts/non2xx at ${c} connections — not advancing.`
    );
    break;
  }

  if (prevP99 != null && r.p99 > prevP99 * 3 && r.p99 > 500) {
    console.error(
      `\nSTOP: p99 jumped sharply (${prevP99} -> ${r.p99} ms) at ${c} connections.`
    );
    break;
  }
  prevP99 = r.p99;
  console.log(`\nGATE PASS @ ${c} connections — continuing.\n`);
}

console.log("\n=== LADDER SUMMARY ===");
for (const r of results) {
  console.log(
    `c=${r.connections} rps=${r.throughput} p50=${r.p50} p99=${r.p99} err=${r.errors} t/o=${r.timeouts} non2xx=${r.non2xx}`
  );
}
