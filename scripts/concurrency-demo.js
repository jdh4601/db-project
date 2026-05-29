// =====================================================================
// concurrency-demo.js
//
// 발표용 동시성 비교 데모:
//   (A) FOR UPDATE 없이 — race condition으로 정원 초과 가능
//   (B) FOR UPDATE 있이 — 정확히 정원만큼만 성공
//
// 실행: node scripts/concurrency-demo.js
//
// 시나리오: 정원 2명짜리 모임에 5명이 Promise.all 로 동시 참여 요청.
// =====================================================================

import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'dbproject',
  password: process.env.PGPASSWORD || 'dbproject',
  database: process.env.PGDATABASE || 'dbproject',
  max: 20,
});

const CAPACITY = 2;
const ATTEMPTERS = ['A', 'B', 'C', 'D', 'E'];

async function reset() {
  await pool.query('TRUNCATE participants, meetups RESTART IDENTITY CASCADE');
  const { rows } = await pool.query(
    `INSERT INTO meetups (title, category, place, meet_at, capacity, host_name)
     VALUES ('동시성 데모', 'meal', '데모룸', NOW() + INTERVAL '1 hour', $1, '호스트')
     RETURNING id`,
    [CAPACITY]
  );
  return rows[0].id;
}

// ---------- (A) FOR UPDATE 없이: TOCTOU race ----------
async function joinWithoutLock(meetupId, name) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 잠금 없이 capacity와 status만 확인
    const { rows: m } = await client.query(
      'SELECT capacity, status FROM meetups WHERE id = $1',
      [meetupId]
    );
    if (m.length === 0 || m[0].status !== 'open') {
      await client.query('ROLLBACK');
      return { name, ok: false, reason: 'closed' };
    }

    const { rows: c } = await client.query(
      'SELECT COUNT(*)::int AS c FROM participants WHERE meetup_id = $1',
      [meetupId]
    );
    if (c[0].c >= m[0].capacity) {
      await client.query('ROLLBACK');
      return { name, ok: false, reason: 'full' };
    }

    // 의도적으로 약간 지연을 줘 race window 를 키운다
    await new Promise((r) => setTimeout(r, 30));

    await client.query(
      'INSERT INTO participants (meetup_id, name) VALUES ($1, $2)',
      [meetupId, name]
    );
    await client.query('COMMIT');
    return { name, ok: true };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return { name, ok: false, reason: 'duplicate' };
    return { name, ok: false, reason: 'error', err: err.message };
  } finally {
    client.release();
  }
}

// ---------- (B) FOR UPDATE 있이: 직렬화 ----------
async function joinWithLock(meetupId, name) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: m } = await client.query(
      'SELECT capacity, status FROM meetups WHERE id = $1 FOR UPDATE',
      [meetupId]
    );
    if (m.length === 0 || m[0].status !== 'open') {
      await client.query('ROLLBACK');
      return { name, ok: false, reason: 'closed' };
    }

    const { rows: c } = await client.query(
      'SELECT COUNT(*)::int AS c FROM participants WHERE meetup_id = $1',
      [meetupId]
    );
    if (c[0].c >= m[0].capacity) {
      await client.query('ROLLBACK');
      return { name, ok: false, reason: 'full' };
    }

    // 동일한 인공 지연 — 비교 공정성 위해
    await new Promise((r) => setTimeout(r, 30));

    await client.query(
      'INSERT INTO participants (meetup_id, name) VALUES ($1, $2)',
      [meetupId, name]
    );
    await client.query('COMMIT');
    return { name, ok: true };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return { name, ok: false, reason: 'duplicate' };
    return { name, ok: false, reason: 'error', err: err.message };
  } finally {
    client.release();
  }
}

async function runScenario(label, joinFn) {
  const meetupId = await reset();
  const results = await Promise.all(ATTEMPTERS.map((n) => joinFn(meetupId, n)));
  const { rows: finalCount } = await pool.query(
    'SELECT COUNT(*)::int AS c FROM participants WHERE meetup_id = $1',
    [meetupId]
  );

  console.log(`\n=== ${label} ===`);
  console.log(`정원: ${CAPACITY}, 시도자: ${ATTEMPTERS.length}명`);
  for (const r of results) {
    if (r.ok) console.log(`  ✓ ${r.name}: 성공`);
    else console.log(`  ✗ ${r.name}: ${r.reason}`);
  }
  console.log(`→ 최종 DB 참여자 수: ${finalCount[0].c}`);

  const ok = results.filter((r) => r.ok).length;
  const overshoot = finalCount[0].c > CAPACITY;
  console.log(
    overshoot
      ? `  ⚠️  정원 초과 발생 (${finalCount[0].c} > ${CAPACITY})`
      : `  ✅ 무결성 유지 (${finalCount[0].c} ≤ ${CAPACITY})`
  );
  return { ok, overshoot, finalCount: finalCount[0].c };
}

async function main() {
  try {
    const a = await runScenario('(A) FOR UPDATE 없이', joinWithoutLock);
    const b = await runScenario('(B) FOR UPDATE 있이', joinWithLock);

    console.log('\n=== 요약 ===');
    console.log(`(A) 성공 ${a.ok}건, 최종 ${a.finalCount}명 ${a.overshoot ? '(초과)' : ''}`);
    console.log(`(B) 성공 ${b.ok}건, 최종 ${b.finalCount}명`);
    console.log(
      a.overshoot
        ? '\n결론: 잠금 없는 트랜잭션은 정원을 초과할 수 있음 → FOR UPDATE 필요'
        : '\n결론: (A) 도 우연히 통과 — 부하/지연을 더 키워 재시도 권장'
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
