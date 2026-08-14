FinTrack

FinTrack is a full-stack personal finance management platform built with the MERN stack. It combines day-to-day money tracking with budgeting, goals, recurring transactions, analytics, notifications, AI-assisted financial analysis, anomaly-aware forecasting, professional monthly PDF reports, and production-oriented security controls.

The project is designed to go beyond a basic CRUD finance tracker. FinTrack treats financial data as an integrated system: transactions update account balances, budgets react to spending, goals are evaluated against saving pace, recurring transactions generate real records, reports share the same analytical engine as the AI Assistant, and authentication is backed by revocable server-side sessions and security activity logging.

Table of Contents

Project Status

Highlights

Feature Overview

Authentication and Account Security

Dashboard and Analytics

Accounts

Transactions

Categories

Budgets

Savings Goals

Recurring Transactions

Notifications

Reports

AI Assistant

Monthly PDF Financial Report

Settings and Personalization

Security Architecture

AI and Financial Intelligence

System Architecture

Technology Stack

Project Structure

Core Data Model

API Reference

Getting Started

Environment Variables

Available Scripts

Testing and Verification

Production Deployment

Important Implementation Details

Known Constraints

Future Ideas

Author

Project Status

Status: Feature-complete and deployment-ready after final regression/security hardening.

FinTrack currently includes:

Complete finance-management workflow

Email OTP authentication

Server-tracked revocable sessions

Security activity logging

New-login security alerts

Analytics dashboard

Budgeting and savings goals

Recurring transaction automation

Notification system

AI financial assistant

Spending anomaly detection

Month-end financial forecasting

What-if financial simulation

Monthly PDF reporting

Dark/light themes

Timezone-aware financial date handling

Production CORS, CSRF, rate limiting, environment validation, and health checks

Highlights

Grounded AI Assistant — answers questions using the authenticated user's real FinTrack data through controlled server-side financial tools.

Anomaly-aware forecasting — avoids blindly extrapolating large one-off spending through the rest of the month.

Cross-feature consistency — Transactions, Accounts, Budgets, Reports, Assistant calculations, Notifications, and PDF reports share the same underlying financial data.

Server-side session revocation — a browser can be remotely logged out even if it still holds a previously issued JWT.

Security activity timeline — successful logins, failed password attempts, failed OTP attempts, password changes, logout events, and session revocations are recorded without logging credentials or financial contents.

Professional PDF reports — downloadable monthly financial documents with summaries, budget performance, goal snapshots, recurring activity, anomaly insights, and current-month forecasts.

Timezone-safe finance dates — calendar dates are handled separately from timestamps to prevent transactions shifting days across timezones.

Production hardening — Helmet, CORS allowlisting, CSRF protection, rate limiting, secure cookies, request-size limits, input validation, environment fail-fast checks, and MongoDB-aware health checks.

Feature Overview

Authentication and Account Security

FinTrack uses a multi-stage email-based authentication flow.

Registration

User submits name, email, and password.

Password is hashed with bcrypt.

A registration OTP is generated.

Only the OTP hash is stored.

The verification code is sent through Brevo.

Registration is completed after valid OTP verification.

A server-managed authenticated session is created.

Login

User enters email and password.

Password is verified.

FinTrack sends a login OTP through email.

The user submits the OTP.

A server-side session is created.

A JWT containing the session identifier is issued through a secure cookie.

A new-login security email is sent.

OTP Protections

Configurable OTP expiration

Resend cooldown

Maximum OTP attempts

Hashed OTP storage

Authentication endpoint rate limiting

Failed login OTP activity logging

Password Management

Users can change their password from Settings.

A successful password change:

updates the password hash

updates passwordChangedAt

revokes all existing active sessions

clears the current auth cookie

clears private frontend query state

redirects the user to login

records a security activity event

Dashboard and Analytics

The dashboard provides an overview of the user's financial position.

Summary cards

Total account balance

Total income

Total expenses

Overall savings rate

Analytics visualizations

Monthly cash-flow trend

Income vs. expenses

Expense-category breakdown

Category percentages

Top expenses

Account summary

The category donut preserves the real financial percentages while giving extremely small categories a minimum visual slice so values such as ₹600 / 0.15% remain visible.

Accounts

FinTrack supports multiple financial accounts.

Supported account types

Bank

Cash

Card

Wallet

Investment

Each account includes:

name

account type

current balance

currency

icon

color

archive state

Account integrity behavior

