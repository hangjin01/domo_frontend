/**
 * [파일 안내] frontend/src/app/(app)/layout.tsx
 * 로그인한 사용자만 업무 화면을 볼 수 있게 감싸는 레이아웃입니다.
 * UserContext의 로딩/사용자 상태에 따라 렌더링 또는 라우팅을 결정합니다. 클라이언트 보호는 서버 권한 검증을 대신하지 않습니다.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/src/lib/contexts/UserContext';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return <>{children}</>;
}
