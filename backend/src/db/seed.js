import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { runMigrations } from './migrate.js';

export async function seedDatabase() {
  await runMigrations();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Seeding database...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Seed Professor (Admin)
    const profRes = await client.query(
      `INSERT INTO users (name, email, role, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $4
       RETURNING id`,
      ['Dr. Joineazy Professor', 'professor@joineazy.com', 'admin', passwordHash]
    );
    const profId = profRes.rows[0].id;

    // 2. Seed 6 Students
    const studentIds = [];
    const studentData = [
      { name: 'Alice Smith', email: 'student1@joineazy.com', studentId: 'STU1001' },
      { name: 'Bob Johnson', email: 'student2@joineazy.com', studentId: 'STU1002' },
      { name: 'Charlie Brown', email: 'student3@joineazy.com', studentId: 'STU1003' },
      { name: 'Diana Prince', email: 'student4@joineazy.com', studentId: 'STU1004' },
      { name: 'Evan Wright', email: 'student5@joineazy.com', studentId: 'STU1005' },
      { name: 'Fiona Gallagher', email: 'student6@joineazy.com', studentId: 'STU1006' },
    ];

    for (const s of studentData) {
      const res = await client.query(
        `INSERT INTO users (name, email, student_id, role, password_hash)
         VALUES ($1, $2, $3, 'student', $4)
         ON CONFLICT (email) DO UPDATE SET student_id = $3, password_hash = $4
         RETURNING id`,
        [s.name, s.email.toLowerCase(), s.studentId, passwordHash]
      );
      studentIds.push(res.rows[0].id);
    }

    // 3. Seed Groups (Team Alpha, Team Beta, Team Gamma)
    // Team Alpha: student1 (leader), student2
    // Team Beta: student3 (leader), student4
    // Team Gamma: student5 (leader), student6

    const groupDefs = [
      { name: 'Team Alpha', leaderId: studentIds[0], memberIds: [studentIds[0], studentIds[1]] },
      { name: 'Team Beta', leaderId: studentIds[2], memberIds: [studentIds[2], studentIds[3]] },
      { name: 'Team Gamma', leaderId: studentIds[4], memberIds: [studentIds[4], studentIds[5]] },
    ];

    const groupMap = {};

    for (const g of groupDefs) {
      let gRes = await client.query(`SELECT id FROM groups WHERE name = $1`, [g.name]);
      let groupId;
      if (gRes.rows.length > 0) {
        groupId = gRes.rows[0].id;
        await client.query(`UPDATE groups SET leader_id = $1 WHERE id = $2`, [g.leaderId, groupId]);
      } else {
        gRes = await client.query(
          `INSERT INTO groups (name, leader_id) VALUES ($1, $2) RETURNING id`,
          [g.name, g.leaderId]
        );
        groupId = gRes.rows[0].id;
      }
      groupMap[g.name] = groupId;

      for (const mId of g.memberIds) {
        await client.query(
          `INSERT INTO group_members (group_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET group_id = $1`,
          [groupId, mId]
        );
      }
    }

    // 4. Seed Assignments
    const now = new Date();
    const overdueDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const due4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const due9Days = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000);
    const due15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const assignmentsData = [
      {
        title: 'Assignment 1: System Requirements & Architecture',
        description: 'Document functional requirements, ER diagram, and system architecture for the project.',
        dueDate: overdueDate,
        oneDriveLink: 'https://onedrive.live.com/?id=joineazy-assign-1',
        assignToAll: true,
        targetedGroups: [],
      },
      {
        title: 'Assignment 2: UI Prototype & Interactive Mockups',
        description: 'Build Figma wireframes and clickable high-fidelity prototypes for client review.',
        dueDate: due4Days,
        oneDriveLink: 'https://onedrive.live.com/?id=joineazy-assign-2',
        assignToAll: false,
        targetedGroups: [groupMap['Team Alpha'], groupMap['Team Beta']],
      },
      {
        title: 'Assignment 3: Backend API & Database Implementation',
        description: 'Implement RESTful APIs with role-based auth, PostgreSQL schema, and unit tests.',
        dueDate: due9Days,
        oneDriveLink: 'https://onedrive.live.com/?id=joineazy-assign-3',
        assignToAll: true,
        targetedGroups: [],
      },
      {
        title: 'Assignment 4: Final System Deployment & Live Demo',
        description: 'Deploy the full stack application to production and record a walkthrough video.',
        dueDate: due15Days,
        oneDriveLink: 'https://onedrive.live.com/?id=joineazy-assign-4',
        assignToAll: true,
        targetedGroups: [],
      },
    ];

    const assignmentIds = [];
    for (const a of assignmentsData) {
      let aRes = await client.query(`SELECT id FROM assignments WHERE title = $1`, [a.title]);
      let aId;
      if (aRes.rows.length > 0) {
        aId = aRes.rows[0].id;
        await client.query(
          `UPDATE assignments SET description = $1, due_date = $2, onedrive_link = $3, assign_to_all = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
          [a.description, a.dueDate, a.oneDriveLink, a.assignToAll, aId]
        );
      } else {
        aRes = await client.query(
          `INSERT INTO assignments (title, description, due_date, onedrive_link, assign_to_all, created_by)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [a.title, a.description, a.dueDate, a.oneDriveLink, a.assignToAll, profId]
        );
        aId = aRes.rows[0].id;
      }
      assignmentIds.push(aId);

      if (!a.assignToAll && a.targetedGroups.length > 0) {
        await client.query(`DELETE FROM assignment_groups WHERE assignment_id = $1`, [aId]);
        for (const gId of a.targetedGroups) {
          await client.query(
            `INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [aId, gId]
          );
        }
      }
    }

    // 5. Seed Submissions (A few confirmed and pending submissions)
    // Assignment 1 (Overdue):
    // Team Alpha -> Confirmed by student 1
    await client.query(
      `INSERT INTO submissions (assignment_id, group_id, status, requested_by, confirmed_by, requested_at, confirmed_at)
       VALUES ($1, $2, 'confirmed', $3, $3, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '6 days')
       ON CONFLICT (assignment_id, group_id) DO UPDATE SET status = 'confirmed', confirmed_by = $3, confirmed_at = CURRENT_TIMESTAMP - INTERVAL '6 days'`,
      [assignmentIds[0], groupMap['Team Alpha'], studentIds[0]]
    );

    // Team Beta -> Confirmed by student 3
    await client.query(
      `INSERT INTO submissions (assignment_id, group_id, status, requested_by, confirmed_by, requested_at, confirmed_at)
       VALUES ($1, $2, 'confirmed', $3, $3, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days')
       ON CONFLICT (assignment_id, group_id) DO UPDATE SET status = 'confirmed', confirmed_by = $3, confirmed_at = CURRENT_TIMESTAMP - INTERVAL '5 days'`,
      [assignmentIds[0], groupMap['Team Beta'], studentIds[2]]
    );

    // Assignment 2 (Targets Alpha and Beta):
    // Team Alpha -> Confirmed by student 2
    await client.query(
      `INSERT INTO submissions (assignment_id, group_id, status, requested_by, confirmed_by, requested_at, confirmed_at)
       VALUES ($1, $2, 'confirmed', $3, $4, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day')
       ON CONFLICT (assignment_id, group_id) DO UPDATE SET status = 'confirmed', confirmed_by = $4, confirmed_at = CURRENT_TIMESTAMP - INTERVAL '1 day'`,
      [assignmentIds[1], groupMap['Team Alpha'], studentIds[0], studentIds[1]]
    );

    // Team Beta -> Pending (Requested by student 4)
    await client.query(
      `INSERT INTO submissions (assignment_id, group_id, status, requested_by, confirmed_by, requested_at, confirmed_at)
       VALUES ($1, $2, 'pending', $3, NULL, CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL)
       ON CONFLICT (assignment_id, group_id) DO UPDATE SET status = 'pending', requested_by = $3, confirmed_by = NULL, confirmed_at = NULL`,
      [assignmentIds[1], groupMap['Team Beta'], studentIds[3]]
    );

    await client.query('COMMIT');
    console.log('Seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// If executed directly: node src/db/seed.js
if (process.argv[1] === import.meta.filename || (process.argv[1] && process.argv[1].endsWith('seed.js'))) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
