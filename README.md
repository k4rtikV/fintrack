# 💸 FinTrack

### Smart personal finance tracking, analytics, AI insights and reporting in one place.

**MERN Stack** · **React 19** · **Express 5** · **MongoDB** · **Gemini AI** · **Brevo** · **PDFKit**

**Live App:** https://fintrack-api-impd.onrender.com  
**GitHub:** https://github.com/k4rtikV/fintrack

---

## 📌 About FinTrack

**FinTrack** is a full-stack personal finance management platform built with the MERN stack. It helps users track accounts, transactions, budgets, savings goals and recurring payments while turning financial data into useful analytics, forecasts and AI-assisted insights.

The project goes beyond a basic CRUD finance tracker by combining financial management, reporting, security, notifications and a grounded AI Assistant in a single responsive dashboard.

### What FinTrack focuses on

- Accurate account and transaction management
- Budget and savings-goal planning
- Recurring transaction automation
- Visual financial analytics and reports
- AI-assisted financial insights powered by Google Gemini
- Anomaly-aware forecasting and what-if simulations
- Professional monthly PDF financial reports
- OTP-based authentication and server-managed sessions
- Security activity history and active-session controls
- Responsive light and dark user interfaces

---

## ✨ Key Features

| Area | Features |
| --- | --- |
| 💳 Accounts | Bank, Cash, Card, Wallet and Investment accounts |
| 💸 Transactions | Income/expense tracking, filters, search, pagination, tags and notes |
| 🗂️ Categories | Default and custom categories with icons, colours and archive support |
| 🎯 Budgets | Monthly category budgets, usage, remaining amount, projections and pace risk |
| 🏆 Savings Goals | Target tracking, progress, deadlines and required saving pace |
| 🔁 Recurring | Daily, weekly, monthly and yearly recurring transactions |
| 📊 Analytics | Cash flow, category breakdowns, savings rate and top expenses |
| 📈 Reports | Custom periods, historical comparisons and detailed summaries |
| 🤖 AI Assistant | Grounded financial analysis, anomalies, forecasts and simulations |
| 📄 PDF Reports | Downloadable professional monthly financial reports |
| 🔔 Notifications | Budget, goal, recurring and system alerts |
| 🔐 Security | OTP, HttpOnly cookies, sessions, audit history and revocation controls |
| 🌓 UI | Responsive dashboard with light and dark themes |

---

# 🧩 Feature Breakdown

## 📊 Dashboard

The dashboard provides an at-a-glance view of the user's current financial position.

### Summary cards

- Total balance
- Total income
- Total expenses
- Overall savings rate

### Visual analytics

- Cash-flow trend
- Income vs expenses
- Expense-category breakdown
- Category percentages
- Account summary
- Top expenses

---

## 💳 Accounts

FinTrack supports multiple account types:

- Bank
- Cash
- Card
- Wallet
- Investment

Each account can store its name, type, currency, current balance, icon, colour and archive state.

Transaction creation, editing and deletion keep account balances synchronized with the user's financial records.

### Account safety

- Historical transactions remain valid after an account is archived.
- Accounts used by active recurring transactions cannot be archived accidentally.

---

## 💸 Transactions

Users can record both **income** and **expenses** with detailed metadata.

### Transaction fields

- Title
- Amount
- Type
- Account
- Category
- Date
- Payment method
- Tags
- Notes

### Transaction tools

- Search
- Income/expense filter
- Account filter
- Category filter
- Date-range filter
- Sorting
- Pagination
- Quick date ranges
- Saved transaction templates
- CSV export

CSV exports include all matching records and protect user-entered spreadsheet values from formula injection.

---

## 🗂️ Categories

FinTrack provides built-in categories while also allowing users to create their own.

Examples include:

- Salary
- Freelance
- Food
- Transport
- Shopping
- Bills
- Rent
- Entertainment
- Healthcare
- Education
- Investment
- Other

Custom categories support names, icons, colours, transaction type, ordering and archive state.

---

## 🎯 Budgets

Users can set category-specific monthly spending limits and compare them against real transactions.

FinTrack calculates:

