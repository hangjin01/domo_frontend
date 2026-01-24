'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    getProjects,
    createProject,
    deleteProject,
    getWorkspaceMembers,
    logout,
    getMyInfo,
    getMyActivities,
    updateProfileImage,
    updateMyInfo,
} from '@/src/models/api';
import type { Project, Workspace, AuthUser, User, Member } from '@/src/models/types';
import type { ActivityLog } from '@/src/models/api/activity';
import {
    ArrowLeft,
    Plus,
    Search,
    Folder,
    Clock,
    MoreHorizontal,
    Loader2,
    LogOut,
    Users,
    Trash2,
    Building2,
    Settings,
    User as UserIcon,
    Camera,
    Edit2,
    Save,
    X,
    Activity,
    LayoutGrid,
    ChevronDown,
} from 'lucide-react';
import { Mascot } from '@/src/views/common';
import { SettingsView } from '@/src/views/profile';

// ==========================================
// 프로필 카드 컴포넌트
// ==========================================
function ProfileCard({ user, setUser }: { user: User; setUser: (u: User) => void }) {
    const [isUploading, setIsUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(user.name);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const updatedUser = await updateProfileImage(file);
            setUser(updatedUser);
        } catch (error) {
            console.error('Failed to update profile image', error);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleNameUpdate = async () => {
        if (!newName.trim() || newName === user.name) {
            setIsEditing(false);
            return;
        }
        try {
            const updatedUser = await updateMyInfo({ name: newName });
            setUser(updatedUser);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update name', error);
            alert('이름 수정에 실패했습니다.');
        }
    };

    return (
        <div className="glass-card rounded-[2rem] p-8 flex flex-col items-center text-center h-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

            <div className="relative mb-6 group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {user.profile_image ? (
                        <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon size={48} className="text-gray-400" />
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                            <Loader2 className="animate-spin text-white" size={24} />
                        </div>
                    )}
                </div>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 z-20"
                    disabled={isUploading}
                >
                    <Camera size={16} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>

            <div className="w-full space-y-3 z-10">
                {isEditing ? (
                    <div className="flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-white/50 dark:bg-black/30 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-center text-lg font-bold min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <button onClick={handleNameUpdate} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg">
                            <Save size={18} />
                        </button>
                        <button onClick={() => setIsEditing(false)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2 group">
                        {user.name}
                        <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                            <Edit2 size={16} />
                        </button>
                    </h2>
                )}

                <p className="text-gray-500 dark:text-gray-400 font-medium">{user.email}</p>

                <div className="pt-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              user.is_student_verified
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
          }`}>
            {user.is_student_verified ? '학생 인증됨' : '미인증 계정'}
          </span>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// 활동 목록 컴포넌트
// ==========================================
function ActivityList({ activities }: { activities: ActivityLog[] }) {
    const getActionColor = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'CREATE': return 'bg-blue-500';
            case 'UPDATE': return 'bg-green-500';
            case 'DELETE': return 'bg-red-500';
            case 'UPLOAD': return 'bg-pink-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col min-h-[400px]">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                    <Activity className="text-purple-500" size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">최근 활동</h3>
            </div>

            {activities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                    <Clock size={48} className="mb-4 opacity-20" />
                    <p>아직 활동 기록이 없습니다.</p>
                </div>
            ) : (
                <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4 -mr-2">
                    {activities.map((log) => (
                        <div key={log.id} className="group flex gap-4 p-4 rounded-2xl bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                            <div className="flex-shrink-0 mt-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${getActionColor(log.action_type)}`}>
                                    {log.action_type.substring(0, 1)}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words leading-relaxed">{log.content}</p>
                                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold tracking-wide">
                    {log.action_type}
                  </span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ==========================================
// 프로젝트 생성 모달 (워크스페이스 선택 없음!)
// ==========================================
interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (project: Project) => void;
    workspaceId: number;
    workspaceName: string;
}

function CreateProjectModal({ isOpen, onClose, onSuccess, workspaceId, workspaceName }: CreateProjectModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('프로젝트 이름을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const newProject = await createProject(workspaceId, name.trim(), description.trim() || undefined);
            onSuccess(newProject);
            setName('');
            setDescription('');
            onClose();
        } catch (err) {
            console.error('Failed to create project:', err);
            setError(err instanceof Error ? err.message : '프로젝트 생성에 실패했습니다.');
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
                    <div className="p-3 bg-green-500/10 rounded-2xl">
                        <Folder className="text-green-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">새 프로젝트</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{workspaceName}에 새 프로젝트 추가</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            프로젝트 이름 *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: API 서버 개발"
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
                            placeholder="프로젝트에 대한 간단한 설명"
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
                                <span>프로젝트 생성</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==========================================
// 프로젝트 컨텍스트 메뉴
// ==========================================
interface ProjectContextMenuProps {
    project: Project;
    position: { x: number; y: number };
    onClose: () => void;
    onDelete: (projectId: number) => void;
}

function ProjectContextMenu({ project, position, onClose, onDelete }: ProjectContextMenuProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`정말로 "${project.name}" 프로젝트를 삭제하시겠습니까?\n이 작업은 취소할 수 없습니다.`)) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteProject(project.id);
            onDelete(project.id);
            onClose();
        } catch (err) {
            console.error('Failed to delete project:', err);
            alert('프로젝트 삭제에 실패했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[160px]"
                style={{ left: position.x, top: position.y }}
            >
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm disabled:opacity-50"
                >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    <span>프로젝트 삭제</span>
                </button>
            </div>
        </>
    );
}

