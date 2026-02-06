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

    const workspaceId = String(params.workspaceId);
    const projectId = Number(params.projectId);

    useEffect(() => {
        if (isNaN(projectId)) {
            router.replace(`/workspaces/${workspaceId}`);
            return;
        }

        getProject(projectId)
            .then(setProject)
            .catch(() => router.replace(`/workspaces/${workspaceId}`))
            .finally(() => setLoading(false));
    }, [projectId, workspaceId, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
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
