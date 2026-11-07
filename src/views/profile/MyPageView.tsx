/**
 * [파일 안내] frontend/src/views/profile/MyPageView.tsx
 * 프로필과 내 활동 영역을 묶는 마이페이지입니다. 사용자 정보와 하위 편집 컴포넌트를 연결합니다.
 * 표시용 사용자 상태와 저장 후 재조회된 사용자 상태를 일치시켜야 다른 화면에서도 변경된 이름이 보입니다.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { User } from '@/src/models/types';
import { getMyActivities, ActivityLog } from '@/src/models/api';
import { useUser } from '@/src/lib/contexts/UserContext';
import { ProfileCard } from './ProfileCard';
import { ActivityList } from './ActivityList';

interface Props {
    initialUser: User | null; // 상위에서 이미 user정보가 있을 수 있음
}

export function MyPageView({ initialUser }: Props) {
    // 프로필 저장 결과를 루트 상태에 반영하여 설정·보드·마이페이지의 사용자 사본이 갈라지지 않게 합니다.
    const { user: currentUser, updateUser } = useUser();
    const user = currentUser ?? initialUser;
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function loadData() {
            try {
                const activityData = await getMyActivities();
                if (!cancelled) setActivities(activityData);
            } catch (error) {
                console.error('Failed to load mypage data', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadData();
        return () => { cancelled = true; };
    }, []);

    if (loading && !user) {
        return (
            <div className="w-full h-full flex items-center justify-center text-domo-primary animate-pulse">
                Loading...
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="w-full h-full p-8 md:p-12 overflow-y-auto animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-8 tracking-tight">
                    My Page
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)] min-h-[500px]">
                    {/* Left Column: Profile */}
                    <div className="lg:col-span-1">
                        <ProfileCard user={user} setUser={updateUser} />
                    </div>

                    {/* Right Column: Activities */}
                    <div className="lg:col-span-2 h-full">
                        <ActivityList activities={activities} />
                    </div>
                </div>
            </div>
        </div>
    );
}
