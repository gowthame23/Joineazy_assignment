# Contributing to Joineazy LMS

Thank you for contributing to the Joineazy Student, Group & Assignment Management System!

---

## Code Quality & Architecture Standards

1. **Separation of Concerns**:
   - Backend logic resides in `backend/src/`.
   - Business routes in `backend/src/routes/`.
   - Idempotent schema migrations in `backend/src/db/schema.sql`.
   - Frontend components adhere strictly to the Design System defined in `tailwind.config.js`.

2. **Commit Message Conventions**:
   All commits must adhere to [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(...)`: New feature or user capability
   - `fix(...)`: Bug fix
   - `chore(...)`: Tooling, build config, dependencies
   - `docs(...)`: Documentation updates
   - `test(...)`: Unit, integration, or smoke tests

3. **Pre-Commit Verification**:
   Before pushing, verify:
   ```bash
   # In frontend:
   npm test
   npm run build

   # In backend:
   npm test
   npm run test:smoke   # needs the API running and seeded
   ```
