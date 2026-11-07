/**
 * [파일 안내] frontend/src/views/chat/ChatView.tsx
 * 프로젝트의 채팅 이력을 읽고 useChatSocket의 새 메시지를 합쳐 전체 채팅 화면을 렌더링합니다.
 * 메시지 ID로 중복을 막고 날짜별 구분/자동 스크롤을 적용합니다. mock의 연결 표시는 단일 브라우저 데모임을 명시합니다.
 */

// src/views/chat/ChatView.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useChatSocket } from '@/src/containers/hooks/chat';
import { getChatMessages, type ChatMessage } from '@/src/models/api/chat';
import { API_CONFIG } from '@/src/models/api/config';

interface ChatViewProps {
    projectId: number;
    currentUserId: number;
    currentUserName: string;
    projectName: string;
}

export function ChatView({ projectId, currentUserId, currentUserName, projectName }: ChatViewProps) {
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
        enabled: true,
        onMessageReceived: handleMessageReceived,
    });

    // 이전 메시지 로드
    useEffect(() => {
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
    }, [projectId, scrollToBottom]);

    // 새 메시지 시 스크롤
    useEffect(() => {
        requestAnimationFrame(scrollToBottom);
    }, [messages, scrollToBottom]);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

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

    const formatDateSeparator = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    };

    const getDateKey = (dateStr: string) => new Date(dateStr).toDateString();

    return (
        <div className="flex flex-col h-full p-6 overflow-hidden">
            <div className="glass-card rounded-[2rem] flex flex-col min-h-0 flex-1 overflow-hidden">

                {/* 헤더 */}
                <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-200/50 dark:border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{projectName}</h2>
                            <span className={`text-xs font-medium ${isConnected ? 'text-green-500' : 'text-gray-400'}`}>
                                {API_CONFIG.USE_MOCK ? '로컬 데모 · 이 브라우저에만 저장' : isConnected ? '실시간 연결됨' : '연결 중...'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 메시지 목록 */}
                <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-8 py-4 space-y-4">
                    {isLoadingHistory && (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!isLoadingHistory && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                            <svg className="w-16 h-16 mb-4 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-base font-medium">아직 메시지가 없습니다</p>
                            <p className="text-sm mt-1">팀원들과 대화를 시작해보세요!</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const isMine = msg.user_id === currentUserId;
                        const showDateSeparator = idx === 0 || getDateKey(messages[idx - 1].created_at) !== getDateKey(msg.created_at);

                        return (
                            <React.Fragment key={msg.id}>
                                {showDateSeparator && (
                                    <div className="flex items-center gap-4 py-2">
                                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                            {formatDateSeparator(msg.created_at)}
                                        </span>
                                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                                    </div>
                                )}

                                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[60%] ${isMine ? 'order-2' : ''}`}>
                                        {!isMine && (
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                                                    <span className="text-[10px] font-bold text-white">
                                                        {(msg.user?.nickname || msg.user?.name || '?').charAt(0)}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                    {msg.user?.nickname || msg.user?.name || `User ${msg.user_id}`}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
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
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* 입력창 */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200/50 dark:border-white/10">
                    <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/10 rounded-2xl px-5 py-3">
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
                            className="p-2 rounded-full bg-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
