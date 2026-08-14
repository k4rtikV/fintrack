FinTrack

Personal finance, analytics, AI insights, reporting, and account security — in one dashboard.

FinTrack is a full-stack MERN personal finance platform for managing accounts, transactions, budgets, savings goals, recurring payments, analytics, reports, and financial health with a grounded AI Assistant.

Tech stack: React 19 · Vite · Node.js · Express 5 · MongoDB Atlas · Mongoose · TanStack React Query · Tailwind CSS · Recharts · Gemini · Brevo · PDFKit

Security: Email OTP · HttpOnly cookies · Server-side sessions · Session revocation · Security audit logs · CSRF protection · CORS allowlisting · Rate limiting

Overview

FinTrack was built to go beyond a basic CRUD finance tracker.

It combines:

account and balance management

income and expense tracking

custom categories

monthly budgets

savings goals

recurring transactions

analytics and reports

notifications

CSV export

AI-powered financial insights

anomaly-aware forecasting

what-if financial simulations

professional monthly PDF reports

light and dark modes

timezone-safe financial dates

server-side session revocation

security activity logging

new-login email alerts

production security hardening

Key Highlights

Area

What FinTrack Provides

Finance

Accounts, transactions, categories, balances

Analytics

Cash flow, category breakdowns, savings rate

Planning

Budgets, savings goals, recurring transactions

AI

Grounded financial Assistant powered by Gemini

Intelligence

Spending anomalies, forecasts, simulations

Reporting

Downloadable monthly PDF financial reports

Security

OTP, session revocation, audit history

Notifications

In-app alerts and security emails

UX

Responsive UI, light/dark mode, timezone-aware dates

Production

CORS, CSRF, rate limiting, health checks

Features

Dashboard

The Dashboard gives a quick overview of the user's financial position.

Summary metrics

Total balance

Total income

Total expenses

Overall savings rate

Visual analytics

Cash-flow trend

Income vs expenses

Expense-category breakdown

Category percentages

Account summary

Top expenses

Very small categories remain visible in the expense donut without changing their real percentages.

Accounts

FinTrack supports multiple account types:

Bank

Cash

Card

Wallet

Investment

Each account stores:

account name

account type

current balance

currency

icon

color

archive state

Transaction creation, editing, and deletion update account balances consistently.

Archive safety

An account cannot be archived while an active recurring transaction still depends on it.

Historical transactions remain valid even if their original account is later archived.

Transactions

Transactions support:

Income or expense

Amount

Title

Account

Category

Date

Payment method

Tags

Notes

Transaction tools

Search

Type filters

Account filters

Category filters

Date ranges

Sorting

Pagination

Quick date ranges

CSV export

Saved quick templates

Search is debounced to avoid unnecessary API requests.

Pagination automatically repairs itself when deleting records makes the current page invalid.

CSV export

CSV export fetches all matching records, not only the first 100.

User-controlled text is also protected against spreadsheet formula injection.

Categories

FinTrack includes default and custom categories for income and expenses.

Examples include:

Salary

Freelance

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

Categories support:

custom names

icons

colors

type

display order

archive state

A category cannot be archived while an active recurring schedule still depends on it.

Budgets

Users can create monthly category-specific spending limits.

FinTrack calculates:

spent amount

remaining amount

usage percentage

over-budget state

unbudgeted spending

projected month-end usage

projected overage

pace risk

projection confidence

Anomaly-aware budget pace

FinTrack does not blindly extrapolate large one-time expenses.

For example:

Investment budget: ₹5,00,000
Current spend:     ₹4,00,000
Usage:             80%

If the ₹4,00,000 expense is identified as a one-off event, FinTrack can include it once instead of repeating that spending pace through the rest of the month.

This keeps budget risk consistent across:

Budgets

Reports

Financial Health

AI forecasts

PDF reports

Savings Goals

Savings goals support:

target amount

current amount

target date

note

icon

color

FinTrack calculates:

completion percentage

amount remaining

days remaining

overdue status

required saving pace

Goal date calculations use the user's configured timezone.

Recurring Transactions

Supported frequencies:

Daily

Weekly

Monthly

Yearly

Recurring schedules include:

account

category

amount

transaction type

payment method

tags

start date

optional end date

next run date

last run date

active or paused state

Recurring safety

FinTrack includes:

process-all-due support

process-one support

duplicate-occurrence protection

month-end clamping

leap-year handling

timezone-aware due dates

Notifications

FinTrack supports:

Budget alerts

Goal alerts

Recurring alerts

System notifications

Notifications can include:

title

message

action URL

read/unread status

metadata

deduplication keys

The notification bell can refresh immediately after relevant actions, while polling remains a fallback.

Reports

The Reports workspace supports:

This month

Last month

Last 3 months

Year to date

Custom ranges

Report analytics include:

Income

Expenses

Net savings

Savings rate

Spending by category

Budget performance

Account summaries

Historical comparisons

