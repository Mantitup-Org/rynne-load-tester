/**
 * Scenario 2 — Worker + DB public list.
 * GET /api/events/public — upcoming public events (limit 60).
 * No email / Drive / Places / AI / uploads.
 *
 * WARNING: Only run against a Worker whose DATABASE_URL is local Docker Postgres,
 * not production Neon. This harness only blocks production *HTTP* hosts.
 */
import { runBench } from "../bench.mjs";

const base = (process.env.WORKER_URL || "http://127.0.0.1:8787").replace(
  /\/$/,
  ""
);

await runBench({
  connections: Number(process.env.LOADTEST_CONNECTIONS || 50),
  duration: Number(process.env.LOADTEST_DURATION || 30),
  headers: {},
  label: "worker-public-events-db-read",
  method: "GET",
  pipelining: 1,
  url: `${base}/api/events/public`,
  workers: Number(process.env.LOADTEST_WORKERS || 2),
});
