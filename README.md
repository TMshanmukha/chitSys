# ChitFund Pro — Private Chit Fund Collection Management System

**ChitFund Pro** is a modern, private, internal financial collection management web application engineered for chit fund businesses. It is built for business owners, administrators, and authorized field collection agents to manage chit schemes, collection routes, members, daily/monthly dues, and cash/digital payments.

> [!NOTE]
> **Client Access Model**: Chit fund participants (members) do **NOT** have login accounts. The portal is operated exclusively by the business owner/administrators and authorized field collection agents.

---

## 1. Project Directory Structure

```
chitSys/
├── backend/                  # Node.js + Express + ES Modules Backend
│   ├── src/
│   │   ├── config/           # Database pool (mysql2) & Zod environment validator
│   │   ├── controllers/      # Auth & Admin API controllers
│   │   ├── middleware/       # JWT auth, role guard, rate limiter, error handler
│   │   ├── routes/           # REST endpoints (/api/auth, /api/admin)
│   │   ├── scripts/          # Programmatic migration & database seed runners
│   │   ├── services/         # Authentication logic & audit trail persistence
│   │   ├── utils/            # JWT helpers, token revocation & sanitized logger
│   │   └── server.js         # Express server with Helmet, CORS & cookie parser
│   ├── tests/                # Automated auth & authorization test suite
│   ├── .env.example          # Backend environment template
│   └── package.json
│
├── frontend/                 # React 19 + Vite + Tailwind CSS (JavaScript Only)
│   ├── src/
│   │   ├── api/              # Axios instance with credentials & error handling
│   │   ├── components/       # ProtectedRoute, Navbar, Sidebar, AdminLayout, ComingSoon
│   │   ├── context/          # AuthContext (session validation, login, logout)
│   │   ├── pages/            # LoginPage, AdminDashboard, AgentDashboard, ModulePages
│   │   ├── App.jsx           # React Router route hierarchy & guards
│   │   ├── index.css         # Modern Tailwind CSS theme & custom scrollbars
│   │   └── main.jsx          # React DOM entry point
│   ├── index.html            # Responsive viewport & Google Typography (Inter & Outfit)
│   ├── vite.config.js        # Vite config with @tailwindcss/vite & API reverse proxy
│   ├── .env.example          # Frontend environment template
│   └── package.json
│
├── database/                 # MySQL Database Architecture & Migrations
│   ├── diagrams/             # Entity-Relationship (ER) Mermaid diagrams
│   │   └── er_diagram.md
│   ├── migrations/           # Versioned SQL migrations (001_create_auth_tables.sql)
│   ├── schema/               # Future schema architecture (future_schema.sql)
│   ├── seeds/                # Seed script instructions
│   └── README.md             # Database documentation
│
├── .gitignore                # Global gitignore protecting credentials & build files
└── README.md                 # Master project documentation
```

---

## 2. Technology Stack

- **Frontend**:
  - React.js (JavaScript only, no TypeScript, no Next.js)
  - Vite build tool & development server
  - Tailwind CSS with `@tailwindcss/vite`
  - React Router DOM (`react-router-dom`)
  - Axios (`axios`) with `withCredentials: true`
  - Lucide React (`lucide-react`) for financial icons
  - Zod & React Hook Form
- **Backend**:
  - Node.js (v20+) & Express.js using native ES Modules (`"type": "module"`)
  - MySQL database connection with connection pooling (`mysql2/promise`)
  - JSON Web Tokens (`jsonwebtoken`) with random UUID `jti` session tracking
  - Password hashing with `bcryptjs` (salt rounds: 12)
  - HTTP Security Headers (`helmet`)
  - Cross-Origin Resource Sharing (`cors`) with explicit origin whitelist
  - Secure HttpOnly Cookie Parser (`cookie-parser`)
  - IP-based brute force rate limiting (`express-rate-limit`)
  - Centralized error handling and sanitized structured logging
- **Database**:
  - MySQL 9.3 Server
  - Tables: `users`, `role_permissions`, `token_revocations`, `audit_logs`, `schema_migrations`

---

## 3. Prerequisites

- **Node.js**: v18.0.0 or higher (v20.20.0 tested)
- **NPM**: v9.0.0 or higher
- **MySQL Server**: 8.0 or 9.x running locally or remotely (port 3306)

---

## 4. Environment Configuration

### Backend (`backend/.env`)
Create `backend/.env` using `backend/.env.example` as a template:

```env
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chitfund_db
DB_USER=root
DB_PASSWORD=admin
DB_CONNECTION_LIMIT=10

# Security Secrets
JWT_SECRET=c8f8b3c98d6e4a2b10984f728190d65b71234a9e5c1284d728198f6230129abc
JWT_EXPIRES_IN=2h
COOKIE_SECRET=chitfund_cookie_secret_key_1234567890

# Seed Account Configuration
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=AdminChitFund2026!
BOOTSTRAP_ADMIN_FULLNAME=Main Administrator
BOOTSTRAP_ADMIN_PHONE=9876543210
```

### Frontend (`frontend/.env`)
Create `frontend/.env` using `frontend/.env.example`:

```env
VITE_API_BASE_URL=/api
VITE_APP_NAME=ChitFund Pro
```

---

## 5. Quick Start & Execution

### Step 1: Database Setup & Migrations
```bash
cd backend
npm install --legacy-peer-deps
npm run db:migrate
npm run db:seed
```
This automatically:
1. Creates the `chitfund_db` database if not present.
2. Applies migration `001_create_auth_tables.sql`.
3. Seeds default role permissions, the Super Admin account, a demo Collection Agent, and an inactive account for security tests.

