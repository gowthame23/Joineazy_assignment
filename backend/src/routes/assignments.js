import express from 'express';
import { z } from 'zod';
import { query, pool } from '../db/pool.js';
import { ASSIGNMENT_STATS_SQL } from '../db/queries.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateUuidParam } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();

const assignmentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: z.string().default(''),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid due date format',
  }),
  // Only http/https links are allowed: blocks javascript:, data:, file: etc.
  oneDriveLink: z
    .string()
    .trim()
    .max(2048, 'OneDrive URL is too long')
    .url('Invalid OneDrive URL')
    .refine((val) => /^https?:\/\//i.test(val), {
      message: 'OneDrive URL must start with http:// or https://',
    }),
  assignToAll: z.boolean().default(true),
  groupIds: z.array(z.string().uuid()).max(500, 'Too many groups selected').default([]),
});

// Helper: check if an assignment targets a specific group
async function assignmentTargetsGroup(assignmentId, groupId) {
  const res = await query(
    `SELECT a.id
     FROM assignments a
     LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
     WHERE a.id = $1 AND (a.assign_to_all = true OR ag.group_id = $2)`,
    [assignmentId, groupId]
  );
  return res.rows.length > 0;
}

// GET /api/assignments - Student or Admin view
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { role, id: userId } = req.user;

    if (role === 'admin') {
      const result = await query(ASSIGNMENT_STATS_SQL);
      return res.status(200).json({ assignments: result.rows });
    }

    // Student view
    const memberRes = await query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );
    const hasGroup = memberRes.rows.length > 0;
    const groupId = hasGroup ? memberRes.rows[0].group_id : null;

    // One query: assignments that target the student's group (or everyone),
    // joined with that group's submission row. A student without a group
    // (groupId = NULL) only matches "assign to all" and never matches a submission.
    const result = await query(
      `SELECT a.id, a.title, a.description, a.due_date AS "dueDate",
              a.onedrive_link AS "oneDriveLink", a.assign_to_all AS "assignToAll",
              a.created_at AS "createdAt",
              s.status AS sub_status, s.confirmed_at AS sub_confirmed_at,
              u.name AS sub_confirmed_by
         FROM assignments a
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.group_id = $1::uuid
         LEFT JOIN users u ON u.id = s.confirmed_by
        WHERE a.assign_to_all = true
           OR EXISTS (SELECT 1 FROM assignment_groups ag
                       WHERE ag.assignment_id = a.id AND ag.group_id = $1::uuid)
        ORDER BY a.due_date ASC`,
      [groupId]
    );

    const assignments = result.rows.map(
      ({ sub_status, sub_confirmed_at, sub_confirmed_by, ...a }) => ({
        ...a,
        submission: {
          status: sub_status || 'none',
          confirmedAt: sub_confirmed_at || null,
          confirmedBy: sub_confirmed_by || null,
        },
      })
    );

    return res.status(200).json({ hasGroup, assignments });
  })
);