- Budget amount
- Amount spent
- Remaining amount
- Usage percentage
- Over-budget status
- Unbudgeted spending
- Projected month-end usage
- Projected overage
- Spending pace risk
- Projection confidence

### Anomaly-aware projections

FinTrack avoids blindly extrapolating unusually large one-time expenses through the remainder of the month. Already-recorded unusual spending is counted, but it does not automatically become the assumed daily spending pace.

This forecasting logic is shared across budgets, reports, financial health analysis, the AI Assistant and monthly PDF reports.

---

## 🏆 Savings Goals

Users can create savings goals with:

- Goal name
- Target amount
- Current amount
- Target date
- Notes
- Icon
- Colour

FinTrack calculates completion percentage, remaining amount, remaining time, overdue state and the saving pace required to reach the target.

---

## 🔁 Recurring Transactions

FinTrack can manage scheduled income and expenses using:

- Daily
- Weekly
- Monthly
- Yearly

Recurring schedules support account, category, amount, transaction type, payment method, tags, start date, optional end date, next run date and active/paused state.

### Recurring safeguards

- Process all currently due entries
- Process a single due schedule
- Duplicate-occurrence protection
- Month-end date clamping
- Leap-year handling
- Timezone-aware due dates

---

## 🔔 Notifications

The in-app notification system supports:

- Budget alerts
- Goal milestones
- Recurring transaction alerts
- System notifications
- Read/unread state
- Action URLs
- Notification metadata
- Deduplication

Important events can refresh the notification centre immediately while polling provides a fallback.

---

## 📈 Reports

The Reports workspace allows analysis across predefined and custom periods.

### Available periods

- This month
- Last month
- Last 3 months
- Year to date
- Custom date range

### Report metrics

- Income
- Expenses
- Net savings
- Savings rate
- Spending by category
- Budget performance
- Account summaries
- Historical comparisons

---

# 🤖 AI Assistant

FinTrack includes a **grounded AI Assistant powered by Google Gemini**.

The AI model does not receive unrestricted database access. Instead, the backend exposes controlled read-only financial tools that retrieve authenticated user data and perform deterministic calculations before Gemini explains the result.

### Example questions

- How am I doing financially this month?
- Where am I spending the most?
- Am I on track with my budgets?
- What spending looks unusual this month?
- How am I projected to finish this month?
- What if I spend ₹25,000 more this month?
- How are my savings goals progressing?

### Assistant capabilities

- Financial overview
- Account balances
- Recent transactions
- Spending by category
- Monthly trends
- Month-to-date comparisons
- Budget status
- Goal progress
- Recurring transaction analysis
- Financial health summary
- Spending-pattern analysis
- Financial forecasting
- Read-only what-if simulations

### Grounded response flow

```text
User question
      ↓
FinTrack Assistant API
      ↓
Authenticated financial tools
      ↓
Deterministic calculations
      ↓
Gemini explanation
      ↓
Readable answer + metric cards
```

The financial figures shown by the Assistant come from FinTrack's own backend calculations. Gemini is used to explain and contextualize those results.

---

## 🧠 Financial Intelligence

### Spending anomaly detection

FinTrack can identify signals such as:

- Unusually large expenses
- Category concentration
- New category activity
- Major changes in spending behaviour
- Sparse historical baselines
- Possible recurring patterns

An anomaly only means that activity is unusual relative to the user's recorded FinTrack history. It does **not** automatically imply fraud or an incorrect transaction.

### Anomaly-aware forecasting

Forecasting considers:

- Spending already incurred
- High-severity unusual transactions
- Non-anomalous routine spending pace
- Historical expense baselines
- Recurring items still due

Large one-time expenses can therefore be included once without being repeatedly extrapolated across the remaining days of the month.

### What-if simulations

Users can ask hypothetical questions without modifying any saved financial records.

For example:

> What if I spend ₹25,000 more this month?

FinTrack can estimate the effect on expenses, net savings, savings rate, budget pressure and the month-end projection.

---

# 📄 Monthly PDF Financial Report

FinTrack can generate downloadable monthly financial reports using **PDFKit**.

Reports can include:

