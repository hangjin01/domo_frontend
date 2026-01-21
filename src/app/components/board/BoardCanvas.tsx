'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Task, Connection, Board, Group, Column } from '../../../types';
import { TaskCard } from '../ui/TaskCard';
import { deleteTask } from '../../../lib/api';
import {
    Plus, LayoutDashboard, ChevronDown, Check, Pencil, X, MousePointer2, Layers, Spline, Activity, Trash2, FilePlus, Clipboard,
    Grid, Sun, Moon, Loader2
} from 'lucide-react';

interface BoardCanvasProps {
    tasks: Task[];
    connections: Connection[];
    columns: Column[];
    onTasksUpdate: (tasks: Task[]) => void;
    onTaskSelect: (task: Task) => void;
    onTaskCreate?: (taskData: Partial<Task>) => Promise<Task>;
    onTaskUpdate?: (taskId: number, updates: Partial<Task>) => Promise<void>;
    onTaskDelete?: (taskId: number) => Promise<void>;
    onMoveTaskToColumn?: (taskId: number, columnId: number) => Promise<void>;
    onConnectionCreate: (from: number, to: number) => void;
    onConnectionDelete: (id: number) => void;
    onConnectionUpdate: (id: number, updates: Partial<Connection>) => void;
    boards: Board[];
    activeBoardId: number;
    onSwitchBoard: (id: number) => void;
    onAddBoard: (name: string) => void;
    onRenameBoard: (id: number, name: string) => void;
    snapToGrid: boolean;
    groups: Group[];
    onGroupsUpdate: (groups: Group[]) => void;
    onGroupMove?: (groupId: number, newX: number, newY: number) => Promise<void>;
    onToggleGrid: () => void;
    onToggleTheme: () => void;
}