Transaction mutations update account balances consistently.

When editing or deleting historical transactions, FinTrack correctly reverses previous balance effects before applying new ones.

An account cannot be archived while an active recurring transaction still depends on it. The recurring schedule must first be paused, updated, or removed.

Historical transactions attached to an account remain editable even if that account is later archived.

Transactions

Transactions are the core financial records in FinTrack.

Each transaction supports:

Income or expense

Amount

Title

Account

Category

Transaction date

Payment method

Tags

Notes

Optional recurring-transaction linkage

Supported payment methods

Cash

UPI

Card

Bank transfer

Cheque

Other

Transaction features

Add transaction

Edit transaction

Delete transaction

Search

Filter by type

Filter by account

Filter by category

Date-range filtering

Sort controls

Pagination

Quick date ranges

CSV export

Quick transaction templates

Search and pagination behavior

Search is debounced to avoid one server request per keystroke.

Pagination automatically corrects itself if deleting records removes the current last page.

Bulk selections are cleared when filters/pages change to avoid hidden selected records.

The UI shows explicit result ranges such as:

Showing 21–30 of 46 · Page 3 of 5

CSV export

CSV export fetches all matching transaction pages, not only the first 100 records.

The export also neutralizes spreadsheet formula prefixes in user-controlled text to reduce CSV formula-injection risk when opened in spreadsheet software.

Quick Templates

Transaction templates are stored locally and scoped by authenticated user ID:

fintrack_transaction_templates:<user-id>

This prevents templates from one FinTrack account appearing in another account on the same browser.

Categories

FinTrack includes income and expense categories.

Default income categories

Salary

Freelance

Investment

Refund

Default expense categories

Food

Transport

Shopping

Bills

Rent

Entertainment

Healthcare

Education

Investment

Other

Users can also create custom categories.

Categories include:

name

income/expense type

icon

color

display order

default/custom state

archive state

A category cannot be archived while an active recurring schedule still depends on it.

Budgets

Budgets are monthly, category-specific spending limits.

Each budget includes:

category

month

amount

note

FinTrack calculates:

amount spent

amount remaining

percentage used

over-budget state

unbudgeted spending

projected month-end usage

pace risk

projection confidence

Anomaly-aware budget pace

Budget forecasting does not blindly repeat anomalous spending.

Example:

Investment budget: ₹5,00,000
Current spend:     ₹4,00,000
Actual usage:      80%

If the ₹4,00,000 expense is identified as a one-off/anomalous outlay, FinTrack can keep the projected usage near the actual 80% rather than linearly extrapolating that expense into an unrealistic >200% month-end projection.

Budget pace risk is recalculated after anomaly adjustment, ensuring:

Budgets page

Financial Health

AI Assistant

Forecasting

Monthly PDF report

all describe the same projected risk state.

Savings Goals

Users can create financial goals with:

name

target amount

current amount

target date

note

color

icon

FinTrack calculates:

completion percentage

remaining amount

days remaining

overdue status

estimated contribution requirements

portfolio-level goal progress

Goal calculations use the user's configured FinTrack timezone.

Goal milestone events can also create notifications.

Recurring Transactions

Recurring transactions automate repeated income and expense records.

Supported frequencies

Daily

Weekly

Monthly

Yearly

Recurring schedules include:

account

category

type

amount

title

notes

payment method

tags

interval

start date

optional end date

next run date

last run date

active/paused state

Processing

FinTrack supports:

Process all due recurring transactions

Process an individual recurring schedule

Pause/update/delete recurring schedules

Generated transactions are linked back to the recurring schedule.

A unique recurring-occurrence constraint prevents the same scheduled occurrence from being generated twice.

Calendar correctness

Recurring schedule arithmetic uses calendar-safe date logic, including:

month-end clamping

leap-year handling

timezone-aware "today"

compatibility normalization for older local-midnight recurring dates

Notifications

FinTrack has an in-app notification system with:

Budget alerts

Goal alerts

Recurring transaction alerts

System notifications

Notifications support:

unread state

mark one as read

mark all as read

action URLs

metadata

deduplication keys

The notification bell can refresh immediately after relevant actions rather than waiting only for the periodic polling fallback.

Email copies can be configured from Settings for normal financial notifications.

Security login emails are intentionally independent of the normal finance-email preference.

Reports

The Reports module provides analytical views over financial activity.

Report functionality includes:

period-based financial summaries

spending by category

cash-flow analytics

