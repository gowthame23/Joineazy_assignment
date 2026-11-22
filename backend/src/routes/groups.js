import express from 'express';
import { z } from 'zod';
import { query, pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateUuidParam } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();

const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(100),
});

const addMemberSchema = z.object({
  identifier: z.string().trim().min(1, 'Student email or ID is required'),
});

// Helper to fetch full details (members + progress) for one or many groups.
// Uses set-based queries so listing N groups costs 2 queries, not 3N.
// An assignment targets a group when assign_to_all = true OR a row exists in
// assignment_groups; confirmed counts only include assignments that still target the group.
export async function getGroupsDetails(groupIds) {
  if (groupIds.length === 0) return [];

  const groupsRes = await query(
    `SELECT g.id, g.name, g.leader_id AS "leaderId",
            (SELECT COUNT(*) FROM assignments a
              WHERE a.assign_to_all
                 OR EXISTS (SELECT 1 FROM assignment_groups ag
                             WHERE ag.assignment_id = a.id AND ag.group_id = g.id))::int AS total,
            (SELECT COUNT(*) FROM submissions s
               JOIN assignments a ON a.id = s.assignment_id
              WHERE s.group_id = g.id AND s.status = 'confirmed'
                AND (a.assign_to_all
                     OR EXISTS (SELECT 1 FROM assignment_groups ag
                                 WHERE ag.assignment_id = a.id AND ag.group_id = g.id)))::int AS confirmed
       FROM groups g
      WHERE g.id = ANY($1::uuid[])
      ORDER BY g.name ASC`,
    [groupIds]
  );

  const membersRes = await query(
    `SELECT gm.group_id, u.id, u.name, u.email, u.student_id AS "studentId", gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ANY($1::uuid[])
      ORDER BY gm.joined_at ASC`,
    [groupIds]
  );

  const membersByGroup = new Map();
  for (const m of membersRes.rows) {
    if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
    membersByGroup.get(m.group_id).push({
      id: m.id,
      name: m.name,
      email: m.email,
      studentId: m.studentId,
      joinedAt: m.joined_at,
    });
  }

  return groupsRes.rows.map((g) => ({
    id: g.id,
    name: g.name,
    leaderId: g.leaderId,
    members: membersByGroup.get(g.id) || [],
    progress: {
      total: g.total,
      confirmed: g.confirmed,
      percent: g.total > 0 ? Math.round((g.confirmed / g.total) * 100) : 0,
    },
  }));
}

export async function getGroupDetails(groupId) {
  const [group] = await getGroupsDetails([groupId]);
  return group || null;
}

// POST /api/groups - Student creates a new group
router.post(
  '/',
  requireAuth,
  requireRole('student'),
  validateBody(createGroupSchema),
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;

    // Check if already in a group
    const memberCheck = await query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );
    if (memberCheck.rows.length > 0) {
      return res.status(409).json({ error: 'You are already a member of a group' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const groupRes = await client.query(
        'INSERT INTO groups (name, leader_id) VALUES ($1, $2) RETURNING id',
        [name, userId]
      );
      const groupId = groupRes.rows[0].id;

      await client.query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
        [groupId, userId]
      );

      await client.query('COMMIT');

      const group = await getGroupDetails(groupId);
      return res.status(201).json({ group });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

// GET /api/groups/me - Get current student's group
router.get(
  '/me',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const memberCheck = await query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(200).json({ group: null });
    }

    const group = await getGroupDetails(memberCheck.rows[0].group_id);
    return res.status(200).json({ group });
  })
);

// POST /api/groups/me/members - Group leader adds a member by email or student ID
router.post(
  '/me/members',
  requireAuth,
  requireRole('student'),
  validateBody(addMemberSchema),
  asyncHandler(async (req, res) => {
    const { identifier } = req.body;
    const userId = req.user.id;

    // Verify caller is in a group and is leader
    const groupRes = await query(
      `SELECT g.id, g.leader_id
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1`,
      [userId]
    );

    if (groupRes.rows.length === 0) {
      return res.status(404).json({ error: 'You are not in any group' });
    }

    const group = groupRes.rows[0];
    if (group.leader_id !== userId) {
      return res.status(403).json({ error: 'Only the group leader can invite or add members' });
    }

    // Lookup target user by email or student_id
    const targetRes = await query(
      `SELECT id, name, email, student_id, role
       FROM users
       WHERE (LOWER(email) = LOWER($1) OR student_id = $1) AND role = 'student'`,
      [identifier]
    );

    if (targetRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found with the provided email or Student ID' });
    }

    const targetUser = targetRes.rows[0];

    // Check if target is already in any group
    const targetGroupCheck = await query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [targetUser.id]
    );
    if (targetGroupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'This student is already in a group' });
    }

    // Add target to group
    await query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.id, targetUser.id]
    );

    const updatedGroup = await getGroupDetails(group.id);
    return res.status(201).json({ group: updatedGroup });
  })
);

// DELETE /api/groups/me/members/:userId - Remove member (leader) or leave group (self)
router.delete(
  '/me/members/:userId',
  requireAuth,
  requireRole('student'),
  validateUuidParam('userId'),
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;

    // Find current user's group
    const callerGroupRes = await query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [currentUserId]
    );
    if (callerGroupRes.rows.length === 0) {
      return res.status(404).json({ error: 'You are not in any group' });
    }
    const groupId = callerGroupRes.rows[0].group_id;

    // Check target is in the same group
    const targetCheck = await query(
      'SELECT group_id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    );
    if (targetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User is not a member of your group' });
    }

    // Check leadership permissions
    const groupMeta = await query('SELECT leader_id FROM groups WHERE id = $1', [groupId]);
    const leaderId = groupMeta.rows[0].leader_id;

    const isSelfLeaving = currentUserId === targetUserId;
    const isLeader = currentUserId === leaderId;

    if (!isSelfLeaving && !isLeader) {
      return res.status(403).json({ error: 'Only the group leader can remove other members' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove member
      await client.query(
        'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, targetUserId]
      );

      // Check remaining members
      const remainingRes = await client.query(
        'SELECT user_id FROM group_members WHERE group_id = $1 ORDER BY joined_at ASC',
        [groupId]
      );

      if (remainingRes.rows.length === 0) {
        // Group is now empty, delete group
        await client.query('DELETE FROM groups WHERE id = $1', [groupId]);
        await client.query('COMMIT');
        return res.status(200).json({ group: null });
      }

      // If the leaving user was leader, handover leadership to longest-standing member
      if (targetUserId === leaderId) {
        const nextLeaderId = remainingRes.rows[0].user_id;
        await client.query(
          'UPDATE groups SET leader_id = $1 WHERE id = $2',
          [nextLeaderId, groupId]
        );
      }

      await client.query('COMMIT');

      const updatedGroup = await getGroupDetails(groupId);
      return res.status(200).json({ group: updatedGroup });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

// GET /api/groups - Admin lists all groups
router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const groupsRes = await query('SELECT id FROM groups');
    const groups = await getGroupsDetails(groupsRes.rows.map((row) => row.id));
    return res.status(200).json({ groups });
  })
);

export default router;
