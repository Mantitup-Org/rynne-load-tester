/**
 * Phase 4: Worker public calendars list.
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
  label: "direct-public-calendars",
  method: "GET",
  pipelining: 1,
  url: `${base}/api/calendars/public`,
  workers: Number(process.env.LOADTEST_WORKERS || 2),
});
