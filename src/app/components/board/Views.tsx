'use client';

import React, { useState } from 'react';
import { Task } from '../../../types';
import { getStickyStyle } from '../../../lib/utils/canvas';
import { logout } from '../../../lib/api';
import {
    Settings, Sun, Moon, Bell, Shield, ChevronRight, Mail, LogOut, StretchHorizontal, ChevronLeft, Loader2
} from 'lucide-react';

interface SettingsViewProps {
    onLogout?: () => void;  // 로그아웃 후 콜백
    user?: {
        name: string;
        email: string;
        profile_image?: string | null;
    };
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onLogout, user }) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    // ✅ 로그아웃 API 연결
    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        try {
            await logout();
            // 로그아웃 성공 후 콜백 실행
            if (onLogout) {
                onLogout();
            } else {
                // 콜백이 없으면 페이지 새로고침
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Logout failed:', error);
            alert('로그아웃에 실패했습니다.');
        } finally {
            setIsLoggingOut(false);
        }
    };

    const toggleDarkMode = () => {
        document.documentElement.classList.toggle('dark');
        setIsDarkMode(!isDarkMode);
    };

    const displayName = user?.name || 'User Name';
    const displayEmail = user?.email || 'user@example.com';
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
        <div className="flex-1 overflow-auto p-8 animate-in fade-in duration-300">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <Settings className="text-gray-400" size={32} />
                설정
            </h2>

            <div className="max-w-3xl space-y-10">
                {/* 계정 섹션 */}
                <section>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-1">계정</h3>
                    <div className="bg-white dark:bg-[#1E212B] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-sm">
                        <div className="p-6 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-domo-primary to-domo-highlight flex items-center justify-center text-white text-xl font-bold shadow-inner overflow-hidden">
                                {user?.profile_image ? (
                                    <img src={user.profile_image} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{displayName}</h4>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">{displayEmail}</p>
                            </div>
                            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors">
                                프로필 편집
                            </button>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700/50 px-6 py-4 bg-gray-50 dark:bg-[#16181D]/50 flex justify-between items-center">
                            <span className="text-sm text-gray-500">현재 Free 플랜을 사용 중입니다.</span>
                            <button className="text-domo-primary text-sm font-bold hover:underline">Pro로 업그레이드</button>
                        </div>
                    </div>
                </section>

                {/* 앱 설정 섹션 */}
                <section>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-1">앱 설정</h3>
                    <div className="bg-white dark:bg-[#1E212B] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-sm divide-y divide-gray-200 dark:divide-gray-700/50">
                        {/* 다크 모드 토글 */}
                        <div
                            className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2c333a] transition-colors cursor-pointer"
                            onClick={toggleDarkMode}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                                    <Sun size={18} className="hidden dark:block" />
                                    <Moon size={18} className="block dark:hidden" />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">다크 모드</div>
                                    <div className="text-xs text-gray-500">어두운 테마로 전환합니다.</div>
                                </div>
                            </div>
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDarkMode ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </div>

                        {/* 알림 설정 */}
                        <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2c333a] transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                                    <Bell size={18} />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">알림 설정</div>
                                    <div className="text-xs text-gray-500">푸시 알림 및 이메일 알림을 관리합니다.</div>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-400" />
                        </div>

                        {/* 개인정보 및 보안 */}
                        <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2c333a] transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">개인정보 및 보안</div>
                                    <div className="text-xs text-gray-500">비밀번호 변경 및 2단계 인증</div>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-gray-400" />
                        </div>
                    </div>
                </section>

                {/* 기타 섹션 */}
                <section>
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-1">기타</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-4 bg-white dark:bg-[#1E212B] border border-gray-200 dark:border-gray-700/50 rounded-xl text-left hover:border-domo-primary transition-colors group">
                            <Mail className="mb-3 text-gray-400 group-hover:text-domo-primary transition-colors" size={24} />
                            <div className="font-bold text-gray-900 dark:text-white">지원 문의</div>
                            <div className="text-xs text-gray-500 mt-1">도움이 필요하신가요?</div>
                        </button>

                        {/* ✅ 로그아웃 버튼 - API 연결 */}
                        <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="p-4 bg-white dark:bg-[#1E212B] border border-gray-200 dark:border-gray-700/50 rounded-xl text-left hover:border-red-500 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoggingOut ? (
                                <Loader2 className="mb-3 text-red-500 animate-spin" size={24} />
                            ) : (
                                <LogOut className="mb-3 text-gray-400 group-hover:text-red-500 transition-colors" size={24} />
                            )}
                            <div className="font-bold text-gray-900 dark:text-white group-hover:text-red-500">
                                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">계정에서 로그아웃합니다.</div>
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export const CalendarView = ({ tasks, onTaskSelect }: { tasks: Task[], onTaskSelect: (t: Task) => void }) => {
    const [date, setDate] = useState(new Date());

    const year = date.getFullYear();
    const month = date.getMonth();
    const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-32 border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20"></div>);
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
                        <div key={t.id} onClick={() => onTaskSelect(t)} className="text-xs bg-white dark:bg-[#2c333a] border border-gray-200 dark:border-gray-700 p-1.5 rounded truncate cursor-pointer hover:border-domo-primary hover:shadow-sm transition-all text-gray-700 dark:text-gray-300">{t.title}</div>
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
                    <button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"><ChevronLeft /></button>
                    <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"><ChevronRight /></button>
                </div>
            </header>
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex-1">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (<div key={day} className="bg-gray-100 dark:bg-[#1E212B] p-2 text-center text-sm font-bold text-gray-500">{day}</div>))}
                <div className="contents bg-white dark:bg-[#16181D]">{days}</div>
            </div>
        </div>
    );
};

