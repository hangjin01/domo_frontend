'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Mascot } from '@/src/views/common';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

interface VerifySuccessScreenProps {
    onGoToLogin: () => void;
}

// 파티클 데이터 생성 함수 (컴포넌트 외부)
const generateParticles = () => {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    return Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        backgroundColor: colors[i % 5],
        animationDelay: `${Math.random() * 2}s`,
        animationDuration: `${3 + Math.random() * 2}s`,
    }));
};

export const VerifySuccessScreen: React.FC<VerifySuccessScreenProps> = ({ onGoToLogin }) => {
    const [showContent, setShowContent] = useState(false);
    const [showButton, setShowButton] = useState(false);

    // 파티클은 컴포넌트 마운트 시 한 번만 생성
    const particles = useMemo(() => generateParticles(), []);

    useEffect(() => {
        // 순차적 애니메이션
        const timer1 = setTimeout(() => setShowContent(true), 300);
        const timer2 = setTimeout(() => setShowButton(true), 800);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-black">
            {/* Liquid Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="liquid-bg-blob w-96 h-96 bg-green-500/40 dark:bg-green-600/30 rounded-full top-[-10%] left-[-10%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob"></div>
                <div className="liquid-bg-blob w-96 h-96 bg-yellow-500/30 dark:bg-yellow-600/20 rounded-full top-[20%] right-[-10%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="liquid-bg-blob w-80 h-80 bg-blue-500/30 dark:bg-blue-600/20 rounded-full bottom-[-10%] left-[20%] mix-blend-multiply dark:mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            {/* Confetti-like particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map((particle) => (
                    <div
                        key={particle.id}
                        className="absolute w-2 h-2 rounded-full animate-float opacity-60"
                        style={{
                            left: particle.left,
                            top: particle.top,
                            backgroundColor: particle.backgroundColor,
                            animationDelay: particle.animationDelay,
                            animationDuration: particle.animationDuration,
                        }}
                    />
                ))}
            </div>

            <div className="w-full max-w-[420px] glass-panel rounded-[2.5rem] p-10 relative z-10 mx-4">
                <div className={`flex flex-col items-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {/* 성공 아이콘 */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-green-500 blur-3xl opacity-30 rounded-full animate-pulse"></div>
                        <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40">
                            <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
                        </div>
                        {/* 반짝이 효과 */}
                        <Sparkles
                            size={24}
                            className="absolute -top-2 -right-2 text-yellow-400 animate-bounce"
                        />
                        <Sparkles
                            size={16}
                            className="absolute -bottom-1 -left-3 text-yellow-400 animate-bounce animation-delay-500"
                        />
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500 mb-2">
                        가입 완료!
                    </h1>

                    <p className="text-gray-500 dark:text-gray-400 text-center text-sm font-medium leading-relaxed mb-2">
                        이메일 인증이 완료되었습니다
                    </p>

                    <div className="flex items-center gap-2 mb-8">
                        <Mascot size={28} />
                        <p className="text-gray-600 dark:text-gray-300 font-semibold">
                            DOMO에 오신 것을 환영합니다!
                        </p>
                    </div>

                    {/* 환영 메시지 카드 */}
                    <div className="w-full p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800/50 mb-6">
                        <p className="text-sm text-green-700 dark:text-green-300 text-center font-medium">
                            🎉 이제 로그인하여 팀과 함께 협업을 시작하세요!
                        </p>
                    </div>
                </div>

                {/* 로그인 버튼 */}
                <div className={`transition-all duration-500 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <button
                        onClick={onGoToLogin}
                        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-green-500/30 transition-all hover:shadow-2xl hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] group"
                    >
                        <span>로그인하러 가기</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};
export default VerifySuccessScreen;