budget performance

account summaries

transaction comparisons

historical period analysis

Report and Dashboard queries are invalidated when upstream financial data changes so users do not need a hard refresh to see updated values.

AI Assistant

FinTrack includes a grounded AI Assistant powered through Gemini.

The Assistant does not receive unrestricted database access.

Instead, the server exposes controlled financial tools that return scoped data for the authenticated user.

Assistant toolset

FinTrack currently supports tools for:

get_financial_overview
get_account_balances
get_recent_transactions
get_spending_by_category
get_monthly_trend
compare_month_to_date
get_budget_status
get_goal_progress
get_recurring_transactions
get_financial_health_summary
analyze_spending_patterns
get_financial_forecast
simulate_financial_scenario

Example questions

How am I doing financially this month?

Am I on track with my current budgets?

What spending looks unusual or out of pattern this month?

How am I projected to finish this month?

What if I spend ₹25,000 more this month?

Review my savings goals and priorities.

Where am I spending the most?

How does this month compare with last month?

Grounded response design

The Assistant combines:

deterministic FinTrack calculations

controlled financial tools

Gemini-generated explanation

The application builds authoritative metric cards from FinTrack data instead of trusting the model to invent financial metrics.

Structured model responses are normalized defensively so raw JSON/code-fenced payloads are not exposed directly in the chat interface.

Assistant rate limiting

Assistant requests are rate-limited per authenticated FinTrack account.

Monthly PDF Financial Report

FinTrack can generate a professional monthly financial report using PDFKit.

Reports can be generated for current or historical months.

The PDF can include:

Executive summary

Income / expense / savings overview

Category spending breakdown

Budget performance

Unbudgeted spending

Transaction highlights

Account snapshot

Goal snapshot

Recurring activity

Current-month forecast

Spending anomalies/pattern signals

Financial insights

Report notes and analytical limitations

Shared forecast engine

For the current month, the PDF uses the same hardened forecast engine used by the AI Assistant.

This prevents the Assistant and PDF report from producing unrelated month-end forecasts.

Historical-report transparency

FinTrack explicitly distinguishes true historical records from current snapshots.

For example:

transactions can be reconstructed historically

account balances are current snapshots unless historical balance snapshots exist

goal progress is a generation-time snapshot

forecasts are directional estimates

These limitations are stated in the generated report instead of implying unavailable historical data exists.

Settings and Personalization

Settings include:

Profile

Full name

Preferred currency

Timezone

Locale-related formatting

Supported currencies currently include:

INR

USD

EUR

GBP

Theme

Light mode

Dark mode

Theme preference is saved locally and applied across FinTrack.

Native date inputs use theme-aware browser color schemes so the calendar picker icon remains visible in both light and dark mode.

Notification preferences

Users can configure finance-related notification behavior.

Password

Secure password-change flow with global session invalidation.

Security

Phase 16 adds:

Active Sessions

Current-device identification

Individual session revocation

Log out all other devices

Security Activity timeline

New-login security alerts

Security Architecture

Security is a major part of the final FinTrack design.

Password Security

Passwords are hashed using:

bcrypt cost factor: 12

Passwords are never returned through normal User JSON serialization.

JWT + Server-Side Session Model

FinTrack combines signed JWT authentication with a server-maintained UserSession.

A successful authenticated login creates a session containing:

random session ID

user ID

IP/network address

user agent

browser

operating system

device type

creation time

last-seen time

expiration

revocation state

The JWT contains the session identifier.

Every protected request verifies:

JWT validity

authenticated user existence

password-change validity

server-side session existence

server-side session active state

session expiration

This means a server-side session revocation invalidates an already-issued JWT on the next protected request.

Active Session Management

Settings shows active authenticated devices.

Users can:

identify the current browser/session

revoke another individual session

log out all other devices

A revoked browser is redirected to login when it next accesses a protected resource.

MongoDB TTL indexing automatically removes expired session records.

Security Activity Log

Security events include:

Registration success

Successful login

Failed password login

Failed login OTP

Password changed

Session revoked

Other sessions revoked

Logout

Security records include operational context such as:

browser

operating system

device type

network address

timestamp

Sensitive values are intentionally excluded.

FinTrack does not write these into security event records:

password values

OTP values

JWT strings

transaction contents

financial notes/details

Login Security Alerts

Every successful password + OTP login can send a Brevo security email containing:

device type

browser

operating system

network address

login time

link to FinTrack Settings

