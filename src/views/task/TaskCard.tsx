'use client';

import React, { useState } from 'react';
import { Task } from '@/src/models/types';
import { getStickyStyle, getContrastColor } from '@/src/models/utils/canvas';
import {
    FolderOpen, FileText, Download, Folder, Clock, AlignLeft, Paperclip, MoreHorizontal, ChevronRight,
    Circle, CheckCircle2, ChevronDown
} from 'lucide-react';

interface TaskCardProps {
    task: Task;
    onClick: () => void;
    onMove?: () => void;
    onStatusChange?: (taskId: number, newStatus: string) => void;
    transparent?: boolean;
    variant?: 'default' | 'sticky';
    style?: React.CSSProperties;
    isSelected?: boolean;
    onPointerDown?: (e: React.PointerEvent) => void;
    onConnectStart?: (taskId: number, e: React.PointerEvent, handle: 'left' | 'right') => void;
    onConnectEnd?: (taskId: number, handle: 'left' | 'right') => void;
    onAttachFile?: (taskId: number) => void;
    // 파일 드롭 관련
    isFileDropTarget?: boolean;
    onFileDragEnter?: (taskId: number) => void;
    onFileDragLeave?: (taskId: number) => void;
    onFileDrop?: (taskId: number, fileId: number) => void;
    // 네이티브 파일 드롭 (브라우저에서 직접 드래그)
    onNativeFileDrop?: (taskId: number, files: File[]) => void;
}

// 상태별 아이콘 컴포넌트
const StatusIcon: React.FC<{ status: string; size?: number; className?: string }> = ({ status, size = 12, className = "" }) => {
    switch (status) {
        case 'done':
            return <CheckCircle2 size={size} className={`text-green-500 ${className}`} />;
        case 'doing':
        case 'in-progress':
            return <MoreHorizontal size={size} className={`text-yellow-500 ${className}`} />;
        case 'todo':
        default:
            return <Circle size={size} className={`text-blue-500 ${className}`} />;
    }
};

