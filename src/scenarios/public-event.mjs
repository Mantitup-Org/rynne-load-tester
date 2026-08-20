/**
 * Scenario 3 — Worker + DB event slug lookup (heavier joins).
 * GET /api/events/slug/:slug — requires x-internal-api-secret.
 *
 * Set INTERNAL_API_SECRET in .env (from backend .env.local).
 * Set LOADTEST_EVENT_SLUG or auto-pick from /api/events/public.
 */
import { runBench } from "../bench.mjs";

const base = (process.env.WORKER_URL || "http://127.0.0.1:8787").replace(
  /\/$/,
  ""
);
const secret = (
  process.env.LOADTEST_INTERNAL_API_SECRET ||
  process.env.INTERNAL_API_SECRET ||
  ""
).trim();

if (!secret) {
  console.error(
    "Missing INTERNAL_API_SECRET in .env — slug route is not on the Worker public allowlist."
  );
  process.exit(1);
}

async function resolveSlug() {
  if (process.env.LOADTEST_EVENT_SLUG?.trim()) {
    return process.env.LOADTEST_EVENT_SLUG.trim();
  }
  const res = await fetch(`${base}/api/events/public`);
  if (!res.ok) {
    throw new Error(`Could not list public events: HTTP ${res.status}`);
  }
  const rows = await res.json();
  const slug = Array.isArray(rows)
    ? rows.find((e) => e?.slug)?.slug
    : undefined;
  if (!slug) {
    throw new Error(
      "No public upcoming events. Create one locally or set LOADTEST_EVENT_SLUG."
    );
  }
  return slug;
}

const slug = await resolveSlug();
console.log(`Using event slug: ${slug}`);

await runBench({
  connections: Number(process.env.LOADTEST_CONNECTIONS || 50),
  duration: Number(process.env.LOADTEST_DURATION || 30),
  headers: { "x-internal-api-secret": secret },
  label: `worker-public-event-slug-${slug}`,
  method: "GET",
  pipelining: 1,
  url: `${base}/api/events/slug/${encodeURIComponent(slug)}`,
  workers: Number(process.env.LOADTEST_WORKERS || 2),
});