A temporary email-provider failure does not invalidate an otherwise successful authenticated login.

Secure Cookies

Production authentication uses an HttpOnly secure cookie.

This reduces direct JavaScript access to authentication credentials.

Production requires HTTPS because secure cookies are enabled.

CSRF Protection

FinTrack validates the Origin / Referer of unsafe cookie-authenticated requests.

Protected mutation methods include:

POST
PATCH
PUT
DELETE

Trusted frontend origins come from the configured client-origin allowlist.

This complements CORS rather than assuming CORS alone prevents cross-site cookie submissions.

CORS

Frontend origins are normalized and allowlisted.

CLIENT_URL can contain one or multiple comma-separated origins.

Example:

CLIENT_URL=https://fintrack.example.com,https://preview.fintrack.example.com

HTTP Hardening

The Express application uses:

helmet

disabled X-Powered-By

JSON body-size limits

URL-encoded body-size limits

centralized validation

centralized error handling

Current request-body limit:

10 KB

Rate Limiting

Authentication

Public registration/login/OTP endpoints are network/IP rate-limited.

Defaults:

60 requests / 15 minutes

AI Assistant

Authenticated AI requests are rate-limited per FinTrack account.

Defaults:

120 requests / 15 minutes

PDF Reports

Monthly report downloads are rate-limited per authenticated account.

Validation

FinTrack uses Zod schemas for API validation.

Validation covers areas such as:

Object IDs

transaction types

dates

pagination

sorting

account/category data

budget months

goal values

recurring schedules

Assistant prompts

security activity queries

Settings updates

Production Environment Validation

The backend fails fast when required production configuration is missing.

Important production variables include:

MongoDB URI

sufficiently strong JWT secret

client frontend origin

Brevo credentials

Gemini API key

Frontend Cache Isolation

Private React Query state is cleared when authentication boundaries change, including:

logout

password invalidation

protected-request 401

transition to a different authenticated user

This prevents cached finance data from Account A being briefly reused after Account B logs in within the same SPA/browser.

AI and Financial Intelligence

FinTrack's AI layer is designed around deterministic financial calculations first and natural-language explanation second.

Spending Pattern Analysis

The spending-pattern engine can identify:

large spending concentrations

new category activity

unusual amounts

changes relative to comparable historical windows

categories without sufficient historical baselines

Signals are contextualized relative to the actual FinTrack history available.

A signal marked unusual does not imply fraud or unauthorized activity.

Anomaly-Aware Forecasting

A naive forecast could use:

month-to-date spending / elapsed days × days in month

That works poorly when a large one-time purchase occurs early in a month.

FinTrack instead separates:

already incurred spending

anomalous / high-severity one-off spending

routine non-anomalous pace

historical expense baselines where meaningful

known recurring items still due

One-off spending is included in the month exactly once rather than automatically repeated through every remaining day.

Forecast ranges also respect already-recorded totals.

Forecast Confidence

Forecasts expose confidence rather than presenting an estimate as certainty.

Confidence can be reduced when:

limited history exists

unusual spending dominates the current period

baseline months are sparse

spending patterns are structurally different

What-If Simulation

The Assistant can evaluate hypothetical financial changes without altering real records.

Example:

What if I spend ₹25,000 more this month?

Scenario results can estimate effects on:

total expenses

net savings

savings rate

budget pressure

projected month-end outcome

System Architecture

flowchart LR
    Browser[React + Vite Client]
    API[Express API]
    Auth[Auth / Session Layer]
    Services[Domain Services]
    AI[Assistant Orchestrator]
    Gemini[Gemini API]
    Email[Brevo Email]
    PDF[PDFKit]
    DB[(MongoDB Atlas)]

    Browser -->|Axios + credentials| API
    API --> Auth
    Auth --> DB
    API --> Services
    Services --> DB
    API --> AI
    AI --> Services
    AI --> Gemini
    Services --> Email
    API --> PDF
    PDF --> Services

Request Flow

A typical protected finance request follows:

React UI
  ↓
Axios API client
  ↓
Express route
  ↓
JWT + server-session authentication
  ↓
Zod validation
  ↓
Controller
  ↓
Domain service
  ↓
MongoDB
  ↓
Structured API response
  ↓
React Query cache/UI

AI requests add a controlled tool-orchestration layer:

User question
  ↓
Assistant route
  ↓
Authenticated FinTrack user
  ↓
Intent/tool routing
  ↓