const COLUMN_WIDTH = 350;
const COLUMN_GAP = 30;
const COLUMN_START_X = 50;

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
                                                            tasks, connections, columns, onTasksUpdate, onTaskSelect, onTaskCreate, onTaskUpdate, onTaskDelete, onMoveTaskToColumn, onConnectionCreate, onConnectionDelete, onConnectionUpdate, boards, activeBoardId, onSwitchBoard, onAddBoard, onRenameBoard, snapToGrid, groups, onGroupsUpdate, onGroupMove, onToggleGrid, onToggleTheme
                                                        }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const boardSelectorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const taskFileInputRef = useRef<HTMLInputElement>(null);
    const [activeTaskForFile, setActiveTaskForFile] = useState<number | null>(null);

    const mousePosRef = useRef({ x: 0, y: 0 });
    const [lines, setLines] = useState<React.ReactElement[]>([]);
    const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
    const [dragState, setDragState] = useState<{ id: number, startX: number, startY: number, initialTaskX: number, initialTaskY: number } | null>(null);
    const [groupDragState, setGroupDragState] = useState<{ id: number, startX: number, startY: number, initialGroupX: number, initialGroupY: number, containedTaskIds: { id: number, initialX: number, initialY: number }[] } | null>(null);
    const [connectionDraft, setConnectionDraft] = useState<{ fromId: number, startX: number, startY: number, currX: number, currY: number } | null>(null);
    const [activeMenu, setActiveMenu] = useState<{ id: number, x: number, y: number } | null>(null);
    const [backgroundMenu, setBackgroundMenu] = useState<{ x: number, y: number, taskX: number, taskY: number, targetTaskId?: number } | null>(null);
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currX: number, currY: number } | null>(null);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
    const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
    const [editingGroupTitle, setEditingGroupTitle] = useState('');
    const [showBoardMenu, setShowBoardMenu] = useState(false);
    const [isCreatingBoard, setIsCreatingBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
    const [editBoardName, setEditBoardName] = useState('');

    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [isSavingPosition, setIsSavingPosition] = useState(false);
    const [isDeletingTask, setIsDeletingTask] = useState(false);

    const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

    const getColumnByX = useCallback((x: number): Column | null => {
        if (sortedColumns.length === 0) return null;
        for (let i = 0; i < sortedColumns.length; i++) {
            const columnStartX = COLUMN_START_X + i * (COLUMN_WIDTH + COLUMN_GAP);
            const columnEndX = columnStartX + COLUMN_WIDTH;
            if (x >= columnStartX && x < columnEndX) {
                return sortedColumns[i];
            }
        }
        if (x < COLUMN_START_X) return sortedColumns[0];
        return sortedColumns[sortedColumns.length - 1];
    }, [sortedColumns]);

    const resetBoardMenuState = useCallback(() => {
        setIsCreatingBoard(false);
        setNewBoardName('');
        setEditingBoardId(null);
    }, []);

    useEffect(() => {
        if (!showBoardMenu) resetBoardMenuState();
    }, [showBoardMenu, resetBoardMenuState]);

    const updateConnections = useCallback(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const newLines: React.ReactElement[] = [];
        setSvgSize({ width: container.scrollWidth, height: container.scrollHeight });

        connections.forEach((conn) => {
            const fromEl = document.getElementById(`task-${conn.from}`);
            const toEl = document.getElementById(`task-${conn.to}`);
            if (fromEl && toEl) {
                const fromRect = fromEl.getBoundingClientRect();
                const toRect = toEl.getBoundingClientRect();
                const startX = fromRect.right - containerRect.left + container.scrollLeft;
                const startY = fromRect.top - containerRect.top + fromRect.height / 2 + container.scrollTop;
                const endX = toRect.left - containerRect.left + container.scrollLeft;
                const endY = toRect.top - containerRect.top + toRect.height / 2 + container.scrollTop;
                const dist = Math.abs(endX - startX);
                let pathString: string;
                if (conn.shape === 'straight') {
                    pathString = `M ${startX} ${startY} L ${endX} ${endY}`;
                } else {
                    const cp1x = startX + dist * 0.5;
                    const cp2x = endX - dist * 0.5;
                    pathString = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
                }
                const isSelected = activeMenu?.id === conn.id;
                newLines.push(
                    <g key={conn.id} className="group/line">
                        <path d={pathString} fill="none" stroke="transparent" strokeWidth="20" strokeLinecap="round" className="cursor-pointer pointer-events-auto" onDoubleClick={(evt) => { evt.stopPropagation(); const rect = container.getBoundingClientRect(); setActiveMenu({ id: conn.id, x: evt.clientX - rect.left + container.scrollLeft, y: evt.clientY - rect.top + container.scrollTop }); setBackgroundMenu(null); }} onContextMenu={(evt) => { evt.preventDefault(); evt.stopPropagation(); const rect = container.getBoundingClientRect(); setActiveMenu({ id: conn.id, x: evt.clientX - rect.left + container.scrollLeft, y: evt.clientY - rect.top + container.scrollTop }); setBackgroundMenu(null); }} />
                        <path d={pathString} fill="none" stroke={isSelected ? "#0a84ff" : "rgba(128,128,128,0.4)"} strokeWidth="2" strokeLinecap="round" strokeDasharray={conn.style === 'dashed' ? "8,4" : "none"} className="transition-all duration-300 pointer-events-none group-hover/line:stroke-blue-400 group-hover/line:stroke-[3px]" />
                        <circle cx={startX} cy={startY} r="3" fill="rgba(128,128,128,0.5)" className="pointer-events-none group-hover/line:fill-blue-400" />
                        <path d={`M ${endX} ${endY} L ${endX - 8} ${endY - 4} L ${endX - 8} ${endY + 4} Z`} fill="rgba(128,128,128,0.5)" className="pointer-events-none group-hover/line:fill-blue-400" />
                    </g>
                );
            }
        });
        if (connectionDraft) {
            const dist = Math.abs(connectionDraft.currX - connectionDraft.startX);
            const cp1x = connectionDraft.startX + dist * 0.5;
            const cp2x = connectionDraft.currX - dist * 0.5;
            const pathString = `M ${connectionDraft.startX} ${connectionDraft.startY} C ${cp1x} ${connectionDraft.startY}, ${cp2x} ${connectionDraft.currY}, ${connectionDraft.currX} ${connectionDraft.currY}`;
            newLines.push(<g key="draft"><path d={pathString} fill="none" stroke="#0a84ff" strokeWidth="2" strokeDasharray="5,5" strokeLinecap="round" /><circle cx={connectionDraft.currX} cy={connectionDraft.currY} r="4" fill="#0a84ff" /></g>);
        }
        setLines(newLines);
    }, [connections, connectionDraft, activeMenu]);

    useLayoutEffect(() => {
        updateConnections();
        const handleResize = () => updateConnections();
        window.addEventListener('resize', handleResize);
        let animationFrameId: number;
        const loop = () => { updateConnections(); animationFrameId = requestAnimationFrame(loop); };
        loop();
        return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationFrameId); };
    }, [updateConnections]);

    useEffect(() => {
        const handleKeyDown = (evt: KeyboardEvent) => {
            const key = evt.key.toLowerCase();
            if (key === 'c' && selectedTaskIds.size > 0) {
                evt.preventDefault();
                const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
                if (selectedTasks.length === 0) return;
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                selectedTasks.forEach(t => {
                    minX = Math.min(minX, t.x || 0);
                    minY = Math.min(minY, t.y || 0);
                    maxX = Math.max(maxX, (t.x || 0) + 280);
                    maxY = Math.max(maxY, (t.y || 0) + 200);
                });
                const padding = 40;
                const newGroup: Group = { id: Date.now(), title: 'Group', x: minX - padding, y: minY - padding, width: maxX - minX + (padding * 2), height: maxY - minY + (padding * 2), boardId: activeBoardId };
                onGroupsUpdate([...groups, newGroup]);
                setSelectedTaskIds(new Set());
            }
            if (key === 'n') {
                evt.preventDefault();
                handleCreateNewTask(mousePosRef.current.x - 140, mousePosRef.current.y - 40);
            }
            if ((key === 'delete' || key === 'backspace') && selectedTaskIds.size > 0) {
                evt.preventDefault();
                handleDeleteSelectedTasks();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedTaskIds, tasks, activeBoardId, groups, onGroupsUpdate]);

    useEffect(() => {
        const handleClickOutside = (evt: MouseEvent) => {
            setActiveMenu(null);
            setBackgroundMenu(null);
            if (editingGroupId) setEditingGroupId(null);
            if (boardSelectorRef.current && !boardSelectorRef.current.contains(evt.target as Node)) {
                setShowBoardMenu(false);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [editingGroupId]);

    const handleCreateNewTask = async (x: number, y: number) => {
        if (isCreatingTask) return;
        const targetColumn = getColumnByX(x);
        const newTaskData: Partial<Task> = {
            title: "새로운 카드",
            status: targetColumn?.status || "todo",
            x, y,
            tags: [],
            boardId: activeBoardId,
            column_id: targetColumn?.id,
        };

        if (onTaskCreate) {
            setIsCreatingTask(true);
            const tempTask: Task = { ...newTaskData, id: Date.now(), status: targetColumn?.status || 'todo', x, y, boardId: activeBoardId } as Task;
            onTasksUpdate([...tasks, tempTask]);
            try {
                const savedTask = await onTaskCreate(newTaskData);
                onTasksUpdate(tasks.filter(t => t.id !== tempTask.id).concat(savedTask));
                onTaskSelect(savedTask);
            } catch (err) {
                console.error('Failed to create task:', err);
                onTasksUpdate(tasks.filter(t => t.id !== tempTask.id));
            } finally {
                setIsCreatingTask(false);
            }
        } else {
            const newTask: Task = { ...newTaskData, id: Date.now(), status: 'todo', x, y, boardId: activeBoardId } as Task;
            onTasksUpdate([...tasks, newTask]);
            onTaskSelect(newTask);
        }
    };

    const saveTaskPosition = async (taskId: number, x: number, y: number) => {
        if (!onTaskUpdate) return;
        const updates: Partial<Task> = { x, y };
        setIsSavingPosition(true);
        try {
            await onTaskUpdate(taskId, updates);
        } catch (err) {
            console.error('Failed to save position:', err);
        } finally {
            setIsSavingPosition(false);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (isDeletingTask) return;
        setIsDeletingTask(true);
        const previousTasks = [...tasks];
        onTasksUpdate(tasks.filter(t => t.id !== taskId));
        connections.filter(c => c.from === taskId || c.to === taskId).forEach(c => onConnectionDelete(c.id));
        try {
            if (onTaskDelete) await onTaskDelete(taskId);
            else await deleteTask(taskId);
        } catch (err) {
            console.error('Failed to delete task:', err);
            onTasksUpdate(previousTasks);
            alert('카드 삭제에 실패했습니다.');
        } finally {
            setIsDeletingTask(false);
            setBackgroundMenu(null);
        }
    };

    // ✅ 수정된 다중 삭제 함수 - 병렬 처리 및 원자적 상태 업데이트
    const handleDeleteSelectedTasks = async () => {
        if (selectedTaskIds.size === 0 || isDeletingTask) return;

        const idsToDelete = Array.from(selectedTaskIds);
        setIsDeletingTask(true);

        // 먼저 로컬 상태에서 모든 카드 제거 (낙관적 UI)
        const previousTasks = [...tasks];
        onTasksUpdate(tasks.filter(t => !selectedTaskIds.has(t.id)));

        // 관련 연결선도 제거
        idsToDelete.forEach(id => {
            connections.filter(c => c.from === id || c.to === id).forEach(c => onConnectionDelete(c.id));
        });

        // 선택 해제
        setSelectedTaskIds(new Set());

        // 백엔드에 병렬로 삭제 요청
        try {
            await Promise.all(idsToDelete.map(async (id) => {
                try {
                    if (onTaskDelete) await onTaskDelete(id);
                    else await deleteTask(id);
                } catch (err) {
                    console.warn(`Failed to delete task ${id}:`, err);
                    // 개별 실패는 무시 (이미 삭제된 경우 등)
                }
            }));
        } catch (err) {
            console.error('Failed to delete tasks:', err);
            // 전체 실패 시 롤백
            onTasksUpdate(previousTasks);
        } finally {
            setIsDeletingTask(false);
            setBackgroundMenu(null);
        }
    };

    const handlePointerDown = (e: React.PointerEvent, task?: Task, group?: Group) => {
        if (e.button === 2) return;
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;

        if (e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            setSelectionBox({ startX: x, startY: y, currX: x, currY: y });
            return;
        }
        if (group) {
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            const contained = tasks.filter(t => {
                const tx = t.x || 0, ty = t.y || 0;
                return tx >= group.x && tx <= group.x + group.width && ty >= group.y && ty <= group.y + group.height;
            }).map(t => ({ id: t.id, initialX: t.x || 0, initialY: t.y || 0 }));
            setGroupDragState({ id: group.id, startX: e.clientX, startY: e.clientY, initialGroupX: group.x, initialGroupY: group.y, containedTaskIds: contained });
            setActiveMenu(null);
            setBackgroundMenu(null);
            return;
        }
        if (task) {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setDragState({ id: task.id, startX: e.clientX, startY: e.clientY, initialTaskX: task.x || 0, initialTaskY: task.y || 0 });
            e.stopPropagation();
            setActiveMenu(null);
            setBackgroundMenu(null);
        }
        setActiveMenu(null);
        setBackgroundMenu(null);
    };

    const handleConnectStart = (taskId: number, e: React.PointerEvent) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;
        setConnectionDraft({ fromId: taskId, startX: x, startY: y, currX: x, currY: y });
        setActiveMenu(null);
        setBackgroundMenu(null);
    };

    const handleConnectEnd = (targetId: number) => {
        if (connectionDraft && connectionDraft.fromId !== targetId) {
            onConnectionCreate(connectionDraft.fromId, targetId);
        }
        setConnectionDraft(null);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;
        mousePosRef.current = { x, y };

        if (selectionBox) {
            setSelectionBox(prev => prev ? { ...prev, currX: x, currY: y } : null);
            const boxStartX = Math.min(selectionBox.startX, x);
            const boxStartY = Math.min(selectionBox.startY, y);
            const boxEndX = Math.max(selectionBox.startX, x);
            const boxEndY = Math.max(selectionBox.startY, y);
            const newSelectedIds = new Set<number>();
            tasks.forEach(t => {
                const tx = t.x || 0, ty = t.y || 0;
                if (tx < boxEndX && tx + 280 > boxStartX && ty < boxEndY && ty + 100 > boxStartY) {
                    newSelectedIds.add(t.id);
                }
            });
            setSelectedTaskIds(newSelectedIds);
        } else if (groupDragState) {
            const deltaX = e.clientX - groupDragState.startX;
            const deltaY = e.clientY - groupDragState.startY;
            let newGroupX = groupDragState.initialGroupX + deltaX;
            let newGroupY = groupDragState.initialGroupY + deltaY;
            if (snapToGrid) {
                newGroupX = Math.round(newGroupX / 20) * 20;
                newGroupY = Math.round(newGroupY / 20) * 20;
            }
            onGroupsUpdate(groups.map(g => g.id === groupDragState.id ? { ...g, x: newGroupX, y: newGroupY } : g));
            if (groupDragState.containedTaskIds.length > 0) {
                const effectiveDeltaX = newGroupX - groupDragState.initialGroupX;
                const effectiveDeltaY = newGroupY - groupDragState.initialGroupY;
                onTasksUpdate(tasks.map(t => {
                    const c = groupDragState.containedTaskIds.find(item => item.id === t.id);
                    return c ? { ...t, x: c.initialX + effectiveDeltaX, y: c.initialY + effectiveDeltaY } : t;
                }));
            }
        } else if (dragState) {
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;
            let newX = dragState.initialTaskX + deltaX;
            let newY = dragState.initialTaskY + deltaY;
            if (snapToGrid) {
                newX = Math.round(newX / 20) * 20;
                newY = Math.round(newY / 20) * 20;
            }
            onTasksUpdate(tasks.map(t => t.id === dragState.id ? { ...t, x: newX, y: newY } : t));
        } else if (connectionDraft) {
            setConnectionDraft(prev => prev ? { ...prev, currX: x, currY: y } : null);
        }
    };

    const handlePointerUp = async () => {
        if (selectionBox) setSelectionBox(null);
        if (dragState) {
            const task = tasks.find(t => t.id === dragState.id);
            if (task && (task.x !== dragState.initialTaskX || task.y !== dragState.initialTaskY) && task.x !== undefined && task.y !== undefined) {
                await saveTaskPosition(dragState.id, task.x, task.y);
            }
            setDragState(null);
        }
        if (groupDragState) {
            const group = groups.find(g => g.id === groupDragState.id);
            if (group && onGroupMove) {
                await onGroupMove(groupDragState.id, group.x, group.y);
            }
            setGroupDragState(null);
        }
        if (connectionDraft) setConnectionDraft(null);
    };

    const handleBackgroundContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        const y = e.clientY - rect.top + container.scrollTop;
        const taskEl = (e.target as HTMLElement).closest('[id^="task-"]');
        const targetTaskId = taskEl ? parseInt(taskEl.id.replace('task-', ''), 10) : undefined;
        setActiveMenu(null);
        setSelectedTaskIds(targetTaskId ? new Set([targetTaskId]) : new Set());
        setBackgroundMenu({ x, y, taskX: x - 140, taskY: y - 70, targetTaskId });
    };

    const getConnectionById = (id: number) => connections.find(c => c.id === id);

    return (
        <div className="flex flex-col h-full bg-white/30 dark:bg-black/20 backdrop-blur-xl relative w-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/20 dark:border-white/5 flex justify-between items-center bg-white/20 dark:bg-black/20 backdrop-blur-md relative z-20 shadow-sm">
                <div className="relative" ref={boardSelectorRef}>
                    <button onClick={(evt) => { evt.stopPropagation(); setShowBoardMenu(!showBoardMenu); }} className="flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 px-3 py-1.5 rounded-xl transition-colors group">
                        <div className="bg-white/50 dark:bg-white/10 p-1.5 rounded-lg"><LayoutDashboard size={18} className="text-gray-700 dark:text-gray-200" /></div>
                        <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg tracking-tight">{boards.find(b => b.id === activeBoardId)?.title}</h2>
                        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${showBoardMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showBoardMenu && (
                        <div className="absolute top-full left-0 mt-2 w-64 glass-card rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="p-2 border-b border-white/20 dark:border-white/10">
                                <p className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">내 보드</p>
                                {boards.map(board => (
                                    <div key={board.id} className="group relative">
                                        {editingBoardId === board.id ? (
                                            <div className="px-3 py-2 flex items-center gap-2">
                                                <input autoFocus className="bg-transparent border-b border-blue-500 px-1 text-sm text-gray-800 dark:text-white w-full outline-none" value={editBoardName} onChange={(e) => setEditBoardName(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter') { if (editBoardName.trim()) onRenameBoard(board.id, editBoardName.trim()); setEditingBoardId(null); } }} />
                                                <button onClick={(e) => { e.stopPropagation(); if (editBoardName.trim()) onRenameBoard(board.id, editBoardName.trim()); setEditingBoardId(null); }}><Check size={14} className="text-green-500" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingBoardId(null); }}><X size={14} className="text-red-500" /></button>
                                            </div>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); onSwitchBoard(board.id); setShowBoardMenu(false); }} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-200 transition-colors group">
                                                <span className="font-medium truncate max-w-[140px]">{board.title}</span>
                                                <div className="flex items-center gap-2">
                                                    {board.id === activeBoardId && <Check size={16} className="text-blue-500" />}
                                                    <div className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setEditingBoardId(board.id); setEditBoardName(board.title); }}><Pencil size={12} className="text-gray-400 hover:text-gray-600 dark:hover:text-white" /></div>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="p-2">
                                {isCreatingBoard ? (
                                    <div className="p-2 bg-gray-50 dark:bg-black/30 rounded-xl">
                                        <input autoFocus type="text" className="w-full bg-white dark:bg-white/5 text-gray-800 dark:text-white text-sm rounded-lg px-2 py-1.5 border border-transparent focus:border-blue-500 outline-none mb-2" placeholder="보드 이름 입력" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' && newBoardName.trim()) { onAddBoard(newBoardName.trim()); setShowBoardMenu(false); } }} />
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={(e) => { e.stopPropagation(); setIsCreatingBoard(false); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white">취소</button>
                                            <button onClick={(e) => { e.stopPropagation(); if (newBoardName.trim()) { onAddBoard(newBoardName.trim()); setShowBoardMenu(false); } }} className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 font-medium">만들기</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setIsCreatingBoard(true); }} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all font-medium"><Plus size={16} /><span>새 보드 만들기</span></button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-6 mr-6">
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4 font-medium">
                        {(isCreatingTask || isSavingPosition || isDeletingTask) && (<div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg text-blue-600 dark:text-blue-400"><Loader2 size={12} className="animate-spin" /><span>{isDeletingTask ? '삭제 중...' : '저장 중...'}</span></div>)}
                        <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm"><span className="bg-gray-200 dark:bg-white/20 px-1.5 rounded text-[10px] uppercase">Ctrl</span><span>Select</span></div>
                        <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm"><span className="bg-gray-200 dark:bg-white/20 px-1.5 rounded text-[10px] uppercase">C</span><span>Group</span></div>
                        <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm"><span className="bg-gray-200 dark:bg-white/20 px-1.5 rounded text-[10px] uppercase">Del</span><span>Delete</span></div>
                        <div className="flex items-center gap-2 border-l border-gray-300 dark:border-white/10 pl-4"><MousePointer2 size={12} /><span>우클릭 / &apos;N&apos;</span></div>
                    </div>
                    <div className="h-6 w-[1px] bg-gray-300 dark:bg-white/10"></div>
                    <div className="flex items-center gap-3">
                        <button onClick={onToggleGrid} className={`p-2 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10 ${snapToGrid ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 dark:text-gray-500'}`} title={snapToGrid ? "스냅 끄기" : "스냅 켜기"}><Grid size={18} /></button>
                        <button onClick={onToggleTheme} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"><Sun size={18} className="hidden dark:block" /><Moon size={18} className="block dark:hidden" /></button>
                    </div>
                </div>
            </div>

            {/* Canvas with Column Overlays */}
            <div ref={containerRef} className="flex-1 overflow-auto relative custom-scrollbar w-full h-full bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:24px_24px]" onContextMenu={handleBackgroundContextMenu} onPointerDown={(evt) => handlePointerDown(evt)} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>

                <svg className="absolute top-0 left-0 pointer-events-none z-0" style={{ width: Math.max(svgSize.width, 2000), height: Math.max(svgSize.height, 2000) }}>{lines}</svg>

                {groups.map(group => (
                    <div key={group.id} className="absolute border-2 border-dashed border-gray-300/60 dark:border-white/10 bg-white/30 dark:bg-white/5 rounded-[2rem] transition-all duration-300 group/item hover:border-blue-400/50 hover:bg-white/40 dark:hover:bg-white/10 backdrop-blur-sm" style={{ left: group.x, top: group.y, width: group.width, height: group.height, cursor: groupDragState ? 'grabbing' : 'grab', pointerEvents: 'auto' }} onPointerDown={(evt) => handlePointerDown(evt, undefined, group)}>
                        <div className="absolute -top-10 left-0 min-w-[100px] pointer-events-auto" onPointerDown={(evt) => evt.stopPropagation()} onClick={(evt) => evt.stopPropagation()}>
                            {editingGroupId === group.id ? (
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-xl shadow-lg border border-gray-200 dark:border-white/10">
                                    <Layers size={14} className="text-blue-500" /><input autoFocus type="text" value={editingGroupTitle} onChange={(e) => setEditingGroupTitle(e.target.value)} onBlur={() => { if (editingGroupTitle.trim()) { onGroupsUpdate(groups.map(g => g.id === group.id ? { ...g, title: editingGroupTitle } : g)); } setEditingGroupId(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { if (editingGroupTitle.trim()) { onGroupsUpdate(groups.map(g => g.id === group.id ? { ...g, title: editingGroupTitle } : g)); } setEditingGroupId(null); } }} className="bg-transparent text-sm text-gray-800 dark:text-white outline-none w-32 font-bold" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold text-sm cursor-text px-3 py-1.5 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors backdrop-blur-md" onClick={() => { setEditingGroupId(group.id); setEditingGroupTitle(group.title); }}><Layers size={16} />{group.title}</div>
                            )}
                        </div>
                    </div>
                ))}

                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        variant="sticky"
                        style={{ position: 'absolute', left: task.x || 0, top: task.y || 0 }}
                        isSelected={selectedTaskIds.has(task.id)}
                        onPointerDown={(evt) => handlePointerDown(evt, task)}
                        onClick={() => onTaskSelect(task)}
                        onConnectStart={handleConnectStart}
                        onConnectEnd={handleConnectEnd}
                        onAttachFile={(taskId) => { setActiveTaskForFile(taskId); taskFileInputRef.current?.click(); }}
                        onStatusChange={async (taskId, newStatus) => {
                            // 해당 상태에 맞는 컬럼 찾기
                            const targetColumn = sortedColumns.find(col => col.status === newStatus);
                            if (targetColumn && onTaskUpdate) {
                                try {
                                    await onTaskUpdate(taskId, {
                                        status: newStatus as Task['status'],
                                        column_id: targetColumn.id
                                    });
                                } catch (err) {
                                    console.error('Failed to update task status:', err);
                                }
                            }
                        }}
                    />
                ))}

                {selectionBox && (<div className="absolute border-2 border-blue-500/50 bg-blue-500/10 rounded-xl z-50 pointer-events-none backdrop-blur-sm" style={{ left: Math.min(selectionBox.startX, selectionBox.currX), top: Math.min(selectionBox.startY, selectionBox.currY), width: Math.abs(selectionBox.currX - selectionBox.startX), height: Math.abs(selectionBox.currY - selectionBox.startY) }} />)}

                {activeMenu && (
                    <div className="absolute z-50 glass-card rounded-2xl overflow-hidden min-w-[140px] animate-in fade-in zoom-in-95 duration-100" style={{ left: activeMenu.x, top: activeMenu.y }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <button onClick={() => { const conn = getConnectionById(activeMenu.id); if (conn) onConnectionUpdate(activeMenu.id, { shape: conn.shape === 'straight' ? 'bezier' : 'straight' }); setActiveMenu(null); }} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 w-full text-left font-medium"><Spline size={14} /><span>{getConnectionById(activeMenu.id)?.shape === 'straight' ? '곡선으로 변경' : '직선으로 변경'}</span></button>
                        <button onClick={() => { const conn = getConnectionById(activeMenu.id); if (conn) onConnectionUpdate(activeMenu.id, { style: conn.style === 'dashed' ? 'solid' : 'dashed' }); setActiveMenu(null); }} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 w-full text-left font-medium"><Activity size={14} /><span>{getConnectionById(activeMenu.id)?.style === 'dashed' ? '실선으로 변경' : '점선으로 변경'}</span></button>
                        <div className="h-[1px] bg-gray-200 dark:bg-white/10 my-1 mx-2"></div>
                        <button onClick={() => { onConnectionDelete(activeMenu.id); setActiveMenu(null); }} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 w-full text-left font-medium"><Trash2 size={14} /><span>삭제</span></button>
                    </div>
                )}

                {backgroundMenu && (
                    <div className="absolute z-[100] glass-card rounded-2xl overflow-hidden min-w-[180px] animate-in fade-in zoom-in-95 duration-100" style={{ left: backgroundMenu.x, top: backgroundMenu.y }} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <button onClick={() => { handleCreateNewTask(backgroundMenu.taskX, backgroundMenu.taskY); setBackgroundMenu(null); }} disabled={isCreatingTask} className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 w-full text-left font-medium disabled:opacity-50">
                            {isCreatingTask ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <FilePlus size={16} className="text-blue-500" />}
                            <span>새로운 카드 추가</span>
                        </button>
                        {backgroundMenu.targetTaskId && (
                            <button onClick={() => handleDeleteTask(backgroundMenu.targetTaskId!)} disabled={isDeletingTask} className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 w-full text-left font-medium disabled:opacity-50">
                                {isDeletingTask ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                <span>카드 삭제</span>
                            </button>
                        )}
                        <button disabled className="flex items-center gap-3 px-4 py-3 text-xs hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 cursor-not-allowed w-full text-left font-medium border-t border-gray-200 dark:border-white/10"><Clipboard size={16} /><span>붙여넣기</span></button>
                    </div>
                )}
            </div>

            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-8 right-8 w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-[0_8px_30px_rgba(59,130,246,0.4)] transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center z-40 group backdrop-blur-sm border border-white/20">
                <Plus size={36} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => { /* handleGlobalFileChange */ }} />
            <input type="file" multiple ref={taskFileInputRef} className="hidden" onChange={(e) => { /* handleTaskFileChange */ }} />
        </div>
    );
};