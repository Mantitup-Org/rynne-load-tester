/**
 * Phase 4: BFF public calendars proxy for before/after comparison.
 */
import { runBench } from "../bench.mjs";

const base = (process.env.APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

await runBench({
  connections: Number(process.env.LOADTEST_CONNECTIONS || 50),
  duration: Number(process.env.LOADTEST_DURATION || 20),
  headers: {},
  label: "bff-public-calendars",
  method: "GET",
  pipelining: 1,
  url: `${base}/api/calendars/public`,
  workers: Number(process.env.LOADTEST_WORKERS || 2),
});
