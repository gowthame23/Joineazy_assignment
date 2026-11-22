# Joineazy - Student, Group & Assignment Management System

A role-based, full-stack web application that enables students to form collaborative groups, manage members, and confirm assignment submissions with a server-enforced two-step verification workflow — while professors post assignments, configure group targeting, monitor submissions, and track progress analytics in real-time.

---

## 1. Live Deployment & Repository Links

- **Repository**: [https://github.com/gowthame23/Joineazy_assignment](https://github.com/gowthame23/Joineazy_assignment)
- **Frontend Live Demo**: *Configured for Vercel deployment (`frontend/vercel.json` included)*
- **Backend API Live**: *Configured for Render deployment (`backend/render.yaml` included)*
- **API Health Check**: `https://<render-backend-url>/health` (or `http://localhost:4000/health`)

---

## 2. Features by Role

### Student Role
- **Authentication**: JWT-based sign-in and registration with student email and optional Student ID.
- **Group Management**:
  - Create a new project group (creator automatically becomes the team leader).
  - Add members by exact student email or student ID.
  - Leave group at any time (automatic leadership handover to longest-standing member, or deletion if empty).
  - Leader can remove members.
- **Course Assignments**:
  - View all assignments targeting the student's group (including global "Assign to all" assignments).
  - Direct 1-click access to external OneDrive submission folders.
  - Visual due-date urgency badges ("Due in N days", "Overdue").
- **Two-Step Submission Verification**:
  - **Step 1**: *"Have you uploaded your work to the OneDrive link?"* $\rightarrow$ Sets submission to `pending`.
  - **Step 2**: *"Confirm for your whole group? This cannot be undone."* $\rightarrow$ Sets submission to `confirmed` with timestamps and confirmer attribution.
  - Server strictly enforces step order (cannot skip step 1; cannot alter confirmed submissions).
  - Ability to cancel a pending submission before final confirmation.
- **Progress Tracking**:
  - Live visual progress bars showing completion percentage and confirmed counts ($x \text{ of } y$).

### Professor (Admin) Role
- **Secure Registration**: Admin registration gated by a server-side verified invite code (`ADMIN_INVITE_CODE`).
- **Assignment CRUD & Targeting**:
  - Create, view, edit, and delete assignments (Title, Description, Due Date, OneDrive URL).
  - Flexible targeting: Assign to **All Students** or select **Specific Groups** using a searchable multi-select list.
- **Unified Analytics Dashboard**:
  - KPI summary metric cards: Total Students, Ungrouped Students, Total Groups, Active Assignments, Overall Completion %, Overdue Count.
  - **Visualizations (Recharts)**:
    - Confirmed vs Remaining submissions per assignment.
    - Group performance bar chart (completion rate % per team).
- **Deep Tracking View (`/assignments/:id`)**:
  - **Group-Wise Tab**: Real-time status badge per group, confirmation timestamp, who confirmed, and expandable student rosters.
  - **Student-Wise Tab**: Every student's status, associated team, and explicit marker for the student who confirmed the submission.
  - Instant status filtering and real-time name/email search.

---

## 3. Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v3, React Router v6, Recharts, Lucide Icons |
| **Backend** | Node.js 20+, Express, `pg` (node-postgres, raw SQL with parameterised queries), Zod, bcryptjs, jsonwebtoken, Helmet, CORS, Morgan, Express Rate Limit, Dotenv |
| **Database** | PostgreSQL 16 (`pgcrypto` UUIDs, Timestamptz, Foreign Keys, Unique Constraints) |
| **DevOps / Containers** | Docker (Alpine images), Nginx multi-stage SPA build, Docker Compose |
| **Deployment Targets** | Frontend: Vercel • Backend: Render (Docker) • Database: Neon PostgreSQL |

---

## 4. Setup and Run Instructions

### Prerequisites
- Node.js 20+ and npm 10+
- Docker and Docker Compose (optional for containerized run)
- PostgreSQL database (local or Neon serverless connection string)

---

### Option A: Running with Docker Compose (Recommended - Single Command)

1. Clone the repository:
   ```bash
   git clone https://github.com/gowthame23/Joineazy_assignment.git
   cd Joineazy_assignment
   ```

2. Start the full application stack (PostgreSQL, Backend, Frontend):
   ```bash
   docker compose up --build
   ```

3. Open your browser:
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:4000](http://localhost:4000)
   - **Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

4. *(Optional)* Seed initial sample data inside the container:
   ```bash
   docker compose exec backend npm run seed
   ```

---

### Option B: Running Locally without Docker

#### 1. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
```
Configure `backend/.env` with your PostgreSQL database URL (e.g. Neon or local):
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/joineazy
JWT_SECRET=production-secret-replace-me-random-string
JWT_EXPIRES_IN=7d
ADMIN_INVITE_CODE=joineazy-prof-2026
CORS_ORIGIN=http://localhost:5173
PORT=4000
```

Run database migrations and seed sample records:
```bash
npm run migrate
npm run seed
npm start
```
*Backend will start on `http://localhost:4000`.*

#### 2. Frontend Setup
In a new terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
*Frontend will start on `http://localhost:5173`.*

---

### Pre-Configured Seed Accounts (password: `password123`)

| Role | Email | Password | Details |
|---|---|---|---|
| **Professor** | `professor@joineazy.com` | `password123` | Full access to assignment creation & analytics |
| **Student 1** | `student1@joineazy.com` | `password123` | Leader of **Team Alpha** (ID: `STU1001`) |
| **Student 2** | `student2@joineazy.com` | `password123` | Member of **Team Alpha** (ID: `STU1002`) |
| **Student 3** | `student3@joineazy.com` | `password123` | Leader of **Team Beta** (ID: `STU1003`) |
| **Student 4** | `student4@joineazy.com` | `password123` | Member of **Team Beta** (ID: `STU1004`) |
| **Student 5** | `student5@joineazy.com` | `password123` | Leader of **Team Gamma** (ID: `STU1005`) |
| **Student 6** | `student6@joineazy.com` | `password123` | Member of **Team Gamma** (ID: `STU1006`) |

---

## 5. Environment Variables Table

### Backend (`backend/.env`)
| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (supports Neon `sslmode=require`) | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Secret key used to sign and verify JWT authentication tokens | `complex-random-secret-string` |
| `JWT_EXPIRES_IN` | Token expiration lifespan | `7d` |
| `ADMIN_INVITE_CODE`| Security passphrase required for professor registration | `joineazy-prof-2026` |
| `CORS_ORIGIN` | Permitted frontend origin URL(s), comma-separated | `http://localhost:5173,https://my-app.vercel.app` |
| `PORT` | HTTP server port | `4000` |

### Frontend (`frontend/.env`)
| Variable | Description | Example / Default |
|---|---|---|
| `VITE_API_URL` | Base URL pointing to the running backend service | `http://localhost:4000` or Render URL |

---

## 6. API Reference & Endpoint Details

Base URL: `/api` (Public health check at root: `GET /health`)

| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Uptime monitor health check (`{ status: "ok" }`) |
| `POST` | `/api/auth/register` | Public | Create new student or professor account |
| `POST` | `/api/auth/login` | Public | Authenticate user and return JWT bearer token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile |
| `POST` | `/api/groups` | Student | Create a new team (creator becomes leader) |
| `GET` | `/api/groups/me` | Student | Get current student's group, members, and progress |
| `POST` | `/api/groups/me/members` | Leader | Add member by student email or student ID |
| `DELETE` | `/api/groups/me/members/:userId` | Leader / Self | Remove team member or leave group |
| `GET` | `/api/groups` | Admin | List all student groups with progress metrics |
| `GET` | `/api/assignments` | Authenticated | List assignments (filtered for student, all for admin) |
| `POST` | `/api/assignments` | Admin | Create assignment with group targeting |
| `PUT` | `/api/assignments/:id` | Admin | Update existing assignment details and targeting |
| `DELETE` | `/api/assignments/:id` | Admin | Delete assignment and cascade remove submissions |
| `POST` | `/api/assignments/:id/submission/request` | Student | **Step 1:** Request submission ("Yes, I have submitted") |
| `POST` | `/api/assignments/:id/submission/confirm` | Student | **Step 2:** Final confirmation ("Confirm submission") |
| `DELETE`| `/api/assignments/:id/submission/request` | Student | Cancel pending submission request |
| `GET` | `/api/assignments/:id/submissions` | Admin | Detailed tracking breakdown (group-wise & student-wise) |
| `GET` | `/api/analytics` | Admin | Dashboard summary counts and performance metrics |

---

### Key API Request & Response Examples

#### 1. Two-Step Submission Verification Workflow

**Step 1: Initiation**
```http
POST /api/assignments/a89f92e2-9b93-4a12-8874-8b63e10fa101/submission/request
Authorization: Bearer <STUDENT_TOKEN>
```
Response:
```json
{
  "submission": {
    "status": "pending"
  }
}
```

**Step 2: Final Confirmation**
```http
POST /api/assignments/a89f92e2-9b93-4a12-8874-8b63e10fa101/submission/confirm
Authorization: Bearer <STUDENT_TOKEN>
```
Response:
```json
{
  "submission": {
    "status": "confirmed",
    "confirmedAt": "2026-11-22T10:30:00.000Z"
  }
}
```

---

## 7. Database Schema & Relationships

```mermaid
erDiagram
    users ||--o{ groups : "leads"
    users ||--o| group_members : "belongs to (at most one)"
    groups ||--|{ group_members : "contains"
    users ||--o{ assignments : "creates (professors)"
    assignments ||--o{ assignment_groups : "targets"
    groups ||--o{ assignment_groups : "targeted by"
    assignments ||--o{ submissions : "has"
    groups ||--o{ submissions : "submits"
    users ||--o{ submissions : "requests / confirms"

    users {
        uuid id PK
        varchar name
        varchar email UK
        varchar student_id UK
        varchar password_hash
        varchar role "CHECK ('student', 'admin')"
        timestamptz created_at
    }

    groups {
        uuid id PK
        varchar name
        uuid leader_id FK
        timestamptz created_at
    }

    group_members {
        uuid group_id PK, FK
        uuid user_id PK, FK, UK
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
        uuid assignment_id PK, FK
        uuid group_id PK, FK
    }

    submissions {
        uuid id PK
        uuid assignment_id FK
        uuid group_id FK
        varchar status "CHECK ('pending', 'confirmed')"
        uuid requested_by FK
        uuid confirmed_by FK
        timestamptz requested_at
        timestamptz confirmed_at
    }
```

### Relationship Explanation:
1. **One Group per Student (`group_members.user_id UNIQUE`)**: A student can belong to at most one group at any time, enforced at the database layer.
2. **Submissions Stored Per Group (`submissions.unique_assignment_group_submission`)**: Because work is collaborative, submissions belong to the team (`group_id`). Individual student tracking is derived from group membership, with `confirmed_by` preserving the individual audit trail of who completed the confirmation.
3. **Targeting (`assignment_groups`)**: When `assign_to_all = false`, rows in `assignment_groups` explicitly determine eligible groups. When `assign_to_all = true`, all student groups are eligible.

---

## 8. Architecture Overview

```mermaid
flowchart LR
    subgraph Client ["Client Browser"]
        ReactApp["React 18 SPA (Vite + Tailwind)"]
    end

    subgraph Hosting ["Vercel"]
        ReactApp -->|HTTP Fetch / JWT Bearer| ExpressAPI
    end

    subgraph BackendHost ["Render (Docker)"]
        ExpressAPI["Express API Server (Node 20)"]
        subgraph Pipeline ["Middleware Pipeline"]
            Helmet["Helmet & CORS"] --> Auth["JWT Auth & Role Check"]
            Auth --> Zod["Zod Validation"]
            Zod --> Route["Route Controllers"]
        end
    end

    subgraph Database ["Neon Serverless"]
        Route -->|node-postgres (Raw SQL)| Postgres[("PostgreSQL 16")]
    end
```

### Request Lifecycle:
1. **CORS & Security**: Helmet sets protective HTTP headers; CORS restricts access to registered origins.
2. **JWT Authentication**: `requireAuth` parses Bearer tokens, validates signature against `JWT_SECRET`, and attaches `req.user = { id, role }`.
3. **Role Authorization**: `requireRole('student' | 'admin')` guarantees unauthorized users cannot access privileged operations.
4. **Zod Validation**: Request bodies and parameters are parsed with strict Zod schemas; malformed requests fail fast with status 400.
5. **Database Execution**: Parameterised raw SQL queries protect against SQL injection and maintain high query performance without ORM abstraction overhead.

---

## 9. Key Design and Deployment Decisions

1. **Submissions Per Group**: Rather than creating duplicate submission rows for every student, submissions exist at the group level (`UNIQUE(assignment_id, group_id)`). This guarantees synchronization across team members.
2. **Server-Enforced Two-Step Verification**: The server checks that a submission is in `pending` status before allowing `confirm`. Clients cannot bypass step 1.
3. **Raw SQL with Parameterised Queries**: Avoids ORM synchronization issues, cold-start query generator latency, and ensures total transparency of SQL queries.
4. **Idempotent Boot Migrations**: Database tables and extensions are created on every server startup using `CREATE TABLE IF NOT EXISTS` and `CREATE EXTENSION IF NOT EXISTS`, eliminating manual migration steps on new deployments.
5. **Free-Tier Cold Start Handling**: A custom event listener in `api/client.js` detects when an API request takes longer than 3 seconds (Render free-tier spin-up) and renders an accessible `WakeBanner` informing the user.
6. **Zero-Emoji Academic-Professional Design System**: Strict adherence to restrained corporate typography and flat solid colour tokens (`ink`, `brand`, `line`, `surface`, `canvas`) with no gimmicks, blur, or rainbow gradients.

---

## 10. Running the End-to-End Smoke Test

The repository includes an automated integration test script (`backend/scripts/smoke-test.js`) verifying all critical endpoints:

```bash
# Ensure the backend server is running on http://localhost:4000
cd backend
npm run test:smoke
```

The test runner automatically verifies:
1. Health check `/health`
2. Security safeguards: Admin registration rejection without secret invite code
3. Seed accounts login
4. Fresh student account registration
5. Group creation and member invitation by Student ID
6. Assignment creation with targeted group assignment
7. Two-step submission verification (`request` $\rightarrow$ `confirm` $\rightarrow$ attempt duplicate rejection)
8. Admin tracking breakdown and analytics accuracy
