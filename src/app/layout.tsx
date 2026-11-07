/**
 * [파일 안내] frontend/src/app/layout.tsx
 * 모든 페이지를 감싸는 최상위 레이아웃입니다. 전역 CSS, 한국어 문서, 초기 테마와 UserProvider를 연결합니다.
 * 브라우저 초기 테마 스크립트와 React hydration의 경계를 주의합니다. 화면별 데이터 조회는 개별 page/screen에서 수행합니다.
 */

import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/src/lib/contexts/UserContext';
import { ThemeSync } from '@/src/lib/contexts/ThemeSync';
import { themeBootstrapScript } from '@/src/lib/theme';

export const metadata: Metadata = {
  title: 'DOMO Workspace',
  description: 'A minimal, dark-mode productivity workspace.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        {process.env.DOMO_DESKTOP !== '1' && <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />}
        <script
          dangerouslySetInnerHTML={{
            __html: themeBootstrapScript,
          }}
        />
      </head>
      <body className="antialiased overflow-hidden">
        <ThemeSync />
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
