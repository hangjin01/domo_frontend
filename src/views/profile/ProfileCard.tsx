/**
 * [파일 안내] frontend/src/views/profile/ProfileCard.tsx
 * 이름·닉네임·프로필 이미지를 보여 주고 편집 요청을 API에 전달합니다.
 * mock 이미지는 작은 data URL을 브라우저에 저장합니다. 실제 파일 업로드와 저장 용량/오류 처리가 다릅니다.
 */

'use client';

import React, { useState, useRef } from 'react';
import { User } from '@/src/models/types'; // 기존 types 경로 확인 필요
import { updateProfileImage, updateMyInfo } from '@/src/models/api';
import { getImageUrl } from '@/src/models/utils/image';
import { Camera, Edit2, Save, X, User as UserIcon } from 'lucide-react'; // 아이콘 라이브러리 (기존 프로젝트에 없으면 heroicons 등으로 대체)

interface Props {
    user: User;
    setUser: (user: User) => void;
}

export function ProfileCard({ user, setUser }: Props) {
    const [isUploading, setIsUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(user.name);
    const [newNickname, setNewNickname] = useState(user.nickname || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const updatedUser = await updateProfileImage(file);
            setUser(updatedUser);
        } catch (error) {
            console.error('Profile image update failed', error);
            alert(error instanceof Error ? error.message : '이미지 업로드 실패');
        } finally {
            setIsUploading(false);
        }
    };

    const handleProfileUpdate = async () => {
        const nameChanged = newName.trim() && newName !== user.name;
        const nicknameChanged = newNickname !== (user.nickname || '');

        if (!nameChanged && !nicknameChanged) {
            setIsEditing(false);
            return;
        }

        try {
            const updateData: { name?: string; nickname?: string } = {};
            if (nameChanged) updateData.name = newName;
            if (nicknameChanged) updateData.nickname = newNickname;

            const updatedUser = await updateMyInfo(updateData);
            setUser(updatedUser);
            setIsEditing(false);
        } catch (error) {
            console.error('Profile update failed', error);
            alert('프로필 수정 실패');
        }
    };

    return (
        <div className="relative group w-full max-w-sm mx-auto bg-white/40 dark:bg-[var(--surface-panel)]/60 backdrop-blur-md border border-white/20 dark:border-gray-700/50 rounded-2xl p-8 shadow-xl flex flex-col items-center">
            {/* 프로필 이미지 */}
            <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-lg relative group-hover:border-domo-primary transition-colors duration-300 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    {user.profile_image ? (
                        <img
                            src={getImageUrl(user.profile_image)}
                            alt={user.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <UserIcon size={48} className="text-white" />
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 p-2 bg-domo-primary hover:bg-domo-primary-hover text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
                    disabled={isUploading}
                >
                    <Camera size={16} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                />
            </div>

            {/* 사용자 정보 */}
            <div className="w-full text-center space-y-2">
                {isEditing ? (
                    <div className="flex flex-col items-center gap-3 mb-2 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="이름"
                                className="bg-black/10 dark:bg-black/30 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-center text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-domo-primary"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newNickname}
                                onChange={(e) => setNewNickname(e.target.value)}
                                placeholder="닉네임 (선택)"
                                className="bg-black/10 dark:bg-black/30 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-center text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-domo-primary"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleProfileUpdate} className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded">
                                <Save size={16} />
                            </button>
                            <button onClick={() => setIsEditing(false)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center justify-center gap-2">
                            {user.name}
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-gray-400 hover:text-domo-primary transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Edit2 size={14} />
                            </button>
                        </h2>
                        {user.nickname && (
                            <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                                @{user.nickname}
                            </p>
                        )}
                    </>
                )}

                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide">
                    {user.email}
                </p>

                <div className="pt-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              user.is_student_verified
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
          }`}>
            {user.is_student_verified ? 'STUDENT VERIFIED' : 'UNVERIFIED'}
          </span>
                </div>
            </div>
        </div>
    );
}
