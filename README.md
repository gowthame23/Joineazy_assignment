# Joineazy: Student, Group and Assignment Management

A role-based web app where **students** form groups and confirm assignment submissions through a two-step verification, and **professors** post assignments, choose which groups they apply to, and track progress group-wise and student-wise.

**Stack:** React + Tailwind CSS · Node.js + Express · PostgreSQL · JWT · Docker

The frontend (`frontend/`) and backend (`backend/`) are separate apps. Locally, `docker compose up` runs both with a PostgreSQL database. In production, they are deployed to Vercel, Render and Neon.

---

## Contents

1. [Live links](#1-live-links)
2. [Features by role](#2-features-by-role)
3. [Tech stack](#3-tech-stack)
4. [Setup and run](#4-setup-and-run)
5. [Environment variables](#5-environment-variables)
6. [API reference](#6-api-reference)
7. [Database schema](#7-database-schema)
8. [Architecture](#8-architecture)
9. [Design decisions](#9-design-decisions)
10. [Tests](#10-tests)
11. [Deployment](#11-deployment)

---

## 1. Live links

| | |
|---|---|
| Frontend (Vercel) | https://joineazy-gamma.vercel.app |
| Backend API (Render) | https://joineazy-backend-xsln.onrender.com |
| Health check | https://joineazy-backend-xsln.onrender.com/health |
| Repository | https://github.com/gowthame23/Joineazy_assignment |

Demo accounts are listed in [section 4](#demo-accounts).

---

## 2. Features by role

### Student

| Requirement | How it works |
|---|---|
| Register and log in | Email + password, optional Student ID. JWT session. |
| Create a group and add members | The creator becomes the leader and adds members by **email or Student ID**. A student can be in only one group. Members can leave; the leader can remove members. If the leader leaves, the longest-standing member takes over. |
| View assignments | Only assignments that target the student's group, or all students, are shown. |
| Open the OneDrive link | Each assignment card has an **Open OneDrive** button. |
| Two-step submission | **Step 1:** "Have you uploaded your team's completed deliverables to the designated OneDrive link?" → **Yes, I have submitted** (status becomes `pending`). **Step 2:** "Confirm submission for your whole group? This cannot be undone." → **Confirm submission** (status becomes `confirmed`). A pending request can be cancelled. The server enforces the order. |
| Group progress | Progress bar (confirmed out of total) and status badges: Not submitted, Awaiting confirmation, Submitted, Overdue. |

### Professor (admin)

| Requirement | How it works |
|---|---|
| Create, view, edit, delete assignments | Title, description, due date and OneDrive link. |
| Choose the audience | **All students** or **specific groups** (searchable multi-select). |
| Track submissions | Per-assignment page with a **group-wise** tab (status, who confirmed and when, expandable member list) and a **student-wise** tab (every student, their group and status), with search and status filters. |
| Analytics | Summary cards (students and ungrouped count, groups, assignments, overall progress, overdue) and two charts: confirmed vs remaining per assignment, and completion rate per group. |

Professor sign-up requires an invite code (`ADMIN_INVITE_CODE`), so students cannot make themselves admins.

---

## 3. Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3, React Router, Recharts, lucide-react |
| Backend | Node.js 20+, Express 4, `pg` (raw parameterised SQL, no ORM), zod, bcryptjs, jsonwebtoken, helmet, cors, morgan, express-rate-limit |
| Database | PostgreSQL 16 |
| DevOps | Docker, Docker Compose, Nginx, GitHub Actions |
| Hosting | Vercel (frontend), Render (backend), Neon (database) |

### Project structure

```
backend/
  src/
    app.js              Express app, middleware, routes, error handler
    server.js           env check, migrations on boot, listen
    db/                 pool, schema.sql, migrate, seed, shared queries
    middleware/         requireAuth / requireRole, zod validation
    routes/             auth, groups, assignments, analytics
    utils/              HttpError + asyncHandler, constant-time compare
  scripts/              smoke test, database reset
  tests/                unit tests (node:test)
frontend/
  src/
    api/client.js       fetch wrapper (JWT header, wake-up banner)
    context/            AuthContext
    components/         UI kit, Layout, ProtectedRoute, ErrorBoundary
    pages/              Login, Register, StudentDashboard, AdminDashboard, AssignmentTracking
docker-compose.yml      Postgres + backend + frontend
render.yaml             Render blueprint
```

---

## 4. Setup and run

### Option A: Docker (one command)

Requires Docker Desktop.

```bash
git clone https://github.com/gowthame23/Joineazy_assignment.git
cd Joineazy_assignment
docker compose up --build
```

Then load the demo data (tables are created automatically when the backend starts):

```bash
docker compose exec backend npm run seed
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:4000 |
| Health check | http://localhost:4000/health |

`docker compose down` stops everything. Data is kept in the `postgres_data` volume; add `-v` to delete it.

### Option B: Without Docker

Requires Node.js 20+ and a PostgreSQL database (local, or a Neon connection string).

```bash
# Terminal 1: backend
cd backend
cp .env.example .env      # then set DATABASE_URL
npm install
npm run seed              # creates the tables and demo data
npm run dev               # http://localhost:4000

# Terminal 2: frontend
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

### Demo accounts

All passwords are `password123`. The professor invite code for new admin sign-ups is `joineazy-prof-2026`.

| Role | Email | Group | Student ID |
|---|---|---|---|
| Professor | professor@joineazy.com | | |
| Student | student1@joineazy.com | Team Alpha (leader) | STU1001 |
| Student | student2@joineazy.com | Team Alpha | STU1002 |
| Student | student3@joineazy.com | Team Beta (leader) | STU1003 |
| Student | student4@joineazy.com | Team Beta | STU1004 |
| Student | student5@joineazy.com | Team Gamma (leader) | STU1005 |
| Student | student6@joineazy.com | Team Gamma | STU1006 |

The seed also creates 4 assignments (one overdue, one for specific groups only) and a few pending and confirmed submissions, so the dashboards and charts have data.

---

## 5. Environment variables

### Backend (`backend/.env`)

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string. SSL is used when it contains `sslmode=require` (Neon). | `postgres://postgres:postgres@localhost:5432/joineazy` |
| `JWT_SECRET` | Secret used to sign tokens. Use a long random string. | `change-me-to-a-long-random-string` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `ADMIN_INVITE_CODE` | Code required to register as a professor. If unset, professor sign-up is disabled. | `joineazy-prof-2026` |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated, no trailing slash | `http://localhost:5173` |
| `PORT` | Server port | `4000` |

### Frontend (`frontend/.env`)

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL. Read at build time, so rebuild after changing it. | `http://localhost:4000` |

---

## 6. API reference

All routes except `/health`, register and login need `Authorization: Bearer <token>`. Errors are returned as `{ "error": "message" }`. Full request and response bodies are in [API.md](API.md).

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/health` | Public | Health check, returns `{ "status": "ok" }` |
| POST | `/api/auth/register` | Public | Create a student or professor account |
| POST | `/api/auth/login` | Public | Log in, returns a JWT |
| GET | `/api/auth/me` | Any | Current user |
| POST | `/api/groups` | Student | Create a group (caller becomes leader) |
| GET | `/api/groups/me` | Student | My group with members and progress |
| POST | `/api/groups/me/members` | Leader | Add a member by email or Student ID |
| DELETE | `/api/groups/me/members/:userId` | Leader / self | Remove a member, or leave the group |
| GET | `/api/groups` | Admin | All groups with progress |
| GET | `/api/assignments` | Any | Students: assignments for their group. Admin: all, with stats. |
| POST | `/api/assignments` | Admin | Create an assignment |
| PUT | `/api/assignments/:id` | Admin | Update an assignment and its targeting |
| DELETE | `/api/assignments/:id` | Admin | Delete an assignment and its submissions |
| POST | `/api/assignments/:id/submission/request` | Student | Step 1: "Yes, I have submitted" |
| POST | `/api/assignments/:id/submission/confirm` | Student | Step 2: "Confirm submission" |
| DELETE | `/api/assignments/:id/submission/request` | Student | Cancel a pending request |
| GET | `/api/assignments/:id/submissions` | Admin | Group-wise and student-wise tracking |
| GET | `/api/analytics` | Admin | Summary counts and chart data |

### Examples

**Register**

```http
POST /api/auth/register
Content-Type: application/json

{ "name": "Jane Doe", "email": "jane@joineazy.com", "password": "password123", "studentId": "STU1099" }
```

`201 Created`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "e6a1005b-...", "name": "Jane Doe", "email": "jane@joineazy.com", "studentId": "STU1099", "role": "student" }
}
```

To register a professor, send `"role": "admin"` and `"adminCode"`. A missing or wrong code returns `403`. Login takes `{ "email", "password" }` and returns the same shape. A wrong email and a wrong password both return the same `401`.

**Create a group and add a member**

```http
POST /api/groups
Authorization: Bearer <student token>

{ "name": "Team Delta" }
```

`201 Created`

```json
{
  "group": {
    "id": "b8109bf1-...",
    "name": "Team Delta",
    "leaderId": "e6a1005b-...",
    "members": [{ "id": "e6a1005b-...", "name": "Jane Doe", "email": "jane@joineazy.com", "studentId": "STU1099" }],
    "progress": { "total": 3, "confirmed": 0, "percent": 0 }
  }
}
```

```http
POST /api/groups/me/members
Authorization: Bearer <leader token>

{ "identifier": "STU1002" }
```

`identifier` is an email or a Student ID. Returns `201` with the updated group, `404` if the student doesn't exist, `409` if they are already in a group, and `403` if the caller isn't the leader.

**Two-step confirmation**

```http
POST /api/assignments/:id/submission/request
Authorization: Bearer <student token>
```

`200 OK`: `{ "submission": { "status": "pending" } }`

```http
POST /api/assignments/:id/submission/confirm
Authorization: Bearer <student token>
```

`200 OK`: `{ "submission": { "status": "confirmed", "confirmedAt": "2026-11-22T10:30:00.000Z" } }`

Confirming without step 1, or confirming twice, returns `409 Conflict`.

---

## 7. Database schema

```mermaid
erDiagram
    users ||--o{ groups : "leads"
    users ||--o| group_members : "is in (at most one)"
    groups ||--|{ group_members : "has"
    users ||--o{ assignments : "creates"
    assignments ||--o{ assignment_groups : "targets"
    groups ||--o{ assignment_groups : "is targeted by"
    assignments ||--o{ submissions : "has"
    groups ||--o{ submissions : "makes"
    users ||--o{ submissions : "requests / confirms"

    users {
        uuid id PK
        varchar name
        varchar email UK
        varchar student_id UK
        varchar password_hash
        varchar role "student | admin"
        timestamptz created_at
    }
    groups {
        uuid id PK
        varchar name
        uuid leader_id FK
        timestamptz created_at
    }
    group_members {
        uuid group_id PK
        uuid user_id PK "UNIQUE"
        timestamptz joined_at
    }
    assignments {
        uuid id PK
        varchar title
        text description
        timestamptz due_date
        text onedrive_link
        boolean assign_to_all
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    assignment_groups {
        uuid assignment_id PK
        uuid group_id PK
    }
    submissions {
        uuid id PK
        uuid assignment_id FK
        uuid group_id FK
        varchar status "pending | confirmed"
        uuid requested_by FK
        uuid confirmed_by FK
        timestamptz requested_at
        timestamptz confirmed_at
    }
```

| Relationship | Meaning |
|---|---|
| users → group_members | `user_id` is `UNIQUE`, so a student belongs to at most one group. The database enforces this, not just the UI. |
| groups → group_members | A group has one or more members. `groups.leader_id` points to the leader. |
| assignments → assignment_groups | When `assign_to_all` is false, these rows list the groups the assignment is for. When true, it applies to every group. |
| assignments + groups → submissions | One submission per assignment per group (`UNIQUE (assignment_id, group_id)`). `requested_by` and `confirmed_by` record which student did each step. |
| Student-wise tracking | Derived by joining `group_members` with `submissions`, so every member of a confirmed group shows as confirmed. |

Deleting an assignment or group removes its related rows (`ON DELETE CASCADE`).

---

## 8. Architecture

```mermaid
flowchart LR
    Browser["React SPA<br/>(Vercel)"] -->|"HTTPS + JWT"| API["Express API<br/>(Render, Docker)"]
    API -->|"parameterised SQL"| DB[("PostgreSQL<br/>(Neon)")]
```

### Request lifecycle

`helmet` + CORS → JSON body parser (100 kB limit) → rate limit (auth routes only) → `requireAuth` (verifies the JWT) → `requireRole` (student or admin) → zod validation → route handler (parameterised SQL) → central error handler.

### Two-step confirmation

```mermaid
stateDiagram-v2
    [*] --> none
    none --> pending : Step 1 (request)
    pending --> none : cancel
    pending --> confirmed : Step 2 (confirm)
    confirmed --> [*] : final
```

- **Step 1** runs `INSERT ... ON CONFLICT DO NOTHING`, so a double click creates one row and never overwrites a confirmed submission.
- **Step 2** runs `UPDATE ... SET status = 'confirmed' WHERE status = 'pending'`. If no row matches (step 1 skipped, or already confirmed), the server returns `409`. Because the check and the update are one statement, two simultaneous confirms cannot both succeed.
- **Cancel** only deletes a `pending` row, so a confirmed submission can never be undone.

---

## 9. Design decisions

| Decision | Reason |
|---|---|
| Submissions are stored per group | The whole group shares one status. One member confirms, every member sees it. |
| One group per student via a `UNIQUE` constraint | Holds even when two requests arrive at once. The duplicate insert becomes a clean `409`, not a `500`. |
| Two-step confirmation enforced on the server | The order is checked in SQL, so it can't be bypassed by calling the API directly. |
| Admin invite code | Anyone can register as a student. Professor accounts need a server-side code, compared in constant time. If the code isn't configured, professor sign-up is off. |
| Raw SQL with `pg` | The queries are short and visible, and parameters (`$1`, `$2`) prevent SQL injection. Dashboard and analytics numbers come from a few aggregate queries instead of one query per row. |
| Migrations on boot | `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so a fresh database is set up automatically on first start. |
| Safe links | OneDrive links must start with `http://` or `https://`, which blocks `javascript:` links. They open with `rel="noopener noreferrer"`. |
| Neon, Render and Vercel | Free tiers with no expiry. Render runs the same Docker image used locally. Vercel serves the static build with an SPA rewrite (`frontend/vercel.json`). |
| Keep-alive and wake-up banner | Render's free tier sleeps after about 15 minutes. An uptime monitor pings `/health` every 5 minutes. If a request still takes over 3 seconds, the frontend shows a "waking up the server" banner. |

### Known limitations

- JWTs are stored in `localStorage` and can't be revoked before they expire (7 days).
- The leader adds members directly. There is no invite-and-accept flow.
- The app can't check that files were actually uploaded to OneDrive. Confirmation is the group's declaration.
- No email notifications or password reset.
- Lists aren't paginated, which is fine for a class but not for a whole university.

---

## 10. Tests

**Unit tests** (no database needed):

```bash
cd backend && npm test     # role guard, validation, error handling, admin invite code
cd frontend && npm test    # due-date wording and date formatting
```

**End-to-end smoke test** (needs the backend running with demo data):

```bash
cd backend
npm run seed
npm run dev                # terminal 1
npm run test:smoke         # terminal 2 (set API_URL to test another server)
```

It covers: health check, admin sign-up blocked without the code, login, group creation and adding a member, assignment targeting, the two-step flow (confirm before request → `409`, request → confirm, repeat → `409`), admin tracking and analytics, rejection of `javascript:` / `data:` / `file:` links, and simultaneous duplicate sign-ups.

**CI:** GitHub Actions ([ci.yml](.github/workflows/ci.yml)) runs lint and unit tests for both apps and the frontend production build on every push and pull request to `main`.

---

## 11. Deployment

1. **Neon:** create a project and copy the connection string (it ends in `sslmode=require`).
2. **Render:** New → Blueprint, select this repo (it reads `render.yaml`). Set `DATABASE_URL` to the Neon string and `CORS_ORIGIN` to the Vercel URL. `JWT_SECRET` is generated automatically. Health check path: `/health`.
3. **Vercel:** import the repo, set the root directory to `frontend`, and set `VITE_API_URL` to the Render URL. Redeploy the frontend if the backend URL changes.
4. **Demo data:** run the seed once against Neon:
   ```bash
   cd backend
   DATABASE_URL="<neon connection string>" npm run seed
   ```
5. **Keep-alive:** add a free UptimeRobot HTTP monitor on `<render-url>/health`, every 5 minutes.