Authoritative FinTrack tool data
  ↓
Gemini explanation
  ↓
Response normalization
  ↓
Structured cards + readable narrative

Technology Stack

Frontend

Technology

Purpose

React 19

Component-based UI

Vite

Development server and production build

React Router

SPA routing

TanStack React Query

Server-state caching/invalidation

Axios

HTTP client

React Hook Form

Form state

Zod

Client validation

Recharts

Charts and analytics

Tailwind CSS

Styling utility pipeline

Lucide React

Icons

React Hot Toast

User feedback

date-fns

Date utilities

Backend

Technology

Purpose

Node.js

Server runtime

Express 5

REST API

MongoDB

Primary database

Mongoose

ODM and schema/index management

JWT

Signed authentication token

bcryptjs

Password hashing

Zod

Request validation

Helmet

HTTP security headers

CORS

Frontend origin control

cookie-parser

Auth-cookie parsing

express-rate-limit

Abuse/rate protection

PDFKit

Monthly PDF generation

Axios

External API requests

Morgan

Development request logging

External Services

Service

Purpose

MongoDB Atlas

Managed database

Brevo

OTP, notification and security emails

Google Gemini

AI Assistant language generation

Project Structure

fintrack/
├── client/
│   ├── public/
│   │   └── fintrack-logo.png
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   ├── goals/
│   │   │   ├── layout/
│   │   │   ├── recurring/
│   │   │   ├── reports/
│   │   │   └── transactions/
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── AccountsPage.jsx
│   │   │   ├── AssistantPage.jsx
│   │   │   ├── BudgetsPage.jsx
│   │   │   ├── CategoriesPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── GoalsPage.jsx
│   │   │   ├── RecurringPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── TransactionsPage.jsx
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── constants/
│   │   ├── controllers/
│   │   ├── emails/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── package.json
└── README.md

Core Data Model

User

Stores:

profile identity

email

password hash

preferred currency

timezone

locale

notification preferences

email-verification state

OTP hashes/expiration/attempt counters

last login

password-change timestamp

Account

Stores:

owner

name

account type

balance

currency

visual metadata

archive state

Category

Stores:

owner

name

income/expense type

icon/color

display order

default/custom state

archive state

Transaction

Stores:

owner

account

category

income/expense type

amount

title

note

calendar date

payment method

tags

recurring link

Budget

Stores one category budget per user/month.

Unique constraint:

user + category + month

Goal

Stores:

target amount

current amount

target date

note

presentation metadata

RecurringTransaction

Stores:

account/category

amount/type

schedule frequency

interval

next run date

last run date

active state

Notification

Stores:

notification type

title/message

action route

metadata

deduplication key

read state

UserSession

Stores the server-managed authenticated session.

Expired sessions are removed using a TTL index.

SecurityEvent

Stores non-sensitive authentication and session security events.

API Reference

Base development URL:

http://localhost:5000/api

All finance/security/settings routes require authentication unless explicitly noted.

Authentication

Method

Endpoint

Description

POST

/auth/register

Begin registration

POST

/auth/verify-registration-otp

Verify registration OTP

POST

/auth/resend-registration-otp

Resend registration OTP

POST

/auth/login

Verify email/password and begin login OTP

POST

/auth/verify-login-otp

Verify login OTP and create managed session

POST

/auth/resend-login-otp

Resend login OTP

POST

/auth/logout

Revoke current session and logout

GET

/auth/me

Get current authenticated user

Accounts

Method

Endpoint

Description

POST

/accounts

Create account

GET

/accounts

List accounts

GET

/accounts/:accountId

Get one account

PATCH

/accounts/:accountId

Update account

PATCH

/accounts/:accountId/archive

Archive account

Categories

Method

Endpoint

Description

POST

/categories

Create category

GET

/categories

List categories

GET

/categories/:categoryId

Get category

PATCH

/categories/:categoryId

Update category

PATCH

/categories/:categoryId/archive

Archive category

Transactions

Method

Endpoint

Description

POST

/transactions

Create transaction

GET

/transactions

List/search/filter/paginate transactions

GET

/transactions/:transactionId

Get transaction

PATCH

/transactions/:transactionId

Update transaction

DELETE

/transactions/:transactionId

Delete transaction

Analytics

Method

Endpoint

Description

GET

/analytics/overview

Financial overview

GET

/analytics/category-breakdown

Category spending data

GET

/analytics/monthly-trend

Monthly income/expense trend

