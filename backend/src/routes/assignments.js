import express from 'express';
import { z } from 'zod';
import { query, pool } from '../db/pool.js';
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
  oneDriveLink: z.string().trim().url('Invalid OneDrive URL'),
  assignToAll: z.boolean().default(true),
  groupIds: z.array(z.string().uuid()).default([]),
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
      // Admin view
      const assignmentsRes = await query(
        `SELECT id, title, description, due_date AS "dueDate", onedrive_link AS "oneDriveLink",
                assign_to_all AS "assignToAll", created_by AS "createdBy",
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM assignments
         ORDER BY due_date ASC`
      );

      // Get targeted and confirmed counts for each assignment
      const allGroupsRes = await query('SELECT COUNT(*)::int AS count FROM groups');
      const totalGroupsInSystem = allGroupsRes.rows[0]?.count || 0;

      const results = [];
      for (const a of assignmentsRes.rows) {
        let targetedCount = 0;
        let targetedGroupIds = [];

        if (a.assignToAll) {
          targetedCount = totalGroupsInSystem;
          const gRes = await query('SELECT id FROM groups');
          targetedGroupIds = gRes.rows.map(r => r.id);
        } else {
          const gRes = await query(
            'SELECT group_id FROM assignment_groups WHERE assignment_id = $1',
            [a.id]
          );
          targetedCount = gRes.rows.length;
          targetedGroupIds = gRes.rows.map(r => r.group_id);
        }

        // Confirmed submissions from targeted groups
        let confirmedCount = 0;
        if (targetedGroupIds.length > 0) {
          const confRes = await query(
            `SELECT COUNT(*)::int AS count
             FROM submissions
             WHERE assignment_id = $1 AND status = 'confirmed' AND group_id = ANY($2::uuid[])`,
            [a.id, targetedGroupIds]
          );
          confirmedCount = confRes.rows[0]?.count || 0;
        }

        results.push({
          ...a,
          targeted: targetedCount,
          confirmed: confirmedCount,
          groupIds: a.assignToAll ? [] : targetedGroupIds,
        });
      }

      return res.status(200).json({ assignments: results });
    }

    // Student view
    const memberRes = await query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );

    const hasGroup = memberRes.rows.length > 0;
    const groupId = hasGroup ? memberRes.rows[0].group_id : null;

    let assignmentsQuery = '';
    let queryParams = [];

    if (hasGroup) {
      assignmentsQuery = `
        SELECT DISTINCT a.id, a.title, a.description, a.due_date AS "dueDate",
               a.onedrive_link AS "oneDriveLink", a.assign_to_all AS "assignToAll",
               a.created_at AS "createdAt"
        FROM assignments a
        LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
        WHERE a.assign_to_all = true OR ag.group_id = $1
        ORDER BY a.due_date ASC
      `;
      queryParams = [groupId];
    } else {
      assignmentsQuery = `
        SELECT a.id, a.title, a.description, a.due_date AS "dueDate",
               a.onedrive_link AS "oneDriveLink", a.assign_to_all AS "assignToAll",
               a.created_at AS "createdAt"
        FROM assignments a
        WHERE a.assign_to_all = true
        ORDER BY a.due_date ASC
      `;
      queryParams = [];
    }

    const assignmentsRes = await query(assignmentsQuery, queryParams);

    // Fetch submission status for student's group
    const assignmentsWithSubmissions = [];
    for (const a of assignmentsRes.rows) {
      let submission = {
        status: 'none',
        confirmedAt: null,
        confirmedBy: null,
      };

      if (hasGroup) {
        const subRes = await query(
          `SELECT s.status, s.confirmed_at, u.name AS confirmed_by_name
           FROM submissions s
           LEFT JOIN users u ON s.confirmed_by = u.id
           WHERE s.assignment_id = $1 AND s.group_id = $2`,
          [a.id, groupId]
        );

        if (subRes.rows.length > 0) {
          const row = subRes.rows[0];
          submission = {
            status: row.status,
            confirmedAt: row.confirmed_at,
            confirmedBy: row.confirmed_by_name,
          };
        }
      }

      assignmentsWithSubmissions.push({
        ...a,
        submission,
      });
    }

    return res.status(200).json({
      hasGroup,
      assignments: assignmentsWithSubmissions,
    });
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

    // Check existing submission
    const existing = await query(
      'SELECT status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
      [assignmentId, groupId]
    );

    if (existing.rows.length > 0) {
      const currentStatus = existing.rows[0].status;
      if (currentStatus === 'confirmed') {
        return res.status(409).json({ error: 'Assignment submission has already been confirmed' });
      }
      // If already pending, return current pending status
      return res.status(200).json({ submission: { status: 'pending' } });
    }

    // Insert pending submission
    await query(
      `INSERT INTO submissions (assignment_id, group_id, status, requested_by, requested_at)
       VALUES ($1, $2, 'pending', $3, CURRENT_TIMESTAMP)`,
      [assignmentId, groupId, userId]
    );

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

    // Enforce step order: must be currently in 'pending' status
    const existing = await query(
      'SELECT status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
      [assignmentId, groupId]
    );

    if (existing.rows.length === 0 || existing.rows[0].status !== 'pending') {
      return res.status(409).json({
        error: 'Submission must be requested (pending) before it can be confirmed',
      });
    }

    // Update to confirmed
    const updateRes = await query(
      `UPDATE submissions
       SET status = 'confirmed', confirmed_by = $1, confirmed_at = CURRENT_TIMESTAMP
       WHERE assignment_id = $2 AND group_id = $3
       RETURNING status, confirmed_at AS "confirmedAt"`,
      [userId, assignmentId, groupId]
    );

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

    const existing = await query(
      'SELECT status FROM submissions WHERE assignment_id = $1 AND group_id = $2',
      [assignmentId, groupId]
    );

    if (existing.rows.length === 0 || existing.rows[0].status !== 'pending') {
      return res.status(409).json({ error: 'Can only cancel pending submission requests' });
    }

    await query(
      'DELETE FROM submissions WHERE assignment_id = $1 AND group_id = $2',
      [assignmentId, groupId]
    );

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
      const membersRes = await query(
        `SELECT u.id, u.name, u.email, u.student_id AS "studentId"
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1
         ORDER BY gm.joined_at ASC`,
        [group.id]
      );

      const members = membersRes.rows.map(m => {
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
