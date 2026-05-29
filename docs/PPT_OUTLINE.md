# PPT 아웃라인 — db-project

발표용 7-slide 구성. 각 슬라이드의 핵심 메시지와 보여줄 자료를 정리.

---

## Slide 1 · 컨셉과 데모

**메시지**: "캠퍼스에서 30분 뒤 학식 같이 갈 사람을 모으는 가장 가벼운 게시판."

**보여줄 것**
- 한 줄 컨셉
- 스크린샷 3장: 목록 / 만들기 / 상세
- 라이브 데모는 발표 마지막에 다시 — 여기는 정지 화면만

---

## Slide 2 · 아키텍처와 ERD

**메시지**: "Next.js → Express → PostgreSQL 3-레이어. 데이터 모델은 단 3개 테이블."

**보여줄 것**
- 아키텍처 다이어그램
  ```
  Browser ─ HTTP ─→ Next.js (3000) ─ HTTP ─→ Express (3001) ─ pg pool ─→ PostgreSQL (5432)
  ```
- ERD (README mermaid 그대로 화면 캡처)
- 의도적 분리 이유:
  - 백엔드와 프론트 책임 분리 → "DB 가 어떻게 호출되는지" 가 코드에서 명확
  - ORM 없이 직접 SQL → 학습 목표에 부합

---

## Slide 3 · 릴레이션 설계와 제약조건

**메시지**: "정원 무결성·중복 방지·참조 무결성을 모두 DB 가 강제한다."

**보여줄 것** (표)

| 제약 | 역할 |
|---|---|
| `PRIMARY KEY (meetup_id, name)` on `participants` | 한 사람 한 모임 1회 참여 |
| `FK category → categories.code` | 존재하지 않는 카테고리 차단 |
| `FK meetup_id → meetups.id ON DELETE CASCADE` | 모임 삭제 시 참여자 자동 정리 |
| `CHECK capacity >= 1` | 0명 모임 방지 |
| `CHECK status IN (open, closed, cancelled)` | 상태 enum 강제 |

**시연 한 줄**: `INSERT INTO meetups (..., capacity, ...) VALUES (..., 0, ...);`
→ `ERROR: new row for relation "meetups" violates check constraint "meetups_capacity_check"`

---

## Slide 4 · 대표 쿼리와 EXPLAIN

**메시지**: "목록 조회는 단일 JOIN + GROUP BY 1발 쿼리. partial index 로 0.1ms 이하."

**보여줄 것**
- SQL (목록):
  ```sql
  SELECT m.*, c.label, c.emoji, COUNT(p.name) AS joined
  FROM meetups m
  JOIN categories c ON c.code = m.category
  LEFT JOIN participants p ON p.meetup_id = m.id
  WHERE m.status = 'open' AND m.meet_at > NOW()
  GROUP BY m.id, c.code, c.label, c.emoji
  ORDER BY m.meet_at ASC;
  ```
- EXPLAIN ANALYZE 결과 캡처 → `Index Scan using idx_meetups_open_meet_at` 하이라이트
- partial index 의미: "open & 미래" 조건과 정확히 일치하는 부분만 인덱싱 → 인덱스가 작아짐

---

## Slide 5 · 트랜잭션 흐름 — `joinMeetup`

**메시지**: "선착순 참여는 1개의 트랜잭션 + `SELECT FOR UPDATE` 행 잠금으로 안전하게."

**보여줄 것** — 단계 다이어그램

```
BEGIN
  ├─ SELECT capacity, status, meet_at FROM meetups WHERE id=? FOR UPDATE
  ├─ if (현재 참여자 수 >= capacity)   → ROLLBACK, reason=full
  ├─ if (status != open or 시각 과거) → ROLLBACK, reason=closed
  ├─ INSERT participants (id, name)
  │     └─ if (23505 unique violation) → ROLLBACK, reason=duplicate
  ├─ if (방금 정원 채워짐) → UPDATE meetups SET status='closed'
  └─ COMMIT
```

**deep module 의 가치**: 호출자는 `{ok}|{ok:false, reason}` 만 본다.
잠금·SQLSTATE·UPDATE 같은 디테일은 새지 않는다.

---

## Slide 6 · 동시성 비교 실험

**메시지**: "잠금 없으면 정원이 깨지고, 잠금이 있으면 정확히 지켜진다."

**보여줄 것** — 라이브 실행 또는 캡처

```
$ node scripts/concurrency-demo.js
=== (A) FOR UPDATE 없이 ===
정원: 2, 시도자: 5명 → 성공 5건, 최종 5명  ⚠️  정원 초과 (5 > 2)

=== (B) FOR UPDATE 있이 ===
정원: 2, 시도자: 5명 → 성공 2건, 최종 2명  ✅ 무결성 유지
```

**보조 자료**: `npm test` 의 7개 통과 로그 — 동시성 테스트가 안정적으로 그린.

---

## Slide 7 · 한계와 확장

**메시지**: "학습 목표에 집중하기 위해 의도적으로 빼둔 것과, 자연스러운 다음 단계."

**의도적으로 뺀 것**
- 인증/세션 — "이름만 입력" 으로 단순화
- ORM/마이그레이션 도구 — SQL 가시성 우선
- 실시간 알림 — 트랜잭션 학습 의도와 무관

**자연스러운 확장**
- 호스트 인증으로 모임 취소 권한 보호
- 평판/노쇼 기록 → 매칭 품질 피드백 루프 (원래 PRD 의 풀버전)
- 실시간 자리 변동: `LISTEN/NOTIFY` 또는 WebSocket
- SERIALIZABLE 격리 수준과의 비교 실험

**마무리 한 줄**: "데이터베이스 무결성을 누가 책임지는가 — 그 답이 정확히 DB 쪽에 있게 설계했다."

---

## 발표 보조 자료 위치

- ERD, 제약조건 표, EXPLAIN ANALYZE 결과 → `README.md`
- 테스트 출력 → `cd server && npm test`
- 동시성 데모 → `cd scripts && node concurrency-demo.js`
- 슬라이스별 진행 흐름 → `docs/PRD.md` 의 "User Stories" 매핑
