import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();

// GET /api/analytics - Admin Analytics
router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    // 1. Totals
    const studentsCountRes = await query(
      "SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'"
    );
    const totalStudents = studentsCountRes.rows[0]?.count || 0;

    const groupsCountRes = await query('SELECT COUNT(*)::int AS count FROM groups');
    const totalGroups = groupsCountRes.rows[0]?.count || 0;

    const assignmentsCountRes = await query('SELECT COUNT(*)::int AS count FROM assignments');
    const totalAssignments = assignmentsCountRes.rows[0]?.count || 0;

    const overdueCountRes = await query(
      'SELECT COUNT(*)::int AS count FROM assignments WHERE due_date < CURRENT_TIMESTAMP'
    );
    const overdueAssignments = overdueCountRes.rows[0]?.count || 0;

    const ungroupedRes = await query(
      `SELECT COUNT(*)::int AS count
       FROM users u
       LEFT JOIN group_members gm ON u.id = gm.user_id
       WHERE u.role = 'student' AND gm.group_id IS NULL`
    );
    const ungroupedStudents = ungroupedRes.rows[0]?.count || 0;

    // 2. Per-assignment metrics
    const assignRes = await query(
      `SELECT id, title, due_date AS "dueDate", assign_to_all AS "assignToAll"
       FROM assignments
       ORDER BY due_date ASC`
    );

    let totalPairsAssigned = 0;
    let totalPairsConfirmed = 0;

    const assignmentsData = [];
    for (const a of assignRes.rows) {
      let targetedGroupIds = [];
      if (a.assignToAll) {
        const allG = await query('SELECT id FROM groups');
        targetedGroupIds = allG.rows.map(g => g.id);
      } else {
        const agG = await query(
          'SELECT group_id FROM assignment_groups WHERE assignment_id = $1',
          [a.id]
        );
        targetedGroupIds = agG.rows.map(g => g.group_id);
      }

      const targeted = targetedGroupIds.length;
      totalPairsAssigned += targeted;

      let confirmed = 0;
      if (targetedGroupIds.length > 0) {
        const confRes = await query(
          `SELECT COUNT(*)::int AS count
           FROM submissions
           WHERE assignment_id = $1 AND status = 'confirmed' AND group_id = ANY($2::uuid[])`,
          [a.id, targetedGroupIds]
        );
        confirmed = confRes.rows[0]?.count || 0;
      }
      totalPairsConfirmed += confirmed;

      const percent = targeted > 0 ? Math.round((confirmed / targeted) * 100) : 0;

      assignmentsData.push({
        id: a.id,
        title: a.title,
        dueDate: a.dueDate,
        targeted,
        confirmed,
        percent,
      });
    }

    const overallCompletionPercent =
      totalPairsAssigned > 0 ? Math.round((totalPairsConfirmed / totalPairsAssigned) * 100) : 0;

    // 3. Per-group metrics
    const groupsRes = await query('SELECT id, name FROM groups ORDER BY name ASC');
    const groupsData = [];

    for (const g of groupsRes.rows) {
      // Member count
      const memRes = await query(
        'SELECT COUNT(*)::int AS count FROM group_members WHERE group_id = $1',
        [g.id]
      );
      const members = memRes.rows[0]?.count || 0;

      // Assignments targeting this group
      const assignedRes = await query(
        `SELECT COUNT(DISTINCT a.id)::int AS count
         FROM assignments a
         LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
         WHERE a.assign_to_all = true OR ag.group_id = $1`,
        [g.id]
      );
      const assigned = assignedRes.rows[0]?.count || 0;

      // Confirmed submissions on those targeted assignments
      const confRes = await query(
        `SELECT COUNT(DISTINCT s.assignment_id)::int AS count
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
         WHERE s.group_id = $1
           AND s.status = 'confirmed'
           AND (a.assign_to_all = true OR ag.group_id = $1)`,
        [g.id]
      );
      const confirmed = confRes.rows[0]?.count || 0;

      const percent = assigned > 0 ? Math.round((confirmed / assigned) * 100) : 0;

      groupsData.push({
        id: g.id,
        name: g.name,
        members,
        assigned,
        confirmed,
        percent,
      });
    }

    return res.status(200).json({
      totals: {
        students: totalStudents,
        groups: totalGroups,
        assignments: totalAssignments,
        overdueAssignments,
        ungroupedStudents,
        overallCompletionPercent,
      },
      assignments: assignmentsData,
      groups: groupsData,
    });
  })
);

export default router;
