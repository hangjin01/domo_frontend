/**
 * [파일 안내] frontend/src/views/chat/ChatModal.tsx
 * 도크에서 여는 채팅 모달입니다. 열림 상태에 맞춰 이력과 연결 수명을 관리하고 메시지를 보냅니다.
 * ChatView와 같은 API/소켓 훅을 사용하지만 별도 뷰 상태를 가집니다. 닫힌 모달의 연결·타이머 정리를 확인하세요.
 */

// src/views/chat/ChatModal.tsx
'use client';

import { API_CONFIG } from '@/src/models/api/config';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Send } from 'lucide-react';
import { useChatSocket } from '@/src/containers/hooks/chat';
import { getChatMessages, type ChatMessage } from '@/src/models/api/chat';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExpandToFullView: () => void;
    projectId: number;
    currentUserId: number;
    currentUserName: string;
    projectName: string;
}

export function ChatModal({
    isOpen,
    onClose,
    onExpandToFullView,
    projectId,
    currentUserId,
    currentUserName,
    projectName,
}: ChatModalProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, []);

    const handleMessageReceived = useCallback((message: ChatMessage) => {
        setMessages(prev => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
        });
    }, []);

    const { isConnected, sendMessage } = useChatSocket({
        projectId,
        currentUserId,
        enabled: isOpen,
        onMessageReceived: handleMessageReceived,
    });

    // 이전 메시지 로드
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        const loadHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const history = await getChatMessages(projectId);
                if (!cancelled) {
                    setMessages(history);
                    requestAnimationFrame(scrollToBottom);
                }
            } catch (e) {
                console.error('[Chat] Failed to load history:', e);
            } finally {
                if (!cancelled) setIsLoadingHistory(false);
            }
        };

        loadHistory();
        return () => { cancelled = true; };
    }, [isOpen, projectId]);

    // 새 메시지 시 스크롤
    useEffect(() => {
        requestAnimationFrame(scrollToBottom);
    }, [messages, scrollToBottom]);

    // 모달 열릴 때 입력창 포커스
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = () => {
        const text = inputText.trim();
        if (!text || !isConnected) return;
        sendMessage(text);
        setInputText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;
    if (typeof window === 'undefined') return null;

    return createPortal(
        <div className="fixed bottom-28 right-24 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-96 h-[520px] flex flex-col rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl">

                {/* 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/50 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[180px]">{projectName}</h3>
                            <span className={`text-[10px] font-medium ${isConnected ? 'text-green-500' : 'text-gray-400'}`}>
                                {API_CONFIG.USE_MOCK ? '로컬 데모 · 이 브라우저에만 저장' : isConnected ? '연결됨' : '연결 중...'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={onExpandToFullView}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                            title="전체보기"
                        >
                            <Maximize2 size={16} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* 메시지 목록 */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {isLoadingHistory && (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!isLoadingHistory && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-sm font-medium">아직 메시지가 없습니다</p>
                            <p className="text-xs mt-1">첫 메시지를 보내보세요!</p>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isMine = msg.user_id === currentUserId;
                        return (
                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                                    {!isMine && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                                <span className="text-[9px] font-bold text-white">
                                                    {(msg.user?.nickname || msg.user?.name || '?').charAt(0)}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                {msg.user?.nickname || msg.user?.name || `User ${msg.user_id}`}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                        isMine
                                            ? 'bg-blue-500 text-white rounded-br-md'
                                            : 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100 rounded-bl-md'
                                    }`}>
                                        {msg.content}
                                    </div>
                                    <p className={`text-[10px] text-gray-400 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 입력창 */}
                <div className="px-4 py-3 border-t border-gray-200/50 dark:border-white/10">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/10 rounded-2xl px-4 py-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isConnected ? '메시지를 입력하세요...' : '연결 중...'}
                            disabled={!isConnected}
                            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputText.trim() || !isConnected}
                            className="p-1.5 rounded-full bg-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
