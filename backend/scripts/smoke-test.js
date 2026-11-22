/**
 * End-to-End API Smoke Test Script
 * Verifies all critical paths: Health, Auth, Roles, Groups, Assignments CRUD,
 * Two-Step Submission Verification, and Analytics.
 */

const API_BASE = process.env.API_URL || 'http://localhost:4000';

let testPassed = 0;
let testFailed = 0;

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, options);
  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data };
}

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    testPassed++;
  } else {
    console.error(`  FAIL: ${testName} - ${details}`);
    testFailed++;
  }
}

async function runSmokeTests() {
  console.log(`\nStarting Joineazy LMS API Smoke Tests against ${API_BASE}...\n`);

  try {
    // 1. Health check
    console.log('[1/7] Testing Health Check...');
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.data?.status === 'ok', 'GET /health returns 200 {status: "ok"}', JSON.stringify(health));

    // 2. Auth: Admin registration rejection without invite code
    console.log('\n[2/7] Testing Auth Security & Role Safeguards...');
    const invalidAdmin = await request('POST', '/api/auth/register', {
      name: 'Fake Admin',
      email: `fakeadmin_${Date.now()}@test.com`,
      password: 'password123',
      role: 'admin',
      adminCode: 'wrong-code',
    });
    assert(invalidAdmin.status === 403, 'POST /api/auth/register rejects admin without correct invite code (403)');

    // Login with seeded admin
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'professor@joineazy.com',
      password: 'password123',
    });
    assert(adminLogin.status === 200 && adminLogin.data?.token, 'POST /api/auth/login succeeds for seeded admin');
    const adminToken = adminLogin.data?.token;

    // Login with seeded student 1
    const student1Login = await request('POST', '/api/auth/login', {
      email: 'student1@joineazy.com',
      password: 'password123',
    });
    assert(student1Login.status === 200 && student1Login.data?.token, 'POST /api/auth/login succeeds for student1');

    // 3. Register fresh student test accounts for clean workflow
    console.log('\n[3/7] Testing User Registration & Profile...');
    const uniqueId = Date.now().toString().slice(-5);
    const freshStudent1 = await request('POST', '/api/auth/register', {
      name: 'Smoke Test Lead',
      email: `lead_${uniqueId}@test.com`,
      studentId: `ST_${uniqueId}A`,
      password: 'password123',
      role: 'student',
    });
    assert(freshStudent1.status === 201 && freshStudent1.data?.token, 'POST /api/auth/register creates student account');
    const freshLeadToken = freshStudent1.data?.token;

    const freshStudent2 = await request('POST', '/api/auth/register', {
      name: 'Smoke Test Peer',
      email: `peer_${uniqueId}@test.com`,
      studentId: `ST_${uniqueId}B`,
      password: 'password123',
      role: 'student',
    });
    assert(freshStudent2.status === 201, 'POST /api/auth/register creates second student account');

    // GET /api/auth/me
    const meRes = await request('GET', '/api/auth/me', null, freshLeadToken);
    assert(meRes.status === 200 && meRes.data?.user?.email === `lead_${uniqueId}@test.com`, 'GET /api/auth/me returns authenticated user details');

    // 4. Groups Workflow
    console.log('\n[4/7] Testing Group Creation & Member Addition...');
    const groupRes = await request('POST', '/api/groups', { name: `Team Delta ${uniqueId}` }, freshLeadToken);
    assert(groupRes.status === 201 && groupRes.data?.group?.name === `Team Delta ${uniqueId}`, 'POST /api/groups creates a new group');
    const groupId = groupRes.data?.group?.id;

    // Add member by student ID
    const addMemberRes = await request('POST', '/api/groups/me/members', { identifier: `ST_${uniqueId}B` }, freshLeadToken);
    assert(addMemberRes.status === 201 && addMemberRes.data?.group?.members?.length === 2, 'POST /api/groups/me/members adds student by studentId');

    // 5. Assignments CRUD & Targeting
    console.log('\n[5/7] Testing Admin Assignment CRUD & Targeting...');
    const createAssignRes = await request('POST', '/api/assignments', {
      title: `Smoke Test Assignment ${uniqueId}`,
      description: 'End to end testing assignment with selective targeting',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      oneDriveLink: 'https://onedrive.live.com/test-link',
      assignToAll: false,
      groupIds: [groupId],
    }, adminToken);
    assert(createAssignRes.status === 201, 'POST /api/assignments creates assignment with group targeting');
    const assignmentId = createAssignRes.data?.assignment?.id;

    // Student view of assignments
    const studentAssignRes = await request('GET', '/api/assignments', null, freshLeadToken);
    const found = studentAssignRes.data?.assignments?.find(a => a.id === assignmentId);
    assert(studentAssignRes.status === 200 && found, 'GET /api/assignments returns targeted assignment for student');

    // 6. Two-step submission verification
    console.log('\n[6/7] Testing Two-Step Submission Verification Workflow...');
    // Direct confirm before request should fail with 409
    const earlyConfirm = await request('POST', `/api/assignments/${assignmentId}/submission/confirm`, null, freshLeadToken);
    assert(earlyConfirm.status === 409, 'POST /submission/confirm fails (409) if step 1 was not performed');

    // Step 1: Request
    const reqStep1 = await request('POST', `/api/assignments/${assignmentId}/submission/request`, null, freshLeadToken);
    assert(reqStep1.status === 200 && reqStep1.data?.submission?.status === 'pending', 'Step 1: POST /submission/request sets status to pending');

    // Step 2: Confirm
    const reqStep2 = await request('POST', `/api/assignments/${assignmentId}/submission/confirm`, null, freshLeadToken);
    assert(reqStep2.status === 200 && reqStep2.data?.submission?.status === 'confirmed', 'Step 2: POST /submission/confirm updates status to confirmed');

    // Attempting to request again after confirmed should return 409
    const secondReq = await request('POST', `/api/assignments/${assignmentId}/submission/request`, null, freshLeadToken);
    assert(secondReq.status === 409, 'Cannot request or alter already confirmed submission (409)');

    // 7. Admin Tracking & Analytics
    console.log('\n[7/7] Testing Admin Tracking & Analytics Verification...');
    const trackingRes = await request('GET', `/api/assignments/${assignmentId}/submissions`, null, adminToken);
    assert(
      trackingRes.status === 200 &&
      trackingRes.data?.summary?.confirmed >= 1 &&
      trackingRes.data?.groups?.some(g => g.id === groupId && g.status === 'confirmed'),
      'GET /assignments/:id/submissions shows confirmed group status and details'
    );

    const analyticsRes = await request('GET', '/api/analytics', null, adminToken);
    assert(
      analyticsRes.status === 200 &&
      analyticsRes.data?.totals?.students > 0 &&
      analyticsRes.data?.totals?.groups > 0 &&
      analyticsRes.data?.groups?.length > 0,
      'GET /api/analytics returns complete system metrics and group breakdown'
    );

    // 8. Hardening regression checks
    console.log('\n[8/8] Testing Input Hardening & Concurrency...');
    for (const badLink of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd']) {
      const badRes = await request(
        'POST',
        '/api/assignments',
        { title: 'Bad link', dueDate: new Date(Date.now() + 86400000).toISOString(), oneDriveLink: badLink },
        adminToken
      );
      assert(badRes.status === 400, `POST /api/assignments rejects non-http link (${badLink.split(':')[0]}:)`, JSON.stringify(badRes));
    }

    const raceEmail = `race_${Date.now()}@test.com`;
    const raceResults = await Promise.all(
      Array.from({ length: 5 }, () =>
        request('POST', '/api/auth/register', { name: 'Race', email: raceEmail, password: 'password123' })
      )
    );
    assert(
      raceResults.filter(r => r.status === 201).length === 1 && raceResults.every(r => r.status < 500),
      'Simultaneous duplicate sign-ups yield one 201 and 409s (never a 500)',
      raceResults.map(r => r.status).join(',')
    );

    console.log('\n=======================================');
    console.log(`Smoke Tests Complete!`);
    console.log(`Passed: ${testPassed} | Failed: ${testFailed}`);
    console.log('=======================================\n');

    if (testFailed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Smoke test suite error:', err);
    process.exit(1);
  }
}

runSmokeTests();
