-- =====================================================================
-- db-project: "지금 같이 갈래?" — schema
-- =====================================================================
-- 학습 목표:
--  * 릴레이션과 제약조건 설계
--  * 트랜잭션 동시성 제어 (DBP-6 의 joinMeetup 에서 본격 사용)
--
-- Idempotent: re-running drops and recreates everything.
-- =====================================================================

DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS meetups CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ---------------------------------------------------------------------
-- categories: 카테고리 마스터 (정규화 예시)
-- ---------------------------------------------------------------------
CREATE TABLE categories (
  code   TEXT PRIMARY KEY,
  label  TEXT NOT NULL,
  emoji  TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- meetups: 모임
-- ---------------------------------------------------------------------
CREATE TABLE meetups (
  id          SERIAL      PRIMARY KEY,
  title       TEXT        NOT NULL CHECK (length(title) > 0),
  category    TEXT        NOT NULL REFERENCES categories(code) ON UPDATE CASCADE,
  place       TEXT        NOT NULL CHECK (length(place) > 0),
  meet_at     TIMESTAMPTZ NOT NULL,
  capacity    INT         NOT NULL CHECK (capacity >= 1),
  host_name   TEXT        NOT NULL CHECK (length(host_name) > 0),
  status      TEXT        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'closed', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetups_open_meet_at
  ON meetups (meet_at)
  WHERE status = 'open';

CREATE INDEX idx_meetups_category
  ON meetups (category);

-- ---------------------------------------------------------------------
-- participants: 모임 참여자
--   * 복합 PK (meetup_id, name) 이 곧 "한 사람 한 모임 1회 참여" 제약
--   * ON DELETE CASCADE 로 모임 삭제 시 참여자 자동 삭제
-- ---------------------------------------------------------------------
CREATE TABLE participants (
  meetup_id   INT         NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (length(name) > 0),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (meetup_id, name)
);

CREATE INDEX idx_participants_meetup
  ON participants (meetup_id);
