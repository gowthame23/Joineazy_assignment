# Joineazy LMS - REST API Specification

Comprehensive documentation of all backend REST endpoints, payload schemas, and response formats.

---

## Global Headers & Authentication

All private endpoints require an `Authorization` header containing a valid JWT Bearer token:
```http
Authorization: Bearer <jwt_token>
```

All responses are formatted in JSON.
Standard error response schema:
```json
{
  "error": "Descriptive human-readable error message"
}
```

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new student or professor user account.

**Request Body (Student):**
```json
{
  "name": "Jane Doe",
  "email": "jane@joineazy.com",
  "password": "password123",
  "role": "student",
  "studentId": "STU1099"
}
```

**Request Body (Professor):**
```json
{
  "name": "Dr. Alan Turing",
  "email": "turing@joineazy.com",
  "password": "password123",
  "role": "admin",
  "adminCode": "joineazy-prof-2026"
}
```

**Response (HTTP 201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e6a1005b-42fa-4509-9ec6-8d629a8a7df0",
    "name": "Jane Doe",
    "email": "jane@joineazy.com",
    "studentId": "STU1099",
    "role": "student"
  }
}
```

---

### `POST /api/auth/login`
Authenticates existing users.

**Request Body:**
```json
{
  "email": "professor@joineazy.com",
  "password": "password123"
}
```

**Response (HTTP 200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "c1f78da4-1b11-4770-9854-5a21768846c4",
    "name": "Dr. Joineazy Professor",
    "email": "professor@joineazy.com",
    "studentId": null,
    "role": "admin"
  }
}
```

---

### `GET /api/auth/me`
Fetches the currently authenticated profile.

**Response (HTTP 200 OK):**
```json
{
  "user": {
    "id": "c1f78da4-1b11-4770-9854-5a21768846c4",
    "name": "Dr. Joineazy Professor",
    "email": "professor@joineazy.com",
    "studentId": null,
    "role": "admin"
  }
}
```

---

## 2. Groups Endpoints

### `POST /api/groups`
Create a new project group. Caller must be an ungrouped student.

**Request Body:**
```json
{
  "name": "Team Delta"
}
```

**Response (HTTP 201 Created):**
```json
{
  "group": {
    "id": "b8109bf1-4475-4fc1-a95d-dbca1356f6f9",
    "name": "Team Delta",
    "leaderId": "e6a1005b-42fa-4509-9ec6-8d629a8a7df0",
    "members": [
      {
        "id": "e6a1005b-42fa-4509-9ec6-8d629a8a7df0",
        "name": "Jane Doe",
        "email": "jane@joineazy.com",
        "studentId": "STU1099"
      }
    ],
    "progress": {
      "total": 3,
      "confirmed": 0,
      "percent": 0
    }
  }
}
```

---

### `POST /api/groups/me/members`
Add a member to the caller's group by email or student ID. Caller must be the team leader.

**Request Body:**
```json
{
  "identifier": "STU1002"
}
```

---

### `DELETE /api/groups/me/members/:userId`
Remove a member from the group. If the caller is the leader, they can remove any member. Any student can leave their own group.

---

## 3. Assignments Endpoints

### `POST /api/assignments` (Admin)
Creates an assignment with selective or global targeting.

**Request Body:**
```json
{
  "title": "Assignment 2: UI Prototype",
  "description": "Design interactive wireframes",
  "dueDate": "2026-11-28T18:00:00.000Z",
  "oneDriveLink": "https://onedrive.live.com/sample",
  "assignToAll": false,
  "groupIds": [
    "b8109bf1-4475-4fc1-a95d-dbca1356f6f9"
  ]
}
```

**Validation rules:**
- `title`: 1 to 255 characters. `dueDate`: any valid date string (ISO 8601 recommended).
- `oneDriveLink`: must be an `http://` or `https://` URL (max 2048 chars). `javascript:`, `data:`, `file:` and other schemes are rejected with `400`.
- `assignToAll: false` requires a non-empty `groupIds` array, and every group must exist (otherwise `400`).

**Response (HTTP 201 Created):**
```json
{
  "assignment": {
    "id": "a89f92e2-9b93-4a12-8874-8b63e10fa101",
    "title": "Assignment 2: UI Prototype",
    "description": "Design interactive wireframes",
    "dueDate": "2026-11-28T18:00:00.000Z",
    "oneDriveLink": "https://onedrive.live.com/sample",
    "assignToAll": false,
    "createdBy": "c1f78da4-1b11-4770-9854-5a21768846c4",
    "createdAt": "2026-11-22T10:00:00.000Z",
    "updatedAt": "2026-11-22T10:00:00.000Z",
    "groupIds": ["b8109bf1-4475-4fc1-a95d-dbca1356f6f9"]
  }
}
```

---

### `PUT /api/assignments/:id` (Admin)
Updates an assignment and replaces its targeting. Same body and validation as `POST`. Returns `200 { "assignment": { ... } }`, or `404` if the assignment does not exist. Progress counts only include submissions from groups that still target the assignment.

### `DELETE /api/assignments/:id` (Admin)
Deletes the assignment and cascades to its targeting rows and submissions. Returns `204 No Content`, or `404`.

---