### Step 2: Start Backend Server
```bash
cd backend
npm start
# Server starts on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### Step 3: Start Frontend Client
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# Frontend starts on http://localhost:5173 (or http://localhost:5174)
```

---

## 6. Default Test Accounts

| Role | Username | Password | Purpose |
|---|---|---|---|
| **Super Admin** | `admin` | `AdminChitFund2026!` | Full administrative console, audit logs, future scheme configuration |
| **Collection Agent** | `agent01` | `Agent1234!` | Field collection agent terminal, route assignments (Ramesh Kumar) |
| **Inactive Agent** | `inactive_agent` | `Agent1234!` | Deactivated account to verify security block |

---

## 7. Authentication & Security Architecture

1. **Explicit Role Selection**: The user selects **Admin Login** or **Agent Login** before submitting.
2. **Server-Side Role Guard**: The backend validates that the credentials match an account possessing the *actual* authorized role. Selecting Admin Login cannot grant administrator access to an agent account.
3. **HttpOnly Cookie Storage**: JWTs are stored exclusively inside `HttpOnly`, `SameSite=Lax/Strict` cookies. Tokens are **never** stored in `localStorage` or `sessionStorage` to prevent XSS exfiltration.
4. **Session Revocation**: Upon logout, the session ID (`jti`) is persisted in `token_revocations`, invalidating any subsequent requests even before the JWT expires.
5. **Sanitized Audit Trail**: Every authentication attempt (success, password failure, role mismatch, deactivation check) is recorded in `audit_logs` without ever saving passwords, PINs, or raw JWTs.
6. **Rate Limiting**: Authentication endpoints are throttled via `express-rate-limit` (20 attempts per 15-minute window per IP) to prevent brute-force attacks.

---

## 8. Milestone 1 Implemented Features vs Roadmap

### ✅ Implemented in Milestone 1
- **Three-tier folder architecture**: `frontend/`, `backend/`, `database/`.
- **Responsive login page** supporting Admin and Collection Agent flows with role toggle, password reveal, accessible inputs, and mobile numeric-friendly layout.
- **Real MySQL authentication**: Bcrypt password hashing, parameterised SQL queries, active account enforcement.
- **JWT session management**: HttpOnly cookies with revocation table tracking.
- **Role-based route authorization**: `SUPER_ADMIN`, `ADMIN`, and `COLLECTION_AGENT`.
- **Protected Admin Dashboard shell**:
  - Topbar with user profile badge and quick logout.
  - Collapsible desktop sidebar and mobile navigation drawer.
  - Operational metrics grid with live backend counts.
  - Live security & audit trail table displaying real records from MySQL.
- **Protected Agent Dashboard shell**:
  - Mobile-first card interface.
  - Agent identity and active status verified against database.
  - Empty state for assigned routes with Milestone 2 notices.
  - Complete isolation from administrative navigation.
- **Future Module Roadmap Placeholders**:
  - Chit Groups (`/admin/chit-groups`)
  - Collection Agents (`/admin/agents`)
  - Members Directory (`/admin/members`)
  - Daily & Monthly Collections (`/admin/collections`)
  - Financial Reports & Reconciliation (`/admin/reports`)
  - Sub-Admin & User Management (`/admin/users`)
  - Settings & Security Configuration (`/admin/settings`)
- **Automated Test Suite**: 13 automated test assertions covering valid logins, invalid credentials, role mismatches, inactive accounts, protected routes, and session revocation.

### 📋 Reserved for Subsequent Milestones
- **Chit Groups Module**: Group creation, daily vs monthly scheme rules, ticket slots, start/end dates.
- **Route & Agent Assignments**: Mapping agents to specific physical collection areas and chit groups.
- **Member Directory**: KYC documentation, contact records, multiple ticket memberships.
- **Collections Workflow**: Daily and monthly collection recording, cash vs UPI tagging, auto-generated receipt numbers.
- **Cash Handover Reconciliation**: Daily agent cash handover verification and discrepancy tracking.
- **Payout Calculations**: Auction bidding discounts, dividends, and payout approval workflows (pending client rule confirmation).
- **Sub-Admin Delegation**: Granular permissions per group and route.

---

## 9. Automated Testing Results

The automated test suite can be run at any time via:
```bash
cd backend
npm test
```

**Actual Execution Results (13/13 Passed):**
```
TAP version 13
ok 1 - 1. Valid Administrator Login (duration: 352ms)
ok 2 - 2. Valid Administrator Login with Default Username (PIN/Password Only) (duration: 269ms)
ok 3 - 3. Invalid Administrator Credentials (duration: 245ms)
ok 4 - 4. Valid Collection Agent Login (duration: 244ms)
ok 5 - 5. Invalid Collection Agent Credentials (duration: 248ms)
ok 6 - 6. Role Mismatch: Agent Attempting to Log in via Admin Portal (duration: 4ms)
ok 7 - 7. Role Mismatch: Admin Attempting to Log in via Agent Portal (duration: 4ms)
ok 8 - 8. Inactive Account Login Rejected (duration: 5ms)
ok 9 - 9. Unauthenticated Access to Protected API (/api/auth/me) (duration: 3ms)
ok 10 - 10. Authenticated Access to Session Check (/api/auth/me) (duration: 245ms)
ok 11 - 11. Collection Agent Attempting to Access Admin Route (/api/admin/audit-logs) Blocked (duration: 248ms)
ok 12 - 12. Administrator Permitted to Access Admin Route (/api/admin/audit-logs) (duration: 250ms)
ok 13 - 13. Logout Revokes Session (duration: 276ms)
# tests 13 | suites 0 | pass 13 | fail 0 | cancelled 0
```
