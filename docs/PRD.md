# PRD: "지금 같이 갈래?" — 캠퍼스 번개 모임 게시판

> 데이터베이스 과목 기말 프로젝트
> 학습 목표: 웹 ↔ DBMS 연동, 릴레이션·쿼리·트랜잭션의 정의와 활용

---

## Problem Statement

학생들은 "지금 학식 같이 갈 사람", "30분 뒤 카페에서 같이 공부할 사람"처럼 **아주 짧은 수명의 즉석 모임**을 만들고 싶을 때가 많지만, 기존 단톡방·에브리타임 게시판은 흐름이 빨라 묻히거나, 정원 관리가 안 되어 누가 참여했는지 헷갈리는 문제가 있다.

학생 입장에서 필요한 것은 다음 두 가지뿐이다.

- 지금 진행 중인 번개 모임이 한눈에 보이는 목록
- 정원이 정해진 모임에 **선착순으로 끼어드는** 단순한 방법

## Solution

이름만 입력하면 누구나 모임을 만들고 참여할 수 있는 초경량 번개 모임 게시판을 만든다.
인증·평판·알림 같은 부가 기능은 모두 제거하고, **목록 보기 / 만들기 / 참여하기** 세 가지 행동에만 집중한다.

서비스적 가치는 부차적이며, 본 프로젝트의 진짜 목표는 다음을 **명확히 시연**하는 것이다.

1. Next.js로 만든 웹 화면이 백엔드 API를 거쳐 PostgreSQL과 어떻게 대화하는지
2. 모임/참여자/카테고리 3개 릴레이션이 어떻게 설계·연결되는지
3. "선착순 참여"라는 단 하나의 트랜잭션이 동시성 환경에서 어떻게 무결성을 지키는지

## User Stories

1. 학생으로서, 진행 중인 번개 모임 목록을 시간 임박순으로 보고 싶다. 그래야 지금 끼어들 수 있는 모임을 빠르게 찾을 수 있다.
2. 학생으로서, 모임 카드에서 제목·장소·시각·현재 참여 인원/정원·카테고리를 한눈에 보고 싶다. 그래야 클릭 전에 참여 여부를 판단할 수 있다.
3. 학생으로서, 카테고리(밥/카페/공부/운동)별로 모임을 필터링하고 싶다. 그래야 내 관심사에 맞는 모임만 볼 수 있다.
4. 학생으로서, 이미 정원이 찼거나 시각이 지난 모임은 목록에서 자동으로 사라졌으면 좋겠다. 그래야 실수로 마감된 모임을 클릭하지 않는다.
5. 학생으로서, "모임 만들기" 버튼을 눌러 제목·카테고리·장소·만날 시각·정원·내 이름을 입력하고 모임을 만들고 싶다. 그래야 다른 사람을 모을 수 있다.
6. 학생으로서, 정원을 1명 이상으로만 설정하도록 검증받고 싶다. 그래야 잘못된 모임이 만들어지지 않는다.
7. 학생으로서, 모임 상세 페이지에서 현재 참여자 목록을 이름으로 보고 싶다. 그래야 누가 함께하는지 알 수 있다.
8. 학생으로서, 상세 페이지에서 이름을 입력하고 "참여하기"를 눌러 모임에 끼고 싶다. 그래야 즉시 참여 의사를 표현할 수 있다.
9. 학생으로서, 정원이 꽉 찼을 때 참여 시도가 명확히 거절되었음을 안내받고 싶다. 그래야 헷갈리지 않는다.
10. 학생으로서, 같은 이름으로 한 모임에 중복 참여되지 않았으면 좋겠다. 그래야 정원이 부정확해지지 않는다.
11. 학생으로서, 정원이 가득 차면 모임이 자동으로 "마감(closed)" 상태가 되어 목록에서 사라지길 원한다. 그래야 헛걸음하지 않는다.
12. 채점자(교수/조교)로서, 카테고리별 모임 수와 시간대별 분포를 보는 통계 페이지를 보고 싶다. 그래야 JOIN과 집계 쿼리가 동작함을 확인할 수 있다.
13. 채점자로서, 모임을 삭제하면 해당 모임의 참여자 행도 자동으로 사라지는지 확인하고 싶다. 그래야 외래키 cascade 동작을 검증할 수 있다.
14. 채점자로서, 동일한 모임에 5명이 동시에 참여 요청을 보낸 시나리오에서 정확히 정원만큼만 성공함을 코드와 로그로 확인하고 싶다. 그래야 트랜잭션 격리 제어가 학습되었음을 확인할 수 있다.
15. 채점자로서, README에서 ERD와 각 제약조건의 의도를 문장으로 읽고 싶다. 그래야 릴레이션 설계 의도를 평가할 수 있다.
16. 채점자로서, PPT에서 `FOR UPDATE` 유무에 따른 동시성 실험 결과 비교를 보고 싶다. 그래야 트랜잭션 학습의 핵심 포인트가 전달되었음을 확인할 수 있다.

