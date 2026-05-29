export type Meetup = {
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
  joined: number;
};

export type Category = {
  code: string;
  label: string;
  emoji: string;
};

// 시드와 동기화된 정적 카테고리 목록.
// 카테고리는 거의 변하지 않으므로 별도 API 없이 상수로 유지.
export const CATEGORIES: Category[] = [
  { code: 'meal',  label: '밥',   emoji: '🍚' },
  { code: 'cafe',  label: '카페', emoji: '☕' },
  { code: 'study', label: '공부', emoji: '📚' },
  { code: 'sport', label: '운동', emoji: '🏃' },
];
