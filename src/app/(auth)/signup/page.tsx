/**
 * [파일 안내] frontend/src/app/(auth)/signup/page.tsx
 * 회원가입 URL의 진입점입니다. 라우트 정보와 화면 컴포넌트를 연결하고 성공/복귀 이동을 정의합니다.
 * page는 URL/라우팅 경계이며 상세 상호작용은 containers/screens에 있습니다. URL의 식별자가 실제 데이터에 존재하는지 로딩/오류 경로도 확인하세요.
 */

'use client';

import { useRouter } from 'next/navigation';
import { SignupScreen } from '@/src/containers/screens';

export default function SignupPage() {
    const router = useRouter();

    return (
        <SignupScreen
            onSignupSuccess={(email: string) => {
                router.push(`/verify?email=${encodeURIComponent(email)}`);
            }}
            onBackToLogin={() => router.push('/login')}
        />
    );
}