## Implementation Decisions

### 아키텍처 (얇은 3-레이어)

```
Next.js(App Router) 페이지/액션  →  Express + pg API  →  PostgreSQL 16
```

- **Next.js**는 화면 4장(목록/만들기/상세/통계)만 담당. 가능한 한 서버 컴포넌트로 단순화하고 폼은 server action 또는 fetch로 처리.
- **Express + node-postgres(pg)**가 DB와 직접 대화. ORM은 사용하지 않는다. **모든 SQL을 직접 쓰는 것**이 학습 목표상 핵심.
- **PostgreSQL**은 로컬 Docker로 띄우고, 스키마는 단일 `schema.sql`로 관리. 마이그레이션 도구 없이 "drop & recreate"로 충분.

### 모듈 구성 (3개)

1. **DB 스키마 모듈** — `meetups`, `participants`, `categories` 3개 테이블과 시드 데이터를 정의. 제약조건(PK, FK, CHECK, UNIQUE, DEFAULT, ON DELETE CASCADE)을 적극 활용.
2. **DB 접근 레이어 (deep module)** — pg 커넥션 풀, `query()` 헬퍼, `withTransaction(fn)` 헬퍼, 그리고 가장 중요한 `joinMeetup(meetupId, name)` 함수를 노출. 트랜잭션 경계와 `SELECT ... FOR UPDATE` 잠금이 이 모듈 안에 완전히 캡슐화된다. 외부에서 보이는 인터페이스는 단순(성공/정원초과/마감 결과만 반환)하나, 내부적으로 깊은 동시성 제어를 수행한다.
3. **HTTP 라우트 모듈** — `GET /meetups`, `POST /meetups`, `GET /meetups/:id`, `POST /meetups/:id/join`, `GET /stats` 5개 엔드포인트. 각 핸들러는 얇게 유지하고, 비즈니스 로직과 SQL은 DB 접근 레이어에 위임.

### 릴레이션 설계

- `meetups (id PK, title, category FK→categories.code, place, meet_at, capacity CHECK ≥1, host_name, status DEFAULT 'open', created_at)`
- `participants ((meetup_id, name) PK, meetup_id FK→meetups.id ON DELETE CASCADE, joined_at)` — 복합 PK가 곧 "한 사람당 한 모임 1회 참여" 제약을 강제
- `categories (code PK, label, emoji)` — 정규화 시연용 별도 테이블
- `meetups.status` 값은 `'open' | 'closed' | 'cancelled'` 3개로 한정 (CHECK 제약 권장)

### 핵심 쿼리 3종

1. **목록 + 집계 + JOIN**: `meetups ⨝ categories ⨝ participants`를 `GROUP BY`로 묶어 현재 참여 인원과 카테고리 라벨/이모지를 함께 반환. `WHERE status='open' AND meet_at > NOW()`로 만료 모임 자동 제외.
2. **상세 조회**: 모임 1건 + 참여자 목록 (2개 쿼리로 분리 가능; 단순성을 위해 채택).
3. **카테고리별 통계**: `categories LEFT JOIN meetups GROUP BY label`로 카테고리별 총 모임 수 반환. 시간대별 분포는 `EXTRACT(HOUR FROM meet_at)`로 그룹핑.

### 핵심 트랜잭션 — `joinMeetup`

선착순 참여는 다음 순서로 처리하며, 전 과정이 단일 트랜잭션이다.

1. `BEGIN`
2. 대상 모임 행에 `SELECT ... FOR UPDATE`로 행 잠금 — 동시 참여 요청을 직렬화
3. 모임 상태가 `'open'`이고 `meet_at > NOW()`인지 검증, 아니면 `ROLLBACK` 후 "마감됨" 반환
4. 현재 참여자 수를 `COUNT(*)`로 확인, 정원 이상이면 `ROLLBACK` 후 "정원 초과" 반환
5. `INSERT INTO participants` — 복합 PK 위반 시(`23505`) `ROLLBACK` 후 "중복 참여" 반환
6. 정원이 채워졌으면 `UPDATE meetups SET status = 'closed'`
7. `COMMIT`

호출자에게는 `{ ok: true } | { ok: false, reason: 'full' | 'closed' | 'duplicate' }` 형태의 단순한 결과만 노출한다. 트랜잭션·잠금·SQLSTATE 코드는 모두 모듈 내부에 숨긴다.

### API 계약

| 메서드 | 경로 | 요청 | 응답 |
|---|---|---|---|
| GET | `/meetups` | 쿼리 파라미터 `category?` | 모임 카드 배열 (참여 인원 포함) |
| POST | `/meetups` | `{ title, category, place, meet_at, capacity, host_name }` | 생성된 모임 |
| GET | `/meetups/:id` | — | 모임 + 참여자 목록 |
| POST | `/meetups/:id/join` | `{ name }` | `{ ok, reason? }` |
| GET | `/stats` | — | 카테고리별/시간대별 집계 |