Monthly PDF Financial Report

FinTrack generates downloadable monthly PDF reports using PDFKit.

Reports can include:

Executive summary

Income and expense totals

Net savings

Savings rate

Category breakdown

Budget performance

Unbudgeted spending

Transaction highlights

Account snapshot

Goal progress

Recurring activity

Spending anomalies

Current-month forecast

Financial insights

Report limitations

Current-month PDF forecasts use the same financial intelligence logic as the AI Assistant.

AI Assistant

FinTrack includes a grounded AI Assistant powered by Google Gemini.

Gemini does not receive unrestricted database access.

Instead, FinTrack exposes controlled tools that retrieve authenticated financial data and perform deterministic calculations.

Assistant tools

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

Where am I spending the most?

Am I on track with my current budgets?

What spending looks unusual this month?

How am I projected to finish this month?

What if I spend ₹25,000 more this month?

Review my savings goals and priorities.

Grounded response flow

User question
     ↓
Assistant API
     ↓
FinTrack financial tools
     ↓
Deterministic calculations
     ↓
Gemini explanation
     ↓
Response normalization
     ↓
Readable answer + FinTrack metric cards

The financial numbers come from FinTrack's own calculations. Gemini is used to explain and contextualize the results.

Financial Intelligence

Spending anomaly detection

FinTrack can detect signals such as:

unusually large expenses

category concentration

new category activity

spending changes

sparse historical baselines

unusual activity relative to comparable periods

An anomaly means unusual compared with available FinTrack history. It does not automatically mean fraud.

Anomaly-aware forecasting

A basic financial forecast might use:

month-to-date spending
÷ elapsed days
× days in month

That can produce unrealistic results when a large one-time purchase occurs early in a month.

FinTrack instead considers:

already-incurred spending

high-severity unusual transactions

routine non-anomalous spending pace

historical expense baselines

recurring items still due

Large one-off expenses are included once instead of automatically being repeated through the remaining days.

What-if simulations

The Assistant can evaluate hypothetical scenarios without changing real records.

Example:

What if I spend ₹25,000 more this month?

FinTrack can estimate the effect on:

Expenses

Net savings

Savings rate

Budget pressure

Month-end projection

Security

Security is a major part of FinTrack's final architecture.

Authentication

FinTrack uses:

Password authentication

bcrypt password hashing

Email OTP verification

Hashed OTP storage

OTP expiry

OTP resend cooldown

OTP attempt limits

Secure authentication cookies

Server-side authenticated sessions

Login flow

Email + password
        ↓
Password verification
        ↓
Email OTP
        ↓
OTP verification
        ↓
Server-managed session
        ↓
JWT cookie

Active Sessions

Every authenticated login creates a server-side session containing:

session identifier

user

browser

operating system

device type

network address

created time

last active time

expiry

revocation status

Every protected request verifies both:

the signed JWT

the matching active server session

This means an already-issued JWT becomes unusable once its server session is revoked.

Users can

view active devices

identify the current session

revoke another device

log out all other devices

Security Activity

FinTrack records non-sensitive authentication and session events.

Examples:

Successful login

Failed password attempt

Failed login OTP

Password changed

Session revoked

Other sessions revoked

Logout

Security events can include:

Browser

Operating system

Device type

Network address

Time

FinTrack does not log:

Password values

OTP values

JWT strings

Transaction contents

Private financial notes

Login Security Emails

Successful authenticated logins trigger a Brevo security alert.

The email can include:

Browser

Operating system

Device type

Network address

Login time

Link to Security Settings

A temporary email-provider failure does not block an otherwise valid login.

Additional Security Hardening

FinTrack also includes:

HttpOnly auth cookies

Secure production cookies

CSRF Origin/Referer validation

CORS allowlisting

Helmet security headers

Zod request validation

Request-body limits

Auth rate limiting

AI Assistant rate limiting

PDF report rate limiting

Production environment validation

Password-change session revocation

Private frontend cache clearing after authentication changes

MongoDB-aware API health checks

Light and Dark Mode

FinTrack includes light and dark themes across the application.

Theme preference is stored locally.

The UI includes theme-specific fixes for:

Native date-picker icons

Month-picker icons

Chart contrast

Small category donut slices

Borders

Surface colors

Text contrast

Technology Stack

Frontend

Technology

Purpose

React 19

UI

Vite

Development and builds

React Router

Routing

TanStack React Query

Server-state caching

Axios

API requests

React Hook Form

Forms

Zod

Validation

Recharts

Charts

Tailwind CSS

Styling

Lucide React

Icons

React Hot Toast

Feedback

date-fns

Date utilities

Backend

Technology

Purpose

Node.js

Runtime

Express 5

REST API

MongoDB Atlas

Database

Mongoose

ODM

bcryptjs

Password hashing

jsonwebtoken

JWT authentication

Zod

API validation

Helmet

HTTP security headers

express-rate-limit

