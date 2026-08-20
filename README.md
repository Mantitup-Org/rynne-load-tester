# Rynne Load Tester

Standalone **capacity benchmark** tool for [Rynne](https://rynne.live).  
Adapted from the autocannon methodology in [agile8118/1m-rps-tester](https://github.com/agile8118/1m-rps-tester) — **not** a claim that Rynne can do 1M RPS.

The original AWS 1M-RPS run used a huge client fleet and a **C++** server ([cpp-1m-rps](https://github.com/agile8118/cpp-1m-rps)). Node alone hit a ceiling there. Keep that context when reading numbers.

> This is a capacity benchmark, **not** a production traffic simulator.

---

## Why a separate repo?

Keep load tooling out of `rynne-v2` so benchmarks never ship with the product and you can iterate on the tester freely.

Original upstream files live under `reference/` for history.

---

## What we measure (keep these separate)

| Layer | Scenario | Meaning |
| --- | --- | --- |
| **A. Worker liveness** | `scenario:health` | `GET /health` — no DB |
| **B. Worker + DB** | `scenario:public-events` | `GET /api/events/public` |
| **B2. Worker + DB (heavy)** | `scenario:public-event` | `GET /api/events/slug/:slug` |
| **C. BFF + Worker + DB** | `scenario:bff-public-events` | Next `GET /api/events` |

Never collapse A/B/C into one “Rynne RPS” headline.

---

## Setup

```bash
cd 1m-rps-tester
npm install
cp .env.example .env
```

Edit `.env`:

```env
WORKER_URL=http://127.0.0.1:8787
APP_URL=http://127.0.0.1:3000
INTERNAL_API_SECRET=   # from rynne-v2/apps/backend/.env.local (slug scenario only)
```

Start Rynne locally (separate terminals):

```bash
# in rynne-v2
npm run dev
# Worker :8787 · App :3000 · Auth :3001
# Prefer Docker Postgres for DB scenarios — do not blast production Neon.
```

---

## Commands

### Generic

```bash
npm run bench -- --url=http://127.0.0.1:8787/health --method=GET --connections=50 --duration=30 --workers=2 --pipelining=1
```

Prefer `--flag=value` (works reliably on Windows npm).

| Flag | Meaning |
| --- | --- |
| `--url=` | Target URL (required) |
| `--method=` | HTTP method (default GET) |
| `--connections=` | Concurrent connections |
| `--duration=` | Seconds |
| `--workers=` | Autocannon workers |
| `--pipelining=` | HTTP pipelining |
| `--body=` | Request body |
| `--header=Name: value` | Extra header |
| `--label=` | Result filename label |
| `--allow-production` | Bypass prod hostname block (**do not use in Phase 1**) |

### Scenarios

```bash
npm run scenario:health
npm run scenario:public-events
npm run scenario:public-event          # needs INTERNAL_API_SECRET
npm run scenario:bff-public-events     # needs app on :3000
```

Env knobs: `LOADTEST_CONNECTIONS`, `LOADTEST_DURATION`, `LOADTEST_WORKERS`, `LOADTEST_EVENT_SLUG`.

---

## Safety

Production hosts are **blocked by default**:

- `rynne.live` / `www.rynne.live`
- `api.rynne.live`
- `auth.rynne.live`

The tool refuses those unless `--allow-production` is set. Phase 1 should never set that flag.

**Also:** HTTP localhost can still talk to **remote Neon** if the Worker’s `DATABASE_URL` points there. For DB scenarios, point the Worker at **Docker Postgres**, or you are load-testing the shared DB.

---

## Results

Written to `results/` (gitignored):

- Machine-readable JSON (options + autocannon raw + summary)
- Console: throughput, p50/p95/p99, errors, status codes

---

## Ramp (manual)

Raise `--connections` as the load dial (autocannon does not target exact RPS). After each stage, check errors/latency before increasing:

50 → 100 → 250 → 500 → 1000

Stop if 5xx/errors rise, latency climbs sharply, or the machine saturates.

---

## Out of scope (Phase 1)

OTP, OAuth, Drive, Places, Resend, AI, UploadThing, file uploads, production hosts, 1M RPS claims, production optimization.

---

## Reference upstream

| Path | What |
| --- | --- |
| `reference/patch.js` | Original hardcoded autocannon PATCH script |
| `reference/commands.sh` | Original AWS SSM fan-out |
| `reference/30min-60-results.txt` | Their published multi-machine result |
