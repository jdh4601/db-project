'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  meetupId: number;
  apiBase: string;
  disabled?: boolean;
};

type Result =
  | { ok: true }
  | { ok: false; reason: 'full' | 'closed' | 'duplicate' | 'error' };

const REASON_MESSAGE: Record<Exclude<Result, { ok: true }>['reason'], string> = {
  full: '아쉽게도 정원이 찼습니다.',
  closed: '모임이 이미 마감되었습니다.',
  duplicate: '이미 같은 이름으로 참여 중이에요. 다른 이름을 써보세요.',
  error: '잠시 후 다시 시도해 주세요.',
};

export default function JoinForm({ meetupId, apiBase, disabled }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState<
    | { kind: 'ok' }
    | { kind: 'err'; message: string }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  if (disabled) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setFeedback(null);
    const res = await fetch(`${apiBase}/meetups/${meetupId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    const data = (await res.json().catch(() => ({}))) as Result;

    if (data.ok) {
      setFeedback({ kind: 'ok' });
      setName('');
      startTransition(() => router.refresh());
    } else {
      setFeedback({
        kind: 'err',
        message: REASON_MESSAGE[data.reason] ?? '참여하지 못했어요.',
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="join-form">
      <h3 className="section-title">참여하기</h3>
      <div className="join-row">
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="내 이름"
          maxLength={20}
          required
        />
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? '처리 중…' : '참여하기'}
        </button>
      </div>

      {feedback?.kind === 'ok' && (
        <p className="join-msg join-ok">✓ 참여 완료!</p>
      )}
      {feedback?.kind === 'err' && (
        <p className="join-msg join-err">✗ {feedback.message}</p>
      )}
    </form>
  );
}