Rate limiting

PDFKit

PDF reports

Morgan

Development logging

External Services

Service

Purpose

Google Gemini

AI explanations

Brevo

OTP and security emails

MongoDB Atlas

Cloud database

Project Structure

fintrack/
│
├── client/
│   ├── public/
│   │   └── fintrack-logo.png
│   │
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   ├── goals/
│   │   │   ├── layout/
│   │   │   ├── recurring/
│   │   │   ├── reports/
│   │   │   └── transactions/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   │
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
│   │   └── validators/
│   │
│   ├── .env.example
│   └── package.json
│
├── package.json
└── README.md

Getting Started

Prerequisites

Install:

Node.js

npm

Git

MongoDB Atlas access

Brevo account

Gemini API key

1. Clone the repository

git clone <your-fintrack-repository-url>
cd fintrack

2. Install dependencies

npm run install-all

Or:

npm install --prefix client
npm install --prefix server

3. Configure frontend environment

Create:

client/.env

Development:

VITE_API_URL=http://localhost:5000/api

4. Configure backend environment

Create:

server/.env

Example:

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
GEMINI_MODEL=your_primary_model
GEMINI_FALLBACK_MODEL=your_fallback_model
GEMINI_ENABLE_FALLBACK=true

ASSISTANT_RATE_LIMIT_MAX=120
ASSISTANT_RATE_LIMIT_WINDOW_MINUTES=15

Never commit real credentials.

5. Start FinTrack

npm run dev

Local services:

Frontend: http://localhost:5173
Backend:  http://localhost:5000

Available Scripts

Root

npm run install-all
npm run dev
npm run client
npm run server
npm run build
npm start

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

Testing

Before deployment:

npm ci --prefix client
npm ci --prefix server

npm run build --prefix client
npm run lint --prefix client

npm run test:assistant --prefix server
npm run test:report-pdf --prefix server
npm run test:security --prefix server

Test suites

Command

Coverage

test:assistant

AI, forecast, anomaly, budget-risk regressions

test:report-pdf

Monthly PDF layout

test:security

Sessions and security behavior

API Overview

All backend routes use:

/api

Authentication

POST /auth/register
POST /auth/verify-registration-otp
POST /auth/resend-registration-otp

POST /auth/login
POST /auth/verify-login-otp
POST /auth/resend-login-otp

POST /auth/logout
GET  /auth/me

Finance

/accounts
/categories
/transactions
/budgets
/goals
/recurring
/analytics
/notifications

Assistant and Reports

POST /assistant/chat
GET  /reports/monthly-pdf

Settings and Security

GET    /settings
PATCH  /settings/profile
PATCH  /settings/notifications
PATCH  /settings/password

GET    /security/sessions
DELETE /security/sessions/:sessionId
POST   /security/sessions/revoke-others
GET    /security/activity

Health

GET /api/health

The health endpoint returns HTTP 503 if MongoDB is unavailable.

Production Deployment

FinTrack is designed for separate frontend and backend deployment.

Recommended order

1. Provision MongoDB Atlas
2. Configure backend environment variables
3. Deploy backend
4. Verify /api/health
5. Configure frontend VITE_API_URL
6. Build and deploy frontend
7. Run production smoke tests

Production frontend

VITE_API_URL=https://your-backend-domain.example/api

Production backend

NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.example
TRUST_PROXY_HOPS=1

MONGO_URI=...
JWT_SECRET=...

BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...

GEMINI_API_KEY=...
GEMINI_MODEL=...

Deployment requirements

Use HTTPS.

Configure SPA rewrites to /index.html.

Set CLIENT_URL to the frontend origin.

Use /api/health as the backend health check.

Deploy the backend before building the final frontend.

Production Smoke Test

After deployment, verify:

Registration

Registration OTP

Login

Login OTP

Login security email

Account CRUD

Transaction CRUD

Budgets

Goals

Recurring processing

Notification updates

AI Assistant

Monthly PDF

Active sessions

Remote session revocation

Direct SPA route refresh

/api/health

Current Scope

FinTrack currently does not include:

Direct bank API synchronization

Live investment market data

Receipt OCR

Historical daily account balance snapshots

Shared household accounts

Native mobile application

These are intentionally outside the current v1 scope.

Possible Future Extensions

Possible v2 ideas:

Bank/Open Banking integrations

Receipt OCR

Investment market-price synchronization

Live multi-currency FX

Passkeys/WebAuthn

TOTP authenticator MFA

Docker support

CI/CD

Automated security scanning

Shared household finance spaces

Native mobile application

Author

Kartik Varma

FinTrack was built as a portfolio-grade full-stack project focused on:

Architecture

Data integrity

Security

Authentication

Analytics

AI grounding

Forecasting

Reporting

Caching

Session management

Production readiness

FinTrack

Track smarter. Understand your finances. Make better decisions.

AI-generated explanations and forecasts are informational and should not be treated as professional financial advice.