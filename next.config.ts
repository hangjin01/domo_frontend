// Next.js 개발/빌드 시 읽는 서버 설정입니다.
// 브라우저가 같은 origin의 /api로 요청하면 FastAPI로 프록시해 HTTP API 주소를 한 곳에서 관리합니다.
// WebSocket은 이 rewrite만 믿지 않고 models/api/config.ts의 실시간 주소를 사용합니다.
// 환경변수 변경 후에는 실행 중인 Next 서버를 재시작해야 합니다.
import type { NextConfig } from "next";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

const nextConfig: NextConfig = {
    ...(process.env.DOMO_DESKTOP === '1' ? { output: 'standalone' as const, distDir: '.next-desktop' } : {}),
    async rewrites() {
        if (process.env.DOMO_DESKTOP === '1') return [];
        return [
            {
                source: '/api/:path*',
                destination: `${API_URL}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