// POST /api/assignments - Admin creates assignment
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validateBody(assignmentSchema),
  asyncHandler(async (req, res) => {
    const { title, description, dueDate, oneDriveLink, assignToAll, groupIds } = req.body;
    const adminId = req.user.id;

    if (!assignToAll) {
      if (!groupIds || groupIds.length === 0) {
        return res.status(400).json({ error: 'You must select at least one group when not assigning to all.' });
      }

      // Check all groupIds exist
      const checkGroups = await query(
        'SELECT id FROM groups WHERE id = ANY($1::uuid[])',
        [groupIds]
      );
      if (checkGroups.rows.length !== groupIds.length) {
        return res.status(400).json({ error: 'One or more selected groups do not exist.' });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO assignments (title, description, due_date, onedrive_link, assign_to_all, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, title, description, due_date AS "dueDate", onedrive_link AS "oneDriveLink",
                   assign_to_all AS "assignToAll", created_by AS "createdBy",
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [title, description, new Date(dueDate), oneDriveLink, assignToAll, adminId]
      );
      const assignment = insertRes.rows[0];

      if (!assignToAll && groupIds.length > 0) {
        for (const gId of groupIds) {
          await client.query(
            'INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, $2)',
            [assignment.id, gId]
          );
        }
      }

      await client.query('COMMIT');
      return res.status(201).json({ assignment: { ...assignment, groupIds: assignToAll ? [] : groupIds } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

// PUT /api/assignments/:id - Admin updates assignment
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validateUuidParam('id'),
  validateBody(assignmentSchema),
  asyncHandler(async (req, res) => {
    const assignmentId = req.params.id;
    const { title, description, dueDate, oneDriveLink, assignToAll, groupIds } = req.body;

    const existing = await query('SELECT id FROM assignments WHERE id = $1', [assignmentId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (!assignToAll) {
      if (!groupIds || groupIds.length === 0) {
        return res.status(400).json({ error: 'You must select at least one group when not assigning to all.' });
      }
      const checkGroups = await query(
        'SELECT id FROM groups WHERE id = ANY($1::uuid[])',
        [groupIds]
      );
      if (checkGroups.rows.length !== groupIds.length) {
        return res.status(400).json({ error: 'One or more selected groups do not exist.' });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE assignments
         SET title = $1, description = $2, due_date = $3, onedrive_link = $4,
             assign_to_all = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING id, title, description, due_date AS "dueDate", onedrive_link AS "oneDriveLink",
                   assign_to_all AS "assignToAll", created_by AS "createdBy",
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [title, description, new Date(dueDate), oneDriveLink, assignToAll, assignmentId]
      );
      const assignment = updateRes.rows[0];

      // Update assignment_groups
      await client.query('DELETE FROM assignment_groups WHERE assignment_id = $1', [assignmentId]);
      if (!assignToAll && groupIds.length > 0) {
        for (const gId of groupIds) {
          await client.query(
            'INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, $2)',
            [assignmentId, gId]
          );
        }
      }

      await client.query('COMMIT');
      return res.status(200).json({ assignment: { ...assignment, groupIds: assignToAll ? [] : groupIds } });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

// DELETE /api/assignments/:id - Admin deletes assignment
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validateUuidParam('id'),
  asyncHandler(async (req, res) => {
    const assignmentId = req.params.id;
    const result = await query('DELETE FROM assignments WHERE id = $1 RETURNING id', [assignmentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    return res.status(204).send();
  })
);

// POST /api/assignments/:id/submission/request - Step 1: "Yes, I have submitted"
router.post(
  '/:id/submission/request',
  requireAuth,
  requireRole('student'),
  validateUuidParam('id'),
  asyncHandler(async (req, res) => {
    const assignmentId = req.params.id;
    const userId = req.user.id;

    // Check student is in a group
    const memberRes = await query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );
    if (memberRes.rows.length === 0) {
      return res.status(403).json({ error: 'You must be in a group to submit assignments' });
    }
    const groupId = memberRes.rows[0].group_id;

    // Check assignment targets this group
    const targets = await assignmentTargetsGroup(assignmentId, groupId);
    if (!targets) {
      return res.status(404).json({ error: 'Assignment not found or not assigned to your group' });
    }

    // Atomic create-or-keep: a concurrent double click can never produce a 500
    // (unique violation) and can never downgrade an already confirmed submission.
    await query(
      `INSERT INTO submissions (assignment_id, group_id, status, requested_by, requested_at)
       VALUES ($1, $2, 'pending', $3, CURRENT_TIMESTAMP)
       ON CONFLICT (assignment_id, group_id) DO NOTHING`,
      [assignmentId, groupId, userId]
    );

    const current = await query(
      'SELECT status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
      [assignmentId, groupId]
    );
    if (current.rows[0]?.status === 'confirmed') {
      return res.status(409).json({ error: 'Assignment submission has already been confirmed' });
    }

    return res.status(200).json({ submission: { status: 'pending' } });
  })
);

// POST /api/assignments/:id/submission/confirm - Step 2: "Confirm submission"
router.post(
  '/:id/submission/confirm',
  requireAuth,
  requireRole('student'),
  validateUuidParam('id'),
  asyncHandler(async (req, res) => {
    const assignmentId = req.params.id;
    const userId = req.user.id;

    // Check student has a group
    const memberRes = await query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );
    if (memberRes.rows.length === 0) {
      return res.status(403).json({ error: 'You must be in a group to submit assignments' });
    }
    const groupId = memberRes.rows[0].group_id;

    // Check assignment targets group
    const targets = await assignmentTargetsGroup(assignmentId, groupId);
    if (!targets) {
      return res.status(404).json({ error: 'Assignment not found or not assigned to your group' });
    }

    // Enforce step order atomically: the UPDATE only matches a 'pending' row, so
    // two simultaneous confirms cannot both succeed and step 2 can never skip step 1.
    const updateRes = await query(
      `UPDATE submissions
       SET status = 'confirmed', confirmed_by = $1, confirmed_at = CURRENT_TIMESTAMP
       WHERE assignment_id = $2 AND group_id = $3 AND status = 'pending'
       RETURNING status, confirmed_at AS "confirmedAt"`,
      [userId, assignmentId, groupId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(409).json({
        error: 'Submission must be requested (pending) before it can be confirmed',
      });
    }

    return res.status(200).json({
      submission: {
        status: 'confirmed',
        confirmedAt: updateRes.rows[0].confirmedAt,
      },
    });
  })
);

// DELETE /api/assignments/:id/submission/request - Cancel a pending submission request
router.delete(
  '/:id/submission/request',
  requireAuth,
  requireRole('student'),
  validateUuidParam('id'),
  asyncHandler(async (req, res) => {
    const assignmentId = req.params.id;
    const userId = req.user.id;

    const memberRes = await query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );
    if (memberRes.rows.length === 0) {
      return res.status(403).json({ error: 'You must be in a group' });
    }
    const groupId = memberRes.rows[0].group_id;

    // Only a pending row can be deleted; a confirmed submission is never undone.
    const deleted = await query(
      `DELETE FROM submissions
       WHERE assignment_id = $1 AND group_id = $2 AND status = 'pending'
       RETURNING id`,
      [assignmentId, groupId]
    );

    if (deleted.rows.length === 0) {
      return res.status(409).json({ error: 'Can only cancel pending submission requests' });
    }

    return res.status(200).json({ message: 'Submission request cancelled' });
  })
);

// GET /api/assignments/:id/submissions - Admin Tracking
router.get(
  '/:id/submissions',
  requireAuth,
  requireRole('admin'),
  validateUuidParam('id'),
  asyncHandler(async (req, res) => {
    const assignmentId = req.params.id;

    // Fetch assignment
    const assignRes = await query(
      `SELECT id, title, description, due_date AS "dueDate", onedrive_link AS "oneDriveLink",
              assign_to_all AS "assignToAll", created_at AS "createdAt"
       FROM assignments WHERE id = $1`,
      [assignmentId]
    );
    if (assignRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const assignment = assignRes.rows[0];

    // Find targeted groups
    let targetedGroupsRes;
    if (assignment.assignToAll) {
      targetedGroupsRes = await query('SELECT id, name FROM groups ORDER BY name ASC');
    } else {
      targetedGroupsRes = await query(
        `SELECT g.id, g.name
         FROM assignment_groups ag
         JOIN groups g ON ag.group_id = g.id
         WHERE ag.assignment_id = $1
         ORDER BY g.name ASC`,
        [assignmentId]
      );
    }
    const targetedGroups = targetedGroupsRes.rows;
    const targetedGroupIds = targetedGroups.map(g => g.id);

    // Fetch all submissions for this assignment
    const subRes = await query(
      `SELECT s.group_id, s.status, s.confirmed_at, s.confirmed_by, u.name AS confirmed_by_name
       FROM submissions s
       LEFT JOIN users u ON s.confirmed_by = u.id
       WHERE s.assignment_id = $1`,
      [assignmentId]
    );
    const subMap = new Map();
    for (const s of subRes.rows) {
      subMap.set(s.group_id, s);
    }

    // Build group breakdown
    let confirmedCount = 0;
    let pendingCount = 0;
    let notSubmittedCount = 0;

    const groupsData = [];
    const studentsData = [];

    // Fetch members of every targeted group in one query (no per-group round trips)
    const membersByGroup = new Map();
    if (targetedGroupIds.length > 0) {
      const allMembersRes = await query(
        `SELECT gm.group_id, u.id, u.name, u.email, u.student_id AS "studentId"
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = ANY($1::uuid[])
         ORDER BY gm.joined_at ASC`,
        [targetedGroupIds]
      );
      for (const row of allMembersRes.rows) {
        if (!membersByGroup.has(row.group_id)) membersByGroup.set(row.group_id, []);
        membersByGroup.get(row.group_id).push(row);
      }
    }

    for (const group of targetedGroups) {
      const sub = subMap.get(group.id);
      let status = 'not_submitted';
      let confirmedAt = null;
      let confirmedBy = null;
      let confirmedById = null;

      if (sub) {
        status = sub.status === 'confirmed' ? 'confirmed' : 'pending';
        confirmedAt = sub.confirmed_at;
        confirmedBy = sub.confirmed_by_name;
        confirmedById = sub.confirmed_by;
      }

      if (status === 'confirmed') confirmedCount++;
      else if (status === 'pending') pendingCount++;
      else notSubmittedCount++;

      // Members of this group
      const members = (membersByGroup.get(group.id) || []).map(m => {
        const isConfirmer = m.id === confirmedById;
        const memberConfirmed = status === 'confirmed';
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          studentId: m.studentId,
          confirmed: memberConfirmed,
          isConfirmer,
        };
      });

      groupsData.push({
        id: group.id,
        name: group.name,
        status,
        confirmedAt,
        confirmedBy,
        members,
      });

      for (const m of members) {
        studentsData.push({
          id: m.id,
          name: m.name,
          email: m.email,
          studentId: m.studentId,
          groupId: group.id,
          groupName: group.name,
          status,
          isConfirmer: m.isConfirmer,
        });
      }
    }

    // If assign_to_all = true, also list ungrouped students as 'no-group'
    if (assignment.assignToAll) {
      const ungroupedRes = await query(
        `SELECT u.id, u.name, u.email, u.student_id AS "studentId"
         FROM users u
         LEFT JOIN group_members gm ON u.id = gm.user_id
         WHERE u.role = 'student' AND gm.group_id IS NULL
         ORDER BY u.name ASC`
      );

      for (const u of ungroupedRes.rows) {
        studentsData.push({
          id: u.id,
          name: u.name,
          email: u.email,
          studentId: u.studentId,
          groupId: null,
          groupName: null,
          status: 'no-group',
          isConfirmer: false,
        });
      }
    }

    const totalGroups = targetedGroups.length;
    const percent = totalGroups > 0 ? Math.round((confirmedCount / totalGroups) * 100) : 0;

    return res.status(200).json({
      assignment,
      summary: {
        groups: totalGroups,
        confirmed: confirmedCount,
        pending: pendingCount,
        notSubmitted: notSubmittedCount,
        percent,
      },
      groups: groupsData,
      students: studentsData,
    });
  })
);

export default router;