- Executive summary
- Income and expense totals
- Net savings
- Savings rate
- Category breakdown
- Budget performance
- Unbudgeted spending
- Transaction highlights
- Account snapshot
- Goal progress
- Recurring activity
- Spending anomalies
- Current-month forecast
- Financial insights

The current-month PDF forecast uses the same hardened financial intelligence logic as the AI Assistant.

---

# 🔐 Authentication & Security

FinTrack uses a security-focused authentication architecture rather than storing a long-lived token directly in browser JavaScript.

### Authentication flow

```text
Email + Password
       ↓
Password Verification
       ↓
Email OTP
       ↓
OTP Verification
       ↓
Server-managed Session
       ↓
Secure HttpOnly JWT Cookie
```

### Security features

- bcrypt password hashing
- Email OTP verification
- Hashed OTP storage
- OTP expiration
- OTP resend cooldown
- OTP attempt limits
- HttpOnly authentication cookies
- Secure production cookie configuration
- Server-side authenticated sessions
- Session revocation
- Active-device management
- Security activity history
- New-login email alerts through Brevo
- CSRF Origin/Referer validation
- CORS allowlisting
- Helmet security headers
- Zod request validation
- Request-body limits
- Authentication rate limiting
- AI Assistant rate limiting
- PDF report rate limiting
- Production environment validation

### Active sessions

Users can:

- View active devices
- Identify the current session
- Revoke another session
- Log out all other devices

Every protected request validates both the signed token and its matching active server session.

### Security activity

FinTrack records non-sensitive security events such as:

- Successful login
- Failed password attempt
- Failed login OTP
- Password change
- Session revocation
- Logout

Passwords, OTP values, JWT strings and private financial notes are not written to the security activity log.

---

# 🧰 Tech Stack

## Frontend

| Technology | Purpose |
| --- | --- |
| React 19 | User interface |
| Vite | Development and production builds |
| React Router | Client-side routing |
| TanStack React Query | Server-state fetching and caching |
| Axios | API requests |
| React Hook Form | Form management |
| Zod | Form validation |
| Recharts | Analytics charts |
| Tailwind CSS | Styling and responsive UI |
| Lucide React | Icons |
| React Hot Toast | User feedback |
| date-fns | Date utilities |

## Backend

| Technology | Purpose |
| --- | --- |
| Node.js | JavaScript runtime |
| Express 5 | REST API |
| MongoDB Atlas | Cloud database |
| Mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| JSON Web Token | Authentication token signing |
| Zod | API validation |
| Helmet | Security headers |
| express-rate-limit | Request rate limiting |
| PDFKit | Monthly PDF generation |
| Morgan | Development request logging |

## External Services

| Service | Purpose |
| --- | --- |
| Google Gemini | AI-generated financial explanations |
| Brevo | OTP, notification and security emails |
| MongoDB Atlas | Managed MongoDB database |
| Render | Frontend/backend deployment |

---

# 📁 Project Structure

```text
fintrack/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   │   ├── accounts/
│   │   │   ├── assistant/
│   │   │   ├── budgets/
│   │   │   ├── categories/
│   │   │   ├── dashboard/
│   │   │   ├── forms/
│   │   │   ├── goals/
│   │   │   ├── layout/
│   │   │   ├── notifications/
│   │   │   ├── recurring/
│   │   │   ├── reports/
│   │   │   ├── transactions/
│   │   │   └── ui/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
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
│   │   └── validators/
│   ├── .env.example
│   └── package.json
│
├── package.json
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Make sure you have:

- Node.js
- npm
- Git
- MongoDB Atlas database
- Brevo account/API key
- Google Gemini API key

## 1. Clone the repository

```bash
git clone <your-fintrack-repository-url>
cd fintrack
```

## 2. Install dependencies

From the project root:

```bash
npm run install-all
```

Or install each application separately:

```bash
npm install --prefix client
npm install --prefix server
```

## 3. Configure the frontend

Create:

```text
client/.env
```

Example:

```env
VITE_API_URL=http://localhost:5000/api
```

## 4. Configure the backend

Create:

```text
server/.env
```

Example:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

TRUST_PROXY_HOPS=1

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
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
```

> Never commit real API keys, database credentials or JWT secrets.

## 5. Run FinTrack

