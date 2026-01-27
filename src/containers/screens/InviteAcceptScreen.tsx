'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Loader2,
    CheckCircle2,
    XCircle,
    Users,
    ArrowRight,
    Mail,
    Lock,
    Eye,
    EyeOff
} from 'lucide-react';
import { getInvitationInfo, acceptInvitation, getCurrentUser, login } from '@/src/models/api';

interface InviteAcceptScreenProps {
    token: string;
}

type ScreenState = 'loading' | 'info' | 'login' | 'accepting' | 'success' | 'error';

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

    // 로그인 폼 상태
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // 로그인 상태 & 초대 정보 확인
    useEffect(() => {
        const checkStatusAndFetchInfo = async () => {
            try {
                // 1. 로그인 상태 확인
                const user = await getCurrentUser();
                setIsLoggedIn(!!user);

                // 2. 초대 정보 조회
                const info = await getInvitationInfo(token);
                setInviteInfo(info);
                
                // 로그인 안되어있으면 로그인 화면, 되어있으면 정보 화면
                setState(user ? 'info' : 'login');
            } catch (error: any) {
                setErrorMessage(error.message || '초대 정보를 불러올 수 없습니다.');
                setState('error');
            }
        };

        checkStatusAndFetchInfo();
    }, [token]);

    // 로그인 처리
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;

        setLoginLoading(true);
        setLoginError('');

        try {
            await login(email, password);
            setIsLoggedIn(true);
            setState('info');
        } catch (error: any) {
            setLoginError(error.message || '로그인에 실패했습니다.');
        } finally {
            setLoginLoading(false);
        }
    };

    // 초대 수락
    const handleAccept = async () => {
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

                    {/* 로그인 필요 - 로그인 폼 표시 */}
                    {state === 'login' && inviteInfo && (
                        <div className="p-8">
                            {/* 초대 정보 헤더 */}
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                    <Users className="text-white" size={28} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                                    워크스페이스 초대
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    <strong className="text-gray-700 dark:text-gray-200">{inviteInfo.inviter_name}</strong>님이
                                    <strong className="text-blue-500"> {inviteInfo.workspace_name}</strong>에 초대했습니다
                                </p>
                            </div>

                            {/* 로그인 폼 */}
                            <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-6 mb-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
                                    초대를 수락하려면 로그인하세요
                                </p>

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="이메일"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="비밀번호"
                                                className="w-full pl-10 pr-12 py-3 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {loginError && (
                                        <p className="text-sm text-red-500 text-center">{loginError}</p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loginLoading}
                                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {loginLoading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                로그인 중...
                                            </>
                                        ) : (
                                            '로그인'
                                        )}
                                    </button>
                                </form>
                            </div>

                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                                계정이 없으신가요?{' '}
                                <button
                                    onClick={() => router.push('/signup')}
                                    className="text-blue-500 hover:underline"
                                >
                                    회원가입
                                </button>
                            </p>
                        </div>
                    )}

                    {/* 초대 정보 표시 (로그인 완료) */}
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

                            {/* 수락 버튼 */}
                            <button
                                onClick={handleAccept}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
                            >
                                초대 수락하기
                                <ArrowRight size={20} />
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
