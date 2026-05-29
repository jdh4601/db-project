'use client';

import { useMemo } from 'react';
import type { Category } from '@/lib/types';

type Props = {
  action: (formData: FormData) => void;
  categories: Category[];
};

export default function NewMeetupForm({ action, categories }: Props) {
  // datetime-local 의 min 값은 현재 시각 (분 단위) 으로 — 과거 시각 차단
  const minDateTime = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    const tz = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - tz).toISOString().slice(0, 16);
  }, []);

  return (
    <form action={action} className="form">
      <label className="field">
        <span>제목</span>
        <input name="title" required maxLength={80} placeholder="학식 같이 가실 분" />
      </label>

      <label className="field">
        <span>카테고리</span>
        <select name="category" required defaultValue="">
          <option value="" disabled>고르세요</option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>장소</span>
        <input name="place" required maxLength={80} placeholder="제1학생회관 1층" />
      </label>

      <label className="field">
        <span>만날 시각</span>
        <input
          type="datetime-local"
          name="meet_at"
          required
          min={minDateTime}
        />
      </label>

      <label className="field">
        <span>정원 (호스트 포함)</span>
        <input type="number" name="capacity" required min={1} max={50} defaultValue={3} />
      </label>

      <label className="field">
        <span>내 이름 (호스트)</span>
        <input name="host_name" required maxLength={20} placeholder="동현" />
      </label>

      <div className="form-actions">
        <button type="submit" className="btn-primary">모임 열기</button>
      </div>
    </form>
  );
}
