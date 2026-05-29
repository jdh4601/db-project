-- =====================================================================
-- Seed data: 카테고리 4종
-- =====================================================================

INSERT INTO categories (code, label, emoji) VALUES
  ('meal',   '밥',   '🍚'),
  ('cafe',   '카페', '☕'),
  ('study',  '공부', '📚'),
  ('sport',  '운동', '🏃')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 데모용 샘플 모임 (목록 화면을 보여주기 위한 최소량)
-- meet_at 은 NOW 기준 상대시간으로 넣어 항상 미래로 유지
-- ---------------------------------------------------------------------
INSERT INTO meetups (title, category, place, meet_at, capacity, host_name) VALUES
  ('학식 같이 가실 분', 'meal',  '제1학생회관 1층', NOW() + INTERVAL '30 minutes', 3, '동현'),
  ('카페에서 코딩',     'cafe',  '스타벅스 정문점',  NOW() + INTERVAL '2 hours',   4, '지연'),
  ('자료구조 스터디',   'study', '도서관 4층 그룹실', NOW() + INTERVAL '1 day',     5, '민수'),
  ('농구 한 게임',      'sport', '체육관 A',         NOW() + INTERVAL '3 hours',   6, '서윤')
ON CONFLICT DO NOTHING;

-- 일부 참여자도 미리
INSERT INTO participants (meetup_id, name) VALUES
  (1, '하나'),
  (2, '두리'),
  (2, '세찬')
ON CONFLICT DO NOTHING;
