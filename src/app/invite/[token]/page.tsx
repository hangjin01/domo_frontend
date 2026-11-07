/**
 * [파일 안내] frontend/src/app/invite/[token]/page.tsx
 * 초대 토큰 수락 URL의 진입점입니다. 라우트 정보와 화면 컴포넌트를 연결하고 성공/복귀 이동을 정의합니다.
 * page는 URL/라우팅 경계이며 상세 상호작용은 containers/screens에 있습니다. URL의 식별자가 실제 데이터에 존재하는지 로딩/오류 경로도 확인하세요.
 */

import { InviteAcceptScreen } from '@/src/containers/screens';

interface InvitePageProps {
    params: Promise<{
        token: string;
    }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
    const { token } = await params;
    return <InviteAcceptScreen token={token} />;
}

export const metadata = {
    title: '워크스페이스 초대 | DOMO',
    description: 'DOMO 워크스페이스 초대를 수락하세요.',
};
