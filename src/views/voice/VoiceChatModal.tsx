'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertTriangle, Mic, Users, Settings } from 'lucide-react';
import type { Member, VoiceParticipant, VoiceChatError } from '@/src/models/types';
import { useAudioAnalyser } from '@/src/containers/hooks/common';
import { VoiceParticipantCard } from './VoiceParticipant';
import { VoiceControls } from './VoiceControls';

interface VoiceChatModalProps {
    /** 모달 표시 여부 */
    isOpen: boolean;
    /** 모달 닫기 핸들러 */
    onClose: () => void;
    /** 연결 상태 */
    isConnected: boolean;
    /** 연결 시도 중 */
    isConnecting: boolean;
    /** 마이크 음소거 상태 */
    isMuted: boolean;
    /** 스피커 음소거 상태 */
    isDeafened: boolean;
    /** 현재 연결된 peer ID 목록 */
    activePeerIds: number[];
    /** 프로젝트 멤버 목록 (매핑용) */
    members: Member[];
    /** 현재 사용자 ID */
    currentUserId: number;
    /** 로컬 MediaStream */
    localStream: MediaStream | null;
    /** 에러 상태 */
    error: VoiceChatError | null;
    /** 채널 입장 핸들러 */
    onJoin: () => void;
    /** 채널 퇴장 핸들러 */
    onLeave: () => void;
    /** 마이크 토글 핸들러 */
    onToggleMute: () => void;
    /** 스피커 토글 핸들러 */
    onToggleDeafen: () => void;
    /** 에러 초기화 핸들러 */
    onClearError: () => void;
}

/**
 * 음성 채팅 모달 컴포넌트
 * - Portal을 사용하여 z-index 문제 해결
 * - Glassmorphism 디자인
 * - 참여자 목록 (멤버 매핑)
 * - 발화 감지 시각 피드백
 * - 에러 핸들링 UI
 */
