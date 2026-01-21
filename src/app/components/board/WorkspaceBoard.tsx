// src/app/components/board/WorkspaceBoard.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task, Connection, Board, Group, ViewMode, Column } from '@/src/types';
import { BoardCanvas } from './BoardCanvas';
import { CalendarView, TimelineView, SettingsView } from './Views';
import { TaskDetailModal } from '../ui/TaskDetailModal';
import { Mascot } from '../ui/Mascot';
import { Dock } from '../dock/Dock';
import { MOCK_MEMBERS } from '@/src/lib/api/mock-data';

import {
    getTasks,
    getConnections,
    getColumns,
    createTask,
    updateTask,
    deleteTask,
    createConnection,
    deleteConnection,
} from '@/src/lib/api';

import {
    Trello, Calendar as CalendarIcon, StretchHorizontal, Settings,
    ChevronLeft, ChevronRight, ArrowLeft, Loader2, AlertCircle
} from 'lucide-react';

interface WorkspaceBoardProps {
    project: Project;
    onBack: () => void;
}

export const WorkspaceBoard: React.FC<WorkspaceBoardProps> = ({ project, onBack }) => {
    // 데이터 상태
    const [tasks, setTasks] = useState<Task[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [columns, setColumns] = useState<Column[]>([]); // ✅ 컬럼 상태 추가
    const [boards, setBoards] = useState<Board[]>([{ id: 1, title: '메인 보드' }]);
    const [activeBoardId, setActiveBoardId] = useState<number>(1);
    const [groups, setGroups] = useState<Group[]>([]);

    // UI 상태
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Dock 관련 상태
    const [activeDockMenu, setActiveDockMenu] = useState('dashboard');
    const [showMembers, setShowMembers] = useState(false);

    // 로딩 & 에러 상태
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // =========================================
    // 데이터 로딩
    // =========================================

    const loadProjectData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // ✅ 컬럼도 함께 로딩
            const [tasksData, connectionsData, columnsData] = await Promise.all([
                getTasks(project.id),
                getConnections(project.id),
                getColumns(project.id),
            ]);

            console.log('✅ Loaded tasks:', tasksData.length);
            console.log('✅ Loaded connections:', connectionsData.length);
            console.log('✅ Loaded columns:', columnsData.length);

            setTasks(tasksData);
            setConnections(connectionsData);
            setColumns(columnsData);
        } catch (err) {
            console.error('❌ Failed to load project data:', err);
            setError('프로젝트 데이터를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [project.id]);

    useEffect(() => {
        loadProjectData();
    }, [loadProjectData]);

    // =========================================
    // 태스크 핸들러
    // =========================================

    // 보드 내 태스크 업데이트 (로컬 상태만)
    const handleBoardTasksUpdate = useCallback((boardTasks: Task[]) => {
        setTasks(prev => {
            const other = prev.filter(t => t.boardId !== activeBoardId);
            return [...other, ...boardTasks];
        });
    }, [activeBoardId]);

    // 태스크 생성
    const handleTaskCreate = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
        // ✅ 실제 컬럼 ID 사용 (첫 번째 컬럼 또는 전달된 column_id)
        let columnId = taskData.column_id;

        if (!columnId) {
            // 컬럼이 없으면 에러
            if (columns.length === 0) {
                throw new Error('프로젝트에 컬럼이 없습니다. 먼저 컬럼을 생성해주세요.');
            }
            // 첫 번째 컬럼 사용
            columnId = columns[0].id;
        }

        const newTaskData: Omit<Task, 'id'> = {
            title: taskData.title || '새로운 카드',
            status: taskData.status || 'todo',
            x: taskData.x ?? 100,
            y: taskData.y ?? 100,
            boardId: project.id, // 프로젝트 ID를 boardId로 사용
            description: taskData.description,
            content: taskData.content,
            column_id: columnId,
            taskType: taskData.taskType,
            card_type: taskData.card_type,
            time: taskData.time,
            start_date: taskData.start_date,
            due_date: taskData.due_date,
            color: taskData.color,
            tags: taskData.tags || [],
            comments: taskData.comments || [],
            files: taskData.files || [],
            assignees: taskData.assignees || [],
        };

        try {
            const newTask = await createTask(columnId, newTaskData);
            setTasks(prev => [...prev, newTask]);
            return newTask;
        } catch (err) {
            console.error('❌ Failed to create task:', err);
            throw err;
        }
    }, [project.id, columns]); // ✅ columns 의존성 추가

    // 태스크 업데이트
    const handleTaskUpdate = useCallback(async (taskId: number, updates: Partial<Task>): Promise<void> => {
        const previousTasks = [...tasks];

        // 낙관적 UI 업데이트
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

        try {
            setIsSaving(true);
            await updateTask(taskId, updates);
        } catch (err) {
            console.error('❌ Failed to update task:', err);
            // 롤백
            setTasks(previousTasks);
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [tasks]);

    // 태스크 삭제
    const handleTaskDelete = useCallback(async (taskId: number): Promise<void> => {
        const previousTasks = [...tasks];

        // 낙관적 UI 업데이트
        setTasks(prev => prev.filter(t => t.id !== taskId));

        try {
            await deleteTask(taskId);
        } catch (err) {
            console.error('❌ Failed to delete task:', err);
            // 롤백
            setTasks(previousTasks);
            throw err;
        }
    }, [tasks]);

    // =========================================
    // 연결선 핸들러
    // =========================================

    const handleConnectionCreate = useCallback(async (from: number, to: number): Promise<Connection> => {
        const newConnection: Omit<Connection, 'id'> = {
            from,
            to,
            boardId: project.id,
            style: 'solid',
            shape: 'bezier',
        };

        try {
            const created = await createConnection(project.id, newConnection);
            setConnections(prev => [...prev, created]);
            return created;
        } catch (err) {
            console.error('❌ Failed to create connection:', err);
            throw err;
        }
    }, [project.id]);

    const handleConnectionDelete = useCallback(async (connectionId: number): Promise<void> => {
        const previousConnections = [...connections];

        setConnections(prev => prev.filter(c => c.id !== connectionId));

        try {
            await deleteConnection(project.id, connectionId);
        } catch (err) {
            console.error('❌ Failed to delete connection:', err);
            setConnections(previousConnections);
            throw err;
        }
    }, [project.id, connections]);

    const handleConnectionUpdate = useCallback((connectionId: number, updates: Partial<Connection>) => {
        setConnections(prev => prev.map(c =>
            c.id === connectionId ? { ...c, ...updates } : c
        ));
    }, []);

    // =========================================
    // 보드 핸들러
    // =========================================

    const handleSwitchBoard = useCallback((boardId: number) => {
        setActiveBoardId(boardId);
    }, []);

    const handleAddBoard = useCallback(() => {
        const newBoard: Board = {
            id: Date.now(),
            title: `보드 ${boards.length + 1}`,
        };
        setBoards(prev => [...prev, newBoard]);
        setActiveBoardId(newBoard.id);
    }, [boards.length]);

    const handleRenameBoard = useCallback((boardId: number, title: string) => {
        setBoards(prev => prev.map(b =>
            b.id === boardId ? { ...b, title } : b
        ));
    }, []);

    // =========================================
    // 그룹 핸들러
    // =========================================

    const handleGroupsUpdate = useCallback((newGroups: Group[]) => {
        setGroups(newGroups);
    }, []);

    // =========================================
    // 기타 핸들러
    // =========================================

    const handleTaskSelect = useCallback((task: Task) => {
        setSelectedTask(task);
    }, []);

    const handleTaskModalUpdate = useCallback(async (updates: Partial<Task>) => {
        if (!selectedTask) return;

        await handleTaskUpdate(selectedTask.id, updates);
        setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }, [selectedTask, handleTaskUpdate]);

    const handleToggleGrid = useCallback(() => {
        setSnapToGrid(prev => !prev);
    }, []);

    const handleToggleTheme = useCallback(() => {
        document.documentElement.classList.toggle('dark');
    }, []);

    // =========================================
    // 렌더링
    // =========================================

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">프로젝트 로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
                <div className="flex flex-col items-center gap-4 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <p className="text-red-500 font-medium">{error}</p>
                    <button
                        onClick={loadProjectData}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    // 현재 보드의 태스크만 필터링
    // Mock 모드: boardId로 필터링
    // 실제 API 모드: 모든 태스크가 같은 프로젝트이므로 필터링 불필요하나 일관성을 위해 유지
    const filteredTasks = tasks.filter(t =>
        t.boardId === activeBoardId || t.boardId === project.id || activeBoardId === 1
    );

    const filteredConnections = connections.filter(c =>
        c.boardId === activeBoardId || c.boardId === project.id || activeBoardId === 1
    );

    const filteredGroups = groups.filter(g =>
        g.boardId === activeBoardId
    );

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
                                <div className="text-xs text-gray-400 mt-2">
                                    {filteredTasks.length}개의 카드 • {filteredConnections.length}개의 연결
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 space-y-1">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${viewMode === 'board' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            <Trello size={20} strokeWidth={viewMode === 'board' ? 2.5 : 2} />
                            {sidebarOpen && <span className="font-medium">Board</span>}
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${viewMode === 'calendar' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            <CalendarIcon size={20} strokeWidth={viewMode === 'calendar' ? 2.5 : 2} />
                            {sidebarOpen && <span className="font-medium">Calendar</span>}
                        </button>
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${viewMode === 'timeline' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            <StretchHorizontal size={20} strokeWidth={viewMode === 'timeline' ? 2.5 : 2} />
                            {sidebarOpen && <span className="font-medium">Timeline</span>}
                        </button>
                    </div>

                    <div className="p-4 mt-auto">
                        <button
                            onClick={() => setViewMode('settings')}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${viewMode === 'settings' ? 'bg-gray-200 dark:bg-white/10 font-bold text-gray-900 dark:text-white' : ''}`}
                        >
                            <Settings size={20} />
                            {sidebarOpen && <span>Settings</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden z-10 p-4">
                <div className="bg-white/40 dark:bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/20 dark:border-white/5 shadow-inner h-full overflow-hidden relative">

                    {/* 저장 중 인디케이터 */}
                    {isSaving && (
                        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-full text-sm shadow-lg">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>저장 중...</span>
                        </div>
                    )}

                    {viewMode === 'board' && (
                        <BoardCanvas
                            tasks={filteredTasks}
                            connections={filteredConnections}
                            onTasksUpdate={handleBoardTasksUpdate}
                            onTaskSelect={handleTaskSelect}
                            onTaskCreate={handleTaskCreate}
                            onTaskUpdate={handleTaskUpdate}
                            onTaskDelete={handleTaskDelete}
                            onConnectionCreate={handleConnectionCreate}
                            onConnectionDelete={handleConnectionDelete}
                            onConnectionUpdate={handleConnectionUpdate}
                            boards={boards}
                            activeBoardId={activeBoardId}
                            onSwitchBoard={handleSwitchBoard}
                            onAddBoard={handleAddBoard}
                            onRenameBoard={handleRenameBoard}
                            snapToGrid={snapToGrid}
                            groups={filteredGroups}
                            onGroupsUpdate={handleGroupsUpdate}
                            onToggleGrid={handleToggleGrid}
                            onToggleTheme={handleToggleTheme}
                        />
                    )}
                    {viewMode === 'calendar' && <CalendarView tasks={tasks} onTaskSelect={handleTaskSelect} />}
                    {viewMode === 'timeline' && <TimelineView tasks={tasks} onTaskSelect={handleTaskSelect} />}
                    {viewMode === 'settings' && <SettingsView />}
                </div>
            </div>

            {/* Dock 컴포넌트 */}
            <Dock
                activeMenu={activeDockMenu}
                onMenuChange={setActiveDockMenu}
                editingCards={[]}
                members={MOCK_MEMBERS}
                showMembers={showMembers}
                setShowMembers={setShowMembers}
                projectId={project.id}
                currentUserId={1}
            />

            {/* Task Detail Modal */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={handleTaskModalUpdate}
                    currentUser="User"
                    currentUserId={1}
                />
            )}
        </div>
    );
}

export default WorkspaceBoard;