
'use client';

import React, { useState } from 'react';
import { Task } from '../../../types';
import { getStickyStyle, getContrastColor } from '../../../lib/utils/canvas.ts';
import { 
  FolderOpen, FileText, Download, Folder, Clock, AlignLeft, Paperclip, MoreHorizontal, ChevronRight 
} from 'lucide-react';

interface TaskCardProps { 
  task: Task; 
  onClick: () => void; 
  onMove?: () => void; 
  transparent?: boolean;
  variant?: 'default' | 'sticky';
  style?: React.CSSProperties;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onConnectStart?: (taskId: string, e: React.PointerEvent) => void;
  onConnectEnd?: (taskId: string) => void;
  onAttachFile?: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, onClick, onMove, transparent, variant = 'default', style, isSelected, onPointerDown, onConnectStart, onConnectEnd, onAttachFile 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
              id={`task-${String(task.id)}`}
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
                    onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(String(task.id), e); }}
                    onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(String(task.id)); }}
                >
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
                </div>
                <div 
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-sm cursor-crosshair hover:scale-125 transition-transform opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center group/handle"
                    onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(String(task.id), e); }}
                    onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(String(task.id)); }}
                >
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
                </div>
            </div>
        );
    }
    
    // COLLAPSED / SINGLE FILE VIEW
    return (
        <div 
          id={`task-${String(task.id)}`}
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
                    onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(String(task.id), e); }}
                    onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(String(task.id)); }}
                >
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
                </div>
                <div 
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-sm cursor-crosshair hover:scale-125 transition-transform opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center group/handle"
                    onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(String(task.id), e); }}
                    onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(String(task.id)); }}
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

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'inbox': return '수신함';
      case 'todo': return '할 일';
      case 'doing': return '진행 중';
      case 'done': return '완료';
      default: return status;
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split('|');
    if (parts.length > 1) {
        return `${parts[0]} ~ ${parts[1]}`;
    }
    return parts[0];
  };

  return (
    <div 
      id={`task-${String(task.id)}`}
      draggable={variant !== 'sticky'}
      onDragStart={handleDragStart}
      onPointerDown={onPointerDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={cardClasses}
      style={{
          ...style,
          backgroundColor: (variant === 'sticky' && isCustomColor) ? task.color : undefined
      }}
    >
      {variant === 'sticky' && (
          <div className="absolute -top-3 left-3 bg-white/80 dark:bg-black/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider opacity-70 border border-black/5 shadow-sm backdrop-blur-md text-gray-800 dark:text-gray-100">
              {getStatusLabel(task.status)}
          </div>
      )}

      <div className="flex justify-between items-start">
        <span className={`${variant === 'sticky' ? 'font-bold text-lg leading-tight mt-1' : 'text-gray-800 dark:text-gray-100 text-sm font-medium'}`}>
          {task.title}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* ATTACH FILE BUTTON */}
            <button 
                onClick={(e) => { e.stopPropagation(); onAttachFile?.(String(task.id)); }}
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
                onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(String(task.id), e); }}
                onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(String(task.id)); }}
            >
                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
            </div>
            <div 
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full shadow-sm cursor-crosshair hover:scale-125 transition-transform z-20 flex items-center justify-center group/handle"
                onPointerDown={(e) => { e.stopPropagation(); onConnectStart?.(String(task.id), e); }}
                onPointerUp={(e) => { e.stopPropagation(); onConnectEnd?.(String(task.id)); }}
            >
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover/handle:bg-domo-primary transition-colors"></div>
            </div>
        </>
      )}
    </div>
  );
};
