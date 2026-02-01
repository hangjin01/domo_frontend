// src/containers/screens/BoardScreen.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project, Task, Connection, Board, Group, ViewMode, Column, Member } from '@/src/models/types';
import { BoardCanvas } from '@/src/views/board';
import { CalendarView } from '@/src/views/calendar';
import { TimelineView } from '@/src/views/timeline';
import { SettingsView } from '@/src/views/profile';
import { TaskDetailModal } from '@/src/views/task';
import { Mascot } from '@/src/views/common';
import { Dock, FileListPanel } from '@/src/views/dock';
import { CommunityBoard } from '@/src/views/community';
import { useUser } from '@/src/lib/contexts/UserContext';
import { useBoardSocket } from '@/src/containers/hooks/board';
import {
    GRID_PADDING,
    GROUP_HEADER_HEIGHT,
    GROUP_DEFAULT_WIDTH,
    GROUP_DEFAULT_HEIGHT,
} from '@/src/models/constants/grid';

import {
    getTasks,
    getConnections,
    getColumns,
    createColumn,
    createTask,
    updateTask,
    deleteTask,
    createConnection,
    deleteConnection,
    updateConnection,
    updateGroup,
    deleteGroup,
    attachFileToCard,
    uploadFile,
    getBoardMembers,
} from '@/src/models/api';

import { subscribeOnlineMembers } from '@/src/models/api/workspace';

import {
    LayoutGrid, Calendar as CalendarIcon, StretchHorizontal, Settings,
    ChevronLeft, ChevronRight, ArrowLeft, Loader2, AlertCircle, MessageSquare,
    Wifi, WifiOff, RefreshCw
} from 'lucide-react';

// ============================================
// 상수 (컴포넌트 외부 - 매 렌더링마다 재생성 방지)
// ============================================
const COLUMN_GAP = 100;

// ============================================
// Props 타입
// ============================================
interface BoardScreenProps {
    project: Project;
    onBack: () => void;
}

