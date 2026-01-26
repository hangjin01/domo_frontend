'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Group, Task } from '@/src/models/types';
import { Layers, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import { GridConfig, DEFAULT_GRID_CONFIG } from '@/src/models/constants/grid';

// ============================================
// 타입 정의
// ============================================

interface SortableGroupProps {
    group: Group;
    tasks: Task[];
    /** 드롭 타겟 하이라이트 여부 */
    isDropTarget: boolean;
    /** 드롭 프리뷰 인덱스 (플레이스홀더 위치) */
    dropPreviewIndex: number | null;
    onPointerDown?: (e: React.PointerEvent, group: Group) => void;
    onTitleEdit?: (groupId: number, newTitle: string) => void;
    onCollapse?: (groupId: number, collapsed: boolean) => void;
    onDelete?: (groupId: number) => void;
    gridConfig?: GridConfig;
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
    gridConfig = DEFAULT_GRID_CONFIG,
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

    // 그룹 내 카드 수
    const cardCount = tasks.filter(t => t.column_id === group.id).length;

    const handleTitleSubmit = () => {
        const trimmedTitle = editTitle.trim();
        if (trimmedTitle && trimmedTitle !== group.title) {
            onTitleEdit?.(group.id, trimmedTitle);
        } else {
            setEditTitle(group.title); // 변경 없으면 원래 값으로 복원
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTitleSubmit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditTitle(group.title);
            setIsEditingTitle(false);
        }
    };

    // 접힌 상태의 높이 계산
    const collapsedHeight = gridConfig.headerHeight + 10;

    return (
        <div
            className={`
                absolute rounded-2xl border-2 transition-all duration-300 ease-out z-0
                ${isDropTarget
                    ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-900/30 shadow-xl shadow-blue-300/30 dark:shadow-blue-900/40 scale-[1.01]'
                    : 'border-dashed border-gray-300/60 dark:border-white/10 bg-white/30 dark:bg-white/5'
                }
                ${!isDropTarget && 'hover:border-gray-400/60 hover:bg-white/40 dark:hover:bg-white/10'}
                backdrop-blur-sm group/sortable-group
            `}
            style={{
                left: group.x,
                top: group.y,
                width: group.width,
                height: group.collapsed ? collapsedHeight : group.height,
                backgroundColor: group.color ? `${group.color}15` : undefined,
                cursor: 'grab',
            }}
            onPointerDown={(e) => onPointerDown?.(e, group)}
        >
            {/* 드롭 타겟 애니메이션 오버레이 */}
            {isDropTarget && (
                <>
                    {/* 펄스 애니메이션 */}
                    <div 
                        className="absolute inset-0 rounded-2xl bg-blue-400/20 animate-pulse pointer-events-none"
                        style={{ animationDuration: '1.5s' }}
                    />
                    
                    {/* 내부 글로우 효과 */}
                    <div className="absolute inset-2 rounded-xl border-2 border-dashed border-blue-400/50 pointer-events-none" />
                    
                    {/* 중앙 드롭 힌트 (빈 그룹일 때) */}
                    {cardCount === 0 && !group.collapsed && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="flex flex-col items-center gap-2 text-blue-500">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center animate-bounce">
                                    <Plus size={24} />
                                </div>
                                <span className="text-sm font-medium">여기에 놓기</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* 헤더 */}
            <div
                className="absolute -top-10 left-0 flex items-center gap-2 z-30"
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* 접기/펼치기 버튼 */}
                <button
                    onClick={() => onCollapse?.(group.id, !group.collapsed)}
                    className="p-1.5 hover:bg-white/60 dark:hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105"
                    title={group.collapsed ? '펼치기' : '접기'}
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
                        if (window.confirm(`"${group.title}" 그룹을 삭제하시겠습니까?\n그룹 내 카드는 자유 배치로 이동됩니다.`)) {
                            onDelete?.(group.id);
                        }
                    }}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 opacity-0 group-hover/sortable-group:opacity-100 hover:scale-105"
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
                        className="bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg text-sm font-bold
                            border-2 border-blue-400 outline-none shadow-lg
                            transition-all duration-200"
                        style={{ width: Math.max(120, editTitle.length * 10 + 20) }}
                        maxLength={50}
                    />
                ) : (
                    <div
                        className={`
                            flex items-center gap-2 font-bold text-sm
                            cursor-text px-3 py-1.5 rounded-xl transition-all duration-200
                            backdrop-blur-md
                            ${isDropTarget
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/40'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                            }
                        `}
                        onClick={() => setIsEditingTitle(true)}
                        title="클릭하여 편집"
                    >
                        <Layers size={16} className={isDropTarget ? 'text-blue-500' : ''} />
                        <span>{group.title}</span>
                        <span className={`text-xs font-normal px-1.5 py-0.5 rounded-full ${
                            isDropTarget 
                                ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200' 
                                : 'text-gray-400 bg-gray-100 dark:bg-gray-800'
                        }`}>
                            {cardCount}
                        </span>
                    </div>
                )}
            </div>

            {/* 드롭 인디케이터 (기존 코드와 호환) */}
            {isDropTarget && !group.collapsed && (
                <div className="absolute inset-0 pointer-events-none rounded-2xl ring-2 ring-blue-400 ring-inset ring-opacity-60" />
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
    if (!isVisible) return null;

    return (
        <div
            className="absolute rounded-xl border-2 border-dashed border-blue-400 
                bg-blue-100/60 dark:bg-blue-900/40
                transition-all duration-200 ease-out pointer-events-none
                animate-pulse"
            style={{
                left: x,
                top: y,
                width,
                height,
                animationDuration: '1.5s',
            }}
        >
            {/* 중앙 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center shadow-lg">
                    <Plus size={20} className="text-blue-600 dark:text-blue-300" />
                </div>
            </div>

            {/* 코너 장식 */}
            <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-blue-400 rounded-tl" />
            <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-blue-400 rounded-tr" />
            <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-blue-400 rounded-bl" />
            <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-blue-400 rounded-br" />
        </div>
    );
};

// ============================================
// Sortable Card Wrapper (레거시 지원용)
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
