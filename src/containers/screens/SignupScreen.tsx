'use client';

import React, { useState } from 'react';
import { Mascot } from '@/src/views/common';
import { signup } from '@/src/models/api';
import { ArrowRight, Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';

interface SignupScreenProps {
    onSignupSuccess: (email: string) => void;
    onBackToLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onSignupSuccess, onBackToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // 유효성 검사
        if (!email.endsWith('@jj.ac.kr')) {
            setError('전주대학교 이메일(@jj.ac.kr)만 사용 가능합니다.');
            return;
        }

        if (password.length < 8) {
            setError('비밀번호는 8자 이상이어야 합니다.');
            return;
        }

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (name.trim().length < 2) {
            setError('이름은 2자 이상이어야 합니다.');
            return;
        }

        setIsLoading(true);

        try {
            await signup(email, password, name);
            onSignupSuccess(email);
        } catch (err) {
            setError(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-black">
            {/* Liquid Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="liquid-bg-blob w-96 h-96 bg-purple-500/30 dark:bg-purple-600/20 rounded-full top-[-10%] left-[-10%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob"></div>
                <div className="liquid-bg-blob w-96 h-96 bg-blue-500/30 dark:bg-blue-600/20 rounded-full top-[20%] right-[-10%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="liquid-bg-blob w-80 h-80 bg-pink-500/30 dark:bg-pink-600/20 rounded-full bottom-[-10%] left-[20%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-[420px] glass-panel rounded-[2.5rem] p-10 relative z-10 mx-4">
                {/* 뒤로가기 버튼 */}
                <button
                    onClick={onBackToLogin}
                    className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 rounded-full"></div>
                        <Mascot size={70} className="relative z-10 drop-shadow-2xl" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        회원가입
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm font-medium">
                        DOMO와 함께 협업을 시작하세요
                    </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-3">
                        {/* 이름 */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User size={20} className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="이름"
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-medium transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        {/* 이메일 */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail size={20} className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                type="email"
                                placeholder="학교 이메일 (@jj.ac.kr)"
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-medium transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {/* 비밀번호 */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={20} className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                placeholder="비밀번호 (8자 이상)"
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-medium transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {/* 비밀번호 확인 */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={20} className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                placeholder="비밀번호 확인"
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-medium transition-all"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 dark:text-red-400 text-xs text-center font-medium bg-red-100/50 dark:bg-red-900/20 py-2.5 rounded-xl border border-red-200 dark:border-red-800/50">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <span>가입하기</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        이미 계정이 있으신가요?{' '}
                        <button
                            onClick={onBackToLogin}
                            className="text-purple-500 hover:text-purple-600 font-semibold hover:underline transition-colors"
                        >
                            로그인
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
export default SignupScreen;
