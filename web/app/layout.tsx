import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '지금 같이 갈래?',
  description: '캠퍼스 번개 모임 게시판',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <h1>지금 같이 갈래?</h1>
          <p className="tagline">캠퍼스 번개 모임 게시판</p>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
