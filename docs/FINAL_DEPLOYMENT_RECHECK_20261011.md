# FinTrack V2 — final PAR–SPR–MISC / CCRA regression and deployment gate

Baseline: `fintrack-main(20261011-004817).zip`, corresponding to commit `76cee9d12acb1091995b9bf121c96ba5acf869b7` (from uploaded ZIP archive comment). This is a **pre-deployment verification plan**, not a live-site approval.

## Rechecked (source and dependency-free tests)

- Verified the previously introduced statement import direction/fingerprint/idempotency regressions; FIF0 lot-cost conservation, trade chronology, currency policy, Autopay account-reference protection, browser sign-in sequence ordering, AI assistant navigation and cancellation controls, and stale-navigation chains.
- Baseline 17/19 Node test scripts ran successfully. The PDF and security scripts were blocked because local npm installation could not complete. They were green in the *prior* GitHub Actions run for commit `76cee9d` but are **not yet verified against this patch**.
- After the patch: 18/20 Node test scripts pass; the same PDF/security suites remain unavailable locally. 148/148 server JavaScript syntax checks pass.
- The uploaded archive was checked for accidentally included live `.env`, private keys and credentials files; only public `.env.example` templates were present.

## New fixes in this patch

1. **Transfer operations under MongoDB transactions (HIGH implementation risk):** `ensureTransferPair` performed `Promise.all` against a shared Mongoose transaction session. Mongoose does not support parallel operations inside a transaction. Source/destination account ownership reads are now serial. This preserves existing cross-currency checks and update/create behavior; true replica-set transfer testing remains essential.
2. **Zero-valued trade recording (MEDIUM):** `assertSafeInvestmentTradeAmounts` previously accepted positive quantities below six-decimal resolution, prices below INR 0.01, and combinations with rounded gross amount INR 0.00. These could fail lot validation or record invalid trades. The utility now checks representability of normalized quantity, price, and gross notional. SELL fees larger than proceeds remain valid.
3. **Investment account currency invariant (LOW, defense-in-depth):** account update service now checks the resulting type/currency pair, not just `updates.type` against the old currency. Public v2 account validators currently restrict new/edited currencies to INR; this protects legacy data and future service callers.

A dependency-free `test:v2-deployment` script was added to CI to prevent reintroducing these cases.

## Required pre-release gates (not executed here)

1. **CI:** GitHub Actions `source-regression` must be green for the **new patch commit**: server install; all 20 test scripts including PDF/security; frontend lint and build.
2. **Replica-set database:** With a disposable MongoDB replica-set database and independently seeded test users, run two-account transfers (create, edit, reverse, delete), including concurrent requests, rollback/error injection, archived account restrictions, and equal-currency checks. Verify exactly-once balance deltas and preserved total cash.
3. **PAR–SPR–MISC:** Upload CSV and XLSX (including duplicate and repeated identical rows); commit/abort/retry; edit/delete/reimport; verify imported balance, categories, alert behaviour, 24-hour draft expiration and no cross-user data leakage.
4. **Investments:** Test buy/sell/FIFO exact fees, multiple lots, chronologically valid dates, backdated rejections, sub-paisa trade rejections, over-sell, zero-gross trades, and full liquidation against account balance and realized P&L. Reconcile existing legacy partially sold lots; this patch DOES NOT rewrite historical trades.
5. **Autopay:** Test daily/monthly/yearly DST and local timezone date boundaries; catch-up after downtime; duplicate-worker requests; changes to accounts/rules concurrently; pause/delete/archival.
6. **Security:** In a real browser, test Google nonce/state, legacy Google linking, same-browser concurrent tabs and separate browser profiles, PIN unlock/relock, logout-all, CSRF same-origin enforcement, failed-auth throttling, and long-idle sessions.
7. **Responsive UI:** Exercise all eight V2 navigation pages and forms on mobile, laptop and desktop sizes. Specifically check modal overlay scroll locking, URL account filters, staged import flow, assistant route cancellation and PDF download after route changes.
8. **V1→V2 data reconciliation:** Make a read-only export/backup of the current Atlas database; compare account balances, transfers, transactions, Autopay schedules, categories, budgets, legacy foreign accounts, investments, archived records, and session schema. Do not overwrite production records to make a test pass.

## Deployment sequencing / rollback

- Preserve existing live deployment, production MongoDB Atlas data and Google OAuth configuration until the new code has passed the above gates. The prior site URL in README is `https://fintrack-api-impd.onrender.com`; verify ownership and service/environment details before deployment.
- Take an authenticated, restorable MongoDB backup and record the existing Render deploy/revision and environment variables (do not place secrets in Git or share them in chat). Confirm `MONGO_URI` is a replica-set cluster and that `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `CLIENT_URL`, `VITE_API_URL`/same-origin API routing and production email/AI settings are correct.
- Deploy from a **verified commit SHA** rather than local uncommitted source. The backend in production serves the built `client/dist` when deployed as a single service; if front end and back end are deployed separately, verify cross-origin cookie settings explicitly rather than assuming the same-origin defaults work.
- Smoke test `/api/health` (database connected), Google login, PIN (if enabled), page navigation, single transfer, investment view, statement preview (disposable data), Autopay visibility and PDF download. Prefer a non-production environment / test account for mutating operations.
- Keep the previous Render revision available for immediate application rollback if smoke tests fail. A code rollback does **not** automatically roll back database changes or irreversible financial writes; restore data only through a separately rehearsed recovery plan.
- Dedicated Google OAuth project migration is a separate final stage; do not mix it into the initial deployment update.

**Decision:** code-level hardening package is prepared, but production release approval remains **CONDITIONAL** on the new GitHub CI run plus environment-specific financial/browser acceptance checks.