GET

/analytics/top-expenses

Top expense transactions

GET

/analytics/account-summary

Account summary

Budgets

Method

Endpoint

Description

POST

/budgets

Create monthly category budget

GET

/budgets

List budgets

GET

/budgets/:budgetId

Get budget

PATCH

/budgets/:budgetId

Update budget

DELETE

/budgets/:budgetId

Delete budget

Goals

Method

Endpoint

Description

POST

/goals

Create goal

GET

/goals

List goals

GET

/goals/:goalId

Get goal

PATCH

/goals/:goalId

Update goal

DELETE

/goals/:goalId

Delete goal

Recurring Transactions

Method

Endpoint

Description

POST

/recurring

Create recurring schedule

GET

/recurring

List recurring schedules

POST

/recurring/process

Process all due schedules

POST

/recurring/:recurringId/process

Process one schedule

GET

/recurring/:recurringId

Get schedule

PATCH

/recurring/:recurringId

Update schedule

DELETE

/recurring/:recurringId

Delete schedule

Notifications

Method

Endpoint

Description

GET

/notifications

List notifications

PATCH

/notifications/read-all

Mark all as read

PATCH

/notifications/:notificationId/read

Mark one as read

AI Assistant

Method

Endpoint

Description

POST

/assistant/chat

Ask a grounded financial question

Assistant requests are authenticated and account-rate-limited.

Reports

Method

Endpoint

Description

GET

/reports/monthly-pdf

Download a monthly financial PDF

Security

Method

Endpoint

Description

GET

/security/sessions

Get active sessions

DELETE

/security/sessions/:sessionId

Revoke another session

POST

/security/sessions/revoke-others

Revoke all sessions except current

GET

/security/activity

Get security activity

Settings

Method

Endpoint

Description

GET

/settings

Get settings

PATCH

/settings/profile

Update profile preferences

PATCH

/settings/notifications

Update notification preferences

PATCH

/settings/password

Change password and revoke all sessions

Health Check

GET /api/health

Healthy response requires MongoDB connectivity.

Example:

{
  "success": true,
  "message": "FinTrack API is working",
  "environment": "production",
  "database": "connected",
  "timestamp": "..."
}

If the API process is alive but MongoDB is unavailable, the endpoint returns HTTP 503.

Getting Started

Prerequisites

Install:

Node.js

npm

Git

MongoDB Atlas account or compatible MongoDB instance

Brevo account with verified sender

Gemini API key

1. Clone the repository

git clone <your-fintrack-repository-url>
cd fintrack

2. Install dependencies

Install everything from the root:

npm run install-all

Or install each workspace separately:

npm install --prefix client
npm install --prefix server

For reproducible CI/deployment installs:

npm ci --prefix client
npm ci --prefix server

3. Configure the frontend

Create:

client/.env

Development:

VITE_API_URL=http://localhost:5000/api

4. Configure the backend

Create:

server/.env

Example development configuration:

NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

TRUST_PROXY_HOPS=1

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_characters
JWT_EXPIRES_IN=30d

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=FinTrack

OTP_EXPIRES_MINUTES=10
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5

AUTH_RATE_LIMIT_MAX=60
AUTH_RATE_LIMIT_WINDOW_MINUTES=15

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_primary_gemini_model
GEMINI_FALLBACK_MODEL=your_fallback_gemini_model
GEMINI_ENABLE_FALLBACK=true

ASSISTANT_RATE_LIMIT_MAX=120
ASSISTANT_RATE_LIMIT_WINDOW_MINUTES=15

Never commit real .env credentials.

5. Start FinTrack

From the root:

npm run dev

This starts both:

Frontend: http://localhost:5173
Backend:  http://localhost:5000

You can also run them independently:

npm run client
npm run server

Environment Variables

Frontend

VITE_API_URL

Base API URL used by the React application.

Development:

VITE_API_URL=http://localhost:5000/api

Production:

VITE_API_URL=https://your-backend-domain.example/api

Production builds intentionally fail clearly if this variable is missing.

Backend

Core

Variable

Description

NODE_ENV

development or production

PORT

Express server port

CLIENT_URL

Allowed frontend origin(s)

TRUST_PROXY_HOPS

Reverse proxy hop count in production

MONGO_URI

MongoDB connection string

JWT_SECRET

JWT signing secret

JWT_EXPIRES_IN

JWT/session lifetime

Email / OTP

Variable

Description

BREVO_API_KEY