// ==========================================
// 메인 컴포넌트: WorkspaceHomeScreen
// ==========================================
type ViewState = 'projects' | 'mypage' | 'settings';

interface ProjectSelectScreenProps {
    workspace: Workspace;
    user: AuthUser;
    onSelectProject: (project: Project) => void;
    onBack: () => void;
    onLogout: () => void;
}

export function ProjectSelectScreen({ workspace, user, onSelectProject, onBack, onLogout }: ProjectSelectScreenProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ project: Project; position: { x: number; y: number } } | null>(null);

    // 뷰 상태
    const [currentView, setCurrentView] = useState<ViewState>('projects');
    const [fullUser, setFullUser] = useState<User | null>(null);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [mypageLoading, setMypageLoading] = useState(false);

    // 프로필 메뉴
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'profile' | 'preferences'>('profile');

    // 프로필 메뉴 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        if (isProfileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileMenuOpen]);

    // 프로젝트 목록 로딩
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await getProjects(workspace.id);
                setProjects(data);
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [workspace.id]);

    // 마이페이지 데이터 로딩
    useEffect(() => {
        if (currentView === 'mypage' && !fullUser) {
            const fetchMyPageData = async () => {
                setMypageLoading(true);
                try {
                    const [userData, activityData] = await Promise.all([
                        getMyInfo(),
                        getMyActivities()
                    ]);
                    setFullUser(userData);
                    setActivities(activityData);
                } catch (error) {
                    console.error('Failed to load mypage data:', error);
                } finally {
                    setMypageLoading(false);
                }
            };
            fetchMyPageData();
        }
    }, [currentView, fullUser]);

    const handleLogout = async () => {
        try {
            await logout();
            onLogout();
        } catch (error) {
            console.error('Logout failed:', error);
            onLogout();
        }
    };

    const handleProjectCreated = (newProject: Project) => {
        setProjects([...projects, newProject]);
    };

    const handleProjectDeleted = (projectId: number) => {
        setProjects(projects.filter(p => p.id !== projectId));
    };

    const handleContextMenu = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            project,
            position: { x: e.clientX, y: e.clientY }
        });
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F111A] text-gray-900 dark:text-white flex overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-400/10 dark:bg-blue-900/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-[100px]" />
            </div>

            {/* Sidebar */}
            <aside className="w-72 glass-panel z-20 flex flex-col border-r-0 m-4 rounded-[2rem]">
                <div className="p-8 flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-lg opacity-30 rounded-full" />
                        <Mascot size={36} className="relative z-10" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            DOMO
          </span>
                </div>

                {/* 뒤로가기 버튼 */}
                <div className="px-6 mb-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors w-full px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">워크스페이스 목록</span>
                    </button>
                </div>

                {/* 현재 워크스페이스 */}
                <div className="px-6 mb-6">
                    <div className="p-4 bg-blue-500/10 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <Building2 size={20} className="text-blue-500" />
                            <div className="min-w-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400">현재 워크스페이스</p>
                                <p className="font-semibold text-gray-900 dark:text-white truncate">{workspace.name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 네비게이션 */}
                <nav className="flex-1 px-6 space-y-2">
                    <button
                        onClick={() => setCurrentView('projects')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                            currentView === 'projects'
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <LayoutGrid size={20} />
                        <span>프로젝트</span>
                    </button>

                    <button
                        onClick={() => setCurrentView('mypage')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                            currentView === 'mypage'
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <UserIcon size={20} />
                        <span>마이페이지</span>
                    </button>

                    <button
                        onClick={() => setCurrentView('settings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                            currentView === 'settings'
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Settings size={20} />
                        <span>설정</span>
                    </button>
                </nav>

                {/* 로그아웃 */}
                <div className="p-6 border-t border-gray-200/50 dark:border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">로그아웃</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto relative z-10">
                {/* 프로젝트 목록 뷰 */}
                {currentView === 'projects' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 헤더 */}
                        <header className="flex items-center justify-between mb-10">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">프로젝트</h1>
                                <p className="text-gray-500 dark:text-gray-400">{workspace.name}의 프로젝트 목록</p>
                            </div>

                            <div className="flex items-center gap-4" ref={profileMenuRef}>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                        className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:shadow-md transition-all"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                            {user.name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name}</span>
                                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isProfileMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                                            <button
                                                onClick={() => { setCurrentView('mypage'); setIsProfileMenuOpen(false); }}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <UserIcon size={16} />
                                                <span>마이페이지</span>
                                            </button>
                                            <button
                                                onClick={() => { setCurrentView('settings'); setIsProfileMenuOpen(false); }}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <Settings size={16} />
                                                <span>설정</span>
                                            </button>
                                            <hr className="my-2 border-gray-200 dark:border-gray-700" />
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <LogOut size={16} />
                                                <span>로그아웃</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>

                        {/* 검색 */}
                        <div className="max-w-7xl mx-auto">
                            <div className="relative mb-10">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="프로젝트 검색..."
                                    className="w-full max-w-md pl-12 pr-4 py-3.5 rounded-2xl text-sm shadow-sm bg-white dark:bg-[#1E212B] border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* 프로젝트 그리드 */}
                            {loading ? (
                                <div className="flex items-center justify-center h-96">
                                    <Loader2 className="animate-spin text-blue-500" size={40} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredProjects.map((project) => (
                                        <div
                                            key={project.id}
                                            onClick={() => onSelectProject(project)}
                                            onContextMenu={(e) => handleContextMenu(e, project)}
                                            className="glass-card rounded-[2rem] p-6 cursor-pointer group relative overflow-hidden min-h-[220px] flex flex-col hover:-translate-y-1 transition-transform duration-300"
                                        >
                                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500 rounded-full" />

                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                <div className={`p-3 rounded-2xl bg-gradient-to-br ${
                                                    project.color === '#FEF3C7' ? 'from-orange-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 text-amber-600 dark:text-amber-400'
                                                        : project.color === '#DBEAFE' ? 'from-blue-100 to-cyan-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-600 dark:text-blue-400'
                                                            : 'from-pink-100 to-rose-200 dark:from-pink-900/30 dark:to-pink-800/30 text-pink-600 dark:text-pink-400'
                                                } shadow-inner`}>
                                                    <Folder size={24} />
                                                </div>
                                                <button
                                                    onClick={(e) => handleContextMenu(e, project)}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                                                >
                                                    <MoreHorizontal size={20} />
                                                </button>
                                            </div>

                                            <h3 className="font-bold text-xl mb-1 group-hover:text-blue-500 transition-colors">{project.name}</h3>
                                            {project.description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{project.description}</p>
                                            )}

                                            <div className="mt-auto pt-4 border-t border-gray-200/50 dark:border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                                                    <Clock size={14} />
                                                    <span>{project.lastActivity}</span>
                                                </div>

                                                <div className="flex -space-x-2">
                                                    {[...Array(Math.min(project.memberCount, 3))].map((_, i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-[#2c2c2e] flex items-center justify-center text-[10px] font-bold shadow-sm">
                                                            U{i+1}
                                                        </div>
                                                    ))}
                                                    {project.memberCount > 3 && (
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-[#2c2c2e] flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm">
                                                            +{project.memberCount - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* 새 프로젝트 생성 버튼 */}
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all h-full min-h-[220px] group"
                                    >
                                        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:scale-110 transition-transform">
                                            <Plus size={28} />
                                        </div>
                                        <span className="font-semibold">새 프로젝트 만들기</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 마이페이지 뷰 */}
                {currentView === 'mypage' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto h-full flex flex-col">
                        <header className="mb-10">
                            <h1 className="text-4xl font-semibold mb-2 tracking-tight text-gray-900 dark:text-white">마이페이지</h1>
                            <p className="text-gray-500 dark:text-gray-400">내 프로필 정보를 관리하고 활동 기록을 확인하세요.</p>
                        </header>

                        {mypageLoading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="animate-spin text-blue-500" size={40} />
                            </div>
                        ) : fullUser ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
                                <div className="lg:col-span-1">
                                    <ProfileCard user={fullUser} setUser={setFullUser} />
                                </div>
                                <div className="lg:col-span-2 h-full min-h-[500px]">
                                    <ActivityList activities={activities} />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">사용자 정보를 불러올 수 없습니다.</div>
                        )}
                    </div>
                )}

                {/* 설정 뷰 */}
                {currentView === 'settings' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                        <button
                            onClick={() => setCurrentView('projects')}
                            className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                        >
                            <ChevronDown className="rotate-90" size={20} />
                            <span className="font-medium">프로젝트 목록으로 돌아가기</span>
                        </button>
                        <SettingsView
                            key={settingsTab}
                            initialTab={settingsTab}
                            onLogout={onLogout}
                            user={fullUser ? { name: fullUser.name, email: fullUser.email, profile_image: fullUser.profile_image } : { name: user.name, email: user.email }}
                        />
                    </div>
                )}
            </main>

            {/* 모달 */}
            <CreateProjectModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleProjectCreated}
                workspaceId={workspace.id}
                workspaceName={workspace.name}
            />

            {/* 컨텍스트 메뉴 */}
            {contextMenu && (
                <ProjectContextMenu
                    project={contextMenu.project}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onDelete={handleProjectDeleted}
                />
            )}
        </div>
    );
}
export default ProjectSelectScreen;