// 상태 옵션
const STATUS_OPTIONS = [
    { value: 'todo', label: '할 일', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { value: 'in-progress', label: '진행 중', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { value: 'done', label: '완료', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
];

export const TaskCard: React.FC<TaskCardProps> = ({
                                                      task, onClick, onMove, onStatusChange, transparent, variant = 'default', style, isSelected, onPointerDown, onConnectStart, onConnectEnd, onAttachFile, isFileDropTarget, onFileDragEnter, onFileDragLeave, onFileDrop, onNativeFileDrop
                                                  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);

    const handleDragStart = (e: React.DragEvent) => {
        if (variant !== 'sticky') {
            e.dataTransfer.setData('taskId', String(task.id));
            e.dataTransfer.effectAllowed = 'move';
        } else {
            e.preventDefault();
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        const isFolder = task.taskType === 2 && task.files && task.files.length > 1;

        if (variant === 'sticky' && (task.taskType !== 2 || isFolder)) {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
        } else {
            onClick();
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (variant === 'sticky') {
            e.stopPropagation();
            onClick();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const isFolder = task.taskType === 2 && task.files && task.files.length > 1;
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        } else if (e.key === ' ' && variant === 'sticky' && (task.taskType !== 2 || isFolder)) {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(!isExpanded);
        }
    };

    // --- FILE / FOLDER TYPE RENDER (TaskType === 2) ---
    if (task.taskType === 2 && variant === 'sticky') {
        const isFolder = task.files && task.files.length > 1;

        // EXPANDED FOLDER VIEW
        if (isFolder && isExpanded) {
            return (
                <div
                    id={`task-${task.id}`}
                    draggable
                    onDragStart={handleDragStart}
                    onPointerDown={onPointerDown}
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    className={`absolute group flex flex-col w-[280px] cursor-grab active:cursor-grabbing focus:outline-none z-30 select-none bg-[#FFF9C4] dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg shadow-xl transition-all duration-200`}
                    style={style}
                >
                    <div className="flex items-center justify-between p-3 border-b border-yellow-200/50 dark:border-yellow-700/30">
                        <div className="flex items-center gap-2">
                            <FolderOpen size={18} className="text-yellow-600 dark:text-yellow-400" />
                            <span className="font-bold text-gray-800 dark:text-yellow-100 text-sm truncate max-w-[180px]">{task.title}</span>
                        </div>
                        <span className="text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded-full">{task.files?.length}</span>
                    </div>

                    <div className="p-2 space-y-1 max-h-[240px] overflow-y-auto custom-scrollbar">
                        {task.files?.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-white/50 dark:bg-black/20 rounded hover:bg-white/80 dark:hover:bg-black/40 transition-colors group/file">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText size={14} className="text-gray-500 dark:text-gray-400 shrink-0"/>
                                    <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{file.name}</span>
                                </div>
                                <a
                                    href={file.url}
                                    download={file.name}
                                    onClick={(e) => e.stopPropagation()}
                                    className="opacity-0 group-hover/file:opacity-100 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-opacity"
                                >
                                    <Download size={12} className="text-gray-600 dark:text-gray-300"/>
                                </a>
                            </div>
                        ))}
                    </div>

                    {/* Connection Handles */}
                    <div
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-sm cursor-crosshair hover:scale-125 transition-transform opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center group/handle"
                        onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(task.id, e, 'left'); }}
                        onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(task.id, 'left'); }}
                    >
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
                    </div>
                    <div
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-sm cursor-crosshair hover:scale-125 transition-transform opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center group/handle"
                        onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(task.id, e, 'right'); }}
                        onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(task.id, 'right'); }}
                    >
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
                    </div>
                </div>
            );
        }

        // COLLAPSED / SINGLE FILE VIEW
        return (
            <div
                id={`task-${task.id}`}
                draggable
                onDragStart={handleDragStart}
                onPointerDown={onPointerDown}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                className="absolute group flex flex-col items-center w-[100px] cursor-grab active:cursor-grabbing focus:outline-none z-10 select-none"
                style={style}
            >
                <div className={`relative w-16 h-20 bg-white rounded-md shadow-sm flex items-center justify-center transition-transform group-hover:scale-105 ${isSelected ? 'ring-2 ring-domo-highlight ring-offset-2 ring-offset-[#0F111A]' : ''}`}>
                    {/* Folded corner effect for single file, or Tab for folder */}
                    {isFolder ? (
                        <>
                            <div className="absolute top-[-4px] left-0 w-6 h-2 bg-gray-300 rounded-t-sm"></div>
                            <Folder className="text-yellow-500" size={32} strokeWidth={1.5} fill="#FDE047" fillOpacity={0.4} />
                            <div className="absolute bottom-1 right-1 bg-gray-800 text-white text-[8px] px-1 rounded-full font-bold">
                                {task.files?.length}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-t-[#0F111A] border-l-[12px] border-l-transparent opacity-20"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 bg-gray-300 rounded-bl-sm"></div>
                            <FileText className="text-gray-600" size={32} strokeWidth={1.5} />
                            {/* Single File Download Button */}
                            {task.files?.[0] && (
                                <a
                                    href={task.files[0].url}
                                    download={task.files[0].name}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute bottom-1 right-1 p-1 bg-domo-primary text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-domo-primary-hover shadow-sm"
                                    title="Download"
                                >
                                    <Download size={10} />
                                </a>
                            )}
                        </>
                    )}

                    {/* Connection Handles */}
                    <div
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-sm cursor-crosshair hover:scale-125 transition-transform opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center group/handle"
                        onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(task.id, e, 'left'); }}
                        onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(task.id, 'left'); }}
                    >
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
                    </div>
                    <div
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-sm cursor-crosshair hover:scale-125 transition-transform opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center group/handle"
                        onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(task.id, e, 'right'); }}
                        onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(task.id, 'right'); }}
                    >
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
                    </div>
                </div>
                <span className={`mt-2 text-[11px] text-center leading-tight px-1.5 py-0.5 rounded break-all line-clamp-2 max-w-full ${isSelected ? 'bg-domo-highlight text-white' : 'text-gray-200 group-hover:bg-white/10'}`}>
                {task.title}
            </span>
            </div>
        );
    }

    // --- STANDARD CARD RENDER ---
    const isCustomColor = task.color?.startsWith('#');
    const stickyStyle = !isCustomColor && variant === 'sticky' ? getStickyStyle(String(task.id), task.color) : null;

    let cardClasses = "group rounded-lg cursor-grab active:cursor-grabbing transition-shadow relative backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-domo-primary focus:ring-offset-2 dark:focus:ring-offset-[#1E212B] ";

    if (variant === 'sticky') {
        if (stickyStyle) {
            cardClasses += `${stickyStyle.bg} ${stickyStyle.text} ${stickyStyle.border} border p-4 shadow-md hover:shadow-xl duration-200 w-[280px] flex flex-col justify-between absolute select-none ${isExpanded ? 'z-30' : 'z-10'}`;
        } else if (isCustomColor) {
            const textColorClass = getContrastColor(task.color || '#ffffff');
            cardClasses += `${textColorClass} border border-gray-200 dark:border-gray-700 p-4 shadow-md hover:shadow-xl duration-200 w-[280px] flex flex-col justify-between absolute select-none ${isExpanded ? 'z-30' : 'z-10'}`;
        }
    } else {
        cardClasses += `${transparent ? 'bg-black/20 hover:bg-black/30 dark:bg-black/20 dark:hover:bg-black/30 bg-white/40 hover:bg-white/50' : 'bg-white dark:bg-[#22272b] hover:bg-gray-50 dark:hover:bg-[#2c333a]'} p-3 mb-2 border border-gray-200 dark:border-transparent hover:border-gray-300 dark:hover:border-gray-500 shadow-sm z-10`;
    }

    if (isSelected) {
        cardClasses += " ring-4 ring-blue-500/50 dark:ring-blue-400/60 z-20 scale-[1.02] ";
    }

    // 파일 드롭 타겟 하이라이트
    if (isFileDropTarget) {
        cardClasses += " ring-4 ring-green-500/70 dark:ring-green-400/70 z-20 scale-[1.02] bg-green-50 dark:bg-green-900/20 ";
    }

    const formatTimeDisplay = (timeStr: string) => {
        if (!timeStr) return '';
        const parts = timeStr.split('|');
        if (parts.length > 1) {
            return `${parts[0]} ~ ${parts[1]}`;
        }
        return parts[0];
    };

    // 파일 드래그 이벤트 핸들러 - 카운터 방식으로 자식 요소 버블링 문제 해결
    const dragCounterRef = React.useRef(0);

    const handleFileDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleFileDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current++;

        // 처음 진입할 때만 콜백 호출
        if (dragCounterRef.current === 1) {
            const hasInternalFile = e.dataTransfer.types.includes('application/json');
            const hasNativeFile = e.dataTransfer.types.includes('Files');
            if (hasInternalFile || hasNativeFile) {
                onFileDragEnter?.(task.id);
            }
        }
    };

    const handleFileDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounterRef.current--;

        // 완전히 벗어났을 때만 콜백 호출
        if (dragCounterRef.current === 0) {
            onFileDragLeave?.(task.id);
        }
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // 드롭 시 카운터 리셋
        dragCounterRef.current = 0;

        // 네이티브 파일 드롭 확인 (브라우저에서 직접 드래그한 파일)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            onNativeFileDrop?.(task.id, files);
            onFileDragLeave?.(task.id);
            return;
        }

        // 내부 파일 드롭 (앱 내 파일 목록에서 드래그)
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'file' && data.fileId) {
                onFileDrop?.(task.id, data.fileId);
            }
        } catch (err) {
            // JSON 파싱 실패는 무시 (네이티브 파일이 아닌 경우)
        }
        onFileDragLeave?.(task.id);
    };


    return (
        <div
            id={`task-${task.id}`}
            draggable={variant !== 'sticky'}
            onDragStart={handleDragStart}
            onPointerDown={onPointerDown}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            onDragOver={handleFileDragOver}
            onDragEnter={handleFileDragEnter}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
            tabIndex={0}
            className={cardClasses}
            style={{
                ...style,
                backgroundColor: (variant === 'sticky' && isCustomColor) ? task.color : undefined
            }}
        >
            {variant === 'sticky' && (
                <div className="absolute -top-2 -right-2 z-30">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowStatusMenu(!showStatusMenu);
                        }}
                        className="w-7 h-7 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                    >
                        <StatusIcon status={task.status} size={14} />
                    </button>

                    {/* 상태 변경 드롭다운 메뉴 */}
                    {showStatusMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={(e) => { e.stopPropagation(); setShowStatusMenu(false); }}
                            />
                            <div className="absolute top-full right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                {STATUS_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onStatusChange?.(task.id, option.value);
                                            setShowStatusMenu(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                            task.status === option.value ? option.bg : ''
                                        }`}
                                    >
                                        <StatusIcon status={option.value} size={14} />
                                        <span className="text-gray-700 dark:text-gray-200">{option.label}</span>
                                        {task.status === option.value && (
                                            <CheckCircle2 size={12} className="ml-auto text-blue-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="flex justify-between items-start">
        <span className={`${variant === 'sticky' ? 'font-bold text-lg leading-tight mt-1' : 'text-gray-800 dark:text-gray-100 text-sm font-medium'}`}>
          {task.title}
        </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* ATTACH FILE BUTTON */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onAttachFile?.(task.id); }}
                        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                        title="Attach File"
                    >
                        <Paperclip size={14} className="text-gray-500 dark:text-gray-300" />
                    </button>
                    {variant !== 'sticky' ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); onMove?.(); }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1"
                        >
                            <ChevronRight size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="p-1 hover:bg-black/10 rounded-full transition-colors"
                        >
                            <MoreHorizontal size={18} />
                        </button>
                    )}
                </div>
            </div>

            {variant === 'sticky' && task.description && (
                <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden mt-3 ${isExpanded ? 'max-h-96' : 'max-h-[1.45rem]'}`}
                >
                    <p className="text-sm opacity-80 font-medium leading-relaxed">
                        {task.description}
                    </p>
                </div>
            )}

            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden
          ${variant === 'sticky'
                    ? (isExpanded ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0')
                    : 'mt-2'
                }
        `}
            >
                {task.time && (
                    <div className={`text-xs flex items-center gap-1 mb-2 ${variant === 'sticky' ? 'opacity-90 font-semibold' : 'text-domo-highlight'}`}>
                        {variant !== 'sticky' && <div className="w-1.5 h-1.5 rounded-full bg-domo-highlight"></div>}
                        <Clock size={12} className={variant === 'sticky' ? 'inline-block' : 'hidden'} />
                        {formatTimeDisplay(task.time)}
                    </div>
                )}

                <div className="flex items-end justify-between">
                    <div className="flex flex-wrap gap-1">
                        {task.taskType !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm bg-opacity-80 border ${task.taskType === 0 ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                    {task.taskType === 0 ? '일' : '메모'}
                </span>
                        )}
                        {task.tags && task.tags.length > 0 && task.tags.map(tag => {
                            const colorStyle = getStickyStyle(String(tag.id), tag.color);
                            return (
                                <span
                                    key={tag.id}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${colorStyle ? colorStyle.bg : 'bg-gray-100'} ${colorStyle ? colorStyle.text : 'text-gray-800'} ${colorStyle ? colorStyle.border : 'border-gray-200'} shadow-sm bg-opacity-80`}
                                >
                      {tag.name}
                    </span>
                            );
                        })}
                    </div>

                    <div className={`flex gap-2 ${variant === 'sticky' ? 'opacity-70 ml-auto' : 'text-gray-400 dark:text-gray-500'}`}>
                        {(task.description && variant !== 'sticky') && <AlignLeft size={12} />}
                        {/* 첨부 파일 표시 */}
                        {task.files && task.files.length > 0 && (
                            <div className="flex items-center gap-0.5 text-[10px]">
                                {variant === 'sticky' ? (
                                    <div className="flex items-center gap-1 bg-white/40 dark:bg-black/20 px-1.5 py-0.5 rounded-full">
                                        <Paperclip size={10} />
                                        <span className="font-bold">{task.files.length}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-0.5">
                                        <Paperclip size={10} />
                                        <span>{task.files.length}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {task.comments && task.comments.length > 0 && (
                            <div className="flex items-center gap-0.5 text-[10px]">
                                {variant === 'sticky' ? (
                                    <div className="flex items-center gap-1 bg-white/40 dark:bg-black/20 px-1.5 py-0.5 rounded-full">
                                        <span className="font-bold">{task.comments.length}</span>
                                    </div>
                                ) : (
                                    <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[8px] text-gray-700 dark:text-white">
                                        {task.comments.length}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {variant === 'sticky' && (
                <>
                    <div
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-sm cursor-crosshair hover:scale-125 transition-transform z-20 flex items-center justify-center group/handle"
                        onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(task.id, e, 'left'); }}
                        onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(task.id, 'left'); }}
                    >
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
                    </div>
                    <div
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-sm cursor-crosshair hover:scale-125 transition-transform z-20 flex items-center justify-center group/handle"
                        onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(task.id, e, 'right'); }}
                        onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(task.id, 'right'); }}
                    >
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
                    </div>
                </>
            )}
        </div>
    );
};