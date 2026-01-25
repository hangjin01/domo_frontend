'use client';

import React, { useState, useRef } from 'react';
import { logout } from '@/src/models/api';
import { updateProfileImage, updateMyInfo } from '@/src/models/api/user';
import {
  Settings, Sun, Moon, Bell, Shield, ChevronRight, Mail, LogOut, ChevronLeft, User, Clock, MoreVertical, ChevronDown, Camera, Loader2
} from 'lucide-react';

interface SettingsViewProps {
  initialTab?: 'profile' | 'preferences';
  onLogout?: () => void;
  user?: {
    name: string;
    email: string;
    profile_image?: string | null;
  };
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'profile', onLogout, user }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>(initialTab);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [profileImage, setProfileImage] = useState<string | null>(user?.profile_image || null);
  const [userName, setUserName] = useState(user?.name || 'User Name');
  const [isEditingName, setIsEditingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);

      try {
        await updateProfileImage(file);
      } catch (error) {
        console.error('Failed to update profile image:', error);
        alert('이미지 업로드에 실패했습니다.');
      }
    }
  };

  const handleSaveName = async () => {
    try {
      await updateMyInfo({ name: userName });
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to update name:', error);
      alert('이름 수정에 실패했습니다.');
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
                      {userName.slice(0, 2).toUpperCase()}
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
                  <div className="flex items-center justify-between mb-2 h-10">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="flex-1 bg-gray-50 dark:bg-black/20 border border-blue-500 rounded-lg px-3 py-1 text-lg font-bold text-gray-900 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                            if (e.key === 'Escape') setIsEditingName(false);
                          }}
                        />
                        <button
                          onClick={handleSaveName}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-md shadow-blue-500/20"
                        >
                          저장
                        </button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate pr-4">{userName}</h2>
                        <button
                          onClick={() => setIsEditingName(true)}
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

                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <Clock size={16} />
                    <span>현지 시간 오후 7:35</span>
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
                  <h3 className="font-bold text-gray-900 dark:text-white">연락처 정보</h3>
                  <button className="text-sm font-bold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400">편집</button>
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
                <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2c333a] transition-colors cursor-pointer" onClick={() => {
                  const isDark = document.documentElement.classList.toggle('dark');
                  localStorage.setItem('theme', isDark ? 'dark' : 'light');
                }}>
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

export default SettingsView;
