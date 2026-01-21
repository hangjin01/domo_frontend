'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  getMyProjects,
  logout,
  getMyInfo,
  getMyActivities,
  updateProfileImage,
  updateMyInfo,
  getWorkspaces,
  createWorkspace,
  createProject,
  deleteProject,
  deleteWorkspace,
} from '../../../lib/api';
import type { Project, AuthUser, User, Workspace } from '../../../types';
import type { ActivityLog } from '../../../lib/api/activity';
import {
  LogOut,
  Plus,
  Search,
  Folder,
  Clock,
  MoreHorizontal,
  Loader2,
  LayoutGrid,
  User as UserIcon,
  Camera,
  Edit2,
  Save,
  X,
  Activity,
  Building2,
  Trash2,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { Mascot } from './Mascot';
import { SettingsView } from '../board/Views';

// ==========================================
// 1. 하위 컴포넌트: ProfileCard
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
// 2. 하위 컴포넌트: ActivityList
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
// 3. 워크스페이스 생성 모달
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
// 4. 프로젝트 생성 모달
// ==========================================
interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
  workspaces: Workspace[];
}

function CreateProjectModal({ isOpen, onClose, onSuccess, workspaces }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

  // 워크스페이스가 있으면 첫 번째를 기본 선택
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('프로젝트 이름을 입력해주세요.');
      return;
    }

    if (!selectedWorkspaceId) {
      setError('워크스페이스를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newProject = await createProject(selectedWorkspaceId, name.trim(), description.trim() || undefined);
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
              <p className="text-sm text-gray-500 dark:text-gray-400">워크스페이스에 새 프로젝트를 추가합니다</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 워크스페이스 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                워크스페이스 *
              </label>
              {workspaces.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                    먼저 워크스페이스를 생성해주세요.
                  </div>
              ) : (
                  <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2c333a] text-left flex items-center justify-between hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                  <span className={selectedWorkspace ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                    {selectedWorkspace?.name || '워크스페이스 선택'}
                  </span>
                      <ChevronDown size={18} className={`text-gray-400 transition-transform ${showWorkspaceDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showWorkspaceDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#2c333a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-10">
                          {workspaces.map((ws) => (
                              <button
                                  key={ws.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedWorkspaceId(ws.id);
                                    setShowWorkspaceDropdown(false);
                                  }}
                                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                                      ws.id === selectedWorkspaceId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                  }`}
                              >
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">{ws.name}</div>
                                  {ws.description && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{ws.description}</div>
                                  )}
                                </div>
                                {ws.id === selectedWorkspaceId && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </button>
                          ))}
                        </div>
                    )}
                  </div>
              )}
            </div>

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
                  disabled={isLoading || workspaces.length === 0}
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
// 5. 프로젝트 컨텍스트 메뉴
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
            className="fixed z-50 bg-white dark:bg-[#2c333a] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.y, left: position.x }}
        >
          <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? (
                <Loader2 className="animate-spin" size={16} />
            ) : (
                <Trash2 size={16} />
            )}
            <span>프로젝트 삭제</span>
          </button>
        </div>
      </>
  );
}

// ==========================================
// 6. 메인 컴포넌트: ProjectSelect
// ==========================================

interface ProjectSelectProps {
  user: AuthUser;
  onSelectProject: (project: Project) => void;
  onLogout: () => void;
}

type ViewState = 'projects' | 'mypage' | 'settings';