export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
    isOpen,
    onClose,
    isConnected,
    isConnecting,
    isMuted,
    isDeafened,
    activePeerIds,
    members,
    currentUserId,
    localStream,
    error,
    onJoin,
    onLeave,
    onToggleMute,
    onToggleDeafen,
    onClearError,
}) => {
    const [mounted, setMounted] = useState(false);

    // 오디오 분석 hook
    const { isSpeaking, audioLevel, startAnalysis, stopAnalysis } = useAudioAnalyser({
        threshold: 25,
        interval: 100,
        holdTime: 300,
    });

    // 클라이언트 마운트 체크 (Portal용)
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // localStream 변경 시 오디오 분석 시작/중지
    useEffect(() => {
        if (localStream && isConnected && !isMuted) {
            startAnalysis(localStream);
        } else {
            stopAnalysis();
        }

        return () => {
            stopAnalysis();
        };
    }, [localStream, isConnected, isMuted, startAnalysis, stopAnalysis]);

    // activePeerIds를 VoiceParticipant로 변환 (멤버 정보 매핑)
    const participants: VoiceParticipant[] = useMemo(() => {
        return activePeerIds.map((peerId) => {
            const member = members.find((m) => m.id === peerId);
            const isCurrentUser = peerId === currentUserId;

            return {
                id: peerId,
                name: member?.name || `사용자 ${peerId}`,
                avatar: member?.avatar || null,
                isSpeaking: isCurrentUser ? isSpeaking : false, // 현재는 본인만 speaking 감지
                isMuted: isCurrentUser ? isMuted : false,
                isCurrentUser,
            };
        });
    }, [activePeerIds, members, currentUserId, isSpeaking, isMuted]);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // 모달이 닫혀있으면 렌더링 안함
    if (!isOpen || !mounted) return null;

    // Portal로 body에 직접 렌더링 (z-index 문제 해결)
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="
                relative w-full max-w-lg mx-4
                bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95
                backdrop-blur-xl rounded-3xl
                border border-white/10
                shadow-2xl shadow-black/50
                animate-in zoom-in-95 fade-in duration-300
                overflow-hidden
            ">
                {/* 배경 장식 */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />
                </div>

                {/* Header */}
                <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={`
                            w-10 h-10 rounded-xl flex items-center justify-center
                            ${isConnected 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-gray-700/50 text-gray-400'
                            }
                        `}>
                            <Mic size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">음성 채팅</h2>
                            <p className="text-xs text-gray-400">
                                {isConnected 
                                    ? `${participants.length}명 참여 중` 
                                    : '연결 안됨'
                                }
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="relative px-6 py-6 min-h-[300px]">
                    {/* 에러 상태 */}
                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle size={20} className="text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-red-400 mb-1">
                                        {error.type === 'permission_denied' && '마이크 권한 필요'}
                                        {error.type === 'not_supported' && '지원되지 않음'}
                                        {error.type === 'connection_failed' && '연결 실패'}
                                        {error.type === 'unknown' && '오류 발생'}
                                    </p>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        {error.message}
                                    </p>
                                    {error.type === 'permission_denied' && (
                                        <div className="mt-3 p-3 rounded-xl bg-white/5 text-xs text-gray-400">
                                            <p className="font-medium text-gray-300 mb-1">해결 방법:</p>
                                            <ol className="list-decimal list-inside space-y-1">
                                                <li>브라우저 주소창 왼쪽의 자물쇠 아이콘 클릭</li>
                                                <li>사이트 설정에서 마이크 권한을 &quot;허용&quot;으로 변경</li>
                                                <li>페이지 새로고침 후 다시 시도</li>
                                            </ol>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={onClearError}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 연결 전 상태 */}
                    {!isConnected && !isConnecting && !error && (
                        <div className="flex flex-col items-center justify-center py-8 animate-in fade-in duration-300">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-white/10">
                                <Users size={32} className="text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                음성 채팅에 참여하기
                            </h3>
                            <p className="text-sm text-gray-400 text-center mb-6 max-w-xs">
                                팀원들과 실시간으로 대화하며 협업하세요.
                                마이크 권한이 필요합니다.
                            </p>
                            <button
                                onClick={onJoin}
                                className="
                                    px-8 py-3 rounded-2xl
                                    bg-gradient-to-r from-blue-500 to-purple-500
                                    hover:from-blue-600 hover:to-purple-600
                                    text-white font-semibold
                                    shadow-lg shadow-blue-500/25
                                    transition-all duration-200
                                    hover:scale-105 active:scale-100
                                "
                            >
                                입장하기
                            </button>
                        </div>
                    )}

                    {/* 연결 중 상태 */}
                    {isConnecting && (
                        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-300">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Loader2 size={28} className="text-blue-400 animate-spin" />
                                </div>
                                <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
                            </div>
                            <p className="mt-6 text-sm text-gray-400">연결 중...</p>
                            <p className="mt-1 text-xs text-gray-500">마이크 권한을 허용해 주세요</p>
                        </div>
                    )}

                    {/* 연결됨 - 참여자 목록 */}
                    {isConnected && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* 참여자 그리드 */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {participants.map((participant) => (
                                    <VoiceParticipantCard
                                        key={participant.id}
                                        participant={participant}
                                        audioLevel={participant.isCurrentUser ? audioLevel : 0}
                                    />
                                ))}

                                {/* 빈 슬롯 (최소 3개 표시) */}
                                {participants.length < 3 && Array.from({ length: 3 - participants.length }).map((_, i) => (
                                    <div
                                        key={`empty-${i}`}
                                        className="flex flex-col items-center gap-2 opacity-30"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-dashed border-white/10" />
                                        <p className="text-xs text-gray-500">대기 중</p>
                                    </div>
                                ))}
                            </div>

                            {/* 컨트롤 버튼 */}
                            <VoiceControls
                                isMuted={isMuted}
                                isDeafened={isDeafened}
                                onToggleMute={onToggleMute}
                                onToggleDeafen={onToggleDeafen}
                                onLeave={onLeave}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                {isConnected && (
                    <div className="relative px-6 py-3 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`} />
                            <span>{isMuted ? '마이크 꺼짐' : '마이크 켜짐'}</span>
                        </div>
                        <button className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
                            <Settings size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
