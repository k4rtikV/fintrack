# FinTrack V2 — post-CCRA acceptance gates

Baseline ZIP: `fintrack-main(20261011-001257).zip`, GitHub green commit `265a0ecc7f86812f2f8047b9bd0f31f4909206c9`.

These are **targeted source fixes**, not evidence of a fully tested final release.

## Changes

1. Investment trades require a strict real `YYYY-MM-DD` date and **nondecreasing trade dates** per account and instrument. Same-day trades remain allowed in insertion order. Earlier-dated trades return `409 INVESTMENT_TRADE_BACKDATED`; historical records are NOT rewritten automatically. Run a separate historical-replay reconciliation if backfilling real statements is needed.
2. Combined trade cash impact is capped at INR 1,000,000,000; rejects unsafe exact-paise gross values while retaining legitimate fee-heavy sales with negative net cash. Both API validator and service guard enforce the cap.
3. Monthly PDF currency policy ignores archived accounts for active balance eligibility but requires any active account to match report currency. Recorded recurring totals/items are scoped to the report denomination, **including historical INR activity on archived INR accounts** while excluding archived USD activity. Existing cross-period assistant analyses remain subject to their separate currency safety policies.
4. Autopay create/edit and account archival now use MongoDB transactions. Autopay reference writes increment a non-financial revision on source/destination account documents. This shares a write-conflict boundary with transactional account type/currency edits and archive. MongoDB replica-set transactions are required, as already assumed by financial services.
5. Same-user browser-scoped sessions use an atomic incrementing `User.browserSignInSequence` across workers; session replacement order no longer depends on ObjectId byte ordering. Unscoped sessions do not participate in browser deduplication; existing pre-upgrade sessions with missing sequence are treated as older.

## Must-run before release

- After `npm ci`, run all `server` `test:*` scripts, frontend `lint`, and frontend `build` with GitHub Actions. Do not disable existing checks.
- In a disposable **replica-set** MongoDB, race account type edits against Autopay create and edit, archive against rule create/resume/transfer, and concurrent two-worker sign-ins with the same browser profile and trusted-device scopes. Confirm results at DB level and with actual JWT revocation. Also test two profiles behind the same IP/UA (no cross-revocation).
- Insert trades buy 10 Oct / sell 9 Oct and confirm 409 + no cash or lot changes. Try a backdated buy after an existing sale, same-day buys and sells, multiple FIFO lots, concurrent sells, and legacy fractional quantity. Reconcile historical realized P&L and holding basis before approving release.
- Reproduce INR PDF with archived foreign account (no historical foreign totals leaked into INR summaries); test active mixed currencies, active USD only, archived INR historical transactions and recurring transfers, plus historical report ranges and PDF output.
- Validate V1 migrated balances/accounts/transactions against source ledger totals, full browser OAuth/PIN workflow, AI navigation cancellation, statement upload/replay, modal state, PDF download, and responsive UI. Dedicated Google OAuth migration is a later independent release stage.

**Staging, historical-data reconciliation and real-browser tests were NOT run as part of this package.**
