import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'admin']).optional().default('student'),
  studentId: z.string().trim().optional().nullable(),
  adminCode: z.string().trim().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const generateToken = (user) => {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role, studentId, adminCode } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Verify admin code if registering as admin
    if (role === 'admin') {
      const requiredCode = process.env.ADMIN_INVITE_CODE || 'joineazy-prof-2026';
      if (!adminCode || adminCode !== requiredCode) {
        return res.status(403).json({ error: 'Invalid admin invite code' });
      }
    }

    // Check email uniqueness
    const existingEmail = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // If student, validate studentId uniqueness if supplied
    const normalizedStudentId = role === 'student' && studentId ? studentId.trim() : null;
    if (normalizedStudentId) {
      const existingStudentId = await query('SELECT id FROM users WHERE student_id = $1', [normalizedStudentId]);
      if (existingStudentId.rows.length > 0) {
        return res.status(409).json({ error: 'A student with this Student ID already exists' });
      }
    }

    // Hash password with bcrypt cost 10
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (name, email, student_id, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, student_id, role`,
      [name, normalizedEmail, normalizedStudentId, passwordHash, role]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        studentId: newUser.student_id,
        role: newUser.role,
      },
    });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const result = await query(
      'SELECT id, name, email, student_id, password_hash, role FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: user.student_id,
        role: user.role,
      },
    });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await query(
      'SELECT id, name, email, student_id, role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        studentId: user.student_id,
        role: user.role,
      },
    });
  })
);

export default router;
