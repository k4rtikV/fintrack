# FinTrack V2 — PAR–SPR–MISC fixes verification gates

Baseline: `fintrack-main(20261010-230300).zip`. This document is a **staging test plan**, not a signed-off staging result.

## Included changes

- H-01: strip currency notation before rejecting negative values in separate Debit/Credit columns; signed-amount imports continue to use signed direction.
- H-02: new investment lots carry original and remaining total cost in **integer paise**, including buy fees. Partial FIFO sales prorate with the final lot sale consuming its exact remainder. Existing lots without these fields fall back to their old unit-cost basis; full liquidation uses the existing holding's remaining recorded cost basis to prevent stranding historical pennies. **Historical realized P&L from past sales is not retroactively rewritten**. Legacy partially-sold lots may need a separate validated trade-history reconciliation.
- H-03: account type/currency changes check transaction, transfer, Autopay, investment, and import references in a MongoDB transaction. Empty account type edits stay allowed.
- M-01: deleting a previously imported transaction removes its fingerprint and supersedes its old batch retry receipt atomically. Commit also reconciles *all* historical receipts (including duplicate-only batches) against current fingerprints within its own transaction. Other imported rows and the old batch history stay intact; a repeated selection can reimport only deleted rows.
- M-02: INR budgets and budget alerts only count expenses from INR accounts; old USD/EUR/GBP accounts remain readable.
- M-03: monthly-trend responses are bounded to 24 calendar months, with strict `YYYY-MM-DD` query dates, order validation, and 60-month bounds on other explicit analytics ranges. Month-trend service also rejects oversized *internal* requests.
- M-04: same-profile concurrent session replacement deterministically revokes only earlier session records, with a 409 for an earlier request that detects a newer active login. Actual parallel-session HTTP testing is still necessary.
- L-01: draft bank rows still have up to 24-hour expiry; changing deletion semantics requires privacy/UX acceptance. No claim of instant deletion after commit.
- L-02: source CI now runs all server scripts plus client lint/build. DB and real-browser scenarios must run separately.

## Required staging testing (not executed in this package)

1. On a disposable replica-set MongoDB, verify atomic account type edits concurrent with transfers/imports/trades; 409 for every referenced account and success for unused account. Test from/to transfer references, inactive Autopay, closed holdings, deleted-import batch history.
2. Import the same CSV/XLSX twice (also with a different category mapping to create a duplicate-only batch), then delete just one imported row and reimport each exact previous selection. Assert exactly one row is recreated and account balance is right; retry in parallel and ensure unique indexes enforce at most once. Re-run with 500 rows, duplicate identical rows, and a mid-commit failure.
3. Buy/sell 333 shares at INR 3 with INR 1.01 fees, including full liquidation, repeated partial fills, multiple lots, concurrent sells. Verify net cash, quantity, total cost basis in paise, exact realized gains, and zero remainder after close. Before using legacy lots, reconcile trade/holding histories in staging and flag any preexisting inaccuracies.
4. With INR and legacy foreign accounts, add matching category expenses and compare budget progress, notification thresholds, reports, account currency, and original V1 balances. Prior incorrect notifications are historical records and are not automatically reversed.
5. Test simultaneous Google sign-ins in two tabs using the same profile, and separate profiles on shared network/OS; ensure at most one active same-profile session, correct browser cookie, Google nonce, trusted PIN, lock/logout, and no cross-profile revocation.
6. Exercise analytics custom dates on leap days, invalid Feb 30, reversed dates, 24/25- and 60/61-month ranges, month boundaries, and unspecified date bounds. Confirm UI reports ranges remain supported.
7. Complete all 17 original server test scripts plus the new hardening suite, client `npm ci && npm run lint && npm run build`, PDF visual checks, manual browser responsive checks and upload privacy review.
8. Record staging dataset hashes, before/after balance snapshots, unique-index status, provider/test configuration, execution receipts, and residual failures before CCRA. Use new Google OAuth project **only after** RC gate and as a separate migration.

## Run locally

```bash
npm ci --prefix server
npm ci --prefix client
npm run test:v2-hardening --prefix server
npm run test:v2-completion --prefix server
npm run test:v2-investments --prefix server
npm run test:report-pdf --prefix server
npm run test:security --prefix server
npm run lint --prefix client
npm run build --prefix client
```

CI runs all server scripts and client checks; this repository does not contain a runnable staging Mongo replica set or live Google provider fixture.