// ============================================
// 메인 컴포넌트
// ============================================
export const BoardScreen: React.FC<BoardScreenProps> = ({ project, onBack }) => {
    const { user } = useUser();

    // =========================================
    // 데이터 상태
    // =========================================
    const [tasks, setTasks] = useState<Task[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [boards, setBoards] = useState<Board[]>([{ id: 1, title: '메인 보드' }]);
    const [activeBoardId, setActiveBoardId] = useState<number>(1);
    const [groups, setGroups] = useState<Group[]>([]);

    // Ref로 최신 상태 유지 (클로저 문제 방지)
    const tasksRef = useRef<Task[]>(tasks);
    const connectionsRef = useRef<Connection[]>(connections);
    useEffect(() => { tasksRef.current = tasks; }, [tasks]);
    useEffect(() => { connectionsRef.current = connections; }, [connections]);

    const [members, setMembers] = useState<Member[]>([]);

    // =========================================
    // UI 상태
    // =========================================
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeDockMenu, setActiveDockMenu] = useState('dashboard');
    const [showMembers, setShowMembers] = useState(false);
    const [showFilePanel, setShowFilePanel] = useState(false);
    const [filePanelRefreshKey, setFilePanelRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // =========================================
    // Optimistic Update 중복 방지
    // =========================================
    const pendingOperationsRef = useRef<Set<string>>(new Set());

    const addPendingOperation = useCallback((type: string, id: number) => {
        const key = `${type}:${id}`;
        pendingOperationsRef.current.add(key);
        setTimeout(() => pendingOperationsRef.current.delete(key), 5000);
    }, []);

    const isPendingOperation = useCallback((type: string, id: number) => {
        return pendingOperationsRef.current.has(`${type}:${id}`);
    }, []);

    const removePendingOperation = useCallback((type: string, id: number) => {
        pendingOperationsRef.current.delete(`${type}:${id}`);
    }, []);

    // =========================================
    // WebSocket 이벤트 핸들러
    // =========================================
    const handleSocketTaskCreated = useCallback((task: Task) => {
        if (isPendingOperation('CARD_CREATED', task.id)) {
            removePendingOperation('CARD_CREATED', task.id);
            return;
        }
        setTasks(prev => prev.some(t => t.id === task.id) ? prev : [...prev, task]);
    }, [isPendingOperation, removePendingOperation]);

    const handleSocketTaskUpdated = useCallback((task: Task) => {
        if (isPendingOperation('CARD_UPDATED', task.id)) {
            removePendingOperation('CARD_UPDATED', task.id);
            return;
        }
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
        setSelectedTask(prev => prev?.id === task.id ? { ...prev, ...task } : prev);
    }, [isPendingOperation, removePendingOperation]);

    const handleSocketTaskDeleted = useCallback((taskId: number) => {
        if (isPendingOperation('CARD_DELETED', taskId)) {
            removePendingOperation('CARD_DELETED', taskId);
            return;
        }
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setSelectedTask(prev => prev?.id === taskId ? null : prev);
    }, [isPendingOperation, removePendingOperation]);

    const handleSocketTasksBatchUpdated = useCallback((updatedTasks: Task[]) => {
        setTasks(prev => {
            const map = new Map(updatedTasks.map(t => [t.id, t]));
            return prev.map(t => map.has(t.id) ? { ...t, ...map.get(t.id)! } : t);
        });
    }, []);

    const handleSocketColumnCreated = useCallback((column: Column) => {
        setColumns(prev => prev.some(c => c.id === column.id) ? prev : [...prev, column]);
        setGroups(prev => {
            if (prev.some(g => g.id === column.id)) return prev;
            return [...prev, {
                id: column.id,
                title: column.title,
                x: column.localX ?? GRID_PADDING,
                y: column.localY ?? (GRID_PADDING + GROUP_HEADER_HEIGHT),
                width: column.width ?? GROUP_DEFAULT_WIDTH,
                height: column.height ?? GROUP_DEFAULT_HEIGHT,
                projectId: column.project_id,
                parentId: column.parentId ?? null,
                depth: column.depth ?? 0,
                color: column.color,
                collapsed: column.collapsed,
            }];
        });
    }, []);

    const handleSocketColumnUpdated = useCallback((column: Column) => {
        setColumns(prev => prev.map(c => c.id === column.id ? { ...c, ...column } : c));
        setGroups(prev => prev.map(g => g.id !== column.id ? g : {
            ...g,
            title: column.title,
            x: column.localX ?? g.x,
            y: column.localY ?? g.y,
            width: column.width ?? g.width,
            height: column.height ?? g.height,
            parentId: column.parentId ?? null,
            depth: column.depth ?? 0,
            color: column.color,
            collapsed: column.collapsed,
        }));
    }, []);

    const handleSocketColumnDeleted = useCallback((columnId: number) => {
        setColumns(prev => prev.filter(c => c.id !== columnId));
        setGroups(prev => prev.filter(g => g.id !== columnId));
        setTasks(prev => prev.map(t => t.column_id === columnId ? { ...t, column_id: undefined } : t));
    }, []);

    const handleSocketConnectionCreated = useCallback((connection: Connection) => {
        if (isPendingOperation('CONNECTION_CREATED', connection.id)) {
            removePendingOperation('CONNECTION_CREATED', connection.id);
            return;
        }
        setConnections(prev => prev.some(c => c.id === connection.id) ? prev : [...prev, connection]);
    }, [isPendingOperation, removePendingOperation]);

    const handleSocketConnectionUpdated = useCallback((connection: Connection) => {
        setConnections(prev => prev.map(c => c.id === connection.id ? { ...c, ...connection } : c));
    }, []);

    const handleSocketConnectionDeleted = useCallback((connectionId: number) => {
        if (isPendingOperation('CONNECTION_DELETED', connectionId)) {
            removePendingOperation('CONNECTION_DELETED', connectionId);
            return;
        }
        setConnections(prev => prev.filter(c => c.id !== connectionId));
    }, [isPendingOperation, removePendingOperation]);

    const handleSocketFileUploaded = useCallback(() => {
        setFilePanelRefreshKey(prev => prev + 1);
    }, []);

    const handleSocketFileDeleted = useCallback((fileId: number) => {
        setTasks(prev => prev.map(task => ({
            ...task,
            files: task.files?.filter(f => f.id !== fileId) || []
        })));
        setFilePanelRefreshKey(prev => prev + 1);
    }, []);

    // =========================================
    // WebSocket 훅 연결
    // =========================================
    const {
        connectionState,
        lastError: socketError,
        reconnectAttempts,
        reconnect: reconnectSocket,
    } = useBoardSocket({
        projectId: project.id,
        currentUserId: user?.id,
        enabled: !isLoading,
        onTaskCreated: handleSocketTaskCreated,
        onTaskUpdated: handleSocketTaskUpdated,
        onTaskDeleted: handleSocketTaskDeleted,
        onTasksBatchUpdated: handleSocketTasksBatchUpdated,
        onColumnCreated: handleSocketColumnCreated,
        onColumnUpdated: handleSocketColumnUpdated,
        onColumnDeleted: handleSocketColumnDeleted,
        onConnectionCreated: handleSocketConnectionCreated,
        onConnectionUpdated: handleSocketConnectionUpdated,
        onConnectionDeleted: handleSocketConnectionDeleted,
        onFileUploaded: handleSocketFileUploaded,
        onFileDeleted: handleSocketFileDeleted,
    });

    // =========================================
    // 멤버 및 온라인 상태 로딩
    // =========================================
    useEffect(() => {
        if (!project.workspace_id) return;
        let cleanup: (() => void) | null = null;
        let loadedMembers: Member[] = [];

        const initMembers = async () => {
            try {
                const allMembers = await getBoardMembers(project.id);
                loadedMembers = allMembers.map(m => ({ ...m, isOnline: false }));
                setMembers(loadedMembers);
                cleanup = subscribeOnlineMembers(
                    project.workspace_id!,
                    (onlineUsers) => {
                        const onlineIds = new Set(onlineUsers.map(u => u.id));
                        setMembers(prev => (prev.length > 0 ? prev : loadedMembers).map(m => ({
                            ...m,
                            isOnline: onlineIds.has(m.id),
                        })));
                    },
                    () => {}
                );
            } catch {}
        };
        void initMembers();
        return () => cleanup?.();
    }, [project.id, project.workspace_id]);

    // =========================================
    // 컬럼 → Group 변환
    // =========================================
    const generateGroupsFromColumns = useCallback((columnsData: Column[]): Group[] => {
        const sorted = [...columnsData].sort((a, b) => a.order - b.order);
        let fallbackX = GRID_PADDING;

        return sorted.map((col) => {
            const hasPos = col.localX || col.localY || col.width || col.height;
            const x = hasPos ? (col.localX ?? fallbackX) : fallbackX;
            const y = hasPos ? (col.localY ?? GRID_PADDING + GROUP_HEADER_HEIGHT) : GRID_PADDING + GROUP_HEADER_HEIGHT;
            const w = col.width ?? GROUP_DEFAULT_WIDTH;
            const h = col.height ?? GROUP_DEFAULT_HEIGHT;
            fallbackX = x + w + COLUMN_GAP;

            return {
                id: col.id,
                title: col.title,
                x, y, width: w, height: h,
                projectId: project.id,
                parentId: col.parentId ?? null,
                depth: col.depth ?? 0,
                color: col.color,
                collapsed: col.collapsed,
            };
        });
    }, [project.id]);

    // =========================================
    // 초기 데이터 로딩
    // =========================================
    const loadProjectData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [tasksData, connectionsData, columnsData] = await Promise.all([
                getTasks(project.id),
                getConnections(project.id),
                getColumns(project.id),
            ]);
            setTasks(tasksData);
            setConnections(connectionsData);
            setColumns(columnsData);
            setGroups(generateGroupsFromColumns(columnsData));
        } catch (err) {
            console.error('Failed to load project data:', err);
            setError('프로젝트 데이터를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [project.id, generateGroupsFromColumns]);

    useEffect(() => { void loadProjectData(); }, [loadProjectData]);

    // =========================================
    // 헬퍼 함수
    // =========================================
    const getDefaultColumnId = useCallback((): number | null => {
        if (columns.length === 0) return null;
        const todo = columns.find(c => c.title.includes('할 일') || c.status === 'todo' || c.order === 0);
        return todo?.id || columns[0].id;
    }, [columns]);

    const getColumnById = useCallback((id: number) => columns.find(c => c.id === id), [columns]);

    // =========================================
    // 태스크 핸들러
    // =========================================
    const handleBoardTasksUpdate = useCallback((boardTasks: Task[]) => {
        setTasks(prev => {
            const other = prev.filter(t => t.boardId !== activeBoardId && t.boardId !== project.id);
            const unique = boardTasks.filter((t, i, s) => i === s.findIndex(x => x.id === t.id));
            return [...other, ...unique];
        });
    }, [activeBoardId, project.id]);

    const handleTaskCreate = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
        const columnId = taskData.column_id === null ? undefined : (taskData.column_id ?? getDefaultColumnId() ?? undefined);
        const newTaskData: Omit<Task, 'id'> = {
            title: taskData.title || '새로운 카드',
            status: taskData.status || 'todo',
            x: taskData.x ?? 100,
            y: taskData.y ?? 100,
            boardId: project.id,
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

        const newTask = await createTask(project.id, newTaskData);
        addPendingOperation('CARD_CREATED', newTask.id);
        setTasks(prev => [...prev.filter(t => t.id !== newTask.id), newTask]);
        return newTask;
    }, [project.id, getDefaultColumnId, addPendingOperation]);

    const handleTaskUpdate = useCallback(async (taskId: number, updates: Partial<Task>): Promise<void> => {
        const original = tasksRef.current.find(t => t.id === taskId);
        if (!original) return;

        addPendingOperation('CARD_UPDATED', taskId);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t)
            .filter((t, i, s) => i === s.findIndex(x => x.id === t.id)));

        try {
            setIsSaving(true);
            await updateTask(taskId, updates);
        } catch (err) {
            removePendingOperation('CARD_UPDATED', taskId);
            setTasks(prev => prev.map(t => t.id === taskId ? original : t)
                .filter((t, i, s) => i === s.findIndex(x => x.id === t.id)));
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, [addPendingOperation, removePendingOperation]);

    const handleMoveTaskToColumn = useCallback(async (taskId: number, columnId: number) => {
        const col = getColumnById(columnId);
        if (col) await handleTaskUpdate(taskId, { column_id: columnId, status: col.status });
    }, [getColumnById, handleTaskUpdate]);

    const handleTaskDelete = useCallback(async (taskId: number) => {
        let prev: Task[] = [];
        addPendingOperation('CARD_DELETED', taskId);
        setTasks(p => { prev = p; return p.filter(t => t.id !== taskId); });
        try {
            await deleteTask(taskId);
        } catch {
            removePendingOperation('CARD_DELETED', taskId);
            setTasks(prev);
        }
    }, [addPendingOperation, removePendingOperation]);

    // =========================================
    // 연결선 핸들러
    // =========================================
    const handleConnectionCreate = useCallback(async (
        from: number, to: number,
        sourceHandle?: 'left' | 'right', targetHandle?: 'left' | 'right'
    ): Promise<Connection> => {
        const created = await createConnection(project.id, {
            from, to, boardId: project.id, style: 'solid', shape: 'bezier',
            sourceHandle: sourceHandle || 'right', targetHandle: targetHandle || 'left',
        });
        addPendingOperation('CONNECTION_CREATED', created.id);
        setConnections(prev => [...prev, created]);
        return created;
    }, [project.id, addPendingOperation]);

    const handleConnectionDelete = useCallback(async (connectionId: number) => {
        const prev = [...connectionsRef.current];
        addPendingOperation('CONNECTION_DELETED', connectionId);
        setConnections(p => p.filter(c => c.id !== connectionId));
        try {
            await deleteConnection(project.id, connectionId);
        } catch {
            removePendingOperation('CONNECTION_DELETED', connectionId);
            setConnections(prev);
        }
    }, [project.id, addPendingOperation, removePendingOperation]);

    const handleConnectionUpdate = useCallback(async (connectionId: number, updates: Partial<Connection>) => {
        const prev = [...connectionsRef.current];
        setConnections(p => p.map(c => c.id === connectionId ? { ...c, ...updates } : c));
        try {
            await updateConnection(connectionId, updates);
        } catch {
            setConnections(prev);
        }
    }, []);

    // =========================================
    // 파일 핸들러 (WebSocket 자동 갱신)
    // =========================================
    const handleFileDropOnCard = useCallback(async (cardId: number, fileId: number) => {
        await attachFileToCard(cardId, fileId);
    }, []);

    const handleNativeFileDrop = useCallback(async (cardId: number, files: File[]) => {
        await Promise.all(files.map(async (f) => {
            const uploaded = await uploadFile(project.id, f);
            await attachFileToCard(cardId, uploaded.id);
        }));
    }, [project.id]);

    const handleBackgroundFileDrop = useCallback(async (files: File[]) => {
        await Promise.all(files.map(f => uploadFile(project.id, f)));
        setShowFilePanel(true);
        setActiveDockMenu('files');
    }, [project.id]);

    const handleFileDeleted = useCallback((fileId: number) => {
        setTasks(prev => prev.map(t => ({ ...t, files: t.files?.filter(f => f.id !== fileId) || [] })));
        setSelectedTask(prev => prev ? { ...prev, files: prev.files?.filter(f => f.id !== fileId) || [] } : null);
    }, []);

    // =========================================
    // 보드/그룹 핸들러
    // =========================================
    const handleSwitchBoard = useCallback((id: number) => setActiveBoardId(id), []);
    const handleAddBoard = useCallback(() => {
        const b: Board = { id: Date.now(), title: `보드 ${boards.length + 1}` };
        setBoards(prev => [...prev, b]);
        setActiveBoardId(b.id);
    }, [boards.length]);
    const handleRenameBoard = useCallback((id: number, title: string) => {
        setBoards(prev => prev.map(b => b.id === id ? { ...b, title } : b));
    }, []);

    const handleGroupsUpdate = useCallback(async (newGroups: Group[]): Promise<Map<number, number>> => {
        const existingIds = new Set(groups.map(g => g.id));
        const added = newGroups.filter(g => !existingIds.has(g.id));
        const parentChanged = newGroups.filter(g => {
            const e = groups.find(x => x.id === g.id);
            return e && e.parentId !== g.parentId;
        });

        const idMap = new Map<number, number>();
        for (const ng of added) {
            try {
                const col = await createColumn(project.id, {
                    title: ng.title, order: columns.length,
                    localX: ng.x, localY: ng.y, width: ng.width, height: ng.height,
                });
                setColumns(prev => [...prev, col]);
                idMap.set(ng.id, col.id);
                newGroups = newGroups.map(g => g.id === ng.id ? { ...g, id: col.id } : g);
            } catch {}
        }

        if (idMap.size > 0) {
            setTasks(prev => prev.map(t => t.column_id && idMap.has(t.column_id)
                ? { ...t, column_id: idMap.get(t.column_id)! } : t));
        }

        for (const cg of parentChanged) {
            try { await updateGroup(cg.id, { parentId: cg.parentId, depth: cg.depth }); } catch {}
        }

        setGroups(newGroups);
        return idMap;
    }, [groups, columns, project.id]);

    const handleGroupMove = useCallback(async (groupId: number, newX: number, newY: number) => {
        const g = groups.find(x => x.id === groupId);
        if (!g) return;
        setGroups(prev => prev.map(x => x.id === groupId ? { ...x, x: newX, y: newY } : x));
        try {
            await updateGroup(groupId, { x: newX, y: newY });
        } catch {
            setGroups(prev => prev.map(x => x.id === groupId ? { ...x, x: g.x, y: g.y } : x));
        }
    }, [groups]);

    const handleGroupDelete = useCallback(async (groupId: number) => {
        const g = groups.find(x => x.id === groupId);
        if (!g || !confirm(`'${g.title}' 그룹을 삭제하시겠습니까?\n(카드들은 보드에 남아있습니다)`)) return;
        try {
            await deleteGroup(groupId);
            setGroups(prev => prev.filter(x => x.id !== groupId));
            setColumns(prev => prev.filter(c => c.id !== groupId));
            setTasks(prev => prev.map(t => t.column_id === groupId ? { ...t, column_id: undefined } : t));
        } catch {
            alert('그룹 삭제에 실패했습니다.');
        }
    }, [groups]);

    // =========================================
    // 기타 핸들러
    // =========================================
    const handleTaskSelect = useCallback((task: Task) => setSelectedTask(task), []);
    const handleTaskModalUpdate = useCallback(async (updates: Partial<Task>) => {
        if (!selectedTask) return;
        await handleTaskUpdate(selectedTask.id, updates);
        setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    }, [selectedTask, handleTaskUpdate]);
    const handleToggleGrid = useCallback(() => setSnapToGrid(prev => !prev), []);
    const handleToggleTheme = useCallback(() => document.documentElement.classList.toggle('dark'), []);

    // =========================================
    // 렌더링: 로딩/에러
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
                    <button onClick={loadProjectData} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    // =========================================
    // 필터링된 데이터
    // =========================================
    const filteredTasks = tasks
        .filter(t => t.boardId === activeBoardId || t.boardId === project.id || activeBoardId === 1)
        .filter((t, i, s) => i === s.findIndex(x => x.id === t.id));
    const filteredConnections = connections.filter(c => c.boardId === activeBoardId || c.boardId === project.id || activeBoardId === 1);
    const filteredGroups = groups.filter(g => g.projectId === activeBoardId || g.projectId === project.id || activeBoardId === 1);

    // =========================================
    // 메인 렌더링
    // =========================================
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-400/5 dark:bg-blue-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-400/5 dark:bg-purple-900/10 rounded-full blur-[120px]" />
            </div>

            {/* Sidebar */}
            <div className={`relative z-20 py-4 pl-4 transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-20'}`}>
                <div className="glass-panel h-full rounded-[2rem] flex flex-col border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden">
                    <div className="p-6 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-3 font-bold text-xl text-gray-900 dark:text-white ${!sidebarOpen && 'hidden'}`}>
                                <Mascot size={32} />
                                <span className="tracking-tight">DOMO</span>
                            </div>
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-gray-500 ${!sidebarOpen && 'mx-auto'}`}>
                                {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                            </button>
                        </div>
                        {sidebarOpen && (
                            <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white px-1 group">
                                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                <span>Back to Projects</span>
                            </button>
                        )}
                    </div>

                    {sidebarOpen && (
                        <div className="px-6 pb-6">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Current Project</div>
                            <div className="p-4 bg-white/50 dark:bg-white/5 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm">
                                <div className="font-bold text-lg truncate mb-1" title={project.name}>{project.name}</div>
                                <div className="text-xs text-gray-500 font-medium">{project.workspace}</div>
                                <div className="text-xs text-gray-400 mt-2">
                                    {filteredTasks.length}개 카드 • {filteredConnections.length}개 연결 • {columns.length}개 컬럼
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 space-y-1">
                        {([
                            { mode: 'board', icon: LayoutGrid, label: 'Board' },
                            { mode: 'calendar', icon: CalendarIcon, label: 'Calendar' },
                            { mode: 'timeline', icon: StretchHorizontal, label: 'Timeline' },
                            { mode: 'community', icon: MessageSquare, label: 'Community' },
                        ] as const).map(({ mode, icon: Icon, label }) => (
                            <button key={mode} onClick={() => setViewMode(mode)}
                                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${viewMode === mode ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                <Icon size={20} strokeWidth={viewMode === mode ? 2.5 : 2} />
                                {sidebarOpen && <span className="font-medium">{label}</span>}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 mt-auto">
                        <button onClick={() => setViewMode('settings')}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 ${viewMode === 'settings' ? 'bg-gray-200 dark:bg-white/10 font-bold text-gray-900 dark:text-white' : ''}`}>
                            <Settings size={20} />
                            {sidebarOpen && <span>Settings</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden z-10 p-4">
                <div className="bg-white/40 dark:bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/20 dark:border-white/5 shadow-inner h-full overflow-hidden relative">
                    {/* Status Indicators */}
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        {connectionState === 'connected' && (
                            <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full text-xs font-medium">
                                <Wifi className="w-3.5 h-3.5" /><span>실시간</span>
                            </div>
                        )}
                        {connectionState === 'connecting' && (
                            <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-full text-xs font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /><span>연결 중...</span>
                            </div>
                        )}
                        {connectionState === 'reconnecting' && (
                            <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full text-xs font-medium">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>재연결 중 ({reconnectAttempts})</span>
                            </div>
                        )}
                        {connectionState === 'disconnected' && !isLoading && (
                            <button onClick={reconnectSocket} title={socketError || '연결 끊김'}
                                    className="flex items-center gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-red-500/20">
                                <WifiOff className="w-3.5 h-3.5" /><span>오프라인</span>
                            </button>
                        )}
                        {isSaving && (
                            <div className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-full text-sm shadow-lg">
                                <Loader2 className="w-4 h-4 animate-spin" /><span>저장 중...</span>
                            </div>
                        )}
                    </div>

                    {viewMode === 'board' && (
                        <BoardCanvas
                            tasks={filteredTasks} connections={filteredConnections} columns={columns}
                            onTasksUpdate={handleBoardTasksUpdate} onTaskSelect={handleTaskSelect}
                            onTaskCreate={handleTaskCreate} onTaskUpdate={handleTaskUpdate}
                            onTaskDelete={handleTaskDelete} onMoveTaskToColumn={handleMoveTaskToColumn}
                            onConnectionCreate={handleConnectionCreate} onConnectionDelete={handleConnectionDelete}
                            onConnectionUpdate={handleConnectionUpdate}
                            boards={boards} activeBoardId={activeBoardId}
                            onSwitchBoard={handleSwitchBoard} onAddBoard={handleAddBoard} onRenameBoard={handleRenameBoard}
                            snapToGrid={snapToGrid} groups={filteredGroups}
                            onGroupsUpdate={handleGroupsUpdate} onGroupMove={handleGroupMove} onGroupDelete={handleGroupDelete}
                            onToggleGrid={handleToggleGrid} onToggleTheme={handleToggleTheme}
                            onFileDropOnCard={handleFileDropOnCard} onNativeFileDrop={handleNativeFileDrop}
                            onBackgroundFileDrop={handleBackgroundFileDrop}
                        />
                    )}
                    {viewMode === 'calendar' && <CalendarView tasks={tasks} onTaskSelect={handleTaskSelect} />}
                    {viewMode === 'timeline' && <TimelineView tasks={tasks} onTaskSelect={handleTaskSelect} />}
                    {viewMode === 'community' && <CommunityBoard projectId={project.id} viewType="table" />}
                    {viewMode === 'settings' && <SettingsView />}
                </div>
            </div>

            {/* Dock */}
            <Dock
                activeMenu={activeDockMenu}
                onMenuChange={(menu) => {
                    setShowFilePanel(menu === 'files' ? !showFilePanel : false);
                    setActiveDockMenu(menu);
                }}
                editingCards={[]} members={members} showMembers={showMembers}
                setShowMembers={setShowMembers} projectId={project.id} currentUserId={user?.id ?? 0}
            />

            {/* File Panel */}
            <FileListPanel
                key={filePanelRefreshKey} projectId={project.id} isOpen={showFilePanel}
                onClose={() => { setShowFilePanel(false); setActiveDockMenu('dashboard'); }}
                onFileDragStart={() => {}} onFileDeleted={handleFileDeleted}
            />

            {/* Task Modal */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask} onClose={() => setSelectedTask(null)}
                    onUpdate={handleTaskModalUpdate}
                    currentUser={user?.name ?? "User"} currentUserId={user?.id ?? 0}
                    projectId={project.id}
                />
            )}
        </div>
    );
};

export default BoardScreen;