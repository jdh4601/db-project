// Express 백엔드 베이스 URL.
// 서버 컴포넌트에서 fetch 시 사용한다.
export const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}
