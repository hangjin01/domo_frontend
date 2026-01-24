'use client';

import React, { useEffect, useState } from 'react';
import {
    getWorkspaces,
    createWorkspace,
    deleteWorkspace,
    logout,
} from '@/src/models/api';
import type { Workspace, AuthUser } from '@/src/models/types';
import {
    Building2,
    Plus,
    Loader2,
    LogOut,
    MoreHorizontal,
    Trash2,
    Users,
    Folder,
    ChevronRight,
} from 'lucide-react';
import { Mascot } from '@/src/views/common';

// ==========================================
// 워크스페이스 생성 모달
// ==========================================
interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (workspace: Workspace) => void;
}

function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('워크스페이스 이름을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const newWorkspace = await createWorkspace(name.trim(), description.trim() || undefined);
            onSuccess(newWorkspace);
            setName('');
            setDescription('');
            onClose();
        } catch (err) {
            console.error('Failed to create workspace:', err);
            setError(err instanceof Error ? err.message : '워크스페이스 생성에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="w-full max-w-md bg-white dark:bg-[#1E212B] rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                        <Building2 className="text-blue-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">새 워크스페이스</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">팀을 위한 새 워크스페이스를 만듭니다</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            워크스페이스 이름 *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: 캡스톤디자인 팀"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2c333a] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            설명 (선택)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="워크스페이스에 대한 간단한 설명"
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2c333a] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>생성 중...</span>
                                </>
                            ) : (
                                <span>워크스페이스 생성</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==========================================
// 워크스페이스 카드 컴포넌트
// ==========================================
interface WorkspaceCardProps {
    workspace: Workspace;
    onSelect: (workspace: Workspace) => void;
    onDelete: (workspaceId: number) => void;
}

function WorkspaceCard({ workspace, onSelect, onDelete }: WorkspaceCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`정말로 "${workspace.name}" 워크스페이스를 삭제하시겠습니까?\n모든 프로젝트가 함께 삭제됩니다.`)) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteWorkspace(workspace.id);
            onDelete(workspace.id);
        } catch (err) {
            console.error('Failed to delete workspace:', err);
            alert('워크스페이스 삭제에 실패했습니다.');
        } finally {
            setIsDeleting(false);
            setShowMenu(false);
        }
    };

    const projectCount = workspace.projects?.length || 0;

    // 워크스페이스별 색상 (ID 기반)
    const colors = [
        'from-blue-500/20 to-cyan-500/20',
        'from-purple-500/20 to-pink-500/20',
        'from-orange-500/20 to-amber-500/20',
        'from-green-500/20 to-emerald-500/20',
        'from-rose-500/20 to-red-500/20',
    ];
    const colorClass = colors[workspace.id % colors.length];

    return (
        <div
            onClick={() => onSelect(workspace)}
            className="glass-card rounded-[2rem] p-6 cursor-pointer group relative overflow-hidden min-h-[200px] flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
        >
            {/* 배경 그라데이션 */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-50`} />
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />

            {/* 컨텐츠 */}
            <div className="relative z-10 flex flex-col h-full">
                {/* 헤더 */}
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-sm">
                        <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>

                    {/* 메뉴 버튼 */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <MoreHorizontal size={20} className="text-gray-500" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[140px] z-20">
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm"
                                >
                                    {isDeleting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                    <span>삭제</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 워크스페이스 정보 */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {workspace.name}
                </h3>

                {workspace.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                        {workspace.description}
                    </p>
                )}

                {/* 하단 정보 */}
                <div className="mt-auto pt-4 border-t border-gray-200/50 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <Folder size={14} />
                            <span>{projectCount}개 프로젝트</span>
                        </div>
                    </div>

                    <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 메인 컴포넌트: WorkspaceListScreen
// ==========================================
interface WorkspaceListScreenProps {
    user: AuthUser;
    onSelectWorkspace: (workspace: Workspace) => void;
    onLogout: () => void;
}

export function WorkspaceListScreen({ user, onSelectWorkspace, onLogout }: WorkspaceListScreenProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // 워크스페이스 목록 로딩
    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const data = await getWorkspaces();
                setWorkspaces(data);
            } catch (error) {
                console.error('Failed to fetch workspaces:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWorkspaces();
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            onLogout();
        } catch (error) {
            console.error('Logout failed:', error);
            onLogout();
        }
    };

    const handleWorkspaceCreated = (newWorkspace: Workspace) => {
        setWorkspaces([...workspaces, newWorkspace]);
    };

    const handleWorkspaceDeleted = (workspaceId: number) => {
        setWorkspaces(workspaces.filter(w => w.id !== workspaceId));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F111A] text-gray-900 dark:text-white">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-400/10 dark:bg-blue-900/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-30 rounded-full" />
                            <Mascot size={32} className="relative z-10" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DOMO
            </span>
                    </div>

                    <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {user.name}님, 환영합니다!
            </span>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        >
                            <LogOut size={18} />
                            <span>로그아웃</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                {/* Title Section */}
                <div className="mb-10">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                        워크스페이스
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                        팀과 함께 작업할 워크스페이스를 선택하거나 새로 만드세요.
                    </p>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-96">
                        <Loader2 className="animate-spin text-blue-500" size={48} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 워크스페이스 목록 */}
                        {workspaces.map((workspace) => (
                            <WorkspaceCard
                                key={workspace.id}
                                workspace={workspace}
                                onSelect={onSelectWorkspace}
                                onDelete={handleWorkspaceDeleted}
                            />
                        ))}

                        {/* 새 워크스페이스 생성 버튼 */}
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all min-h-[200px] group"
                        >
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:scale-110 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-all">
                                <Plus size={32} />
                            </div>
                            <span className="font-semibold text-lg">새 워크스페이스 만들기</span>
                            <span className="text-sm text-gray-400">팀을 위한 새로운 공간을 시작하세요</span>
                        </button>
                    </div>
                )}

                {/* 빈 상태 */}
                {!loading && workspaces.length === 0 && (
                    <div className="text-center py-20">
                        <div className="inline-flex p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                            <Building2 size={48} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            아직 워크스페이스가 없습니다
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            첫 번째 워크스페이스를 만들어 팀 협업을 시작해보세요!
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors inline-flex items-center gap-2"
                        >
                            <Plus size={20} />
                            <span>워크스페이스 만들기</span>
                        </button>
                    </div>
                )}
            </main>

            {/* 생성 모달 */}
            <CreateWorkspaceModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleWorkspaceCreated}
            />
        </div>
    );
}
export default WorkspaceListScreen;
