/**
 * [파일 안내] frontend/src/app/page.tsx
 * 루트 주소 진입 시 현재 사용자 상태를 확인하고 로그인 또는 워크스페이스 목록으로 보냅니다.
 * 인증 확인 중의 로딩 상태와 미로그인을 구분해 아직 조회되지 않은 사용자를 성급히 리다이렉트하지 않게 합니다.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/src/lib/contexts/UserContext';
import { Loader2 } from 'lucide-react';

export default function Home() {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            router.replace(user ? '/workspaces' : '/login');
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
    );
}
