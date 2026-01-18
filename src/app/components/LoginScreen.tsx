"use client";

import React, { useState, useEffect } from 'react';
import { login, signup, verify, API_CONFIG } from '@/lib/api';
import type { AuthUser } from '@/types';

// ============================================
// 컴포넌트
// ============================================
interface LoginScreenProps {
    onLoginSuccess?: (user: AuthUser) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
    const [view, setView] = useState<'login' | 'signup' | 'verify'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ email: '', password: '', name: '', code: '' });
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const result = await login(form.email, form.password);
            onLoginSuccess?.(result.user);
        } catch (err) {
            setError(err instanceof Error ? err.message : '로그인 실패');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await signup(form.email, form.password, form.name);
            setView('verify');
        } catch (err) {
            setError(err instanceof Error ? err.message : '회원가입 실패');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await verify(form.email, form.code);
            setView('login');
            setForm(f => ({ ...f, password: '', code: '' }));
        } catch (err) {
            setError(err instanceof Error ? err.message : '인증 실패');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = `
    w-full h-12 px-4 
    bg-[var(--bg-input)] 
    border border-[var(--border-primary)] 
    rounded-lg 
    text-[var(--text-primary)] text-sm
    placeholder:text-[var(--text-placeholder)]
    outline-none
    transition-colors duration-200
    hover:border-[var(--border-secondary)]
    focus:border-[var(--text-tertiary)]
  `;

    const buttonPrimaryClass = `
    w-full h-12
    bg-[var(--accent)] 
    text-[var(--bg-primary)]
    text-sm font-medium
    rounded-lg
    transition-colors duration-200
    hover:bg-[var(--accent-hover)]
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg-primary)' }}
        >
            {/* 다크모드 토글 */}
            <button
                onClick={() => setIsDark(!isDark)}
                className="absolute top-6 right-6 p-2 rounded-lg transition-colors hover:bg-[var(--bg-secondary)]"
                aria-label="Toggle theme"
            >
                {isDark ? (
                    <svg className="w-5 h-5" fill="none" stroke="var(--text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="5"/>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="var(--text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                    </svg>
                )}
            </button>

            <div className="w-full max-w-[340px]">
                {/* Logo */}
                <div className="text-center mb-10">
                    <h1
                        className="text-3xl font-semibold tracking-tight"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Domo
                    </h1>
                    <p
                        className="text-sm mt-2"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        팀프로젝트 협업 플랫폼
                    </p>
                </div>

                {/* Login Form */}
                {view === 'login' && (
                    <form onSubmit={handleLogin}>
                        <div className="space-y-3">
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="학교 이메일"
                                className={inputClass}
                                required
                            />
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="비밀번호"
                                className={inputClass}
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-sm mt-3" style={{ color: 'var(--error)' }}>{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`${buttonPrimaryClass} mt-5`}
                        >
                            {isLoading ? '로그인 중...' : 'Continue with email'}
                        </button>

                        <div className="flex items-center my-6">
                            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-primary)' }} />
                            <span className="px-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>or</span>
                            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-primary)' }} />
                        </div>

                        {/* 소셜 로그인 자리 - 나중에 추가 */}
                        <button
                            type="button"
                            disabled
                            className="w-full h-12 border rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                borderColor: 'var(--border-primary)',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'transparent'
                            }}
                        >
                            Continue with Kakao (준비중)
                        </button>

                        <p
                            className="text-center text-sm mt-8"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            계정이 없으신가요?{' '}
                            <button
                                type="button"
                                onClick={() => { setView('signup'); setError(''); }}
                                className="font-medium hover:underline"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                회원가입
                            </button>
                        </p>
                    </form>
                )}

                {/* Signup Form */}
                {view === 'signup' && (
                    <form onSubmit={handleSignup}>
                        <div className="space-y-3">
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="이름"
                                className={inputClass}
                                required
                            />
                            <div>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="학교 이메일"
                                    className={inputClass}
                                    required
                                />
                                <p className="text-xs mt-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>
                                    @jj.ac.kr 이메일만 가능
                                </p>
                            </div>
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="비밀번호 (8자 이상)"
                                minLength={8}
                                className={inputClass}
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-sm mt-3" style={{ color: 'var(--error)' }}>{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`${buttonPrimaryClass} mt-5`}
                        >
                            {isLoading ? '처리 중...' : '회원가입'}
                        </button>

                        <p
                            className="text-center text-sm mt-8"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            이미 계정이 있으신가요?{' '}
                            <button
                                type="button"
                                onClick={() => { setView('login'); setError(''); }}
                                className="font-medium hover:underline"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                로그인
                            </button>
                        </p>
                    </form>
                )}

                {/* Verify Form */}
                {view === 'verify' && (
                    <form onSubmit={handleVerify}>
                        <div className="text-center mb-8">
                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                인증 메일을 발송했습니다
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                {form.email}
                            </p>
                        </div>

                        <input
                            type="text"
                            name="code"
                            value={form.code}
                            onChange={handleChange}
                            placeholder="인증 코드 6자리"
                            maxLength={6}
                            className={`${inputClass} text-center tracking-[0.3em]`}
                            required
                        />

                        {error && (
                            <p className="text-sm mt-3" style={{ color: 'var(--error)' }}>{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`${buttonPrimaryClass} mt-5`}
                        >
                            {isLoading ? '확인 중...' : '인증 완료'}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setView('signup'); setError(''); }}
                            className="w-full text-sm mt-4 py-2"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            ← 뒤로
                        </button>
                    </form>
                )}

                {/* Dev Info */}
                {API_CONFIG.USE_MOCK && (
                    <div
                        className="mt-12 pt-6 text-center"
                        style={{ borderTop: '1px solid var(--border-primary)' }}
                    >
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            테스트: student@jj.ac.kr / test1234
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                            인증코드: 123456
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}