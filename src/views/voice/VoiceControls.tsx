'use client';

import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff } from 'lucide-react';

interface VoiceControlsProps {
    isMuted: boolean;
    isDeafened: boolean;
    onToggleMute: () => void;
    onToggleDeafen: () => void;
    onLeave: () => void;
}

/**
 * 음성 채팅 컨트롤 버튼 그룹
 * - 마이크 On/Off
 * - 스피커 On/Off (Deafen)
 * - 나가기
 */
export const VoiceControls: React.FC<VoiceControlsProps> = ({
    isMuted,
    isDeafened,
    onToggleMute,
    onToggleDeafen,
    onLeave,
}) => {
    return (
        <div className="flex items-center justify-center gap-3">
            {/* 마이크 토글 */}
            <button
                onClick={onToggleMute}
                className={`
                    group relative w-14 h-14 rounded-full flex items-center justify-center
                    transition-all duration-200 shadow-lg
                    ${isMuted
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    }
                `}
                title={isMuted ? '마이크 켜기' : '마이크 끄기'}
            >
                {isMuted ? (
                    <MicOff size={24} />
                ) : (
                    <Mic size={24} />
                )}

                {/* Hover Tooltip */}
                <span className="
                    absolute -bottom-8 left-1/2 -translate-x-1/2
                    px-2 py-1 rounded text-xs font-medium
                    bg-gray-900 text-white whitespace-nowrap
                    opacity-0 group-hover:opacity-100 transition-opacity
                    pointer-events-none
                ">
                    {isMuted ? '마이크 켜기' : '마이크 끄기'}
                </span>
            </button>

            {/* 스피커 토글 (Deafen) */}
            <button
                onClick={onToggleDeafen}
                className={`
                    group relative w-14 h-14 rounded-full flex items-center justify-center
                    transition-all duration-200 shadow-lg
                    ${isDeafened
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    }
                `}
                title={isDeafened ? '소리 켜기' : '소리 끄기'}
            >
                {isDeafened ? (
                    <VolumeX size={24} />
                ) : (
                    <Volume2 size={24} />
                )}

                {/* Hover Tooltip */}
                <span className="
                    absolute -bottom-8 left-1/2 -translate-x-1/2
                    px-2 py-1 rounded text-xs font-medium
                    bg-gray-900 text-white whitespace-nowrap
                    opacity-0 group-hover:opacity-100 transition-opacity
                    pointer-events-none
                ">
                    {isDeafened ? '소리 켜기' : '소리 끄기'}
                </span>
            </button>

            {/* 구분선 */}
            <div className="w-px h-8 bg-white/20 mx-1" />

            {/* 나가기 버튼 */}
            <button
                onClick={onLeave}
                className="
                    group relative w-14 h-14 rounded-full flex items-center justify-center
                    bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white
                    transition-all duration-200 shadow-lg border border-red-500/30 hover:border-transparent
                "
                title="음성 채팅 나가기"
            >
                <PhoneOff size={24} />

                {/* Hover Tooltip */}
                <span className="
                    absolute -bottom-8 left-1/2 -translate-x-1/2
                    px-2 py-1 rounded text-xs font-medium
                    bg-gray-900 text-white whitespace-nowrap
                    opacity-0 group-hover:opacity-100 transition-opacity
                    pointer-events-none
                ">
                    나가기
                </span>
            </button>
        </div>
    );
};