### 기술적 결정 요약

- 로그인·세션·평판·알림 **없음**. "이름 입력"만으로 행위자를 식별.
- ORM 사용 **금지**. 모든 SQL을 직접 작성해 학습 의도를 살린다.
- 마이그레이션 도구 **사용하지 않음**. `schema.sql` 한 파일이 단일 진실의 원천.
- 배포는 선택사항. 로컬에서 시연 가능한 수준을 기본 목표로 한다.

## Testing Decisions

### 좋은 테스트의 기준

- **외부 동작만** 검증한다. "트랜잭션 안에서 `SELECT FOR UPDATE`가 호출되었는가" 같은 구현 세부를 보지 않고, "5명이 정원 2명 모임에 동시에 참여하면 정확히 2명만 성공하는가"를 본다.
- 테스트는 **실제 PostgreSQL**을 띄워 돌린다. mock된 DB는 동시성 학습 의도를 무력화하므로 금지.
- 각 테스트는 깨끗한 스키마에서 시작 — 테스트 시작 시 truncate.

### 테스트 대상 모듈

오직 **DB 접근 레이어의 `joinMeetup`** 한 곳만 자동화 테스트한다. 이유는 두 가지:

1. 이 함수가 본 프로젝트의 학습 목표(트랜잭션·동시성)를 가장 잘 드러내는 표면이다.
2. 단순 SELECT 쿼리는 화면에서 눈으로 검증 가능하지만, 동시성은 자동화 없이는 재현이 어렵다.

### 테스트 시나리오

1. 정원이 남은 모임에 1명이 참여 → `{ ok: true }`, 참여자 수 +1
2. 정원이 꽉 찬 모임에 참여 시도 → `{ ok: false, reason: 'full' }`
3. 같은 이름으로 같은 모임에 2번 참여 → 두 번째는 `{ ok: false, reason: 'duplicate' }`
4. 정원 2명 모임에 5명이 **동시에** `Promise.all`로 참여 요청 → 성공 2건, 실패 3건, DB에는 정확히 2명만 존재
5. 정원이 채워진 후 모임 `status`가 자동으로 `'closed'`로 바뀌었는지 확인
6. 마감 시각(`meet_at`)이 과거인 모임에 참여 시도 → `{ ok: false, reason: 'closed' }`

### 발표용 검증

자동 테스트와 별도로, **PPT 시연용 동시성 비교 스크립트**를 작성한다. 동일 시나리오를 (A) `FOR UPDATE` 없이, (B) 있이 실행해 결과를 나란히 보여준다. 이는 테스트라기보다 **학습 결과의 시각화**다.

## Out of Scope

- 사용자 인증, 회원 가입, 세션, 비밀번호, OAuth
- 사용자 평판, 노쇼 기록, 차단, 신고
- 알림(푸시/이메일/SMS), 실시간 업데이트(WebSocket, SSE)
- 모임 수정(편집), 댓글, 채팅
- 이미지 업로드, 지도, 위치 기반 검색
- 모바일 앱, PWA
- 다국어, 다크모드, 접근성 정밀화
- 검색(Full-text search), 추천 알고리즘
- ORM, 마이그레이션 도구, 배포 자동화

## Further Notes

### 발표(PPT) 구성 권장 흐름

1. 한 줄 컨셉과 데모 화면 3장
2. ERD 1장 — 3개 테이블, 관계선 2개
3. 제약조건 표 — PK/FK/CHECK/UNIQUE/CASCADE를 왜 걸었는지 한 줄씩
4. 대표 쿼리 1개의 `EXPLAIN ANALYZE` (인덱스 추가 전후 비교가 가능하면 추가 가산점)
5. 트랜잭션 흐름도 — `joinMeetup`의 6단계
6. 동시성 비교 실험 결과 — `FOR UPDATE` 없을 때 vs 있을 때
7. 한계와 확장 아이디어

### 작업 일정 가이드 (5~7일)

| Day | 작업 |
|---|---|
| 1 | Docker로 PostgreSQL, `schema.sql` 작성 및 시드 |
| 2 | Express + pg 셋업, `GET /meetups`, `POST /meetups` |
| 3~4 | `joinMeetup` 트랜잭션 구현 + 동시성 테스트 |
| 5~6 | Next.js 화면 4장 |
| 7 | 동시성 비교 스크립트, README, PPT 정리 |

### 폴더 구조 (제안)

```
/db
  schema.sql
  seed.sql
/server          # Express
  index.js
  db.js          # pg 풀 + withTransaction + joinMeetup
  routes/meetups.js
  __tests__/joinMeetup.test.js
/web             # Next.js
  app/
    page.tsx         # 목록
    new/page.tsx     # 만들기
    meetups/[id]/page.tsx  # 상세
    stats/page.tsx   # 통계
/scripts
  concurrency-demo.js  # 발표용 동시성 비교
/docs
  ASSIGNMENT.md
  PRD.md
README.md
```
