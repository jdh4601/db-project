// =====================================================================
// db.js — DB 접근 deep module
//
// 외부에 노출하는 표면은 단 3가지:
//   1. query(sql, params)            — 단발 쿼리
//   2. withTransaction(fn)           — 트랜잭션 경계 캡슐화
//   3. close()                       — 풀 종료 (테스트/종료용)
//
// 그 외 pool, client 같은 내부 객체는 외부로 새지 않도록 한다.
// 이렇게 해야 트랜잭션·잠금·SQLSTATE 같은 세부가 호출자 코드에 침투하지 않는다.
// =====================================================================

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'dbproject',
  password: process.env.PGPASSWORD || 'dbproject',
  database: process.env.PGDATABASE || 'dbproject',
  max: 10,
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error:', err);
});

/**
 * 단발 쿼리 실행.
 * @param {string} text  SQL 문자열, $1 $2 … 파라미터 자리표시자 사용
 * @param {unknown[]} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * 트랜잭션 경계 캡슐화.
 *
 * 사용 예:
 *   const result = await withTransaction(async (client) => {
 *     await client.query('SELECT ... FOR UPDATE');
 *     await client.query('INSERT ...');
 *     return { ok: true };
 *   });
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[db] rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function close() {
  await pool.end();
}
