'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  getMyProjects,
  logout,
  getMyInfo,
  getMyActivities,
  updateProfileImage,
  updateMyInfo
} from '../../../lib/api';
import type { Project, AuthUser, User } from '../../../types';
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
  Activity
} from 'lucide-react';
import { Mascot } from './Mascot';

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
// 3. 메인 컴포넌트: ProjectSelect
// ==========================================

interface ProjectSelectProps {
  user: AuthUser;
  onSelectProject: (project: Project) => void;
  onLogout: () => void;
}

type ViewState = 'projects' | 'mypage';

export const ProjectSelect: React.FC<ProjectSelectProps> = ({ user: initialAuthUser, onSelectProject, onLogout }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 상태 관리: 뷰 모드 및 마이페이지 데이터
  const [currentView, setCurrentView] = useState<ViewState>('projects');
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [mypageLoading, setMypageLoading] = useState(false);

  // 초기 프로젝트 로딩
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getMyProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
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
    await logout();
    onLogout();
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
                  <button className="btn-primary flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform">
                    <Plus size={18} />
                    <span>새 프로젝트</span>
                  </button>
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
                                className="glass-card rounded-[2rem] p-6 cursor-pointer group relative overflow-hidden min-h-[220px] flex flex-col hover:-translate-y-1 transition-transform duration-300"
                            >
                              <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500 rounded-full"></div>

                              <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className={`p-3 rounded-2xl bg-gradient-to-br ${project.color === '#FEF3C7' ? 'from-orange-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 text-amber-600 dark:text-amber-400' : project.color === '#DBEAFE' ? 'from-blue-100 to-cyan-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-600 dark:text-blue-400' : 'from-pink-100 to-rose-200 dark:from-pink-900/30 dark:to-pink-800/30 text-pink-600 dark:text-pink-400'} shadow-inner`}>
                                  <Folder size={24} />
                                </div>
                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
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
                        <button className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all h-full min-h-[220px] group">
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

        </main>
      </div>
  );
};