Brevo API key

BREVO_SENDER_EMAIL

Verified sender email

BREVO_SENDER_NAME

Sender display name

OTP_EXPIRES_MINUTES

OTP validity

OTP_RESEND_COOLDOWN_SECONDS

Minimum resend delay

OTP_MAX_ATTEMPTS

Maximum invalid attempts

Authentication Rate Limits

Variable

Description

AUTH_RATE_LIMIT_MAX

Allowed auth attempts per window

AUTH_RATE_LIMIT_WINDOW_MINUTES

Auth limiter window

AI Assistant

Variable

Description

GEMINI_API_KEY

Gemini API credential

GEMINI_MODEL

Primary model

GEMINI_FALLBACK_MODEL

Optional fallback model

GEMINI_ENABLE_FALLBACK

Enable/disable model fallback

ASSISTANT_RATE_LIMIT_MAX

AI request limit

ASSISTANT_RATE_LIMIT_WINDOW_MINUTES

AI rate window

Available Scripts

Root

npm run install-all

Installs client and server dependencies.

npm run dev

Runs frontend and backend concurrently.

npm run client

Runs Vite frontend.

npm run server

Runs backend with Nodemon.

npm run build

Builds the frontend.

npm start

Runs the production backend server.

Client

npm run dev --prefix client
npm run build --prefix client
npm run lint --prefix client
npm run preview --prefix client

Server

npm run dev --prefix server
npm start --prefix server
npm run backfill:categories --prefix server
npm run test:assistant --prefix server
npm run test:report-pdf --prefix server
npm run test:security --prefix server

Testing and Verification

Before deployment, run:

npm ci --prefix client
npm ci --prefix server

npm run build --prefix client
npm run lint --prefix client
npm run test:assistant --prefix server
npm run test:report-pdf --prefix server
npm run test:security --prefix server

Assistant Regression Suite

The Assistant suite verifies core financial-intelligence behavior, including anomaly-aware forecasting and budget risk consistency.

Run:

npm run test:assistant --prefix server

Monthly PDF Layout Test

Run:

npm run test:report-pdf --prefix server

This is intended to catch report layout/clipping regressions.

Security Phase Test

Run:

npm run test:security --prefix server

Phase 16 was also designed for live multi-browser verification.

Useful manual tests:

Individual session revocation

Login in Browser A.

Login in Browser B.

Open Settings in Browser A.

Revoke Browser B.

Navigate to a protected page in Browser B.

Browser B should be returned to login.

Browser A should remain logged in.

Log out other devices

Maintain multiple active sessions.

Click Log out other devices.

The current browser remains authenticated.

Every other session becomes invalid.

Failed password activity

Attempt login using a valid account email and incorrect password.

Login correctly afterward.

Settings → Security Activity should show a warning event.

Failed OTP activity

Begin a valid login.

Submit an incorrect OTP.

Complete authentication with the correct OTP.

Security Activity should contain the failed OTP event.

Password global revocation

Maintain two active sessions.

Change password in one browser.

Both sessions should become invalid.

Login with the new password.

Security Activity should show the password-change event.

Production Deployment

FinTrack is structured as a separate frontend and backend deployment.

Recommended order

Provision production MongoDB.

Configure backend environment variables.

Deploy backend.

Verify:

/api/health

Configure frontend VITE_API_URL with the production backend /api URL.

Build/deploy frontend.

Verify registration/login/email/Assistant/PDF flows.

Backend Production Variables

At minimum, configure:

NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.example
TRUST_PROXY_HOPS=1

MONGO_URI=...
JWT_SECRET=...
JWT_EXPIRES_IN=30d

BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=FinTrack

GEMINI_API_KEY=...
GEMINI_MODEL=...

The production server performs fail-fast validation for critical configuration.

Frontend Production Variable

VITE_API_URL=https://your-backend-domain.example/api

HTTPS

Production frontend and backend should both use HTTPS.

The production auth cookie is secure and should not be expected to work correctly over plain HTTP.

SPA Rewrite

The frontend uses React Router with browser routes including:

/dashboard
/accounts
/categories
/transactions
/recurring
/budgets
/goals
/reports
/assistant
/settings

Your static hosting platform must rewrite unknown frontend routes to:

/index.html

Otherwise refreshing /assistant, /reports, etc. may produce a host-level 404.

CORS

CLIENT_URL must contain the frontend origin, not a page path.

Correct:

CLIENT_URL=https://fintrack.example.com

