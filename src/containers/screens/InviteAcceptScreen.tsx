'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Loader2,
    CheckCircle2,
    XCircle,
    Users,
    ArrowRight,
    LogIn
} from 'lucide-react';
import { getInvitationInfo, acceptInvitation, getCurrentUser } from '@/src/models/api';

interface InviteAcceptScreenProps {
    token: string;
}

type ScreenState = 'loading' | 'info' | 'accepting' | 'success' | 'error' | 'login_required';

export const InviteAcceptScreen: React.FC<InviteAcceptScreenProps> = ({ token }) => {
    const router = useRouter();
    const [state, setState] = useState<ScreenState>('loading');
    const [inviteInfo, setInviteInfo] = useState<{
        workspace_name: string;
        inviter_name: string;
        role: string;
    } | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    // 로그인 상태 & 초대 정보 확인
    useEffect(() => {
        const checkStatusAndFetchInfo = async () => {
            try {
                // 1. 로그인 상태 확인
                try {
                    await getCurrentUser();
                    setIsLoggedIn(true);
                } catch {
                    setIsLoggedIn(false);
                }

                // 2. 초대 정보 조회
                const info = await getInvitationInfo(token);
                setInviteInfo(info);
                setState('info');
            } catch (error: any) {
                setErrorMessage(error.message || '초대 정보를 불러올 수 없습니다.');
                setState('error');
            }
        };

        checkStatusAndFetchInfo();
    }, [token]);

    // 초대 수락
    const handleAccept = async () => {
        if (!isLoggedIn) {
            // 로그인 페이지로 이동 (초대 토큰을 쿼리로 전달)
            router.push(`/login?redirect=/invite/${token}`);
            return;
        }

        setState('accepting');
        try {
            await acceptInvitation(token);
            setState('success');
        } catch (error: any) {
            setErrorMessage(error.message || '초대 수락에 실패했습니다.');
            setState('error');
        }
    };

    // 워크스페이스로 이동
    const handleGoToWorkspace = () => {
        router.push('/');
    };

    // 로그인 페이지로 이동
    const handleGoToLogin = () => {
        router.push(`/login?redirect=/invite/${token}`);
    };

    // 역할 표시 텍스트
    const getRoleText = (role: string) => {
        switch (role) {
            case 'admin':
                return '관리자';
            case 'member':
                return '멤버';
            default:
                return role;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-[#0F111A] dark:via-[#1E212B] dark:to-[#0F111A] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* 로고 영역 */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        DOMO
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">팀 협업 플랫폼</p>
                </div>

                {/* 카드 */}
                <div className="bg-white dark:bg-[#1E212B] rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    {/* 로딩 상태 */}
                    {state === 'loading' && (
                        <div className="p-12 flex flex-col items-center justify-center">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                            <p className="text-gray-500 dark:text-gray-400">초대 정보를 확인하고 있습니다...</p>
                        </div>
                    )}

                    {/* 초대 정보 표시 */}
                    {state === 'info' && inviteInfo && (
                        <div className="p-8">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                    <Users className="text-white" size={36} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    워크스페이스 초대
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    <strong className="text-gray-900 dark:text-white">{inviteInfo.inviter_name}</strong>님이
                                    당신을 초대했습니다
                                </p>
                            </div>

                            {/* 워크스페이스 정보 카드 */}
                            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-6 mb-6">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">워크스페이스</p>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {inviteInfo.workspace_name}
                                    </h3>
                                    <p className="text-sm text-blue-500 mt-2">
                                        {getRoleText(inviteInfo.role)}로 참여
                                    </p>
                                </div>
                            </div>

                            {/* 로그인 필요 안내 */}
                            {isLoggedIn === false && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center">
                                        초대를 수락하려면 먼저 로그인이 필요합니다.
                                    </p>
                                </div>
                            )}

                            {/* 버튼 */}
                            <button
                                onClick={isLoggedIn ? handleAccept : handleGoToLogin}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
                            >
                                {isLoggedIn ? (
                                    <>
                                        초대 수락하기
                                        <ArrowRight size={20} />
                                    </>
                                ) : (
                                    <>
                                        <LogIn size={20} />
                                        로그인하고 참여하기
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* 수락 중 */}
                    {state === 'accepting' && (
                        <div className="p-12 flex flex-col items-center justify-center">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                            <p className="text-gray-500 dark:text-gray-400">워크스페이스에 참여하는 중...</p>
                        </div>
                    )}

                    {/* 성공 */}
                    {state === 'success' && (
                        <div className="p-8">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="text-green-500" size={40} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    환영합니다!
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    <strong className="text-gray-900 dark:text-white">
                                        {inviteInfo?.workspace_name}
                                    </strong>
                                    에 성공적으로 참여했습니다.
                                </p>
                            </div>

                            <button
                                onClick={handleGoToWorkspace}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
                            >
                                워크스페이스로 이동
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    )}

                    {/* 에러 */}
                    {state === 'error' && (
                        <div className="p-8">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <XCircle className="text-red-500" size={40} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    초대 처리 실패
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {errorMessage}
                                </p>
                            </div>

                            <button
                                onClick={() => router.push('/')}
                                className="w-full py-4 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors"
                            >
                                홈으로 돌아가기
                            </button>
                        </div>
                    )}
                </div>

                {/* 하단 텍스트 */}
                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
                    초대 링크에 문제가 있다면 초대한 분에게 다시 요청해주세요.
                </p>
            </div>
        </div>
    );
};
