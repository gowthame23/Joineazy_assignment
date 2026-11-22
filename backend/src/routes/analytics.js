import express from 'express';
import { query } from '../db/pool.js';
import { ASSIGNMENT_STATS_SQL, GROUP_STATS_SQL } from '../db/queries.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();

const percentOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// GET /api/analytics - Admin Analytics
router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    // Summary counters in a single round trip
    const totalsRes = await query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS students,
         (SELECT COUNT(*) FROM groups)::int AS groups,
         (SELECT COUNT(*) FROM assignments)::int AS assignments,
         (SELECT COUNT(*) FROM assignments WHERE due_date < CURRENT_TIMESTAMP)::int AS "overdueAssignments",
         (SELECT COUNT(*) FROM users u
            WHERE u.role = 'student'
              AND NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.user_id = u.id))::int AS "ungroupedStudents"`
    );
    const totals = totalsRes.rows[0];

    // Per-assignment and per-group metrics (set-based, no per-row queries)
    const [assignRes, groupRes] = await Promise.all([
      query(ASSIGNMENT_STATS_SQL),
      query(GROUP_STATS_SQL),
    ]);

    let totalPairsAssigned = 0;
    let totalPairsConfirmed = 0;

    const assignments = assignRes.rows.map((a) => {
      totalPairsAssigned += a.targeted;
      totalPairsConfirmed += a.confirmed;
      return {
        id: a.id,
        title: a.title,
        dueDate: a.dueDate,
        targeted: a.targeted,
        confirmed: a.confirmed,
        percent: percentOf(a.confirmed, a.targeted),
      };
    });

    const groups = groupRes.rows.map((g) => ({
      id: g.id,
      name: g.name,
      members: g.members,
      assigned: g.assigned,
      confirmed: g.confirmed,
      percent: percentOf(g.confirmed, g.assigned),
    }));

    return res.status(200).json({
      totals: {
        ...totals,
        overallCompletionPercent: percentOf(totalPairsConfirmed, totalPairsAssigned),
      },
      assignments,
      groups,
    });
  })
);

export default router;
