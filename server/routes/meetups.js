// =====================================================================
// /meetups 라우트
//   GET /meetups[?category=<code>]
//     → 진행 중인 모임 카드 리스트 (단일 SQL: JOIN + GROUP BY)
// =====================================================================

import { Router } from 'express';
import { query } from '../db.js';
import { joinMeetup } from '../joinMeetup.js';

export const meetupsRouter = Router();

// 카테고리 라벨/이모지 + 현재 참여 인원을 한 번에 가져오는 단일 쿼리.
// status='open' 이고 meet_at 이 미래인 모임만 포함한다.
const LIST_SQL = `
  SELECT
    m.id,
    m.title,
    m.place,
    m.meet_at,
    m.capacity,
    m.host_name,
    m.status,
    c.code   AS category_code,
    c.label  AS category_label,
    c.emoji  AS category_emoji,
    COUNT(p.name)::int AS joined
  FROM meetups m
  JOIN categories c ON c.code = m.category
  LEFT JOIN participants p ON p.meetup_id = m.id
  WHERE m.status = 'open'
    AND m.meet_at > NOW()
    AND ($1::text IS NULL OR m.category = $1)
  GROUP BY m.id, c.code, c.label, c.emoji
  ORDER BY m.meet_at ASC
`;

meetupsRouter.get('/', async (req, res) => {
  const category = typeof req.query.category === 'string' && req.query.category.length > 0
    ? req.query.category
    : null;

  try {
    const { rows } = await query(LIST_SQL, [category]);
    res.json({ meetups: rows });
  } catch (err) {
    console.error('[GET /meetups]', err);
    res.status(500).json({ error: 'failed to list meetups' });
  }
});

// -----------------------------------------------------------------
// POST /meetups
// body: { title, category, place, meet_at, capacity, host_name }
//
// 입력 정규화 → 단일 INSERT.
// CHECK / FK 위반은 PostgreSQL 의 SQLSTATE 를 기준으로 400 으로 매핑.
// -----------------------------------------------------------------
const CREATE_SQL = `
  INSERT INTO meetups (title, category, place, meet_at, capacity, host_name)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *
`;

function normalizeCreateBody(body) {
  const out = {
    title: typeof body?.title === 'string' ? body.title.trim() : '',
    category: typeof body?.category === 'string' ? body.category.trim() : '',
    place: typeof body?.place === 'string' ? body.place.trim() : '',
    meet_at: typeof body?.meet_at === 'string' ? body.meet_at : '',
    capacity: Number.isFinite(Number(body?.capacity)) ? Math.trunc(Number(body.capacity)) : NaN,
    host_name: typeof body?.host_name === 'string' ? body.host_name.trim() : '',
  };
  const errors = [];
  if (!out.title) errors.push('title required');
  if (!out.category) errors.push('category required');
  if (!out.place) errors.push('place required');
  if (!out.meet_at || Number.isNaN(Date.parse(out.meet_at))) errors.push('meet_at must be ISO date');
  if (!Number.isFinite(out.capacity) || out.capacity < 1) errors.push('capacity must be >= 1');
  if (!out.host_name) errors.push('host_name required');
  return { value: out, errors };
}

// -----------------------------------------------------------------
// GET /meetups/:id  → 모임 1건 + 참여자 목록
// 두 개의 쿼리로 분리 — 단순성 우선
// -----------------------------------------------------------------
const ONE_SQL = `
  SELECT
    m.id, m.title, m.place, m.meet_at, m.capacity,
    m.host_name, m.status, m.created_at,
    c.code AS category_code, c.label AS category_label, c.emoji AS category_emoji
  FROM meetups m
  JOIN categories c ON c.code = m.category
  WHERE m.id = $1
`;
const PARTICIPANTS_SQL = `
  SELECT name, joined_at
  FROM participants
  WHERE meetup_id = $1
  ORDER BY joined_at ASC
`;

meetupsRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: 'not found' });
  }

  try {
    const { rows: meetupRows } = await query(ONE_SQL, [id]);
    if (meetupRows.length === 0) {
      return res.status(404).json({ error: 'not found' });
    }
    const { rows: participants } = await query(PARTICIPANTS_SQL, [id]);
    res.json({ meetup: meetupRows[0], participants });
  } catch (err) {
    console.error('[GET /meetups/:id]', err);
    res.status(500).json({ error: 'failed to load meetup' });
  }
});

meetupsRouter.post('/', async (req, res) => {
  const { value, errors } = normalizeCreateBody(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'invalid input', details: errors });
  }

  try {
    const { rows } = await query(CREATE_SQL, [
      value.title,
      value.category,
      value.place,
      value.meet_at,
      value.capacity,
      value.host_name,
    ]);
    res.status(201).json({ meetup: rows[0] });
  } catch (err) {
    // 23503 = foreign_key_violation, 23514 = check_violation
    if (err && (err.code === '23503' || err.code === '23514')) {
      return res.status(400).json({
        error: 'constraint violation',
        constraint: err.constraint ?? null,
        detail: err.detail ?? err.message,
      });
    }
    console.error('[POST /meetups]', err);
    res.status(500).json({ error: 'failed to create meetup' });
  }
});

// -----------------------------------------------------------------
// POST /meetups/:id/join
// body: { name }
//   응답은 joinMeetup() 의 결과를 그대로 전달:
//     { ok: true } | { ok: false, reason: 'full' | 'closed' | 'duplicate' }
// -----------------------------------------------------------------
meetupsRouter.post('/:id/join', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ error: 'not found' });
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'name required' });
  }
  if (name.length > 20) {
    return res.status(400).json({ error: 'name too long' });
  }

  try {
    const result = await joinMeetup(id, name);
    res.status(result.ok ? 200 : 409).json(result);
  } catch (err) {
    console.error('[POST /meetups/:id/join]', err);
    res.status(500).json({ ok: false, reason: 'error' });
  }
});
