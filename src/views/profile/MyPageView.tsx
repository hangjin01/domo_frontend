'use client';

import React, { useEffect, useState } from 'react';
import { User } from '@/src/models/types';
import { getMyActivities, ActivityLog } from '@/src/models/api';
import { getMyInfo } from '@/src/models/api';
import { ProfileCard } from './ProfileCard';
import { ActivityList } from './ActivityList';

interface Props {
    initialUser: User | null; // 상위에서 이미 user정보가 있을 수 있음
}

export function MyPageView({ initialUser }: Props) {
    const [user, setUser] = useState<User | null>(initialUser);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                // User정보가 없으면 fetch, 있으면 activities만 병렬 fetch 가능하지만 단순화
                const [userData, activityData] = await Promise.all([
                    user ? Promise.resolve(user) : getMyInfo(),
                    getMyActivities(),
                ]);

                setUser(userData);
                setActivities(activityData);
            } catch (error) {
                console.error('Failed to load mypage data', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
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
                        <ProfileCard user={user} setUser={setUser} />
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