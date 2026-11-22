import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import assignmentRoutes from './routes/assignments.js';
import analyticsRoutes from './routes/analytics.js';
import { HttpError } from './utils/http.js';

const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging (skip during automated tests)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Request body parsing limited to 100kb
app.use(express.json({ limit: '100kb' }));

// Auth rate limiter: 100 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

// Uptime health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Catch-all 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  // JSON parse error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON payload in request' });
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed by CORS' });
  }

  // Internal unexpected errors (never leak database or internal stack traces)
  console.error('Unhandled server error:', err);
  return res.status(500).json({ error: 'An unexpected internal server error occurred' });
});

export default app;
