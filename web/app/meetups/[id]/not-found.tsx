import Link from 'next/link';

export default function NotFound() {
  return (
    <section>
      <h2>모임을 찾을 수 없어요</h2>
      <p style={{ color: 'var(--muted)' }}>
        삭제되었거나 잘못된 주소입니다.
      </p>
      <p>
        <Link href="/" className="btn-primary">목록으로 돌아가기</Link>
      </p>
    </section>
  );
}
