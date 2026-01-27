'use client';

import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import type { VoiceParticipant } from '@/src/models/types';

interface VoiceParticipantCardProps {
    participant: VoiceParticipant;
    audioLevel?: number;
}

/**
 * 음성 채팅 참여자 카드 컴포넌트
 * - 아바타 표시 (프로필 이미지 또는 이니셜)
 * - 발화 시 테두리 애니메이션
 * - 음소거 상태 표시
 */
export const VoiceParticipantCard: React.FC<VoiceParticipantCardProps> = ({
    participant,
    audioLevel = 0,
}) => {
    const { name, avatar, isSpeaking, isMuted, isCurrentUser } = participant;

    // 이니셜 추출 (이름의 첫 글자)
    const initial = name.charAt(0).toUpperCase();

    // 발화 강도에 따른 테두리 크기 계산 (0-255 -> 0-8px)
    const glowIntensity = isSpeaking ? Math.min(8, Math.floor(audioLevel / 32)) : 0;

    return (
        <div className="flex flex-col items-center gap-2">
            {/* 아바타 컨테이너 */}
            <div className="relative">
                {/* 발화 시 Glow 효과 */}
                <div
                    className={`
                        absolute inset-0 rounded-full transition-all duration-150
                        ${isSpeaking && !isMuted ? 'opacity-100' : 'opacity-0'}
                    `}
                    style={{
                        background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)',
                        transform: `scale(${1 + glowIntensity * 0.05})`,
                        filter: `blur(${glowIntensity}px)`,
                    }}
                />

                {/* 아바타 */}
                <div
                    className={`
                        relative w-16 h-16 rounded-full flex items-center justify-center
                        text-xl font-bold shadow-lg transition-all duration-200
                        ${isSpeaking && !isMuted 
                            ? 'ring-[3px] ring-green-500 ring-offset-2 ring-offset-transparent' 
                            : 'ring-2 ring-white/20'
                        }
                        ${isCurrentUser ? 'ring-offset-blue-500/20' : ''}
                    `}
                    style={{
                        background: avatar 
                            ? `url(${avatar}) center/cover no-repeat`
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: avatar ? 'transparent' : '#fff',
                    }}
                >
                    {!avatar && initial}
                </div>

                {/* 음소거 뱃지 */}
                {isMuted && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                        <MicOff size={12} className="text-white" />
                    </div>
                )}

                {/* 발화 중 인디케이터 */}
                {isSpeaking && !isMuted && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                        <Mic size={12} className="text-white" />
                    </div>
                )}
            </div>

            {/* 이름 */}
            <div className="text-center">
                <p className={`
                    text-sm font-medium truncate max-w-[80px]
                    ${isCurrentUser 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-800 dark:text-gray-200'
                    }
                `}>
                    {isCurrentUser ? `${name} (나)` : name}
                </p>
            </div>

            {/* 오디오 레벨 바 (발화 시에만 표시) */}
            {isSpeaking && !isMuted && (
                <div className="flex gap-0.5 h-3 items-end">
                    {[0, 1, 2, 3, 4].map((i) => {
                        const barHeight = Math.min(12, Math.max(2, (audioLevel / 255) * 12 * (1 - i * 0.15)));
                        return (
                            <div
                                key={i}
                                className="w-1 bg-green-500 rounded-full transition-all duration-75"
                                style={{
                                    height: `${barHeight}px`,
                                    opacity: 0.6 + (barHeight / 12) * 0.4,
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};
