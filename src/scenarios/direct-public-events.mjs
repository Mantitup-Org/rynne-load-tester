/**
 * Phase 3: same URL as browser publicApiUrl('/api/events/public') —
 * Worker public path with no secret / no session headers.
 */
import { runBench } from "../bench.mjs";

const base = (process.env.WORKER_URL || "http://127.0.0.1:8787").replace(
  /\/$/,
  ""
);

await runBench({
  connections: Number(process.env.LOADTEST_CONNECTIONS || 50),
  duration: Number(process.env.LOADTEST_DURATION || 20),
  headers: { Accept: "application/json" },
  label: "direct-public-events-no-secret",
  method: "GET",
  pipelining: 1,
  url: `${base}/api/events/public`,
  workers: Number(process.env.LOADTEST_WORKERS || 2),
});
