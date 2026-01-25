
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DOMO Workspace',
  description: 'A minimal, dark-mode productivity workspace.',
};

import { UserProvider } from '@/src/lib/contexts/UserContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                darkMode: 'class',
                theme: {
                  extend: {
                    fontFamily: {
                      sans: ['Inter', 'sans-serif'],
                      mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                      domo: {
                        bg: '#0F111A',
                        card: '#1E212B',
                        accent: '#8D6E63',
                        primary: '#8D6E63',
                        'primary-hover': '#6D4C41',
                        'primary-light': '#D7CCC8',
                        highlight: '#E879F9',
                      }
                    },
                    animation: {
                      blob: "blob 7s infinite",
                    },
                    keyframes: {
                      blob: {
                        "0%": { transform: "translate(0px, 0px) scale(1)" },
                        "33%": { transform: "translate(30px, -50px) scale(1.1)" },
                        "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
                        "100%": { transform: "translate(0px, 0px) scale(1)" },
                      },
                    },
                  },
                },
              }
            `,
          }}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: #4B5563; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
        `}} />
      </head>
      <body className="bg-white dark:bg-domo-bg text-gray-800 dark:text-gray-200 antialiased overflow-hidden">
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
