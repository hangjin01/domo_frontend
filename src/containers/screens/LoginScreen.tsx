'use client';

import React, { useState } from 'react';
import { Mascot } from '@/src/views/common';
import { login } from '@/src/models/api';
import type { AuthUser } from '@/src/models/types';
import { ArrowRight, Loader2, Mail, Lock } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  onGoToSignup: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onGoToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await login(email, password);
      onLoginSuccess(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-black">
        {/* Liquid Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="liquid-bg-blob w-96 h-96 bg-blue-500/30 dark:bg-blue-600/20 rounded-full top-[-10%] left-[-10%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob"></div>
          <div className="liquid-bg-blob w-96 h-96 bg-purple-500/30 dark:bg-purple-600/20 rounded-full top-[20%] right-[-10%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="liquid-bg-blob w-80 h-80 bg-pink-500/30 dark:bg-pink-600/20 rounded-full bottom-[-10%] left-[20%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-[400px] glass-panel rounded-[2.5rem] p-10 relative z-10 mx-4">
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
              <Mascot size={90} className="relative z-10 drop-shadow-2xl" />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              DOMO
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm font-medium">
              비전 있는 팀을 위한 워크스페이스
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={20} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                    type="email"
                    placeholder="학교 이메일"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm font-medium transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                    type="password"
                    placeholder="비밀번호"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm font-medium transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                className="w-full py-4 btn-primary rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
              ) : (
                  <>
                    <span>로그인</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              전주대학교 계정으로 로그인하세요
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              계정이 없으신가요?{' '}
              <button
                  onClick={onGoToSignup}
                  className="text-blue-500 hover:text-blue-600 font-semibold hover:underline transition-colors"
              >
                회원가입
              </button>
            </p>
          </div>
        </div>
      </div>
  );
};
export default LoginScreen;
