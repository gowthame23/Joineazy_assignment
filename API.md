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
