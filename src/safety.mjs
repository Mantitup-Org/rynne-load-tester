const BLOCKED_HOSTS = new Set([
  "rynne.live",
  "www.rynne.live",
  "api.rynne.live",
  "auth.rynne.live",
]);

/** Explicitly allowed staging hostnames (workers.dev). Never production. */
const ALLOWED_STAGING_HOST_SUFFIXES = [".workers.dev"];

function isExplicitStagingHost(hostname) {
  // Only the dedicated staging Worker name — not arbitrary workers.dev apps.
  if (hostname === "rynne-backend-staging.mantitup.workers.dev") return true;
  if (hostname.startsWith("rynne-backend-staging.") && hostname.endsWith(".workers.dev")) {
    return true;
  }
  return false;
}

export function assertSafeTarget(url, allowProduction = false) {
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (isExplicitStagingHost(hostname)) {
    return;
  }

  const blocked =
    BLOCKED_HOSTS.has(hostname) ||
    [...BLOCKED_HOSTS].some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );

  if (blocked && !allowProduction) {
    throw new Error(
      `Refusing production host "${hostname}". Use localhost/127.0.0.1, or the staging Worker (rynne-backend-staging.*.workers.dev).`
    );
  }
}

export { BLOCKED_HOSTS, ALLOWED_STAGING_HOST_SUFFIXES };
