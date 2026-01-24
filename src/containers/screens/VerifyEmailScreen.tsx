'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { verify } from '@/src/models/api';
import { Loader2, Mail, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';

interface VerifyEmailScreenProps {
    email: string;
    onVerifySuccess: () => void;
    onBackToSignup: () => void;
    onResendCode: () => void;
}

// 이메일 마스킹 함수 (컴포넌트 외부)
const maskEmail = (emailStr: string) => {
    const [local, domain] = emailStr.split('@');
    if (local.length <= 3) return emailStr;
    return `${local.slice(0, 3)}${'*'.repeat(Math.min(local.length - 3, 5))}@${domain}`;
};

export const VerifyEmailScreen: React.FC<VerifyEmailScreenProps> = ({
                                                                        email,
                                                                        onVerifySuccess,
                                                                        onBackToSignup,
                                                                        onResendCode,
                                                                    }) => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // 인증 처리 함수
    const handleVerify = useCallback(async (verificationCode: string) => {
        setIsLoading(true);
        setError(null);

        try {
            await verify(email, verificationCode);
            onVerifySuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : '인증에 실패했습니다.');
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    }, [email, onVerifySuccess]);

    // 재전송 쿨다운 타이머
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // 첫 번째 입력창에 자동 포커스
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (index: number, value: string) => {
        // 숫자만 허용
        if (value && !/^\d$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        setError(null);

        // 다음 입력창으로 자동 이동
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // 모든 코드가 입력되면 자동 제출
        if (newCode.every(c => c !== '') && index === 5) {
            handleVerify(newCode.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        // 백스페이스 시 이전 입력창으로 이동
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

        if (pastedData.length === 6) {
            const newCode = pastedData.split('');
            setCode(newCode);
            inputRefs.current[5]?.focus();
            handleVerify(pastedData);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0 || isResending) return;

        setIsResending(true);
        try {
            onResendCode();
            setResendCooldown(60);
            setError(null);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsResending(false);
        }
    };

    // ref 설정 함수
    const setInputRef = useCallback((index: number) => (el: HTMLInputElement | null) => {
        inputRefs.current[index] = el;
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-black">
            {/* Liquid Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="liquid-bg-blob w-96 h-96 bg-green-500/30 dark:bg-green-600/20 rounded-full top-[-10%] left-[-10%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob"></div>
                <div className="liquid-bg-blob w-96 h-96 bg-blue-500/30 dark:bg-blue-600/20 rounded-full top-[20%] right-[-10%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="liquid-bg-blob w-80 h-80 bg-teal-500/30 dark:bg-teal-600/20 rounded-full bottom-[-10%] left-[20%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-[420px] glass-panel rounded-[2.5rem] p-10 relative z-10 mx-4">
                {/* 뒤로가기 버튼 */}
                <button
                    onClick={onBackToSignup}
                    className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="flex flex-col items-center mb-8">
                    {/* 메일 아이콘 with 애니메이션 */}
                    <div className="relative mb-4">
                        <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                        <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30">
                            <Mail size={36} className="text-white" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        이메일 인증
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm font-medium text-center leading-relaxed">
                        <span className="text-green-500 font-semibold">{maskEmail(email)}</span>
                        <br />
                        으로 전송된 6자리 코드를 입력해주세요
                    </p>
                </div>

                {/* 6자리 코드 입력 */}
                <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                        <input
                            key={index}
                            ref={setInputRef(index)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            disabled={isLoading}
                            className={`w-12 h-14 text-center text-xl font-bold rounded-xl transition-all
                ${digit ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : ''}
                ${error ? 'border-red-300 dark:border-red-700' : ''}
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:ring-2 focus:ring-green-500 focus:border-green-500
              `}
                        />
                    ))}
                </div>

                {error && (
                    <div className="text-red-500 dark:text-red-400 text-xs text-center font-medium bg-red-100/50 dark:bg-red-900/20 py-2.5 rounded-xl border border-red-200 dark:border-red-800/50 mb-4">
                        {error}
                    </div>
                )}

                {isLoading && (
                    <div className="flex items-center justify-center gap-2 text-green-500 mb-4">
                        <Loader2 className="animate-spin" size={20} />
                        <span className="text-sm font-medium">인증 확인 중...</span>
                    </div>
                )}

                {/* 재전송 버튼 */}
                <div className="text-center mb-6">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                        코드를 받지 못하셨나요?
                    </p>
                    <button
                        onClick={handleResend}
                        disabled={resendCooldown > 0 || isResending}
                        className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors
              ${resendCooldown > 0
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-green-500 hover:text-green-600'
                        }
            `}
                    >
                        {isResending ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <RefreshCw size={16} className={resendCooldown > 0 ? '' : 'group-hover:rotate-180 transition-transform'} />
                        )}
                        {resendCooldown > 0 ? `${resendCooldown}초 후 재전송 가능` : '인증 코드 재전송'}
                    </button>
                </div>

                {/* 수동 제출 버튼 (옵션) */}
                <button
                    onClick={() => handleVerify(code.join(''))}
                    disabled={isLoading || code.some(c => c === '')}
                    className="w-full py-3.5 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25 transition-all hover:shadow-xl hover:shadow-green-500/30"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            <CheckCircle2 size={18} />
                            <span>인증 완료</span>
                        </>
                    )}
                </button>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        잘못된 이메일인가요?{' '}
                        <button
                            onClick={onBackToSignup}
                            className="text-green-500 hover:text-green-600 font-semibold hover:underline transition-colors"
                        >
                            다시 가입하기
                        </button>
                    </p>
                </div>
            </div>

            {/* Shake 애니메이션 스타일 */}
            <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
        </div>
    );
};
export default VerifyEmailScreen;
