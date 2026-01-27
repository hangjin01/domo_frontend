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
