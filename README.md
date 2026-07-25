# CodeSentry

A distributed secret, dependency-vulnerability, and PII scanner for GitHub repositories. Every push to a monitored repo fires a real GitHub webhook, which enqueues a scan job onto a Redis-backed job queue; a pool of worker processes picks up jobs in parallel, clones the repo at that exact commit, and runs three independent checks against it. Results stream live to a Socket.io dashboard, and every finding is diffed against the repo's scan history so you can tell a newly introduced problem from one that's been sitting there for weeks.

## Why

Most student projects that touch "security scanning" are a single script you run by hand against one file. CodeSentry is a small distributed system: multiple worker processes pulling from a shared queue, a real webhook trigger (not a button), and a persistence layer that tracks state across scans rather than treating every run as a one-off.

## Architecture

```
GitHub push
    |
    v
GitHub webhook  --(HMAC-verified POST)-->  Express API server
                                                 |
                                                 v
                                          Redis job queue (BullMQ)
                                                 |
                          -----------------------+-----------------------
                          |                      |                      |
                    Worker process 1       Worker process 2       Worker process N
                          |                      |                      |
                          +----------- clone repo at commit -------------+
                                                 |
                              +------------------+------------------+
                              |                  |                  |
                     entropy secret scan   NVD vuln lookup     PII regex scan
                              |                  |                  |
                              +------------------+------------------+
                                                 |
                                    diff against previous scan
                                    (new / persisting / resolved)
                                                 |
                                                 v
                                          MongoDB (scans + findings)
                                                 |
                          Redis pub/sub  ------->+-------> Socket.io  --> live dashboard
```

The API server and the worker processes are separate Node processes. They only communicate through Redis - the job queue for work distribution, and a pub/sub channel so the API server's connected dashboard clients hear about scans happening in worker processes it isn't otherwise talking to.

## What it actually checks

- **Secrets** - Shannon entropy scoring over token-shaped substrings in every file. High-entropy, sufficiently long strings get flagged as likely leaked credentials.
- **Dependency vulnerabilities** - parses `package.json`, queries the public NVD API per dependency, and caches results in MongoDB (24h TTL) to stay well under NVD's unauthenticated rate limit.
- **PII** - regex-based detection for email addresses, phone numbers, and credit-card-shaped number sequences.

## Historical diffing

Every finding gets a stable fingerprint (a hash of its type, file, and the actual matched content - not its line number, so unrelated edits elsewhere in a file don't make it look "new" again). Each scan is compared against the repo's previous completed scan:

- A fingerprint that's new this scan → **new**
- A fingerprint that also existed last scan → **persisting**
- A fingerprint that existed last scan but is gone now → **resolved**

## Running it locally

You'll need a MongoDB connection string and a Redis connection string (a free tier from Upstash or Redis Cloud works fine - Redis doesn't run natively on Windows).

```bash
npm install
cp .env.example .env   # fill in MONGO_URI, REDIS_URL, GITHUB_WEBHOOK_SECRET

npm start              # the API server + dashboard, on :9000
npm run worker         # a scan worker (run this multiple times in separate terminals for real parallelism)
```

Open `http://localhost:9000` for the dashboard.

To actually receive GitHub webhooks locally you need a tunnel (e.g. `cloudflared tunnel --url http://localhost:9000`) and to register a webhook on a repo pointing at `<tunnel-url>/api/github/webhook`, content type `application/json`, with the same secret as `GITHUB_WEBHOOK_SECRET`.

## Stack

Node.js, Express, Socket.io, MongoDB (Mongoose), Redis (BullMQ + ioredis), simple-git.

## Notes

This is a portfolio/demo project, not a production security tool. The vulnerability matching is NVD keyword search against a package name, not precise CPE/version-range matching the way a real vulnerability database (Snyk, OSS Index, Grype) would do it - it's a reasonable entry-level approach, not a claim of enterprise-grade accuracy.