```bash
npm run dev
```

Local services:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

---

# 🧪 Available Scripts

## Root

```bash
npm run install-all
npm run dev
npm run client
npm run server
npm run build
npm start
```

## Client

```bash
npm run dev --prefix client
npm run build --prefix client
npm run lint --prefix client
npm run preview --prefix client
```

## Server

```bash
npm run dev --prefix server
npm start --prefix server
npm run backfill:categories --prefix server
npm run test:assistant --prefix server
npm run test:report-pdf --prefix server
npm run test:security --prefix server
```

---

# ✅ Testing

Useful checks before deployment:

```bash
npm ci --prefix client
npm ci --prefix server

npm run build --prefix client
npm run lint --prefix client

npm run test:assistant --prefix server
npm run test:report-pdf --prefix server
npm run test:security --prefix server
```

| Test | Coverage |
| --- | --- |
| `test:assistant` | AI, forecasts, anomaly detection and budget-risk regressions |
| `test:report-pdf` | Monthly PDF layout and generation |
| `test:security` | Sessions and security behaviour |

---

# 🔌 API Overview

All backend routes are served below:

```text
/api
```

### Authentication

```text
POST /api/auth/register
POST /api/auth/verify-registration-otp
POST /api/auth/resend-registration-otp

POST /api/auth/login
POST /api/auth/verify-login-otp
POST /api/auth/resend-login-otp

POST /api/auth/logout
GET  /api/auth/me
```

### Finance

```text
/api/accounts
/api/categories
/api/transactions
/api/budgets
/api/goals
/api/recurring
/api/analytics
/api/notifications
```

### AI & Reports

```text
POST /api/assistant/chat
GET  /api/reports/monthly-pdf
```

### Settings & Security

```text
/api/settings
/api/security/sessions
/api/security/activity
```

### Health check

```text
GET /api/health
```

The health endpoint returns an unavailable status when the database connection is not healthy.

---

# ☁️ Deployment

FinTrack can be deployed with separate frontend and backend services on **Render**, with **MongoDB Atlas** providing the production database.

Recommended deployment order:

1. Create/configure the MongoDB Atlas database.
2. Deploy the backend service.
3. Add all backend environment variables.
4. Verify `/api/health`.
5. Configure the frontend API URL.
6. Build and deploy the frontend.
7. Configure SPA rewrites for React Router.
8. Run a complete production smoke test.

Production services should use HTTPS and valid production environment values.

### Production smoke-test checklist

- Registration
- Registration OTP verification
- Login
- Login OTP verification
- Security login email
- Accounts
- Transactions
- Categories
- Budgets
- Goals
- Recurring processing
- Notifications
- Reports
- AI Assistant
- Monthly PDF download
- Active sessions
- Session revocation
- Mobile responsiveness
- Direct-route refresh
- API health check

---

# 🌓 Responsive UI & Themes

FinTrack supports light and dark modes and is designed to adapt across desktop and mobile layouts.

Theme-specific handling includes native date/month controls, chart contrast, borders, surface colours and text contrast.

---

# ⚠️ Current Scope

FinTrack v1 intentionally does not include:

- Direct bank synchronization
- Live investment market data
- Receipt OCR
- Historical daily account-balance snapshots
- Shared household accounts
- Native mobile applications
- Automatic foreign-exchange conversion between account currencies

These are potential areas for future expansion rather than missing requirements for the current project.

---

# 🔮 Possible Future Improvements

- Bank/Open Banking integration
- Receipt OCR
- Live investment-price synchronization
- Multi-currency FX conversion
- Passkeys / WebAuthn
- Authenticator-app MFA
- Docker support
- CI/CD pipeline
- Automated security scanning
- Shared household finance spaces
- Native mobile application

---

# 👨‍💻 Author

**Kartik Varma**

GitHub: `github.com/k4rtikV`

FinTrack was built as a portfolio-grade full-stack project with an emphasis on **architecture, data integrity, security, analytics, AI grounding, forecasting, reporting and production readiness**.

---

### 💸 FinTrack

**Track smarter. Understand your finances. Make better decisions.**

*AI-generated explanations, forecasts and simulations are informational and are not professional financial advice.*