### `GET /api/assignments`
**Student response:** only assignments that apply to the caller's group, plus all "assign to all" ones. A student without a group still sees the "assign to all" assignments (`hasGroup: false`).
```json
{
  "hasGroup": true,
  "assignments": [
    {
      "id": "a89f92e2-9b93-4a12-8874-8b63e10fa101",
      "title": "Assignment 2: UI Prototype",
      "description": "Design interactive wireframes",
      "dueDate": "2026-11-28T18:00:00.000Z",
      "oneDriveLink": "https://onedrive.live.com/sample",
      "assignToAll": false,
      "createdAt": "2026-11-22T10:00:00.000Z",
      "submission": {
        "status": "none",
        "confirmedAt": null,
        "confirmedBy": null
      }
    }
  ]
}
```
`submission.status` is one of `none`, `pending`, `confirmed`. `confirmedBy` is the confirmer's name.

**Admin response:** every assignment with its audience and completion counts.
```json
{
  "assignments": [
    {
      "id": "a89f92e2-9b93-4a12-8874-8b63e10fa101",
      "title": "Assignment 2: UI Prototype",
      "dueDate": "2026-11-28T18:00:00.000Z",
      "oneDriveLink": "https://onedrive.live.com/sample",
      "assignToAll": false,
      "targeted": 2,
      "confirmed": 1,
      "groupIds": ["b8109bf1-4475-4fc1-a95d-dbca1356f6f9"]
    }
  ]
}
```
(Each admin row also includes `description`, `createdBy`, `createdAt` and `updatedAt`.) `groupIds` is empty when `assignToAll` is `true`.

---

## 4. Submission Endpoints (Two-Step Confirmation)

Any member of a group can perform either step for the whole group. The server enforces the order.

### `POST /api/assignments/:id/submission/request` (Student) - Step 1
"Yes, I have submitted". Creates the submission as `pending`. Safe to repeat while pending.

| Status | When |
|---|---|
| `200` `{ "submission": { "status": "pending" } }` | Created, or already pending |
| `403` | Caller is not in a group |
| `404` | Assignment does not exist or does not target the caller's group |
| `409` | Already `confirmed` |

### `POST /api/assignments/:id/submission/confirm` (Student) - Step 2
"Confirm submission". Only valid from `pending`.

```json
{
  "submission": {
    "status": "confirmed",
    "confirmedAt": "2026-11-22T10:30:00.000Z"
  }
}
```
Returns `409` if there is no pending request (step 1 was skipped) or the submission is already confirmed. The check and update are a single atomic SQL statement, so two simultaneous confirms cannot both succeed.

### `DELETE /api/assignments/:id/submission/request` (Student)
Cancels a pending request. Returns `200 { "message": "Submission request cancelled" }`, or `409` if there is nothing pending. A confirmed submission can never be undone.

---

## 5. Admin Tracking

### `GET /api/assignments/:id/submissions` (Admin)
Group-wise and student-wise breakdown for one assignment.
```json
{
  "assignment": { "id": "...", "title": "...", "dueDate": "...", "oneDriveLink": "...", "assignToAll": true },
  "summary": { "groups": 3, "confirmed": 1, "pending": 1, "notSubmitted": 1, "percent": 33 },
  "groups": [
    {
      "id": "...",
      "name": "Team Alpha",
      "status": "confirmed",
      "confirmedAt": "2026-11-21T09:00:00.000Z",
      "confirmedBy": "Alice Smith",
      "members": [
        { "id": "...", "name": "Alice Smith", "email": "student1@joineazy.com", "studentId": "STU1001", "confirmed": true, "isConfirmer": true }
      ]
    }
  ],
  "students": [
    { "id": "...", "name": "Alice Smith", "email": "student1@joineazy.com", "studentId": "STU1001", "groupId": "...", "groupName": "Team Alpha", "status": "confirmed", "isConfirmer": true }
  ]
}
```
Group `status` is `confirmed`, `pending` or `not_submitted`. For "assign to all" assignments, `students` also lists ungrouped students with `status: "no-group"`.

---

## 6. Analytics

### `GET /api/analytics` (Admin)
```json
{
  "totals": {
    "students": 6,
    "groups": 3,
    "assignments": 4,
    "overdueAssignments": 1,
    "ungroupedStudents": 0,
    "overallCompletionPercent": 42
  },
  "assignments": [
    { "id": "...", "title": "Assignment 1", "dueDate": "...", "targeted": 3, "confirmed": 2, "percent": 67 }
  ],
  "groups": [
    { "id": "...", "name": "Team Alpha", "members": 2, "assigned": 4, "confirmed": 2, "percent": 50 }
  ]
}
```

---

## 7. Groups (remaining endpoints)

### `GET /api/groups/me` (Student)
Returns `{ "group": { ... } }` in the shape shown above, or `{ "group": null }` when the student has no group.

### `GET /api/groups` (Admin)
Returns `{ "groups": [ ... ] }`, every group with members and progress.

### `POST /api/groups/me/members` - responses
`201 { "group": { ... } }`, `403` (caller is not the leader), `404` (no such student, or the target is not a student), `409` (target already in a group).

### `DELETE /api/groups/me/members/:userId` - responses
`200 { "group": { ... } }`. If the leader leaves, leadership passes to the longest-standing member. If the group becomes empty it is deleted and the response is `{ "group": null }`. `403` if a non-leader removes someone else, `404` if the target is not in the caller's group.

---

## 8. Status Codes

| Code | Meaning |
|---|---|
| `400` | Validation failed (bad body, bad UUID parameter, non-http link) |
| `401` | Missing, invalid or expired token |
| `403` | Wrong role, or action not allowed (e.g. not the leader, no group) |
| `404` | Resource not found, or not targeted at the caller's group |
| `409` | Conflict (duplicate email or student ID, already in a group, step order violated) |
| `413` | Request body larger than the 100 kB limit |
| `429` | Too many requests to `/api/auth` (100 per 15 minutes per IP) |
| `500` | Unexpected server error (details are never leaked) |
