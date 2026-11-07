/**
 * [파일 안내] frontend/src/app/(app)/workspaces/page.tsx
 * 워크스페이스 목록 URL의 진입점입니다. 라우트 정보와 화면 컴포넌트를 연결하고 성공/복귀 이동을 정의합니다.
 * page는 URL/라우팅 경계이며 상세 상호작용은 containers/screens에 있습니다. URL의 식별자가 실제 데이터에 존재하는지 로딩/오류 경로도 확인하세요.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/src/lib/contexts/UserContext';
import { WorkspaceListScreen } from '@/src/containers/screens';
import { logout } from '@/src/models/api';
import type { Workspace } from '@/src/models/types';

export default function WorkspacesPage() {
    const router = useRouter();
    const { user, clearUser } = useUser();

    if (!user) return null;

    return (
        <WorkspaceListScreen
            user={user}
            onSelectWorkspace={(workspace: Workspace) => {
                router.push(`/workspaces/${workspace.id}`);
            }}
            onLogout={async () => {
                try {
                    await logout();
                } catch (e) {
                    console.error('Logout failed:', e);
                }
                clearUser();
                router.push('/login');
            }}
        />
    );
}
