/**
 * Shared set-based SQL used by the admin assignment list and the analytics endpoint.
 *
 * An assignment targets a group when assign_to_all = true OR a row exists in
 * assignment_groups. Submissions from groups that no longer target the
 * assignment (after a targeting edit) are never counted.
 */

// One row per assignment with how many groups it targets and how many confirmed.
export const ASSIGNMENT_STATS_SQL = `
  SELECT a.id,
         a.title,
         a.description,
         a.due_date          AS "dueDate",
         a.onedrive_link     AS "oneDriveLink",
         a.assign_to_all     AS "assignToAll",
         a.created_by        AS "createdBy",
         a.created_at        AS "createdAt",
         a.updated_at        AS "updatedAt",
         CASE WHEN a.assign_to_all
              THEN (SELECT COUNT(*) FROM groups)
              ELSE (SELECT COUNT(*) FROM assignment_groups ag WHERE ag.assignment_id = a.id)
         END::int AS targeted,
         (SELECT COUNT(*)
            FROM submissions s
           WHERE s.assignment_id = a.id
             AND s.status = 'confirmed'
             AND (a.assign_to_all
                  OR EXISTS (SELECT 1 FROM assignment_groups ag
                              WHERE ag.assignment_id = a.id AND ag.group_id = s.group_id))
         )::int AS confirmed,
         CASE WHEN a.assign_to_all
              THEN ARRAY[]::uuid[]
              ELSE COALESCE((SELECT array_agg(ag.group_id) FROM assignment_groups ag
                              WHERE ag.assignment_id = a.id), ARRAY[]::uuid[])
         END AS "groupIds"
    FROM assignments a
   ORDER BY a.due_date ASC`;

// One row per group with member count, assignments targeting it and confirmed ones.
export const GROUP_STATS_SQL = `
  SELECT g.id,
         g.name,
         (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id)::int AS members,
         (SELECT COUNT(*)
            FROM assignments a
           WHERE a.assign_to_all
              OR EXISTS (SELECT 1 FROM assignment_groups ag
                          WHERE ag.assignment_id = a.id AND ag.group_id = g.id)
         )::int AS assigned,
         (SELECT COUNT(*)
            FROM submissions s
            JOIN assignments a ON a.id = s.assignment_id
           WHERE s.group_id = g.id
             AND s.status = 'confirmed'
             AND (a.assign_to_all
                  OR EXISTS (SELECT 1 FROM assignment_groups ag
                              WHERE ag.assignment_id = a.id AND ag.group_id = g.id))
         )::int AS confirmed
    FROM groups g
   ORDER BY g.name ASC`;
