/**
 * [파일 안내] frontend/src/app/(auth)/verify/page.tsx
 * 이메일 인증 URL의 진입점입니다. 라우트 정보와 화면 컴포넌트를 연결하고 성공/복귀 이동을 정의합니다.
 * page는 URL/라우팅 경계이며 상세 상호작용은 containers/screens에 있습니다. URL의 식별자가 실제 데이터에 존재하는지 로딩/오류 경로도 확인하세요.
 */

'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VerifyEmailScreen } from '@/src/containers/screens';

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    if (!email) {
        router.replace('/signup');
        return null;
    }

    return (
        <VerifyEmailScreen
            email={email}
            onVerifySuccess={() => router.push('/verify-success')}
            onBackToSignup={() => router.push('/signup')}
            onResendCode={() => {}}
        />
    );
}

export default function VerifyPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black" />
            }
        >
            <VerifyContent />
        </Suspense>
    );
}
