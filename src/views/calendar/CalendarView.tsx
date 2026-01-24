'use client';

import React, { useState } from 'react';
import { Task } from '@/src/models/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskSelect }) => {
  const [date, setDate] = useState(new Date());

  const year = date.getFullYear();
  const month = date.getMonth();
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(
      <div key={`empty-${i}`} className="h-32 border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20"></div>
    );
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => {
      if (!t.time) return false;
      if (t.time.includes('|')) {
        const [start, end] = t.time.split('|');
        if (end) return dateStr >= start && dateStr <= end;
      }
      return t.time.startsWith(dateStr);
    });

    days.push(
      <div key={d} className="h-32 border border-gray-200 dark:border-gray-800 p-2 overflow-y-auto hover:bg-gray-50 dark:hover:bg-white/5 transition-colors relative">
        <div className="text-sm font-medium text-gray-500 mb-1">{d}</div>
        <div className="space-y-1">
          {dayTasks.map(t => (
            <div
              key={t.id}
              onClick={() => onTaskSelect(t)}
              className="text-xs bg-white dark:bg-[#2c333a] border border-gray-200 dark:border-gray-700 p-1.5 rounded truncate cursor-pointer hover:border-domo-primary hover:shadow-sm transition-all text-gray-700 dark:text-gray-300"
            >
              {t.title}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8 overflow-hidden">
      <header className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{year}년 {monthNames[month]}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setDate(new Date(year, month - 1, 1))}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => setDate(new Date(year, month + 1, 1))}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"
          >
            <ChevronRight />
          </button>
        </div>
      </header>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex-1">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="bg-gray-100 dark:bg-[#1E212B] p-2 text-center text-sm font-bold text-gray-500">
            {day}
          </div>
        ))}
        <div className="contents bg-white dark:bg-[#16181D]">{days}</div>
      </div>
    </div>
  );
};

export default CalendarView;
