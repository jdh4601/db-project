// =====================================================================
// joinMeetup — 동시성 테스트 (실제 PostgreSQL 사용)
//
// 전제: docker compose up 으로 5432 포트의 Postgres 가 떠 있어야 함.
// 각 테스트 시작 시 meetups / participants 를 truncate 하여 깨끗한 상태에서 시작.
// =====================================================================

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { query, withTransaction, close } from '../db.js';
import { joinMeetup } from '../joinMeetup.js';

async function createMeetup({
  title = '테스트 모임',
  category = 'meal',
  place = '아무데나',
  meetAtOffsetMs = 60 * 60 * 1000,        // 1시간 뒤
  capacity = 2,
  hostName = '호스트',
  status = 'open',
} = {}) {
  const { rows } = await query(
    `INSERT INTO meetups (title, category, place, meet_at, capacity, host_name, status)
     VALUES ($1, $2, $3, NOW() + ($4::int || ' milliseconds')::interval, $5, $6, $7)
     RETURNING id, status, capacity`,
    [title, category, place, meetAtOffsetMs, capacity, hostName, status]
  );
  return rows[0];
}

async function countParticipants(meetupId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS c FROM participants WHERE meetup_id = $1',
    [meetupId]
  );
  return rows[0].c;
}

async function getStatus(meetupId) {
  const { rows } = await query(
    'SELECT status FROM meetups WHERE id = $1',
    [meetupId]
  );
  return rows[0]?.status;
}

before(async () => {
  // 헬스 체크
  await query('SELECT 1');
});

after(async () => {
  await close();
});

beforeEach(async () => {
  // 매 테스트 시작 시 깨끗한 상태로
  await query('TRUNCATE participants, meetups RESTART IDENTITY CASCADE');
});

// ---------------------------------------------------------------------
// 1) Happy path
// ---------------------------------------------------------------------
test('1) 정원 남은 모임에 1명 참여 → ok', async () => {
  const m = await createMeetup({ capacity: 3 });
  const result = await joinMeetup(m.id, '하나');
  assert.deepEqual(result, { ok: true });
  assert.equal(await countParticipants(m.id), 1);
});

// ---------------------------------------------------------------------
// 2) Full
// ---------------------------------------------------------------------
test('2) 정원이 꽉 찬 모임 → reason=full', async () => {
  const m = await createMeetup({ capacity: 2 });
  await joinMeetup(m.id, '하나');
  await joinMeetup(m.id, '두리');
  const third = await joinMeetup(m.id, '세찬');
  assert.deepEqual(third, { ok: false, reason: 'full' });
  assert.equal(await countParticipants(m.id), 2);
});

// ---------------------------------------------------------------------
// 3) Duplicate
// ---------------------------------------------------------------------
test('3) 같은 이름 2회 참여 → reason=duplicate', async () => {
  const m = await createMeetup({ capacity: 5 });
  await joinMeetup(m.id, '하나');
  const second = await joinMeetup(m.id, '하나');
  assert.deepEqual(second, { ok: false, reason: 'duplicate' });
  assert.equal(await countParticipants(m.id), 1);
});

// ---------------------------------------------------------------------
// 4) 동시성 — 정원 2명에 5명이 동시 참여
// ---------------------------------------------------------------------
test('4) 정원 2명에 5명 동시 참여 → 정확히 2명만 성공', async () => {
  const m = await createMeetup({ capacity: 2 });
  const names = ['A', 'B', 'C', 'D', 'E'];
  const results = await Promise.all(names.map((n) => joinMeetup(m.id, n)));
  const successCount = results.filter((r) => r.ok).length;
  const fullCount = results.filter((r) => !r.ok && r.reason === 'full').length;
  assert.equal(successCount, 2, `expected 2 successes, got ${successCount}: ${JSON.stringify(results)}`);
  assert.equal(fullCount, 3, `expected 3 fulls, got ${fullCount}: ${JSON.stringify(results)}`);
  assert.equal(await countParticipants(m.id), 2);
});

// ---------------------------------------------------------------------
// 5) Auto-close
// ---------------------------------------------------------------------
test('5) 정원이 채워지면 status 자동 closed', async () => {
  const m = await createMeetup({ capacity: 2 });
  await joinMeetup(m.id, '하나');
  assert.equal(await getStatus(m.id), 'open');
  await joinMeetup(m.id, '두리');
  assert.equal(await getStatus(m.id), 'closed');
});

// ---------------------------------------------------------------------
// 6) Expired
// ---------------------------------------------------------------------
test('6) meet_at 이 과거인 모임 → reason=closed', async () => {
  const m = await createMeetup({ capacity: 2, meetAtOffsetMs: -60 * 60 * 1000 });
  const result = await joinMeetup(m.id, '하나');
  assert.deepEqual(result, { ok: false, reason: 'closed' });
  assert.equal(await countParticipants(m.id), 0);
});

// ---------------------------------------------------------------------
// 7) (보너스) 이미 closed 인 모임
// ---------------------------------------------------------------------
test('7) status=closed 인 모임 → reason=closed', async () => {
  const m = await createMeetup({ capacity: 5, status: 'closed' });
  const result = await joinMeetup(m.id, '하나');
  assert.deepEqual(result, { ok: false, reason: 'closed' });
});
