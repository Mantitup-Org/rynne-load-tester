const BLOCKED_HOSTS = new Set([
  "rynne.live",
  "www.rynne.live",
  "api.rynne.live",
  "auth.rynne.live",
]);

export function assertSafeTarget(url, allowProduction = false) {
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const blocked =
    BLOCKED_HOSTS.has(hostname) ||
    [...BLOCKED_HOSTS].some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );

  if (blocked && !allowProduction) {
    throw new Error(
      `Refusing production host "${hostname}". Use localhost/127.0.0.1 for Phase 1, or pass --allow-production (not recommended).`
    );
  }
}

export { BLOCKED_HOSTS };
