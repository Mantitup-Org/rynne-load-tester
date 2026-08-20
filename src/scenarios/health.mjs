/**
 * Scenario 1 — Worker liveness (NO database).
 * Label: "Worker liveness capacity" — NOT "Rynne application capacity".
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
  label: "worker-liveness-health",
  method: "GET",
  pipelining: 1,
  url: `${base}/health`,
  workers: Number(process.env.LOADTEST_WORKERS || 2),
});
