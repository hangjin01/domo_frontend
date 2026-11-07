/**
 * [파일 안내] frontend/src/app/(auth)/login/page.tsx
 * 로그인 URL의 진입점입니다. 라우트 정보와 화면 컴포넌트를 연결하고 성공/복귀 이동을 정의합니다.
 * page는 URL/라우팅 경계이며 상세 상호작용은 containers/screens에 있습니다. URL의 식별자가 실제 데이터에 존재하는지 로딩/오류 경로도 확인하세요.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/src/lib/contexts/UserContext';
import { LoginScreen } from '@/src/containers/screens';

export default function LoginPage() {
    const router = useRouter();
    const { refreshUser } = useUser();

    return (
        <LoginScreen
            onLoginSuccess={async () => {
                await refreshUser();
                router.push('/workspaces');
            }}
            onGoToSignup={() => router.push('/signup')}
        />
    );
}
