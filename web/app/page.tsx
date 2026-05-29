import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { CATEGORIES, type Meetup } from '@/lib/types';
import { formatMeetAt, formatRelative } from '@/lib/format';

type ListResponse = { meetups: Meetup[] };
type SearchParams = { category?: string };

async function getMeetups(category?: string): Promise<Meetup[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  try {
    const data = await apiGet<ListResponse>(`/meetups${qs}`);
    return data.meetups;
  } catch {
    return [];
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { category } = await searchParams;
  const meetups = await getMeetups(category);

  return (
    <section>
      <div className="page-head">
        <h2>진행 중인 모임</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/stats" className="chip">📊 통계</Link>
          <Link href="/new" className="btn-primary">+ 모임 만들기</Link>
        </div>
      </div>

      <nav className="chips">
        <Link
          href="/"
          className={`chip ${!category ? 'chip-active' : ''}`}
        >
          전체
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.code}
            href={`/?category=${c.code}`}
            className={`chip ${category === c.code ? 'chip-active' : ''}`}
          >
            <span>{c.emoji}</span>
            <span>{c.label}</span>
          </Link>
        ))}
      </nav>

      {meetups.length === 0 ? (
        <div className="empty-state">
          <p>아직 진행 중인 모임이 없어요.</p>
          <p className="empty-sub">
            <Link href="/new">첫 번째 모임</Link>을 만들어 보세요.
          </p>
        </div>
      ) : (
        <ul className="meetup-list">
          {meetups.map((m) => (
            <li key={m.id}>
              <Link href={`/meetups/${m.id}`} className="meetup-card">
                <div className="meetup-row">
                  <span className="meetup-cat">
                    {m.category_emoji} {m.category_label}
                  </span>
                  <span className="meetup-when">
                    {formatRelative(m.meet_at)}
                  </span>
                </div>
                <h3 className="meetup-title">{m.title}</h3>
                <div className="meetup-meta">
                  <span>📍 {m.place}</span>
                  <span>🕒 {formatMeetAt(m.meet_at)}</span>
                </div>
                <div className="meetup-foot">
                  <span className="meetup-host">호스트 {m.host_name}</span>
                  <span
                    className={`meetup-count ${m.joined >= m.capacity ? 'full' : ''}`}
                  >
                    {m.joined} / {m.capacity}명
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
