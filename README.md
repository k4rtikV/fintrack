# FinTrack V2

### Personal finance, investments, reporting, and AI-assisted insights — in one secure workspace.

**MERN stack · React 19 · Vite 8 · Express 5 · MongoDB Atlas · Google Sign-In · Upstox · Gemini · Brevo**

[**Live website**](https://fintrack-api-impd.onrender.com) · [**Google Sign-In**](https://fintrack-api-impd.onrender.com/login) · [**Source code**](https://github.com/k4rtikV/fintrack)

> **Status (October 2026):** FinTrack V2 is deployed on Render with the existing production database. Deployment, Google Sign-In, account access, selected balances, investment views, and Upstox market data have been exercised in production. Full end-to-end and cross-account regression testing remains ongoing. The Google OAuth application's transition from *Testing* to *In production* is being configured separately; until then, Google limits sign-in to approved test users.

---

## Overview

**FinTrack** is a full-stack, personal finance management application for recording income and expenses, monitoring account balances, organizing investments, managing budgets and goals, automating recurring entries, and exploring financial data through reports and a grounded AI assistant.

V2 replaces the original email/password and OTP sign-in flow with **Google Sign-In** and server-managed sessions, introduces optional six-digit PIN protection for trusted devices, expands investment research using **read-only Upstox market data**, and unifies transactions, categories, and recurring payments in a streamlined dark-only interface.

**FinTrack is not a bank, broker, payment processor, or automated trading system.** Users maintain their own financial records; market information and AI-generated explanations are informational and may be delayed or unavailable.

## Features at a glance

| Workspace | Capabilities |
| --- | --- |
| **Dashboard** | Financial summary, monthly cash-flow charts, income/expense trends, spending breakdowns and account overview |
| **Accounts** | Bank, cash, card, wallet and investment accounts; transaction-linked balances, account history and archival |
| **Transactions** | Income, expenses, transfers, filtering, sorting, date ranges, CSV export, and financial activity history |
| **Statement Import** | CSV/XLSX preview, column/date/debit-credit mapping, row selection, category assignment, duplicate handling and import history |
| **Autopay & Categories** | Recurring schedules, catch-up processing, protected occurrence generation and customizable categories — inside the Transactions workspace |
| **Budget** | Historical and monthly category budgets, spending progress, projections and pace-risk insights |
| **Investments** | NSE/BSE search, holdings, buy/sell records, watchlists, portfolio P&L, stock charts, fundamentals and company research |
| **Goals** | Savings targets, progress, deadlines and required savings pace |
| **Reports** | Financial summaries, period comparisons and downloadable monthly PDF reports |
| **AI Assistant** | Gemini-backed, tool-grounded answers, financial analysis, forecasts, what-if simulations and investment research context |
| **Notifications** | In-app alerts, eligible email copies, recurring and goal events, and security activity |
| **Settings & Security** | Google identity linking, optional trusted-device PIN, lock/unlock, session history, device revocation, profile and timezone preferences |

### V2 interface

- Dark-only **blue-steel/graphite** surfaces with copper actions, ivory text and muted gray-blue details.
- Persistent eight-area top navigation, responsive layouts, accessible controls and consistent chart interactions.
- A unified Transactions workspace with **Transactions / Autopay / Categories** tabs.
- Client-side routing with support for direct links and refreshes on the production server.

---

## Core workspaces

### Accounts, transactions, and statement imports

FinTrack supports multiple account types with balances derived from recorded activity. Users can inspect account-specific histories, record income and expenses, move funds between accounts, and review investment trades without treating investment purchases as ordinary household spending.

The statement importer supports **CSV and XLSX** files with a preview-first workflow. Users can map the statement's fields, choose an account, classify/select entries, review potential duplicates, and commit accepted rows. The backend uses import fingerprints, duplicate checks, and transactional writes to keep account balances and imported transactions consistent.

> Importing and changing transactions can affect account balances. Review previews and duplicates before confirming a write.

### Autopay

Recurring schedules support periodic financial activity, including daily, weekly, monthly and yearly cadences. FinTrack applies duplicate-occurrence safeguards and handles calendar edge cases such as month ends and leap years.

The backend performs a **startup catch-up sweep** and schedules additional sweeps at a configurable interval (15 minutes by default). **Render Free can sleep while idle**, so a running interval should not be treated as an always-on background job. Due entries are reconciled when the service wakes or starts; timing can therefore be delayed.

### Investments and market research

FinTrack's investment workspace tracks user-entered trades, share quantities, cost basis, realized/unrealized P&L, investment account balances and watchlists. Investment purchases and sales are kept distinct from conventional expense and income reports.

The backend uses an **Upstox Analytics Token** for read-only NSE/BSE data, including:

- Symbol search, quotes, market status and historical/intraday price charts.
- Stock overview, financial fundamentals, statements, shareholding patterns and available news/corporate-action information.
- Portfolio and watchlist market-value refreshes, plus external research links.

The app **does not connect to an actual Upstox brokerage account, place orders, sync broker holdings, or initiate trades**. Prices can be delayed, unavailable, or last-session values when an exchange is closed.

### Budgets, goals, and reporting

Users can create monthly category budgets and savings goals; view historical progress; and inspect financial reports over predefined or custom ranges. Budget calculations include actual recorded spending, remaining amount and projection context. The PDF reporting system uses **PDFKit** and keeps financial totals in application-side deterministic calculations.

### AI Assistant

The AI Assistant uses **Google Gemini** to interpret results returned by authenticated, scoped backend tools. FinTrack performs numeric calculations on the server rather than delegating financial arithmetic to the language model. Capabilities include spending comparisons, budget analysis, goals, anomaly-aware projections, hypothetical scenarios, and read-only investment context.

The assistant does not have unrestricted database access and does not execute bank transfers, brokerage orders, or user-record mutations. Model availability and request limits depend on the configured Google AI service.

---

## Authentication and security

### Google Sign-In

FinTrack V2 uses **Google Identity Services** as its primary sign-in method. The frontend retrieves the OAuth client ID from the backend at `GET /api/auth/google/config`; it does **not** require a `VITE_GOOGLE_CLIENT_ID` variable.

For an existing V1 account, a **one-time explicit migration** can link the Google identity after the user confirms the old FinTrack password. FinTrack does not automatically claim an existing account based on a matching email address alone. Legacy password/OTP sign-in is retired after migration.

### Trusted-device PIN and sessions

Users can optionally enable a **six-digit PIN** for a trusted browser/device. A salted, memory-hard `scrypt` verifier is kept server-side; sensitive operations require recent strong Google authentication. Protection includes idle locking, failed-attempt cooldowns, unlock checks, session revocation and security activity history.

Additional safeguards include secure/HttpOnly cookies in production, server-side session verification, CSRF Origin/Referer enforcement, CORS origin restrictions, Helmet headers, validation, rate limiting, and user-scoped data access. The PIN is an optional session-unlock convenience, **not** a replacement for Google identity verification.

> Security is an ongoing engineering process. Public deployment does not itself constitute a third-party audit or guarantee of security.

---

## Public pages and OAuth publication

FinTrack's public-facing pages are designed for visitors who have **not** signed in:

| Route | Purpose |
| --- | --- |
| `/` | Public FinTrack homepage and feature overview |
| `/login` | Google Sign-In and one-time V1-account migration |
| `/privacy` | Public privacy policy |
| `/terms` | Public Terms of Service |

The public-page update includes footer links and links from the login page. **The `/`, `/privacy`, and `/terms` routes require the corresponding public-branding-page update to be included in a deployment**; the original V2 commit `7046366` does not yet contain those routes.

For Google Auth Platform → **Branding**, use the publicly accessible pages after deployment:

```text
Application home page:         https://fintrack-api-impd.onrender.com/
Application privacy policy:    https://fintrack-api-impd.onrender.com/privacy
Application Terms of Service:  https://fintrack-api-impd.onrender.com/terms
```

The OAuth application is configured as **External**. Publishing to **In production** is a separate Google Cloud step and may involve consent-screen or domain-related validation; having public pages does not itself remove Google's test-user restriction.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 4, Recharts, TanStack Query, Axios, React Hook Form, Zod, Lucide |
| Backend | Node.js 22, Express 5, MongoDB/Mongoose 9, JWT, cookie-parser, Zod, Helmet, express-rate-limit |
| Reporting | PDFKit; CSV exports and CSV/XLSX statement import |
| Authentication | Google Identity Services, server sessions, optional `scrypt`-protected PIN |
| Market data | Upstox APIs — read-only market/analytics token |
| AI | Google Gemini with configurable primary/fallback models |
| Email | Brevo transactional email API |
| Deployment | Render web service (API and React build served together), MongoDB Atlas |

## Repository structure

```text
fintrack/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── services/
│   │   └── validators/
│   ├── .env.example
│   └── package.json
├── package.json
└── README.md
```

---

## Local development

### Prerequisites

- **Node.js 22.12+** and npm (production was configured with Node 22.16.0).
- Access to a MongoDB database, a Google Cloud OAuth **Web application** client, and the relevant external API keys.
- A Google OAuth **Authorized JavaScript origin** of `http://localhost:5173` for local Google Sign-In testing.

### Install

```bash
git clone https://github.com/k4rtikV/fintrack.git
cd fintrack
npm ci
npm ci --prefix server
npm ci --prefix client
```

### Backend environment

Create `server/.env` from `server/.env.example` and set the values for your own development environment:

```dotenv
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
TRUST_PROXY_HOPS=1

MONGO_URI=mongodb+srv://USER:PASSWORD@HOST/fintrack-dev
JWT_SECRET=replace_with_a_long_random_secret_of_at_least_32_characters
JWT_EXPIRES_IN=30d
GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=FinTrack

GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=your_available_primary_model
GEMINI_FALLBACK_MODEL=your_available_fallback_model
GEMINI_ENABLE_FALLBACK=true

UPSTOX_ANALYTICS_TOKEN=your_valid_upstox_analytics_token

PIN_IDLE_LOCK_MINUTES=15
PIN_STRONG_AUTH_MINUTES=10
AUTOPAY_SCHEDULER_INTERVAL_MINUTES=15

AUTH_RATE_LIMIT_MAX=60
AUTH_RATE_LIMIT_WINDOW_MINUTES=15
ASSISTANT_RATE_LIMIT_MAX=120
ASSISTANT_RATE_LIMIT_WINDOW_MINUTES=15
```

`UPSTOX_ANALYTICS_TOKEN` is optional for server startup, but market-data features require a valid token. Existing `OTP_*` environment options may remain for compatibility with the repository example, although V2's primary sign-in is Google-only.

**Never commit `.env` files, database URIs containing credentials, PINs, tokens, or OAuth client secrets.** Google Identity Services sign-in uses a client ID, not a backend Google client secret.

### Frontend API URL

The frontend automatically uses `http://localhost:5000/api` during development and `/api` in a production build. `client/.env` is optional; set `VITE_API_URL` only when a custom API origin is required. Do **not** point a production build at `localhost`.

### Run

```bash
npm run dev
```

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Health:   http://localhost:5000/api/health
```

---

## Testing and regression checks

```bash
npm run lint --prefix client
npm run build --prefix client

npm run test:assistant --prefix server
npm run test:report-pdf --prefix server
npm run test:security --prefix server
npm run test:v2-auth --prefix server
npm run test:v2-pin --prefix server
npm run test:v2-transactions --prefix server
npm run test:v2-autopay --prefix server
npm run test:v2-investments --prefix server
npm run test:v2-research --prefix server
npm run test:v2-deployment --prefix server
npm run test:v2-stale-navigation --prefix server
npm run test:v2-navigation-chains --prefix server
```

Additional focused V2 regression scripts are listed in `server/package.json`. A passing automated suite is a prerequisite, not a substitute for production and multi-account verification.

### Production smoke-test focus

- Google sign-in, new-account onboarding, one-time V1 account linking and session renewal.
- Optional PIN enrollment, lock/unlock, reset and session revocation.
- Existing accounts, transaction balances, investment lots/trades and historical reports.
- Statement preview, duplicate detection and safe import commit.
- Autopay catch-up, occurrence uniqueness and notifications.
- Budgets, goals, monthly PDF download and grounded AI Assistant behavior.
- Upstox quotes, chart history, closed-market messaging and unavailable-provider behavior.
- Cross-user isolation, authorized browser origins, direct-route refresh and logout.

---

## API overview

All endpoints share the `/api` prefix. Most finance, security, and market-data routes require an authenticated and unlocked session.

| Area | Routes (examples) |
| --- | --- |
| Auth | `GET /api/auth/google/config`, `POST /api/auth/google`, `POST /api/auth/google/link-legacy`, `POST /api/auth/google/reauth`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Finance | `/api/accounts`, `/api/transactions`, `/api/categories`, `/api/budgets`, `/api/goals`, `/api/recurring`, `/api/analytics` |
| Statement imports | `/api/statement-imports/preview`, `/prepare`, `/commit`, `/history` |
| Investments | `/api/investments/portfolio`, `/trades`, `/watchlist`, `/market/search`, `/market/quote/:instrumentId` and instrument research routes |
| AI | `POST /api/assistant/chat` |
| Reports | `GET /api/reports/monthly-pdf` |
| Security | `/api/security/pin/*`, `/api/security/sessions`, `/api/security/activity` |
| Health | `GET /api/health` |

`/api/health` reports whether the server has a live MongoDB connection.

---

## Render deployment

The production configuration uses **one Render Node web service** for both Express and the compiled React frontend. The deployment keeps the existing app URL and MongoDB database; it does not require a separate static site.

| Setting | Production value |
| --- | --- |
| Repo / branch | `k4rtikV/fintrack` / `main` |
| Root directory | Repository root (blank) |
| Node.js | `22.16.0` in the deployed configuration |
| Build command | `npm ci --prefix server && npm ci --include=dev --prefix client && npm run build --prefix client` |
| Start command | `npm run start --prefix server` |
| Health check | `/api/health` |
| Auto-deploy | Off for controlled manual rollouts |
| Public base URL | `https://fintrack-api-impd.onrender.com` |

**Why `--include=dev`?** The React build needs Vite and related plugins even when Render runs with `NODE_ENV=production`. Omitting frontend dev dependencies causes a missing `@vitejs/plugin-react` build error.

Keep the existing `MONGO_URI` and `JWT_SECRET` stable through V1 → V2 migration. Store `GOOGLE_CLIENT_ID`, `UPSTOX_ANALYTICS_TOKEN`, `BREVO_*`, `GEMINI_*`, and other secrets **only** in Render's environment settings, never in the repository.

### Backup and rollback

Before deployments that may affect financial records, create a **database-specific MongoDB archive** and test it with `mongorestore --dryRun` (preferably also a separate test restore). Confirm collection counts and key balances. For production incidents, use the previously healthy code revision and the verified data backup as separate recovery controls: **rolling back code does not undo transactions written to MongoDB by newer code**.

On Render Free, cold starts and service sleeping can delay API responses and periodic Autopay sweeps.

---

## Limits and disclaimers

- **No bank integration:** account information and transactions are maintained by FinTrack users or imported from supported files.
- **No brokerage execution:** Upstox is used for read-only market information, not portfolio synchronization or trading.
- **No financial guarantees:** AI explanations, projections and market information are informational, not professional investment, tax or financial advice.
- **External-service dependencies:** Google Sign-In, Brevo, Gemini, Upstox, Render and MongoDB Atlas can be unavailable or subject to quotas/rate limits.
- **Privacy and data protection:** public-facing policy pages should accurately reflect the application's data-processing practices before opening Google OAuth to unrestricted users.

---

## Author

**Kartik Varma** · [GitHub](https://github.com/k4rtikV)

FinTrack is a portfolio-grade full-stack project emphasizing **financial data integrity, secure sessions, deterministic analytics, read-only AI and market-data integration, production deployment, and user-focused design**.

**FinTrack — understand where your money goes.**
