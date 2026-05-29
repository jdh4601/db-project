import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet, API_BASE } from '@/lib/api';
import { formatMeetAt, formatRelative } from '@/lib/format';
import JoinForm from './join-form';

type Meetup = {
  id: number;
  title: string;
  place: string;
  meet_at: string;
  capacity: number;
  host_name: string;
  status: 'open' | 'closed' | 'cancelled';
  category_code: string;
  category_label: string;
  category_emoji: string;
};
type Participant = { name: string; joined_at: string };
type DetailResponse = { meetup: Meetup; participants: Participant[] };

async function getDetail(id: string): Promise<DetailResponse | null> {
  try {
    return await apiGet<DetailResponse>(`/meetups/${id}`);
  } catch {
    return null;
  }
}

const STATUS_LABEL: Record<Meetup['status'], string> = {
  open: '모집 중',
  closed: '마감됨',
  cancelled: '취소됨',
};

export default async function MeetupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getDetail(id);
  if (!data) notFound();

  const { meetup, participants } = data;
  const isOpen = meetup.status === 'open';

  return (
    <section>
      <Link href="/" className="back-link">← 목록으로</Link>

      <div className="detail-head">
        <span className="meetup-cat">
          {meetup.category_emoji} {meetup.category_label}
        </span>
        <span className={`status-pill status-${meetup.status}`}>
          {STATUS_LABEL[meetup.status]}
        </span>
      </div>

      <h2 className="detail-title">{meetup.title}</h2>

      <dl className="detail-grid">
        <dt>장소</dt><dd>📍 {meetup.place}</dd>
        <dt>시각</dt><dd>🕒 {formatMeetAt(meetup.meet_at)} ({formatRelative(meetup.meet_at)})</dd>
        <dt>호스트</dt><dd>👤 {meetup.host_name}</dd>
        <dt>정원</dt><dd>
          <strong style={{ color: participants.length >= meetup.capacity ? 'var(--err)' : 'var(--accent)' }}>
            {participants.length}
          </strong>
          {' / '}{meetup.capacity}명
        </dd>
      </dl>

      <h3 className="section-title">참여자</h3>
      {participants.length === 0 ? (
        <p className="muted">아직 참여자가 없습니다.</p>
      ) : (
        <ul className="participants">
          {participants.map((p) => (
            <li key={p.name}>{p.name}</li>
          ))}
        </ul>
      )}

      {isOpen ? (
        <JoinForm meetupId={meetup.id} apiBase={API_BASE} />
      ) : (
        <div className="card" style={{ marginTop: 20, borderColor: 'var(--muted)' }}>
          <span className="status-badge err">● 마감됨</span>
          <p style={{ marginTop: 8, color: 'var(--muted)' }}>
            이 모임은 더 이상 참여할 수 없습니다.
          </p>
        </div>
      )}
    </section>
  );
}
