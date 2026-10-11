/**
 * Phase 8A — sustain calendars load and capture non-200 bodies.
 */
import { assertSafeTarget } from "../src/safety.mjs";

const url = "https://rynne-backend-staging.mantitup.workers.dev/api/calendars/public";
assertSafeTarget(url);

const connections = Number(process.env.C || 100);
const durationMs = Number(process.env.MS || 20000);
const bodies = new Map();
let ok = 0;
let bad = 0;
let inFlight = 0;
let stop = false;

async function one() {
  inFlight++;
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (res.status === 200) ok++;
    else {
      bad++;
      const key = `${res.status}|${text.slice(0, 2000)}`;
      bodies.set(key, (bodies.get(key) || 0) + 1);
    }
  } catch (e) {
    bad++;
    const key = `throw|${e instanceof Error ? e.message : String(e)}`;
    bodies.set(key, (bodies.get(key) || 0) + 1);
  } finally {
    inFlight--;
    if (!stop) void one();
  }
}

const t0 = Date.now();
for (let i = 0; i < connections; i++) void one();
await new Promise((r) => setTimeout(r, durationMs));
stop = true;
while (inFlight > 0) await new Promise((r) => setTimeout(r, 50));

console.log(
  JSON.stringify(
    {
      connections,
      durationMs,
      elapsedMs: Date.now() - t0,
      ok,
      bad,
      bodies: Object.fromEntries(bodies),
    },
    null,
    2
  )
);
