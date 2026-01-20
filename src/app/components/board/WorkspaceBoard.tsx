'use client';

import React, { useState } from 'react';
import { Project, Task, Connection, Board, Group, ViewMode } from '@/src/types'; // 타입 경로는 프로젝트 설정에 따름 (에러나면 ../../types 로 수정)
import { BoardCanvas } from './BoardCanvas';
import { CalendarView, TimelineView, SettingsView } from './Views';
import { TaskDetailModal } from '../ui/TaskDetailModal';
import { Mascot } from '../ui/Mascot';

// [수정] 상대 경로로 API 데이터와 유틸리티 불러오기
import { MOCK_NODES, MOCK_CONNECTIONS } from '@/src/lib/api';

import {
    Trello, Calendar as CalendarIcon, StretchHorizontal, Settings,
    ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';

interface WorkspaceBoardProps {
    project: Project;
    onBack: () => void;
}

export const WorkspaceBoard: React.FC<WorkspaceBoardProps> = ({ project, onBack }) => {
    // [수정] 하드코딩 제거하고 MOCK_NODES 연동 (타입 호환을 위해 변환)
    const [tasks, setTasks] = useState<Task[]>(MOCK_NODES as unknown as Task[]);

    // [수정] MOCK_CONNECTIONS 연동
    const [connections, setConnections] = useState<Connection[]>(MOCK_CONNECTIONS);

    const [boards, setBoards] = useState<Board[]>([{ id: 1, title: '메인 보드' }]);
    const [activeBoardId, setActiveBoardId] = useState<number>(1);
    const [groups, setGroups] = useState<Group[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleBoardTasksUpdate = (boardTasks: Task[]) => {
        setTasks(prev => {
            const other = prev.filter(t => String(t.boardId) !== String(activeBoardId));
            return [...other, ...boardTasks];
        });
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
            {/* Background Ambiance */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-400/5 dark:bg-blue-900/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-400/5 dark:bg-purple-900/10 rounded-full blur-[120px]"></div>
            </div>

            {/* Floating Sidebar */}
            <div className={`relative z-20 py-4 pl-4 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${sidebarOpen ? 'w-72' : 'w-20'}`}>
                <div className="glass-panel h-full rounded-[2rem] flex flex-col border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden">
                    <div className="p-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-3 font-bold text-xl text-gray-900 dark:text-white ${!sidebarOpen && 'hidden'} transition-opacity duration-200`}>
                                <Mascot size={32} />
                                <span className="tracking-tight">DOMO</span>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className={`p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-gray-500 transition-colors ${!sidebarOpen && 'mx-auto'}`}
                            >
                                {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                            </button>
                        </div>

                        {sidebarOpen && (
                            <button
                                onClick={onBack}
                                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors px-1 group"
                            >
                                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                <span>Back to Projects</span>
                            </button>
                        )}
                    </div>

                    {sidebarOpen && (
                        <div className="px-6 pb-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Current Project</div>
                            <div className="p-4 bg-white/50 dark:bg-white/5 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm">
                                <div className="font-bold text-lg truncate mb-1" title={project.name}>{project.name}</div>
                                <div className="text-xs text-gray-500 font-medium">{project.workspace}</div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 space-y-1">
                        <button onClick={() => setViewMode('board')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${viewMode === 'board' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                            <Trello size={20} strokeWidth={viewMode === 'board' ? 2.5 : 2} />
                            {sidebarOpen && <span className="font-medium">Board</span>}
                        </button>
                        <button onClick={() => setViewMode('calendar')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${viewMode === 'calendar' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                            <CalendarIcon size={20} strokeWidth={viewMode === 'calendar' ? 2.5 : 2} />
                            {sidebarOpen && <span className="font-medium">Calendar</span>}
                        </button>
                        <button onClick={() => setViewMode('timeline')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${viewMode === 'timeline' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                            <StretchHorizontal size={20} strokeWidth={viewMode === 'timeline' ? 2.5 : 2} />
                            {sidebarOpen && <span className="font-medium">Timeline</span>}
                        </button>
                    </div>

                    <div className="p-4 mt-auto">
                        <button onClick={() => setViewMode('settings')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${viewMode === 'settings' ? 'bg-gray-200 dark:bg-white/10 font-bold text-gray-900 dark:text-white' : ''}`}>
                            <Settings size={20} />
                            {sidebarOpen && <span>Settings</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden z-10 p-4">
                <div className="bg-white/40 dark:bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/20 dark:border-white/5 shadow-inner h-full overflow-hidden relative">
                    {viewMode === 'board' && (
                        <BoardCanvas
                            tasks={tasks.filter(t => String(t.boardId) === String(activeBoardId))}
                            connections={connections.filter(c => String(c.boardId) === String(activeBoardId))}
                            onTasksUpdate={handleBoardTasksUpdate}
                            onTaskSelect={setSelectedTask}
                            onConnectionCreate={(from, to) => setConnections([...connections, { id: Date.now(), from, to, boardId: String(activeBoardId), style: 'solid', shape: 'bezier' }])}
                            onConnectionDelete={(id) => setConnections(connections.filter(c => String(c.id) !== String(id)))}
                            onConnectionUpdate={(id, updates) => setConnections(connections.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c))}
                            boards={boards}

                            // 자식에게 넘길 때는 String으로 변환 (자식 props 타입에 맞춤)
                            activeBoardId={String(activeBoardId)}

                            // 자식에서 받은 ID(문자)를 숫자(상태)로 변환
                            onSwitchBoard={(id) => setActiveBoardId(Number(id))}

                            // 새 보드 ID는 숫자(Date.now())로 생성해야 Board 타입과 일치함
                            onAddBoard={(name) => {
                                const newId = Date.now(); // .toString() 제거 (숫자로 유지)
                                setBoards([...boards, { id: newId, title: name }]);
                                setActiveBoardId(newId);
                            }}

                            // ID 비교 시 숫자로 변환
                            onRenameBoard={(id, name) => setBoards(boards.map(b => b.id === Number(id) ? { ...b, title: name } : b))}

                            snapToGrid={snapToGrid}
                            groups={groups.filter(g => String(g.boardId) === String(activeBoardId))}
                            onGroupsUpdate={(updatedGroups) => {
                                setGroups(prev => {
                                    const otherGroups = prev.filter(g => String(g.boardId) !== String(activeBoardId));
                                    return [...otherGroups, ...updatedGroups];
                                });
                            }}
                            onToggleGrid={() => setSnapToGrid(!snapToGrid)}
                            onToggleTheme={() => document.documentElement.classList.toggle('dark')}
                        />
                    )}
                    {viewMode === 'calendar' && <CalendarView tasks={tasks} onTaskSelect={setSelectedTask} />}
                    {viewMode === 'timeline' && <TimelineView tasks={tasks} onTaskSelect={setSelectedTask} />}
                    {viewMode === 'settings' && <SettingsView />}
                </div>
            </div>

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={(updated) => {
                        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
                        setSelectedTask(updated);
                    }}
                    currentUser="User"
                />
            )}
        </div>
    );
}

export default WorkspaceBoard;