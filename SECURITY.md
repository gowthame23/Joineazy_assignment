# Security Policy & Safeguards

This document describes the security architecture and protective safeguards designed into the Joineazy Student, Group & Assignment Management System.

---

## 1. Authentication & Session Management
- **JSON Web Tokens (JWT)**: Signed using HMAC-SHA256 with the server-side `JWT_SECRET`. Tokens expire automatically after 7 days (`JWT_EXPIRES_IN=7d`).
- **Cryptographic Password Hashing**: Passwords are never stored in plaintext. They are salted and hashed using `bcryptjs` with an adaptive work factor of 10.
- **Client Session Revocation**: When the backend returns an HTTP 401 Unauthorized status, the frontend API client clears all cached authentication tokens and forces re-authentication.

---

## 2. Authorization & Role-Based Access Control (RBAC)
- **Strict Role Isolation**: Route endpoints are guarded by `requireRole('student')` and `requireRole('admin')` middleware.
- **Admin Passcode Guard**: Registering an account with `role: "admin"` requires providing a valid `adminCode` matching the server's `ADMIN_INVITE_CODE`. The check fails closed (if the variable is unset, professor sign-up is disabled, there is no default code) and compares in constant time.
- **Login Timing**: A login for an unknown email still performs one bcrypt comparison, so response time does not reveal which emails are registered.
- **Group Leadership Rules**: Only the team leader can invite new members or dismiss other students. Regular members can only leave the group voluntarily.

---

## 3. Network & Transport Security
- **Helmet HTTP Headers**: Enforces Content Security Policy (CSP), hides `X-Powered-By: Express`, enables DNS prefetch control, and sets `X-Content-Type-Options: nosniff`.
- **CORS Allowlist**: Cross-Origin Resource Sharing is locked to configured hostnames specified in `CORS_ORIGIN`.
- **Rate Limiting**: The authentication endpoints under `/api/auth` are rate-limited to 100 requests per 15-minute window to mitigate brute-force credential stuffing.
- **Payload Size Capping**: Request bodies are capped at a maximum of 100 kilobytes to prevent memory exhaustion denial-of-service attempts.

---

## 4. Database Safety
- **SQL Injection Prevention**: All queries use node-postgres parameterised statements (`$1, $2, ...`), preventing unsanitized user inputs from altering SQL logic.
- **Link Scheme Allowlist**: Assignment `oneDriveLink` values must be `http://` or `https://`. Schemes such as `javascript:`, `data:` and `file:` are rejected, and links render with `rel="noopener noreferrer"`.
- **Race-Safe State Changes**: Submission transitions are single atomic SQL statements and unique constraints back every "at most one" rule. Constraint violations are mapped to `409`, never leaked as `500`.
- **UUID Validation**: All route parameters expecting entity identifiers validate the UUIDv4 format using regex before database querying to avoid database-level unhandled exceptions.
