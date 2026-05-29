#!/usr/bin/env bash
# Auto-resume: if pending Linear issues remain, block the Stop event
# and instruct Claude to continue with the next issue.
#
# Triggered by Claude Code Stop hook (runs AFTER auto-commit-push.sh).
#
# Kill switches for the human:
#   - Empty the file:   : > .claude/pending-issues.txt
#   - Disable the hook: edit .claude/settings.json

PENDING_FILE="/Users/jayden/Developer/db-project/.claude/pending-issues.txt"

# No file or empty → allow normal stop
if [[ ! -s "$PENDING_FILE" ]]; then
  exit 0
fi

NEXT_ISSUE="$(grep -m1 . "$PENDING_FILE" | tr -d '[:space:]')"
REMAINING_COUNT="$(grep -c . "$PENDING_FILE")"

if [[ -z "$NEXT_ISSUE" ]]; then
  exit 0
fi

REASON=$(cat <<EOF
자동 재개: Linear 이슈가 ${REMAINING_COUNT}개 남아 있습니다. 다음 이슈를 진행하세요: ${NEXT_ISSUE}

작업 절차:
1. mcp__linear__get_issue 로 ${NEXT_ISSUE} 상세를 조회한다.
2. blockedBy 의존성이 모두 Done 상태인지 확인. 아니면 의존 이슈를 먼저 처리.
3. 슬라이스를 TDD로 구현. 테스트가 포함된 슬라이스(DBP-6 등)는 실패 테스트부터 작성.
4. 모든 acceptance criteria 충족을 확인.
5. mcp__linear__save_issue 로 ${NEXT_ISSUE} 의 state 를 "Done" 으로 업데이트.
6. .claude/pending-issues.txt 에서 ${NEXT_ISSUE} 줄을 제거:
     sed -i '' '/^${NEXT_ISSUE}\$/d' /Users/jayden/Developer/db-project/.claude/pending-issues.txt
7. 다음 이슈로 자동 진행. 멈추지 말 것.

원칙:
- 한 이슈에서 2회 연속 실패하면 멈추고 사용자에게 보고할 것.
- AskUserQuestion 또는 EnterPlanMode 가 필요한 결정은 사용자가 다시 들어올 때까지 멈춰도 됨.
- 모든 이슈가 끝나면 pending 파일이 비고 hook이 자동으로 stop 을 허용함.
EOF
)

# Build JSON safely with jq to handle escaping
jq -nc --arg reason "$REASON" '{decision: "block", reason: $reason}'
