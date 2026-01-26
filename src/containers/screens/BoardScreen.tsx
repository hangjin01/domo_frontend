// src/containers/screens/BoardScreen.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project, Task, Connection, Board, Group, ViewMode, Column, FileMetadata, Member } from '@/src/models/types';
import { BoardCanvas } from '@/src/views/board';
import { CalendarView } from '@/src/views/calendar';
import { TimelineView } from '@/src/views/timeline';
import { SettingsView } from '@/src/views/profile';
import { TaskDetailModal } from '@/src/views/task';
import { Mascot } from '@/src/views/common';
import { Dock, FileListPanel } from '@/src/views/dock';
import { CommunityBoard } from '@/src/views/community';
import {
    CARD_WIDTH,
    CARD_HEIGHT,
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
    ChevronLeft, ChevronRight, ArrowLeft, Loader2, AlertCircle, MessageSquare
} from 'lucide-react';

interface BoardScreenProps {
    project: Project;
    onBack: () => void;
}

export const BoardScreen: React.FC<BoardScreenProps> = ({ project, onBack }) => {
    // 데이터 상태
    const [tasks, setTasks] = useState<Task[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [boards, setBoards] = useState<Board[]>([{ id: 1, title: '메인 보드' }]);
    const [activeBoardId, setActiveBoardId] = useState<number>(1);
    const [groups, setGroups] = useState<Group[]>([]);

    // Ref로 최신 tasks 유지 (클로저 문제 방지)
    const tasksRef = useRef<Task[]>(tasks);
    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    // 멤버 상태 (온라인 상태 포함)
    const [members, setMembers] = useState<Member[]>([]);

    // UI 상태
    const [viewMode, setViewMode] = useState<ViewMode>('board');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Dock 관련 상태
    const [activeDockMenu, setActiveDockMenu] = useState('dashboard');
    const [showMembers, setShowMembers] = useState(false);

    // 파일 패널 상태
    const [showFilePanel, setShowFilePanel] = useState(false);
    const [draggingFile, setDraggingFile] = useState<FileMetadata | null>(null);
    const [filePanelRefreshKey, setFilePanelRefreshKey] = useState(0);

    // 로딩 & 에러 상태
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingCardId, setUploadingCardId] = useState<number | null>(null);

    // =========================================
    // 멤버 및 온라인 상태 로딩 (SSE 구독 방식)
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
                        setMembers(prev => {
                            const base = prev.length > 0 ? prev : loadedMembers;
                            return base.map(member => ({
                                ...member,
                                isOnline: onlineIds.has(member.id),
                            }));
                        });
                    },
                    () => {
                        // SSE connection error - silently handled
                    }
                );
            } catch {
                // Failed to load members - silently handled
            }
        };

        void initMembers();

        return () => cleanup?.();
    }, [project.id, project.workspace_id]);

    // =========================================
    // 컬럼 → Group 변환 상수 (중앙화된 상수 사용)
    // =========================================
    const COLUMN_GAP = 100;

    // =========================================
    // 컬럼 → Group 변환 (백엔드 데이터 우선)
    // =========================================
    const generateGroupsFromColumns = useCallback((
        columnsData: Column[],
        tasksData: Task[]
    ): Group[] => {
        const sortedColumns = [...columnsData].sort((a, b) => a.order - b.order);
        let fallbackX = GRID_PADDING;

        return sortedColumns.map((column) => {
            // 백엔드에 저장된 위치/크기가 있으면 그대로 사용
            const hasBackendPosition = column.localX !== undefined && column.localX !== 0
                || column.localY !== undefined && column.localY !== 0
                || column.width !== undefined
                || column.height !== undefined;

            let groupX: number;
            let groupY: number;
            let groupWidth: number;
            let groupHeight: number;

            if (hasBackendPosition) {
                // 백엔드 데이터 우선 사용
                groupX = column.localX ?? fallbackX;
                groupY = column.localY ?? (GRID_PADDING + GROUP_HEADER_HEIGHT);
                groupWidth = column.width ?? GROUP_DEFAULT_WIDTH;
                groupHeight = column.height ?? GROUP_DEFAULT_HEIGHT;
            } else {
                // 백엔드 데이터 없으면 순차 배치 (fallback)
                groupX = fallbackX;
                groupY = GRID_PADDING + GROUP_HEADER_HEIGHT;
                groupWidth = GROUP_DEFAULT_WIDTH;
                groupHeight = GROUP_DEFAULT_HEIGHT;
            }

            // 다음 컬럼 fallback 위치 계산
            fallbackX = groupX + groupWidth + COLUMN_GAP;

            const group: Group = {
                id: column.id,
                title: column.title,
                x: groupX,
                y: groupY,
                width: groupWidth,
                height: groupHeight,
                projectId: project.id,
                parentId: column.parentId ?? null,
                depth: column.depth ?? 0,
                color: column.color,
                collapsed: column.collapsed,
            };

            return group;
        });
    }, [project.id]);

    // =========================================
    // 데이터 로딩
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

            // 컬럼 + 카드 위치 기반으로 Groups 생성
            const generatedGroups = generateGroupsFromColumns(columnsData, tasksData);

            // 좌표 시스템: 절대 좌표 통일
            // 백엔드에서 받은 x, y를 절대 좌표로 그대로 사용
            // 변환 로직 제거 - 데이터 일관성 유지
            setTasks(tasksData);
            setConnections(connectionsData);
            setColumns(columnsData);
            setGroups(generatedGroups);
        } catch (err) {
            console.error('Failed to load project data:', err);
            setError('프로젝트 데이터를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [project.id, generateGroupsFromColumns]);

    useEffect(() => {
        void loadProjectData();
    }, [loadProjectData]);

    // =========================================
    // 기본 컬럼 ID 가져오기 (첫 번째 컬럼 = "할 일")
    // =========================================
    const getDefaultColumnId = useCallback((): number | null => {
        if (columns.length === 0) return null;

        // "할 일" 컬럼 우선 찾기
        const todoColumn = columns.find(col =>
            col.title.includes('할 일') ||
            col.status === 'todo' ||
            col.order === 0
        );

        return todoColumn?.id || columns[0].id;
    }, [columns]);

    // =========================================
    // 컬럼 ID로 컬럼 정보 가져오기
    // =========================================
    const getColumnById = useCallback((columnId: number): Column | undefined => {
        return columns.find(col => col.id === columnId);
    }, [columns]);

    // =========================================
    // 태스크 핸들러
    // =========================================

    // ✅ 보드 내 태스크 업데이트 (로컬 상태만) - 중복 방지
    const handleBoardTasksUpdate = useCallback((boardTasks: Task[]) => {
        setTasks(prev => {
            // 현재 보드가 아닌 태스크들
            const otherBoardTasks = prev.filter(t =>
                t.boardId !== activeBoardId && t.boardId !== project.id
            );

            // 중복 제거: boardTasks에서 고유한 ID만 유지
            const uniqueBoardTasks = boardTasks.filter((task, index, self) =>
                index === self.findIndex(t => t.id === task.id)
            );

            return [...otherBoardTasks, ...uniqueBoardTasks];
        });
    }, [activeBoardId, project.id]);

    // ✅ 태스크 생성 - 컬럼 없이도 생성 가능
    const handleTaskCreate = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
        // column_id가 명시적으로 null이면 자유 배치 (그룹에 귀속 안 함)
        // undefined일 때만 기본 컬럼 사용
        const columnId = taskData.column_id === null
            ? undefined
            : (taskData.column_id ?? getDefaultColumnId() ?? undefined);

        const newTaskData: Omit<Task, 'id'> = {
            title: taskData.title || '새로운 카드',
            status: taskData.status || 'todo',
            x: taskData.x ?? 100,
            y: taskData.y ?? 100,
            boardId: project.id,
            description: taskData.description,
            content: taskData.content,
            column_id: columnId, // 컬럼 없으면 undefined
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
            const newTask = await createTask(project.id, newTaskData);
            // 기존 태스크 목록에 새 태스크 추가 (중복 방지)
            setTasks(prev => {
                const filtered = prev.filter(t => t.id !== newTask.id);
                return [...filtered, newTask];
            });
            return newTask;
        } catch (err) {
            console.error('Failed to create task:', err);
            throw err;
        }
    }, [project.id, getDefaultColumnId]);

    // 태스크 업데이트 - tasksRef로 최신 상태 참조
    const handleTaskUpdate = useCallback(async (taskId: number, updates: Partial<Task>): Promise<void> => {
        // tasksRef에서 원본 task 찾기 (동기적으로 즉시 참조)
        const originalTask = tasksRef.current.find(t => t.id === taskId);

        if (!originalTask) {
            console.error('Task not found:', taskId);
            return;
        }

        // 낙관적 UI 업데이트
        setTasks(prev => {
            const updated = prev.map(t => t.id === taskId ? { ...t, ...updates } : t);
            // 중복 제거
            return updated.filter((task, index, self) =>
                index === self.findIndex(t => t.id === task.id)
            );
        });

        try {
            setIsSaving(true);
            await updateTask(taskId, updates);
        } catch (err) {
            console.error('Failed to update task:', err);
            // 롤백 - 원래 태스크로 복원
            setTasks(prev => {
                const rolledBack = prev.map(t => t.id === taskId ? originalTask : t);
                return rolledBack.filter((t, index, self) =>
                    index === self.findIndex(item => item.id === t.id)
                );
            });
            throw err;
        } finally {
            setIsSaving(false);
        }
    }, []);  // 의존성 비움 - tasksRef는 항상 최신

    // 태스크를 특정 컬럼으로 이동
    const handleMoveTaskToColumn = useCallback(async (taskId: number, columnId: number): Promise<void> => {
        const column = getColumnById(columnId);

        if (!column) {
            console.error('Column not found');
            return;
        }

        await handleTaskUpdate(taskId, {
            column_id: columnId,
            status: column.status,
        });
    }, [getColumnById, handleTaskUpdate]);

    // 태스크 삭제
    const handleTaskDelete = useCallback(async (taskId: number): Promise<void> => {
        let previousTasks: Task[] = [];

        // setTasks 콜백 내에서 이전 상태 캡처
        setTasks(prev => {
            previousTasks = prev;
            return prev.filter(t => t.id !== taskId);
        });

        try {
            await deleteTask(taskId);
        } catch (err) {
            console.error('Failed to delete task:', err);
            // 롤백
            setTasks(previousTasks);
            throw err;
        }
    }, []);  // 의존성 비움

    // =========================================
    // 연결선 핸들러
    // =========================================

    const handleConnectionCreate = useCallback(async (
        from: number,
        to: number,
        sourceHandle?: 'left' | 'right',
        targetHandle?: 'left' | 'right'
    ): Promise<Connection> => {
        const newConnection: Omit<Connection, 'id'> = {
            from,
            to,
            boardId: project.id,
            style: 'solid',
            shape: 'bezier',
            sourceHandle: sourceHandle || 'right',
            targetHandle: targetHandle || 'left',
        };

        try {
            const created = await createConnection(project.id, newConnection);
            setConnections(prev => [...prev, created]);
            return created;
        } catch (err) {
            console.error('Failed to create connection:', err);
            throw err;
        }
    }, [project.id]);

    // Ref로 connections 최신 상태 유지 (낙관적 업데이트 롤백용)
    const connectionsRef = useRef(connections);
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    const handleConnectionDelete = useCallback(async (connectionId: number): Promise<void> => {
        // 롤백용 스냅샷을 ref에서 캡처 (의존성 제거)
        const previousConnections = [...connectionsRef.current];

        setConnections(prev => prev.filter(c => c.id !== connectionId));

        try {
            await deleteConnection(project.id, connectionId);
        } catch (err) {
            console.error('Failed to delete connection:', err);
            setConnections(previousConnections);
            throw err;
        }
    }, [project.id]); // connections 의존성 제거

    const handleConnectionUpdate = useCallback(async (connectionId: number, updates: Partial<Connection>) => {
        // 롤백용 스냅샷을 ref에서 캡처
        const previousConnections = [...connectionsRef.current];
        
        setConnections(prev => prev.map(c =>
            c.id === connectionId ? { ...c, ...updates } : c
        ));

        try {
            await updateConnection(connectionId, updates);
        } catch (err) {
            console.error('Failed to update connection:', err);
            // 실패 시 롤백
            setConnections(previousConnections);
        }
    }, []); // connections 의존성 제거

    // =========================================
    // 파일 드롭 핸들러
    // =========================================

    const handleFileDropOnCard = useCallback(async (cardId: number, fileId: number) => {
        try {
            await attachFileToCard(cardId, fileId);

            // 카드의 files 배열 업데이트 (낙관적 업데이트는 복잡하므로 데이터 리로드)
            // 실제로는 백엔드에서 반환된 카드 데이터로 업데이트하는 것이 좋음
            const updatedTasks = await getTasks(project.id);
            setTasks(updatedTasks);
        } catch (err) {
            console.error('Failed to attach file to card:', err);
        }
    }, [project.id]);

    // 네이티브 파일 드롭 핸들러 (브라우저에서 직접 드래그한 파일)
    const handleNativeFileDrop = useCallback(async (cardId: number, files: File[]) => {
        setUploadingCardId(cardId);
        try {
            // 파일 업로드 및 카드 연결을 병렬로 처리
            await Promise.all(files.map(async (file) => {
                const uploadedFile = await uploadFile(project.id, file);
                await attachFileToCard(cardId, uploadedFile.id);
            }));

            // 데이터 리로드
            const updatedTasks = await getTasks(project.id);
            setTasks(updatedTasks);
        } catch (err) {
            console.error('Failed to upload and attach file:', err);
        } finally {
            setUploadingCardId(null);
        }
    }, [project.id]);

    // 배경에 파일 드롭 시 프로젝트 파일로 업로드
    const handleBackgroundFileDrop = useCallback(async (files: File[]) => {
        try {
            // 파일 업로드를 병렬로 처리
            await Promise.all(files.map(file => uploadFile(project.id, file)));

            // 파일 패널 열기 + 새로고침 트리거
            setShowFilePanel(true);
            setActiveDockMenu('files');
            setFilePanelRefreshKey(prev => prev + 1);
        } catch (err) {
            console.error('Failed to upload file to project:', err);
        }
    }, [project.id]);

    // 프로젝트 파일 삭제 시 모든 카드에서 해당 파일 제거
    const handleFileDeleted = useCallback((fileId: number) => {
        setTasks(prev => prev.map(task => ({
            ...task,
            files: task.files?.filter(f => f.id !== fileId) || []
        })));

        // selectedTask도 업데이트 (모달이 열려있을 경우)
        setSelectedTask(prev => {
            if (!prev) return null;
            return {
                ...prev,
                files: prev.files?.filter(f => f.id !== fileId) || []
            };
        });
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
    // 그룹 핸들러 (그룹 내 카드도 함께 이동)
    // =========================================

    // 그룹 업데이트 - 새 그룹 생성 및 parent_id 변경 시 백엔드 동기화
    // 카드 귀속은 드래그 앤 드롭으로만 처리 (위치 기반 자동 귀속 제거)
    const handleGroupsUpdate = useCallback(async (newGroups: Group[]) => {
        // 1. 새로 추가된 그룹 찾기 (기존 groups에 없는 것)
        const existingIds = new Set(groups.map(g => g.id));
        const addedGroups = newGroups.filter(g => !existingIds.has(g.id));

        // 2. parent_id가 변경된 그룹 찾기
        const parentChangedGroups = newGroups.filter(g => {
            const existingGroup = groups.find(eg => eg.id === g.id);
            return existingGroup && existingGroup.parentId !== g.parentId;
        });

        // 새 그룹이 있으면 백엔드에 컬럼 생성 (위치/크기 포함)
        for (const newGroup of addedGroups) {
            try {
                const newColumn = await createColumn(project.id, {
                    title: newGroup.title,
                    order: columns.length,
                    localX: newGroup.x,
                    localY: newGroup.y,
                    width: newGroup.width,
                    height: newGroup.height,
                });

                // 컬럼 목록에 추가
                setColumns(prev => [...prev, newColumn]);

                // 그룹 ID를 실제 컬럼 ID로 교체
                newGroups = newGroups.map(g =>
                    g.id === newGroup.id ? { ...g, id: newColumn.id } : g
                );
            } catch (err) {
                console.error('Failed to create column:', err);
            }
        }

        // parent_id가 변경된 그룹들 백엔드에 업데이트
        for (const changedGroup of parentChangedGroups) {
            try {
                await updateGroup(changedGroup.id, {
                    parentId: changedGroup.parentId,
                    depth: changedGroup.depth,
                });
            } catch (err) {
                console.error('Failed to update group parent_id:', changedGroup.id, err);
            }
        }

        setGroups(newGroups);
    }, [groups, columns, project.id]);

    // =========================================
    // 그룹 이동 핸들러 (핵심 재설계!)
    // =========================================
    // 새로운 좌표 시스템:
    // - 그룹에 속한 카드의 x, y = 그룹 내 상대 좌표
    // - 렌더링 시 절대 좌표 = group.x + card.x
    // - 그룹 이동 시 그룹 위치만 서버에 저장 (1회 API)
    // - 카드 위치는 그룹 내에서 드래그할 때만 변경
    // =========================================
    const handleGroupMove = useCallback(async (groupId: number, newX: number, newY: number) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        // 로컬 상태만 업데이트 (카드 위치 변경 없음!)
        // 카드의 x, y는 그룹 내 상대 좌표이므로 그룹 이동과 무관
        setGroups(prev => prev.map(g =>
            g.id === groupId ? { ...g, x: newX, y: newY } : g
        ));

        // 백엔드에 그룹 위치만 저장 (1회 API 호출)
        try {
            await updateGroup(groupId, { x: newX, y: newY });
        } catch (err) {
            console.error('Failed to save group position:', err);
            // 롤백: 원래 위치로 복원
            setGroups(prev => prev.map(g =>
                g.id === groupId ? { ...g, x: group.x, y: group.y } : g
            ));
        }
    }, [groups]);

    // 그룹 삭제 핸들러
    const handleGroupDelete = useCallback(async (groupId: number) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        if (!confirm(`'${group.title}' 그룹을 삭제하시겠습니까?\n(카드들은 보드에 남아있습니다)`)) {
            return;
        }

        try {
            await deleteGroup(groupId);

            // 로컬 상태 업데이트
            setGroups(prev => prev.filter(g => g.id !== groupId));
            setColumns(prev => prev.filter(c => c.id !== groupId));

            // 그룹에 속했던 카드들의 column_id를 null로
            setTasks(prev => prev.map(t =>
                t.column_id === groupId ? { ...t, column_id: undefined } : t
            ));
        } catch (err) {
            console.error('Failed to delete group:', err);
            alert('그룹 삭제에 실패했습니다.');
        }
    }, [groups]);

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

    // 현재 보드의 태스크만 필터링 - 중복 제거
    const filteredTasks = tasks
        .filter(t => t.boardId === activeBoardId || t.boardId === project.id || activeBoardId === 1)
        .filter((task, index, self) => index === self.findIndex(t => t.id === task.id));

    const filteredConnections = connections.filter(c =>
        c.boardId === activeBoardId || c.boardId === project.id || activeBoardId === 1
    );

    const filteredGroups = groups.filter(g =>
        g.projectId === activeBoardId || g.projectId === project.id || activeBoardId === 1
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
                                    {filteredTasks.length}개의 카드 • {filteredConnections.length}개의 연결 • {columns.length}개의 컬럼
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto px-4 space-y-1">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${viewMode === 'board' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            <LayoutGrid size={20} strokeWidth={viewMode === 'board' ? 2.5 : 2} />
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
                        <button
                            onClick={() => setViewMode('community')}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${viewMode === 'community' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                            <MessageSquare size={20} strokeWidth={viewMode === 'community' ? 2.5 : 2} />
                            {sidebarOpen && <span className="font-medium">Community</span>}
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
                            columns={columns}
                            onTasksUpdate={handleBoardTasksUpdate}
                            onTaskSelect={handleTaskSelect}
                            onTaskCreate={handleTaskCreate}
                            onTaskUpdate={handleTaskUpdate}
                            onTaskDelete={handleTaskDelete}
                            onMoveTaskToColumn={handleMoveTaskToColumn}
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
                            onGroupMove={handleGroupMove}
                            onGroupDelete={handleGroupDelete}
                            onToggleGrid={handleToggleGrid}
                            onToggleTheme={handleToggleTheme}
                            onFileDropOnCard={handleFileDropOnCard}
                            onNativeFileDrop={handleNativeFileDrop}
                            onBackgroundFileDrop={handleBackgroundFileDrop}
                        />
                    )}
                    {viewMode === 'calendar' && <CalendarView tasks={tasks} onTaskSelect={handleTaskSelect} />}
                    {viewMode === 'timeline' && <TimelineView tasks={tasks} onTaskSelect={handleTaskSelect} />}
                    {viewMode === 'community' && <CommunityBoard projectId={project.id} viewType="table" />}
                    {viewMode === 'settings' && <SettingsView />}
                </div>
            </div>

            {/* Dock 컴포넌트 */}
            <Dock
                activeMenu={activeDockMenu}
                onMenuChange={(menu) => {
                    if (menu === 'files') {
                        setShowFilePanel(prev => !prev);
                    } else {
                        setShowFilePanel(false);
                    }
                    setActiveDockMenu(menu);
                }}
                editingCards={[]}
                members={members}
                showMembers={showMembers}
                setShowMembers={setShowMembers}
                projectId={project.id}
                currentUserId={1}
            />

            {/* 파일 목록 패널 */}
            <FileListPanel
                key={filePanelRefreshKey}
                projectId={project.id}
                isOpen={showFilePanel}
                onClose={() => {
                    setShowFilePanel(false);
                    setActiveDockMenu('dashboard');
                }}
                onFileDragStart={(file) => setDraggingFile(file)}
                onFileDeleted={handleFileDeleted}
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

export default BoardScreen;