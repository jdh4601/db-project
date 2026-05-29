// =====================================================================
// /stats — 집계 쿼리 시연
//   * 카테고리별 모임 수 (LEFT JOIN으로 0건 카테고리도 포함)
//   * 시간대(시간 of day) 분포 (EXTRACT HOUR)
// =====================================================================

import { Router } from 'express';
import { query } from '../db.js';

export const statsRouter = Router();

const BY_CATEGORY_SQL = `
  SELECT
    c.code   AS category_code,
    c.label  AS category_label,
    c.emoji  AS category_emoji,
    COUNT(m.id)::int AS total,
    COUNT(m.id) FILTER (WHERE m.status = 'open' AND m.meet_at > NOW())::int AS open_now
  FROM categories c
  LEFT JOIN meetups m ON m.category = c.code
  GROUP BY c.code, c.label, c.emoji
  ORDER BY c.code
`;

const BY_HOUR_SQL = `
  SELECT
    EXTRACT(HOUR FROM meet_at AT TIME ZONE 'Asia/Seoul')::int AS hour,
    COUNT(*)::int AS total
  FROM meetups
  GROUP BY hour
  ORDER BY hour
`;

statsRouter.get('/', async (_req, res) => {
  try {
    const [byCat, byHour] = await Promise.all([
      query(BY_CATEGORY_SQL),
      query(BY_HOUR_SQL),
    ]);
    res.json({
      by_category: byCat.rows,
      by_hour: byHour.rows,
    });
  } catch (err) {
    console.error('[GET /stats]', err);
    res.status(500).json({ error: 'failed to compute stats' });
  }
});
