// =====================================================================
// joinMeetup — 선착순 참여 트랜잭션 (★ 본 프로젝트의 학습 목표 핵심)
//
// 외부 표면:
//   joinMeetup(meetupId, name)
//     → { ok: true } | { ok: false, reason: 'full' | 'closed' | 'duplicate' }
//
// 내부 흐름 (단일 트랜잭션):
//   1) BEGIN
//   2) SELECT ... FOR UPDATE   — 모임 행 잠금 (동시 참여 직렬화)
//   3) status / meet_at 검증    — 닫혔거나 과거면 reason=closed
//   4) COUNT(participants)      — 정원 도달이면 reason=full
//   5) INSERT participants      — 23505(PK 중복)면 reason=duplicate
//   6) 정원이 채워졌으면 UPDATE meetups SET status='closed'
//   7) COMMIT
//
// 잠금·SQLSTATE·UPDATE 같은 세부는 모두 이 모듈 안에 캡슐화한다.
// =====================================================================

import { withTransaction } from './db.js';

const SELECT_LOCK_SQL = `
  SELECT capacity, status, meet_at
  FROM meetups
  WHERE id = $1
  FOR UPDATE
`;

const COUNT_SQL = `
  SELECT COUNT(*)::int AS c
  FROM participants
  WHERE meetup_id = $1
`;

const INSERT_SQL = `
  INSERT INTO participants (meetup_id, name)
  VALUES ($1, $2)
`;

const CLOSE_SQL = `
  UPDATE meetups
     SET status = 'closed'
   WHERE id = $1 AND status = 'open'
`;

/**
 * @param {number} meetupId
 * @param {string} name
 * @returns {Promise<{ ok: true } | { ok: false, reason: 'full' | 'closed' | 'duplicate' }>}
 */
export async function joinMeetup(meetupId, name) {
  return withTransaction(async (client) => {
    // 1) 모임 행 잠금 + 현재 상태 조회
    const { rows: meetupRows } = await client.query(SELECT_LOCK_SQL, [meetupId]);
    if (meetupRows.length === 0) {
      return { ok: false, reason: 'closed' };  // 존재하지 않으면 closed 로 취급
    }
    const { capacity, status, meet_at } = meetupRows[0];

    // 2) 현재 참여자 수 — capacity 검사를 status 검사보다 먼저 한다.
    //    동시성 환경에서 다른 트랜잭션이 정원을 채우며 status='closed' 로
    //    바꿔둔 직후에도, 사용자에게는 "정원이 찼습니다" 가 더 정확한 안내.
    const { rows: countRows } = await client.query(COUNT_SQL, [meetupId]);
    const joined = countRows[0].c;
    if (joined >= capacity) {
      return { ok: false, reason: 'full' };
    }

    // 3) 상태/시각 검증 — 호스트가 명시적으로 닫았거나 시각이 지난 경우
    if (status !== 'open' || new Date(meet_at).getTime() <= Date.now()) {
      return { ok: false, reason: 'closed' };
    }

    // 4) 참여자 INSERT — 복합 PK 위반(23505)이면 중복 참여
    try {
      await client.query(INSERT_SQL, [meetupId, name]);
    } catch (err) {
      if (err && err.code === '23505') {
        return { ok: false, reason: 'duplicate' };
      }
      throw err;
    }

    // 5) 이번 INSERT 로 정원이 다 차면 status 를 closed 로 업데이트
    if (joined + 1 >= capacity) {
      await client.query(CLOSE_SQL, [meetupId]);
    }

    return { ok: true };
  });
}
