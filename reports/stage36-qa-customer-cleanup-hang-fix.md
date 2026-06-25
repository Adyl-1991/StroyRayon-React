# Stage 36 - Fix `qa:customer` Cleanup Hang

Date: 2026-06-25

## Summary

`npm run qa:customer` no longer hangs after writing a result. The runner now starts Vite preview without shell wrapping, opens a stable Chrome DevTools target, rejects stalled CDP calls, writes the result file, closes Chrome through CDP, stops the preview process tree, and exits cleanly.

## Starting Status

- Starting commit: `bf9984b Add priority product images`
- Working tree was clean.
- Stage 35 had a passing `qa:customer` result file, but the wrapper cleanup hung and had to be stopped manually.

## Hang Reproduction

The hang reproduced before the fix:

- Preview server stayed alive after the wrapper stopped making progress.
- Chrome startup and CDP connection were unstable on Windows.
- In some runs the result file existed, but the Node wrapper did not exit.
- In other runs Chrome startup/page-target races caused the wrapper to wait without a useful failure.

## Root Cause

The issue was a combination of Windows process and Chrome DevTools edge cases:

- `npm.cmd run preview` was spawned through a shell, creating a nested `cmd -> npm -> vite` process tree that was not reliably stopped by `localServer.kill()`.
- Chrome's launcher process can exit while the real headless browser continues in the background, so treating the launcher exit as Chrome failure was incorrect.
- The initial `about:blank` page target could become unresponsive; `Page.enable`/`Runtime.enable` then waited forever.
- CDP pending requests were registered after `ws.send()`, which left a small race where fast responses could be dropped.
- CDP WebSocket close/error did not reject pending commands, so a dead browser could leave the runner hanging.
- Chrome 149 on this Windows host needed stricter headless flags to avoid GPU/Dawn/Graphite crashes.

## Files Changed

- `scripts/customer-storefront-qa.mjs`
- `reports/stage36-qa-customer-cleanup-hang-fix.md`

## Cleanup Fix Details

- Switched preview startup to direct Vite CLI: `node node_modules/vite/bin/vite.js preview ...`.
- Added timeout helpers for startup and CDP commands.
- Added Windows-compatible process-tree cleanup via `taskkill /T /F`.
- Added random Chrome debug ports when `CUSTOMER_QA_DEBUG_PORT` is not provided.
- Added Chrome startup flags for stable headless operation on this host.
- Created a fresh DevTools page target at the storefront URL instead of relying on the initial `about:blank`.
- Removed unused `Page.enable`; the runner does not consume Page events.
- Registered CDP pending requests before `ws.send()`.
- Rejected all pending CDP requests on WebSocket close/error.
- Added direct current-window WhatsApp intercept before checkout submit.
- Added compact lifecycle logs and optional `CUSTOMER_QA_DEBUG_CDP=1` transport logs.

## `qa:customer` Run #1

Command:

```bash
npm run qa:customer
```

Result:

- Passed: true
- Checks: 1762
- Failed checks: 0
- Console errors: 0
- Failed assets: 0
- Cleanup warnings: 0
- Command exited with code 0

## `qa:customer` Run #2

Command:

```bash
npm run qa:customer
```

Result:

- Passed: true
- Checks: 1762
- Failed checks: 0
- Console errors: 0
- Failed assets: 0
- Cleanup warnings: 0
- Command exited with code 0

## Leftover Process Check

After the two passing runs:

- `http://127.0.0.1:4184` returned closed.
- Last Chrome debug ports `9540` and `9444` returned closed.
- No screenshots, videos, traces, or temp result files were added to the repository.

## Full QA

- `npm run validate:catalog` - passed, warnings: 0
- `npm run generate:sitemap` - passed, 341 URLs, warnings: 0
- `npm run lint` - passed
- `npm run build` - passed; existing large chunk warning remains
- `npm run qa:stage31` - passed, 400 checks, 0 issues
- `npm run qa:customer` - passed twice, 1762 checks each
- `cd api && npm run test` - passed, 29/29
- `cd api && npx prisma validate` - passed

## Remaining Risks

- `scripts/stage31-language-qa.mjs` still emits the older Node shell deprecation warning because it was outside this stage's customer runner scope.
- The production bundle still has the existing Vite large chunk warning.

## Commands Run

```bash
git status --short
git log -1 --oneline
git diff --stat
git diff --check
npm run qa:customer
npm run qa:customer
npm run validate:catalog
npm run generate:sitemap
npm run lint
npm run build
npm run qa:stage31
cd api && npm run test
cd api && npx prisma validate
```

## Safety Check

- No `.env` file was changed or staged.
- No secrets, tokens, DB URLs, or passwords were added.
- No screenshots, videos, Playwright traces, or old test artifacts were committed.
- Product images were not changed in this stage.
- Public storefront production code was not changed.
