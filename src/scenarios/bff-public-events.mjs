/**
 * Scenario 4 — BFF + Worker + DB.
 * GET http://127.0.0.1:3000/api/events → Worker /api/events/public
 * Compare against scenario:public-events to measure BFF overhead.
 */
import { runBench } from "../bench.mjs";

const base = (process.env.APP_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  ""
);

await runBench({
  connections: Number(process.env.LOADTEST_CONNECTIONS || 50),
  duration: Number(process.env.LOADTEST_DURATION || 30),
  headers: {},
  label: "bff-public-events",
  method: "GET",
  pipelining: 1,
  url: `${base}/api/events`,
  workers: Number(process.env.LOADTEST_WORKERS || 2),
});