export const TimelineView = ({ tasks, onTaskSelect }: { tasks: Task[], onTaskSelect: (t: Task) => void }) => {
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><StretchHorizontal className="text-domo-primary" /><span>타임라인</span></h2>
                    <span className="text-xl text-gray-500 dark:text-gray-400 font-medium">{year}년 {month + 1}월</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"><ChevronLeft /></button>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"><ChevronRight /></button>
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
                            <div key={d} className={`w-[40px] flex-shrink-0 p-2 text-center text-xs font-medium border-r border-gray-100 dark:border-gray-800/50 ${isToday(d) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500'}`}>{d}</div>
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
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: isCustom ? task.color : (stickyColor?.id === 'yellow' ? '#FDE047' : stickyColor?.id === 'blue' ? '#93C5FD' : '#cbd5e1') }}></div>
                                        <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{task.title}</span>
                                    </div>
                                    <div className="w-32 p-3 border-l border-gray-200 dark:border-gray-800 flex items-center">
                                        {task.comments?.length ? (
                                            <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">{task.comments[0].user[0]}</div><span className="text-xs text-gray-500 truncate">{task.comments[0].user}</span></div>
                                        ) : <span className="text-xs text-gray-400 italic">-</span>}
                                    </div>
                                    <div className="w-40 p-3 border-l border-gray-200 dark:border-gray-800 text-xs text-gray-500 font-mono flex items-center">{task.time?.replace('|', ' ~ ') || '-'}</div>
                                </div>
                                <div className="relative flex h-12 items-center">
                                    <div className="absolute inset-0 flex pointer-events-none">
                                        {days.map(d => (<div key={d} className={`w-[40px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800/30 h-full ${isToday(d) ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}></div>))}
                                    </div>
                                    {pos && (
                                        <div className={`absolute h-6 rounded-md shadow-sm border cursor-pointer hover:brightness-105 transition-all ${!isCustom && stickyColor ? `${stickyColor.bg} ${stickyColor.border}` : 'bg-gray-200 border-gray-300'}`} style={{ left: `${pos.left + 4}px`, width: `${Math.max(pos.width - 8, 4)}px`, backgroundColor: isCustom ? task.color : undefined }} onClick={() => onTaskSelect(task)} title={`${task.title} (${task.time})`}>
                                            {!isCustom && stickyColor && (<div className={`w-full h-full opacity-20 ${stickyColor.dot}`}></div>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};