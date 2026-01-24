'use client';

import React, { useState } from 'react';
import { Task } from '@/src/models/types';
import { getStickyStyle } from '@/src/models/utils/canvas';
import { StretchHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimelineViewProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onTaskSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const CELL_WIDTH = 40;

  const isToday = (d: number) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
  };

  const getTaskPosition = (task: Task) => {
    if (!task.time) return null;
    let start: Date, end: Date;
    if (task.time.includes('|')) {
      const parts = task.time.split('|');
      start = new Date(parts[0]);
      end = new Date(parts[1]);
    } else {
      start = new Date(task.time);
      end = new Date(task.time);
    }
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    if (end < monthStart || start > monthEnd) return null;
    const effStart = start < monthStart ? monthStart : start;
    const effEnd = end > monthEnd ? monthEnd : end;
    const startDay = effStart.getDate();
    const diffTime = Math.abs(effEnd.getTime() - effStart.getTime());
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return { left: (startDay - 1) * CELL_WIDTH, width: duration * CELL_WIDTH };
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden">
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <StretchHorizontal className="text-domo-primary" />
            <span>타임라인</span>
          </h2>
          <span className="text-xl text-gray-500 dark:text-gray-400 font-medium">{year}년 {month + 1}월</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
          >
            <ChevronRight />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-[#16181D] shadow-sm relative custom-scrollbar">
        <div className="flex min-w-max sticky top-0 z-20 bg-gray-50 dark:bg-[#1E212B] border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="sticky left-0 z-30 flex bg-gray-50 dark:bg-[#1E212B] border-r border-gray-200 dark:border-gray-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
            <div className="w-64 p-3 text-sm font-bold text-gray-500 uppercase tracking-wider">Task</div>
            <div className="w-32 p-3 text-sm font-bold text-gray-500 uppercase tracking-wider border-l border-gray-200 dark:border-gray-800">Member</div>
            <div className="w-40 p-3 text-sm font-bold text-gray-500 uppercase tracking-wider border-l border-gray-200 dark:border-gray-800">Date</div>
          </div>
          <div className="flex">
            {days.map(d => (
              <div
                key={d}
                className={`w-[40px] flex-shrink-0 p-2 text-center text-xs font-medium border-r border-gray-100 dark:border-gray-800/50 ${isToday(d) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500'}`}
              >
                {d}
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-max">
          {tasks.map(task => {
            const pos = getTaskPosition(task);
            const isCustom = task.color?.startsWith('#');
            const stickyColor = !isCustom ? getStickyStyle(String(task.id), task.color) : null;
            return (
              <div key={task.id} className="flex hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-gray-800/50 group/row">
                <div className="sticky left-0 z-10 flex bg-white dark:bg-[#16181D] group-hover/row:bg-gray-50 dark:group-hover/row:bg-[#1E212B] transition-colors border-r border-gray-200 dark:border-gray-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                  <div className="w-64 p-3 flex items-center gap-2 overflow-hidden cursor-pointer" onClick={() => onTaskSelect(task)}>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: isCustom ? task.color : (stickyColor?.id === 'yellow' ? '#FDE047' : stickyColor?.id === 'blue' ? '#93C5FD' : '#cbd5e1') }}
                    ></div>
                    <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{task.title}</span>
                  </div>
                  <div className="w-32 p-3 border-l border-gray-200 dark:border-gray-800 flex items-center">
                    {task.comments?.length ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                          {task.comments[0].user[0]}
                        </div>
                        <span className="text-xs text-gray-500 truncate">{task.comments[0].user}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">-</span>
                    )}
                  </div>
                  <div className="w-40 p-3 border-l border-gray-200 dark:border-gray-800 text-xs text-gray-500 font-mono flex items-center">
                    {task.time?.replace('|', ' ~ ') || '-'}
                  </div>
                </div>
                <div className="relative flex h-12 items-center">
                  <div className="absolute inset-0 flex pointer-events-none">
                    {days.map(d => (
                      <div
                        key={d}
                        className={`w-[40px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800/30 h-full ${isToday(d) ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}
                      ></div>
                    ))}
                  </div>
                  {pos && (
                    <div
                      className={`absolute h-6 rounded-md shadow-sm border cursor-pointer hover:brightness-105 transition-all ${!isCustom && stickyColor ? `${stickyColor.bg} ${stickyColor.border}` : 'bg-gray-200 border-gray-300'}`}
                      style={{
                        left: `${pos.left + 4}px`,
                        width: `${Math.max(pos.width - 8, 4)}px`,
                        backgroundColor: isCustom ? task.color : undefined
                      }}
                      onClick={() => onTaskSelect(task)}
                      title={`${task.title} (${task.time})`}
                    >
                      {!isCustom && stickyColor && (<div className={`w-full h-full opacity-20 ${stickyColor.dot}`}></div>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
