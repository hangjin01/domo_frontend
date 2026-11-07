/**
 * [파일 안내] frontend/src/lib/contexts/UserContext.tsx
 * 여러 페이지가 공유하는 현재 로그인 사용자 상태를 제공합니다. UserProvider가 getMyInfo를 호출하고 useUser로 소비합니다.
 * refreshUser는 로그인/프로필 변경 뒤 재조회용, clearUser는 로그아웃 후 메모리 상태 제거용입니다.
 * 컨텍스트는 편의 상태이지 보안 경계가 아닙니다. 실제 API 권한은 서버 세션으로 다시 확인해야 합니다.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/src/models/types';
import { getMyInfo } from '@/src/models/api';

interface UserContextType {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    updateUser: (userData: User) => void;
    clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            setLoading(true);
            const userData = await getMyInfo();
            setUser(userData);
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateUser = useCallback((userData: User) => {
        setUser(userData);
    }, []);

    const clearUser = useCallback(() => {
        setUser(null);
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    return (
        <UserContext.Provider value={{ user, loading, refreshUser, updateUser, clearUser }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
