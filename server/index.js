// =====================================================================
// Express entry — /health 만 가진 최소 골격 (DBP-1).
// 후속 슬라이스에서 routes/meetups.js 등을 마운트한다.
// =====================================================================

import express from 'express';
import { query, close } from './db.js';
import { meetupsRouter } from './routes/meetups.js';
import { statsRouter } from './routes/stats.js';

const app = express();
app.use(express.json());

// CORS: Next.js (3000) 에서 직접 호출하기 위한 최소 허용
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use('/meetups', meetupsRouter);
app.use('/stats', statsRouter);

app.get('/health', async (_req, res) => {
  try {
    const { rows } = await query('SELECT 1 AS one, NOW() AS now');
    res.json({ ok: true, db: rows[0] });
  } catch (err) {
    res.status(503).json({ ok: false, error: String(err) });
  }
});

const PORT = Number(process.env.PORT || 3001);
const server = app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

async function shutdown(signal) {
  console.log(`[server] received ${signal}, shutting down`);
  server.close(async () => {
    await close();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
