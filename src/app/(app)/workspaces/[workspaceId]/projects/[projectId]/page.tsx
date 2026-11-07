/**
 * [파일 안내] frontend/src/app/(app)/workspaces/[workspaceId]/projects/[projectId]/page.tsx
 * 프로젝트 보드 URL의 진입점입니다. 라우트 정보와 화면 컴포넌트를 연결하고 성공/복귀 이동을 정의합니다.
 * page는 URL/라우팅 경계이며 상세 상호작용은 containers/screens에 있습니다. URL의 식별자가 실제 데이터에 존재하는지 로딩/오류 경로도 확인하세요.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BoardScreen } from '@/src/containers/screens';
import { getProject } from '@/src/models/api';
import { Loader2 } from 'lucide-react';
import type { Project } from '@/src/models/types';

export default function BoardPage() {
    const router = useRouter();
    const params = useParams();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const workspaceId = String(params.workspaceId);
    const projectId = Number(params.projectId);

    useEffect(() => {
        if (isNaN(projectId)) {
            router.replace(`/workspaces/${workspaceId}`);
            return;
        }

        setLoading(true);
        setError(null);
        getProject(projectId)
            .then(setProject)
            .catch((err) => {
                console.error('Failed to fetch project:', err);
                setError(err instanceof Error ? err.message : '프로젝트를 불러오지 못했습니다.');
            })
            .finally(() => setLoading(false));
    }, [projectId, workspaceId, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-black gap-4">
                <p className="text-red-500">{error}</p>
                <button
                    onClick={() => router.replace(`/workspaces/${workspaceId}`)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                    워크스페이스로 돌아가기
                </button>
            </div>
        );
    }

    if (!project) return null;

    return (
        <BoardScreen
            project={project}
            onBack={() => router.push(`/workspaces/${workspaceId}`)}
        />
    );
}
