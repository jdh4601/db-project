import { apiGet } from '@/lib/api';

type HealthOk = { ok: true; db: { one: number; now: string } };
type HealthErr = { ok: false; error: string };
type Health = HealthOk | HealthErr;

async function getHealth(): Promise<Health> {
  try {
    return await apiGet<Health>('/health');
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export default async function HealthPage() {
  const health = await getHealth();
  return (
    <section>
      <h2>헬스 체크</h2>
      <p style={{ color: 'var(--muted)' }}>
        Next.js → Express → PostgreSQL 라운드트립 점검.
      </p>
      {health.ok ? (
        <div className="card">
          <span className="status-badge ok">● DB 연결됨</span>
          <p style={{ marginTop: 12 }}>
            <code>SELECT 1</code> 결과: <code>{JSON.stringify(health.db)}</code>
          </p>
        </div>
      ) : (
        <div className="card">
          <span className="status-badge err">● DB 연결 실패</span>
          <p style={{ marginTop: 12 }}>
            <code>{health.error}</code>
          </p>
        </div>
      )}
    </section>
  );
}
