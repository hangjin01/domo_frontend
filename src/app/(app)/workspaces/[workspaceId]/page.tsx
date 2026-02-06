'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/src/lib/contexts/UserContext';
import { ProjectSelectScreen } from '@/src/containers/screens';
import { getWorkspace, logout } from '@/src/models/api';
import { Loader2 } from 'lucide-react';
import type { Workspace, Project } from '@/src/models/types';

export default function WorkspaceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, clearUser } = useUser();

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);

    const workspaceId = Number(params.workspaceId);

    useEffect(() => {
        if (isNaN(workspaceId)) {
            router.replace('/workspaces');
            return;
        }

        getWorkspace(workspaceId)
            .then(setWorkspace)
            .catch(() => router.replace('/workspaces'))
            .finally(() => setLoading(false));
    }, [workspaceId, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!workspace || !user) return null;

    return (
        <ProjectSelectScreen
            workspace={workspace}
            user={user}
            onSelectProject={(project: Project) => {
                router.push(`/workspaces/${workspaceId}/projects/${project.id}`);
            }}
            onBack={() => router.push('/workspaces')}
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
