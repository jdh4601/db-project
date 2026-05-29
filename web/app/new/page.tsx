import { redirect } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import { CATEGORIES } from '@/lib/types';
import NewMeetupForm from './form';

async function createMeetup(formData: FormData) {
  'use server';

  const payload = {
    title: String(formData.get('title') ?? '').trim(),
    category: String(formData.get('category') ?? '').trim(),
    place: String(formData.get('place') ?? '').trim(),
    meet_at: new Date(String(formData.get('meet_at') ?? '')).toISOString(),
    capacity: Number(formData.get('capacity')),
    host_name: String(formData.get('host_name') ?? '').trim(),
  };

  const res = await fetch(`${API_BASE}/meetups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const reason = body.details?.join(', ') || body.detail || body.error || `HTTP ${res.status}`;
    redirect(`/new?error=${encodeURIComponent(reason)}`);
  }

  const data = (await res.json()) as { meetup: { id: number } };
  redirect(`/meetups/${data.meetup.id}`);
}

export default async function NewMeetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <section>
      <h2>모임 만들기</h2>
      <p style={{ color: 'var(--muted)' }}>이름만 적으면 누구나 모임을 열 수 있어요.</p>

      {error && (
        <div className="card" style={{ borderColor: 'var(--err)' }}>
          <span className="status-badge err">● 만들지 못했어요</span>
          <p style={{ marginTop: 8 }}><code>{error}</code></p>
        </div>
      )}

      <NewMeetupForm action={createMeetup} categories={CATEGORIES} />
    </section>
  );
}
