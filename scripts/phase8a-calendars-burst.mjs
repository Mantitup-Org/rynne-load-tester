/**
 * Phase 8A — capture calendars HTTP status distribution under concurrency.
 * Staging only. No secrets.
 */
import { assertSafeTarget } from "../src/safety.mjs";

const base = "https://rynne-backend-staging.mantitup.workers.dev";
const url = `${base}/api/calendars/public`;
assertSafeTarget(url);

const n = Number(process.env.N || 100);
const results = await Promise.all(
  Array.from({ length: n }, async () => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 300) };
    } catch (e) {
      return { status: 0, body: e instanceof Error ? e.message : String(e) };
    }
  })
);

const byStatus = {};
const bodies = {};
for (const r of results) {
  byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  if (r.status !== 200) {
    bodies[r.body] = (bodies[r.body] || 0) + 1;
  }
}
console.log(JSON.stringify({ n, byStatus, non200Bodies: bodies }, null, 2));
