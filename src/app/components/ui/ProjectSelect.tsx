
'use client';

import React, { useEffect, useState } from 'react';
import { getMyProjects, logout } from '../../../lib/api';
import type { Project, AuthUser } from '../../../types';
import { 
  LogOut, 
  Plus, 
  Search, 
  Folder, 
  Clock, 
  MoreHorizontal, 
  Loader2,
  Grid,
  LayoutGrid
} from 'lucide-react';
import { Mascot } from './Mascot.tsx';

interface ProjectSelectProps {
  user: AuthUser;
  onSelectProject: (project: Project) => void;
  onLogout: () => void;
}

export const ProjectSelect: React.FC<ProjectSelectProps> = ({ user, onSelectProject, onLogout }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.workspace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex overflow-hidden">
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
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/50 dark:bg-white/10 rounded-2xl text-sm font-medium text-gray-900 dark:text-white border border-white/20 shadow-sm backdrop-blur-sm transition-all hover:bg-white/70 dark:hover:bg-white/20">
                <LayoutGrid size={18} className="text-blue-500" />
                <span>모든 프로젝트</span>
            </button>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-4">Workspaces</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl text-sm text-gray-600 dark:text-gray-300 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                <span>캡스톤디자인</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl text-sm text-gray-600 dark:text-gray-300 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
                <span>소프트웨어공학</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 mt-auto">
          <div className="glass-card rounded-3xl p-4 mb-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                {user.name.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
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

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto relative z-10">
        <header className="flex justify-between items-end mb-10 max-w-7xl mx-auto">
          <div>
            <h1 className="text-4xl font-semibold mb-2 tracking-tight text-gray-900 dark:text-white">내 프로젝트</h1>
            <p className="text-gray-500 dark:text-gray-400">최근 활동한 프로젝트 목록입니다.</p>
          </div>
          <button className="btn-primary flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/20">
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
                className="w-full max-w-md pl-12 pr-4 py-3.5 rounded-2xl text-sm shadow-sm"
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
                    className="glass-card rounded-[2rem] p-6 cursor-pointer group relative overflow-hidden min-h-[220px] flex flex-col"
                >
                    {/* Glow effect on hover */}
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
                
                {/* New Project Placeholder */}
                <button className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all h-full min-h-[220px] group">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:scale-110 transition-transform">
                    <Plus size={28} />
                </div>
                <span className="font-semibold">새 프로젝트 만들기</span>
                </button>
            </div>
            )}
        </div>
      </main>
    </div>
  );
};
