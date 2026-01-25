'use client';

import React, { useState, useRef } from 'react';
import { Task } from '../../../types';
import { getStickyStyle } from '../../../lib/utils/canvas';
import { logout } from '../../../lib/api';
import { getImageUrl } from '../../../lib/utils/image';
import { updateProfileImage, updateMyInfo } from '../../../lib/api/user';
import { useUser } from '@/src/lib/contexts/UserContext';
import {
  Settings, Sun, Moon, Bell, Shield, ChevronRight, Mail, LogOut, StretchHorizontal, ChevronLeft, User, Clock, MoreVertical, ChevronDown, Camera, Loader2
} from 'lucide-react';

interface SettingsViewProps {
  initialTab?: 'profile' | 'preferences';
  onLogout?: () => void;
  // user prop is no longer needed as we use UserContext
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'profile', onLogout }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>(initialTab);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Use Global User Context
  const { user, refreshUser } = useUser();

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userName, setUserName] = useState('User Name');
  const [userNickname, setUserNickname] = useState('User');

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with global user context
  React.useEffect(() => {
    if (user) {
      setUserName(user.name);
      setUserNickname(user.nickname || 'User');
      setProfileImage(getImageUrl(user.profile_image) || null);
    }
  }, [user]);


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 로컬 미리보기 (즉시 반응)
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);

      try {
        await updateProfileImage(file);
        refreshUser(); // Global context refresh
      } catch (error) {
        console.error('Failed to update profile image:', error);
        alert('이미지 업로드에 실패했습니다.');
        // 실패 시 원래 이미지로 복구
        setProfileImage(getImageUrl(user?.profile_image) || null);
      }
    }
  };

  const handleSaveName = async () => {
    try {
      await updateMyInfo({ name: userName });
      setIsEditingName(false);
      refreshUser(); // Global context refresh
    } catch (error) {
      console.error('Failed to update name:', error);
      alert('이름 수정에 실패했습니다.');
    }
  };

  // 닉네임 저장 핸들러
  const handleSaveNickname = async () => {
    try {
      await updateMyInfo({ nickname: userNickname });
      setIsEditingNickname(false);
      refreshUser(); // Global context refresh
    } catch (error) {
      console.error('Failed to update nickname:', error);
      alert('닉네임 수정에 실패했습니다.');
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
      if (onLogout) {
        onLogout();
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      alert('로그아웃에 실패했습니다.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayEmail = user?.email || 'user@example.com';

  return (
    <div className="flex-1 overflow-hidden flex animate-in fade-in duration-300">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Settings className="text-gray-400" size={24} />
          설정
        </h2>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
        >
          <User size={18} />
          프로필
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'preferences' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
        >
          <Settings size={18} />
          환경설정
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setActiveTab('preferences')} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">프로필</h3>
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-[#1E212B] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              {/* Avatar Section */}
              <div className="p-8 flex flex-col items-center border-b border-gray-100 dark:border-gray-800">
                <div
                  className="relative group w-48 h-48 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-6xl font-bold shadow-2xl mb-6 transform hover:scale-105 transition-transform duration-300 cursor-pointer overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      {userNickname ? userNickname.slice(0, 2).toUpperCase() : userName.slice(0, 2).toUpperCase()}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={32} className="text-white" />
                      </div>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />

                <div className="w-full">
                  {/* 닉네임 편집 영역 (기존 이름 자리) */}
                  <div className="flex items-center justify-between mb-2 h-10">
                    {isEditingNickname ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
                        <input
                          type="text"
                          value={userNickname}
                          placeholder="닉네임 입력"
                          onChange={(e) => setUserNickname(e.target.value)}
                          className="flex-1 bg-gray-50 dark:bg-black/20 border border-blue-500 rounded-lg px-3 py-1 text-lg font-bold text-gray-900 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNickname();
                            if (e.key === 'Escape') setIsEditingNickname(false);
                          }}
                        />
                        <button
                          onClick={handleSaveNickname}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-md shadow-blue-500/20"
                        >
                          저장
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate pr-4">
                          {userNickname || '닉네임 없음'}
                        </h2>
                        <button
                          onClick={() => setIsEditingNickname(true)}
                          className="text-sm font-bold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap"
                        >
                          편집
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span>온라인</span>
                  </div>



                  <div className="flex gap-2">
                    <button className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      상태 설정
                    </button>
                    <div className="relative flex-1">
                      <button className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between">
                        <span>다음으로 보기</span>
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">내 정보</h3>
                </div>

                {/* 이름 (편집 가능) */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <User size={20} className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-gray-500 mb-0.5">이름</div>
                    {isEditingName ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="flex-1 bg-gray-50 dark:bg-black/20 border border-blue-500 rounded px-2 py-0.5 text-sm  text-gray-900 dark:text-white focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                            if (e.key === 'Escape') setIsEditingName(false);
                          }}
                        />
                        <button
                          onClick={handleSaveName}
                          className="px-2 py-0.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded transition-colors whitespace-nowrap"
                        >
                          저장
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <div className="text-gray-900 dark:text-white text-sm font-medium">{userName}</div>
                        <button onClick={() => setIsEditingName(true)} className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">수정</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Mail size={20} className="text-gray-500" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 mb-0.5">이메일 주소</div>
                    <div className="text-blue-500 hover:underline cursor-pointer text-sm">{displayEmail}</div>
                  </div>
                </div>
              </div>

              {/* About Me */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">내 소개</h3>
                  <button className="text-sm font-bold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400">편집</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="max-w-2xl animate-in slide-in-from-right-4 duration-300 space-y-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">환경설정</h3>
            <section>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-1">앱 설정</h3>
              <div className="bg-white dark:bg-[#1E212B] rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-sm divide-y divide-gray-200 dark:divide-gray-700/50">
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2c333a] transition-colors cursor-pointer" onClick={() => document.documentElement.classList.toggle('dark')}>
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
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition dark:translate-x-6 translate-x-1" />
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2c333a] transition-colors">
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
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2c333a] transition-colors">
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

            <section>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-1">기타</h3>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-4 bg-white dark:bg-[#1E212B] border border-gray-200 dark:border-gray-700/50 rounded-xl text-left hover:border-domo-primary transition-colors group">
                  <Mail className="mb-3 text-gray-400 group-hover:text-domo-primary transition-colors" size={24} />
                  <div className="font-bold text-gray-900 dark:text-white">지원 문의</div>
                  <div className="text-xs text-gray-500 mt-1">도움이 필요하신가요?</div>
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-4 bg-white dark:bg-[#1E212B] border border-gray-200 dark:border-gray-700/50 rounded-xl text-left hover:border-red-500 transition-colors group"
                >
                  {isLoggingOut ? (
                    <Loader2 className="mb-3 text-gray-400 animate-spin" size={24} />
                  ) : (
                    <LogOut className="mb-3 text-gray-400 group-hover:text-red-500 transition-colors" size={24} />
                  )}
                  <div className="font-bold text-gray-900 dark:text-white group-hover:text-red-500">로그아웃</div>
                  <div className="text-xs text-gray-500 mt-1">계정에서 로그아웃합니다.</div>
                </button>
              </div>
            </section>
          </div>
        )}
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