export const ProjectSelect: React.FC<ProjectSelectProps> = ({ user: initialAuthUser, onSelectProject, onLogout }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 상태 관리: 뷰 모드 및 마이페이지 데이터
  const [currentView, setCurrentView] = useState<ViewState>('projects');
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [mypageLoading, setMypageLoading] = useState(false);

  // 모달 상태
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{
    project: Project;
    position: { x: number; y: number };
  } | null>(null);

  // 프로필 드롭다운 메뉴 상태 (행진 기능 추가)
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

  // 초기 데이터 로딩
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [projectsData, workspacesData] = await Promise.all([
          getMyProjects(),
          getWorkspaces(),
        ]);
        setProjects(projectsData);
        setWorkspaces(workspacesData);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 마이페이지 탭 전환 시 데이터 로딩
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
      // 로그아웃 실패해도 클라이언트에서는 로그아웃 처리
      onLogout();
    }
  };

  const handleWorkspaceCreated = (newWorkspace: Workspace) => {
    setWorkspaces([...workspaces, newWorkspace]);
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
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.workspace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0F111A] text-gray-900 dark:text-white flex overflow-hidden font-sans">
        {/* Background Ambience */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-400/10 dark:bg-blue-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Sidebar - Glass Panel */}
        <aside className="w-72 glass-panel z-20 flex flex-col border-r-0 m-4 rounded-[2rem]">
          <div className="p-8 flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-lg opacity-30 rounded-full"></div>
              <Mascot size={36} className="relative z-10" />
            </div>
            <span className="font-semibold text-xl tracking-tight">DOMO</span>
          </div>

          <div className="flex-1 px-4 py-2 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-4">Menu</h3>
              <div className="space-y-2">
                <button
                    onClick={() => setCurrentView('projects')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                        currentView === 'projects'
                            ? 'bg-white/50 dark:bg-white/10 text-blue-600 dark:text-white border border-white/20 shadow-sm backdrop-blur-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                >
                  <LayoutGrid size={18} className={currentView === 'projects' ? "text-blue-500" : ""} />
                  <span>모든 프로젝트</span>
                </button>

                <button
                    onClick={() => setCurrentView('mypage')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                        currentView === 'mypage'
                            ? 'bg-white/50 dark:bg-white/10 text-blue-600 dark:text-white border border-white/20 shadow-sm backdrop-blur-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                >
                  <UserIcon size={18} className={currentView === 'mypage' ? "text-blue-500" : ""} />
                  <span>마이페이지</span>
                </button>
              </div>
            </div>

            {/* 빠른 생성 버튼들 */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-4">빠른 생성</h3>
              <div className="space-y-2">
                <button
                    onClick={() => setShowCreateWorkspaceModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <Building2 size={18} />
                  <span>새 워크스페이스</span>
                </button>
                <button
                    onClick={() => setShowCreateProjectModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <Folder size={18} />
                  <span>새 프로젝트</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 mt-auto">
            <div className="glass-card rounded-3xl p-4 mb-2">
              <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => setCurrentView('mypage')}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  {fullUser?.profile_image ? (
                      <img src={fullUser.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                      initialAuthUser.name.slice(0, 2)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{fullUser?.name || initialAuthUser.name}</p>
                  <p className="text-xs text-gray-500 truncate">{initialAuthUser.email}</p>
                </div>
              </div>
              <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <LogOut size={14} />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto relative z-10">

          {/* === VIEW: PROJECTS === */}
          {currentView === 'projects' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="flex justify-between items-end mb-10 max-w-7xl mx-auto">
                  <div>
                    <h1 className="text-4xl font-semibold mb-2 tracking-tight text-gray-900 dark:text-white">내 프로젝트</h1>
                    <p className="text-gray-500 dark:text-gray-400">최근 활동한 프로젝트 목록입니다.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowCreateProjectModal(true)}
                        className="btn-primary flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
                    >
                      <Plus size={18} />
                      <span>새 프로젝트</span>
                    </button>

                    {/* 프로필 드롭다운 메뉴 (행진 기능 추가) */}
                    <div className="hidden md:flex items-center gap-3 pl-1 pr-2 py-1 bg-white/40 dark:bg-white/5 rounded-full border border-white/20 backdrop-blur-sm relative" ref={profileMenuRef}>
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-white/30 dark:hover:bg-white/10 p-1 rounded-full transition-colors"
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden">
                          {fullUser?.profile_image ? (
                            <img src={fullUser.profile_image} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            initialAuthUser.name.slice(0, 2)
                          )}
                        </div>
                        <div className="flex flex-col mr-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{fullUser?.name || initialAuthUser.name}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{initialAuthUser.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 transition-colors"
                      >
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Profile Dropdown Menu */}
                      {isProfileMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#16181D] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                          <div className="p-2 space-y-0.5">
                            <button
                              onClick={() => {
                                setSettingsTab('profile');
                                setCurrentView('settings');
                                setIsProfileMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                              <UserIcon size={16} />
                              <span>프로필</span>
                            </button>
                            <button
                              onClick={() => {
                                setSettingsTab('preferences');
                                setCurrentView('settings');
                                setIsProfileMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                              <Settings size={16} />
                              <span>환경설정</span>
                            </button>
                          </div>
                          <div className="h-px bg-gray-100 dark:bg-gray-800 my-0.5"></div>
                          <div className="p-2">
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
                            >
                              <LogOut size={16} />
                              <span>로그아웃</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </header>

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
                              <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500 rounded-full"></div>

                              <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className={`p-3 rounded-2xl bg-gradient-to-br ${project.color === '#FEF3C7' ? 'from-orange-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 text-amber-600 dark:text-amber-400' : project.color === '#DBEAFE' ? 'from-blue-100 to-cyan-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-600 dark:text-blue-400' : 'from-pink-100 to-rose-200 dark:from-pink-900/30 dark:to-pink-800/30 text-pink-600 dark:text-pink-400'} shadow-inner`}>
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
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">{project.workspace}</p>

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
                            onClick={() => setShowCreateProjectModal(true)}
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

          {/* === VIEW: MY PAGE === */}
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

          {/* === VIEW: SETTINGS (행진 기능 추가) === */}
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
                  user={fullUser ? { name: fullUser.name, email: fullUser.email, profile_image: fullUser.profile_image } : { name: initialAuthUser.name, email: initialAuthUser.email }}
                />
              </div>
          )}

        </main>

        {/* 모달들 */}
        <CreateWorkspaceModal
            isOpen={showCreateWorkspaceModal}
            onClose={() => setShowCreateWorkspaceModal(false)}
            onSuccess={handleWorkspaceCreated}
        />

        <CreateProjectModal
            isOpen={showCreateProjectModal}
            onClose={() => setShowCreateProjectModal(false)}
            onSuccess={handleProjectCreated}
            workspaces={workspaces}
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
};