Incorrect:

CLIENT_URL=https://fintrack.example.com/dashboard

Multiple trusted frontends can be comma-separated.

Reverse Proxy

When deploying behind a managed reverse proxy, configure:

TRUST_PROXY_HOPS=1

Adjust only if your host architecture requires a different number of trusted proxy hops.

This matters for:

rate limiting

client IP context

security activity information

Production Smoke Test

After deployment verify:

Register account

Receive registration OTP

Login with password

Receive login OTP

Receive new-login security email

Create account

Add transaction

Edit transaction

Delete transaction

Create budget

Create savings goal

Process recurring transaction

Trigger notification

Ask AI Assistant question

Generate current-month PDF

Generate historical PDF

Open Settings security sessions

Revoke another session

Refresh a protected route directly

Verify /api/health

Important Implementation Details

Timezone and Date Handling

Financial calendar dates are not treated as arbitrary UTC timestamps.

FinTrack uses calendar-date utilities so a transaction entered for a specific date stays on that date when:

displayed

filtered

exported

reported

viewed in another configured timezone

The configured user timezone determines concepts such as:

today

current financial month

goal time remaining

recurring-due processing

report current-month selection

MongoDB Indexes and Integrity

FinTrack uses targeted indexes for common user/date queries.

Examples include:

transactions by user/date

transactions by account/date

transactions by category/date

active recurring schedules by next run

notifications by user/time

security events by user/time

active sessions

unique monthly category budgets

Recurring occurrences also use a uniqueness constraint to reduce accidental duplicate processing.

Archive Safety

Accounts/categories used by active recurring schedules cannot be archived until the dependency is resolved.

Historical transactions remain usable after archival.

This separates:

"Cannot be chosen for new activity"

from:

"Existing historical record becomes invalid"

which protects historical integrity.

React Query Invalidation

Financial mutations invalidate dependent caches.

Examples:

Transaction changes can invalidate:

Transactions

Accounts

Dashboard

Budgets

Reports

Account/category changes also invalidate relevant recurring/report/financial views.

This avoids waiting for stale-time expiration before related pages reflect changes.

Assistant Timeout Design

Normal API calls retain the standard shorter Axios timeout.

The /assistant/chat request has a longer endpoint-specific ceiling because grounded AI operations may involve:

financial tool calculation

provider inference

response synthesis

The entire application does not receive an unnecessarily large global timeout.

Notification Refresh

The frontend dispatches lightweight internal notification-change events after actions capable of generating alerts.

The bell can therefore refresh immediately while polling remains a fallback.

Known Constraints

These are intentional current limitations rather than hidden defects.

No Bank API Synchronization

FinTrack currently uses user-entered financial records.

It does not directly connect to bank accounts or card-provider APIs.

No Historical Account-Balance Snapshots

Current account balances are available, but the system does not reconstruct a guaranteed historical month-end account balance for every past month.

Monthly reports explicitly disclose this.

Historical Goal State

Goals are mutable records.

Past reports therefore treat goal information as a report-generation snapshot rather than claiming an unavailable historical goal state.

AI Forecasts Are Estimates

Forecasts are directional financial estimates, not guarantees.

They can change when:

new transactions are added

recurring transactions become due

anomalies occur

historical patterns change

Security Device Information Is Lightweight

Browser/device detection uses request metadata.

FinTrack deliberately does not implement invasive browser fingerprinting or precise device geolocation.

Local development may show:

::1

or:

127.0.0.1

as the network address.

Future Ideas

FinTrack is already feature-complete for its current scope, but possible future extensions could include:

Bank/Open Banking integrations

Investment portfolio market-price synchronization

Multi-currency conversion using live FX rates

Receipt upload and OCR

Data import from bank CSV formats

Passkeys/WebAuthn

TOTP authenticator MFA

Historical daily account-balance snapshots

Shared household finance spaces

Native/mobile client

Docker deployment

CI security scanning and automated deployment pipeline

These are better treated as a future FinTrack version rather than prerequisites for the current release.

Author

Kartik Varma

FinTrack was built as a full-stack portfolio project focused on practical software-engineering concerns beyond standard CRUD functionality, including:

authentication

financial domain modeling

analytics

data integrity

AI grounding

forecasting

reporting

caching

security

session management

production hardening

Final Note

FinTrack is intended as a personal-finance management and analytical tool. AI-generated explanations and forecasts are informational and should not be treated as professional financial advice.