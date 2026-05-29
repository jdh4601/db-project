// 시간 표시 헬퍼.
// 서버/클라이언트에서 동일하게 동작해야 하므로 toLocaleString 고정 옵션 사용.

const fmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export function formatMeetAt(iso: string): string {
  return fmt.format(new Date(iso));
}

export function formatRelative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes}분 뒤`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 뒤`;
  const days = Math.round(hours / 24);
  return `${days}일 뒤`;
}
