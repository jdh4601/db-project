import Link from 'next/link';
import { apiGet } from '@/lib/api';

type ByCategory = {
  category_code: string;
  category_label: string;
  category_emoji: string;
  total: number;
  open_now: number;
};
type ByHour = { hour: number; total: number };
type StatsResponse = { by_category: ByCategory[]; by_hour: ByHour[] };

async function getStats(): Promise<StatsResponse | null> {
  try {
    return await apiGet<StatsResponse>('/stats');
  } catch {
    return null;
  }
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function StatsPage() {
  const stats = await getStats();
  if (!stats) {
    return (
      <section>
        <h2>통계</h2>
        <p>통계를 불러오지 못했어요.</p>
      </section>
    );
  }

  const catMax = Math.max(1, ...stats.by_category.map((r) => r.total));
  const hourMax = Math.max(1, ...stats.by_hour.map((r) => r.total));

  return (
    <section>
      <Link href="/" className="back-link">← 목록으로</Link>
      <h2>통계</h2>
      <p style={{ color: 'var(--muted)' }}>
        집계 쿼리(JOIN + GROUP BY) 시연용 페이지.
      </p>

      <h3 className="section-title">카테고리별 모임 수</h3>
      <table className="stats-table">
        <thead>
          <tr><th>카테고리</th><th>전체</th><th>지금 모집 중</th><th /></tr>
        </thead>
        <tbody>
          {stats.by_category.map((row) => (
            <tr key={row.category_code}>
              <td>{row.category_emoji} {row.category_label}</td>
              <td className="num">{row.total}</td>
              <td className="num">{row.open_now}</td>
              <td className="bar-cell"><Bar value={row.total} max={catMax} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="section-title">시간대별 분포 (KST)</h3>
      {stats.by_hour.length === 0 ? (
        <p className="muted">데이터가 아직 없습니다.</p>
      ) : (
        <table className="stats-table">
          <thead>
            <tr><th>시간</th><th>모임 수</th><th /></tr>
          </thead>
          <tbody>
            {stats.by_hour.map((row) => (
              <tr key={row.hour}>
                <td>{String(row.hour).padStart(2, '0')}:00</td>
                <td className="num">{row.total}</td>
                <td className="bar-cell"><Bar value={row.total} max={hourMax} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
