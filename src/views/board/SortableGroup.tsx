'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Group, Task } from '@/src/models/types';
import { Layers, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

// ============================================
// 타입 정의
// ============================================

interface SortableGroupProps {
    group: Group;
    tasks: Task[];
    isDropTarget: boolean;
    dropPreviewIndex: number | null;
    onPointerDown?: (e: React.PointerEvent, group: Group) => void;
    onTitleEdit?: (groupId: number, newTitle: string) => void;
    onCollapse?: (groupId: number, collapsed: boolean) => void;
    onDelete?: (groupId: number) => void;
    gridConfig: {
        columns: number;
        cardWidth: number;
        cardHeight: number;
        gap: number;
        padding: number;
        headerHeight: number;
    };
    children: React.ReactNode;
    renderPlaceholder?: () => React.ReactNode;
}

// ============================================
// 그룹 컴포넌트
// ============================================

export const SortableGroup: React.FC<SortableGroupProps> = ({
                                                                group,
                                                                tasks,
                                                                isDropTarget,
                                                                dropPreviewIndex,
                                                                onPointerDown,
                                                                onTitleEdit,
                                                                onCollapse,
                                                                onDelete,
                                                                gridConfig,
                                                                children,
                                                                renderPlaceholder,
                                                            }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(group.title);
    const inputRef = useRef<HTMLInputElement>(null);

    // 타이틀 편집 모드 시 포커스
    useEffect(() => {
        if (isEditingTitle && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditingTitle]);

    // 그룹 내 카드 수 (표시용)
    const cardCount = tasks.filter(t => t.column_id === group.id).length;

    const handleTitleSubmit = () => {
        if (editTitle.trim() && editTitle !== group.title) {
            onTitleEdit?.(group.id, editTitle.trim());
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleSubmit();
        } else if (e.key === 'Escape') {
            setEditTitle(group.title);
            setIsEditingTitle(false);
        }
    };

    return (
        <div
            className={`
                absolute rounded-2xl border-2 border-dashed transition-all duration-200 z-0
                ${isDropTarget
                ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg shadow-blue-200/50'
                : 'border-gray-300/60 dark:border-white/10 bg-white/30 dark:bg-white/5'
            }
                backdrop-blur-sm hover:border-blue-400/50 hover:bg-white/40 dark:hover:bg-white/10
                group/sortable-group
            `}
            style={{
                left: group.x,
                top: group.y,
                width: group.width,
                height: group.collapsed ? gridConfig.headerHeight + 10 : group.height,
                backgroundColor: group.color ? `${group.color}20` : undefined,
                cursor: 'grab',
            }}
            onPointerDown={(e) => onPointerDown?.(e, group)}
        >
            {/* 헤더 */}
            <div
                className="absolute -top-10 left-0 flex items-center gap-2 z-30"
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* 접기/펼치기 버튼 */}
                <button
                    onClick={() => {
                        onCollapse?.(group.id, !group.collapsed);
                    }}
                    className="p-1 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                    {group.collapsed
                        ? <ChevronRight size={16} className="text-gray-500" />
                        : <ChevronDown size={16} className="text-gray-500" />
                    }
                </button>

                {/* 삭제 버튼 */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(group.id);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover/sortable-group:opacity-100"
                    title="그룹 삭제"
                >
                    <Trash2 size={16} className="text-red-500" />
                </button>

                {/* 타이틀 */}
                {isEditingTitle ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={handleTitleSubmit}
                        onKeyDown={handleTitleKeyDown}
                        className="bg-white dark:bg-gray-900 px-2 py-1 rounded-lg text-sm font-bold
                       border border-blue-400 outline-none shadow-lg"
                        style={{ width: Math.max(100, editTitle.length * 10) }}
                    />
                ) : (
                    <div
                        className="flex items-center gap-2 text-gray-500 dark:text-gray-400
                       hover:text-gray-900 dark:hover:text-white font-bold text-sm
                       cursor-text px-3 py-1.5 hover:bg-white/50 dark:hover:bg-white/10
                       rounded-xl transition-colors backdrop-blur-md"
                        onClick={() => setIsEditingTitle(true)}
                    >
                        <Layers size={16} />
                        <span>{group.title}</span>
                        <span className="text-xs font-normal text-gray-400">
              ({cardCount})
            </span>
                    </div>
                )}
            </div>

            {/* 드롭 인디케이터 */}
            {isDropTarget && !group.collapsed && (
                <div className="absolute inset-0 pointer-events-none rounded-2xl ring-2 ring-blue-400 ring-inset" />
            )}
        </div>
    );
};

// ============================================
// 드롭 플레이스홀더 컴포넌트
// ============================================

interface DropPlaceholderProps {
    x: number;
    y: number;
    width: number;
    height: number;
    isVisible: boolean;
}

export const DropPlaceholder: React.FC<DropPlaceholderProps> = ({
                                                                    x,
                                                                    y,
                                                                    width,
                                                                    height,
                                                                    isVisible,
                                                                }) => {
    return (
        <div
            className={`
        absolute rounded-xl border-2 border-dashed border-blue-400 
        bg-blue-100/50 dark:bg-blue-900/30
        transition-all duration-200 ease-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
            style={{
                left: x,
                top: y,
                width,
                height,
                pointerEvents: 'none',
            }}
        >
            {/* 중앙 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                    <svg
                        className="w-4 h-4 text-blue-600 dark:text-blue-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

// ============================================
// Sortable Card Wrapper
// ============================================

interface SortableCardProps {
    taskId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    translateX: number;
    translateY: number;
    isDragging: boolean;
    children: React.ReactNode;
    onDragStart: (taskId: number, e: React.PointerEvent) => void;
}

export const SortableCard: React.FC<SortableCardProps> = ({
                                                              taskId,
                                                              x,
                                                              y,
                                                              width,
                                                              height,
                                                              translateX,
                                                              translateY,
                                                              isDragging,
                                                              children,
                                                              onDragStart,
                                                          }) => {
    return (
        <div
            className={`
        absolute transition-transform duration-200 ease-out
        ${isDragging ? 'z-50 cursor-grabbing' : 'z-10 cursor-grab'}
      `}
            style={{
                left: x,
                top: y,
                width,
                height,
                transform: isDragging
                    ? 'none'
                    : `translate(${translateX}px, ${translateY}px)`,
                opacity: isDragging ? 0.8 : 1,
                boxShadow: isDragging
                    ? '0 20px 40px rgba(0,0,0,0.2), 0 10px 20px rgba(0,0,0,0.1)'
                    : undefined,
            }}
            onPointerDown={(e) => {
                e.stopPropagation();
                onDragStart(taskId, e);
            }}
        >
            {children}
        </div>
    );
};

export default SortableGroup;