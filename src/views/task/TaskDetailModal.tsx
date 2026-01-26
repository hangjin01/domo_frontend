'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Task, Comment, Tag as TagType } from '@/src/models/types';
import { STICKY_COLORS, getStickyStyle } from '@/src/models/utils/canvas';
import { createCardComment, getCardComments, deleteCardComment, detachFileFromCard } from '@/src/models/api';
import { FileVersionDropdown } from '@/src/views/common';
import {
    CreditCard, Palette, X, Briefcase, FileText, StickyNote, AlignLeft,
    Paperclip, List, Bookmark, Tag, Clock, Plus, CheckSquare, ChevronRight, Loader2, Trash2, Unlink
} from 'lucide-react';

interface TaskDetailModalProps {
    task: Task;
    onClose: () => void;
    onUpdate: (task: Task) => void;
    currentUser: string;
    currentUserId?: number; // 댓글 삭제 권한 체크용
}

// task.time 파싱 헬퍼 함수 (컴포넌트 외부에 정의)
function parseTaskTime(time: string | undefined): { start: string; end: string } {
    if (!time) return { start: '', end: '' };
    if (time.includes('|')) {
        const [s, e] = time.split('|');
        return { start: s || '', end: e || '' };
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(time)) {
        return { start: time.split(' ')[0], end: '' };
    }
    return { start: '', end: '' };
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdate, currentUser, currentUserId }) => {
    // 초기값을 useMemo로 계산 (useEffect 내 setState 제거)
    const initialDates = useMemo(() => parseTaskTime(task.time), [task.time]);

    const [desc, setDesc] = useState(task.description || '');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [title, setTitle] = useState(task.title);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagText, setNewTagText] = useState('');
    const [newTagColor, setNewTagColor] = useState('blue');
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [startDate, setStartDate] = useState(initialDates.start);
    const [endDate, setEndDate] = useState(initialDates.end);
    const [isSettingType, setIsSettingType] = useState(false);

    // 댓글 관련 상태 추가
    const [comments, setComments] = useState<Comment[]>(task.comments || []);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSavingComment, setIsSavingComment] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

    // 파일 연결 해제 상태
    const [detachingFileId, setDetachingFileId] = useState<number | null>(null);

    // Ref로 콜백 안정화 (무한 루프 방지)
    const onUpdateRef = useRef(onUpdate);
    const taskRef = useRef(task);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
        taskRef.current = task;
    }, [onUpdate, task]);

    // task가 변경될 때 상태 동기화 (useCallback으로 분리)
    const syncTaskState = useCallback(() => {
        setDesc(task.description || '');
        setTitle(task.title);
        const dates = parseTaskTime(task.time);
        setStartDate(dates.start);
        setEndDate(dates.end);
        setComments(task.comments || []);
    }, [task.description, task.title, task.time, task.comments]);

    // task.id가 변경될 때만 동기화 (다른 task로 전환 시)
    useEffect(() => {
        syncTaskState();
    }, [task.id, syncTaskState]);

    // 댓글 목록 로드 (API 연결)
    useEffect(() => {
        let cancelled = false;

        const loadComments = async () => {
            if (!task.id) return;

            setIsLoadingComments(true);
            try {
                const loadedComments = await getCardComments(task.id);
                if (cancelled) return; // 컴포넌트 언마운트 시 상태 업데이트 방지
                
                setComments(loadedComments);
                // ref를 통해 최신 콜백 호출 (의존성 배열에 추가하지 않음)
                onUpdateRef.current({ ...taskRef.current, comments: loadedComments });
            } catch (error) {
                if (cancelled) return;
                console.error('Failed to load comments:', error);
                // 실패 시 기존 comments 유지
            } finally {
                if (!cancelled) {
                    setIsLoadingComments(false);
                }
            }
        };

        loadComments();
        
        return () => {
            cancelled = true;
        };
    }, [task.id]); // task.id가 변경될 때만 로드

    // ESC 키 핸들러
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSaveDesc = () => {
        onUpdate({ ...task, description: desc });
        setIsEditingDesc(false);
    };

    const handleTitleBlur = () => {
        if (title.trim() !== task.title) {
            onUpdate({ ...task, title: title.trim() || task.title });
        }
    };

    // 댓글 추가 (API 연결)
    const handleAddComment = async () => {
        if (!commentText.trim() || isSavingComment) return;

        setIsSavingComment(true);

        // 낙관적 UI 업데이트
        const tempComment: Comment = {
            id: Date.now(), // 임시 ID
            user: currentUser,
            user_id: currentUserId,
            text: commentText,
            timestamp: '방금 전'
        };

        const previousComments = [...comments];
        setComments([tempComment, ...comments]);
        setCommentText('');

        try {
            // API 호출
            const savedComment = await createCardComment(task.id, commentText);

            // 저장된 댓글로 교체
            setComments(prev =>
                prev.map(c => c.id === tempComment.id ? savedComment : c)
            );

            // 부모 컴포넌트 업데이트
            onUpdate({
                ...task,
                comments: [savedComment, ...previousComments]
            });
        } catch (error) {
            console.error('Failed to save comment:', error);
            // 실패 시 롤백
            setComments(previousComments);
            setCommentText(commentText); // 입력 내용 복원
            alert('댓글 저장에 실패했습니다.');
        } finally {
            setIsSavingComment(false);
        }
    };

    // 댓글 삭제 (API 연결)
    const handleDeleteComment = async (commentId: number) => {
        if (deletingCommentId) return;

        setDeletingCommentId(commentId);
        const previousComments = [...comments];

        // 낙관적 UI 업데이트
        setComments(prev => prev.filter(c => c.id !== commentId));

        try {
            await deleteCardComment(commentId);
            // 부모 컴포넌트 업데이트
            onUpdate({
                ...task,
                comments: previousComments.filter(c => c.id !== commentId)
            });
        } catch (error) {
            console.error('Failed to delete comment:', error);
            // 실패 시 롤백
            setComments(previousComments);
            alert('댓글 삭제에 실패했습니다.');
        } finally {
            setDeletingCommentId(null);
        }
    };

    // 파일 연결 해제 핸들러
    const handleDetachFile = async (fileId: number) => {
        if (detachingFileId) return;

        setDetachingFileId(fileId);
        const previousFiles = [...(task.files || [])];

        // 낙관적 UI 업데이트
        const updatedFiles = previousFiles.filter(f => f.id !== fileId);
        onUpdate({ ...task, files: updatedFiles });

        try {
            await detachFileFromCard(task.id, fileId);
        } catch (error) {
            console.error('Failed to detach file:', error);
            // 실패 시 롤백
            onUpdate({ ...task, files: previousFiles });
            alert('파일 연결 해제에 실패했습니다.');
        } finally {
            setDetachingFileId(null);
        }
    };

    const addTag = () => {
        if (!newTagText.trim()) return;
        const newTag: TagType = {
            id: Date.now(),  // number 타입
            name: newTagText.trim(),
            color: newTagColor
        };
        onUpdate({ ...task, tags: [...(task.tags || []), newTag] });
        setNewTagText('');
        setIsAddingTag(false);
    };

    // tagId를 number | string으로 받아서 비교
    const removeTag = (tagId: number | string) => {
        onUpdate({ ...task, tags: task.tags?.filter(t => t.id !== tagId) });
    };

    const addChecklist = () => {
        const checklistTemplate = `\n\n### 체크리스트\n- [ ] 할 일 1\n- [ ] 할 일 2`;
        const newDesc = desc + checklistTemplate;
        setDesc(newDesc);
        onUpdate({ ...task, description: newDesc });
        setIsEditingDesc(true);
    };

    const addMember = () => {
        if (!task.tags?.some(t => t.name === currentUser)) {
            const newTag: TagType = { id: Date.now(), name: currentUser, color: 'orange' };
            onUpdate({ ...task, tags: [...(task.tags || []), newTag] });
        }
    };

    const updateTime = (s: string, e: string) => {
        if (!s && !e) onUpdate({ ...task, time: undefined });
        else if (s && !e) onUpdate({ ...task, time: s });
        else if (!s && e) onUpdate({ ...task, time: e });
        else onUpdate({ ...task, time: `${s}|${e}` });
    };

    const setTaskType = (type: number) => {
        onUpdate({ ...task, taskType: type });
        setIsSettingType(false);
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'inbox': return '수신함';
            case 'todo': return '할 일';
            case 'doing': return '진행 중';
            case 'done': return '완료';
            default: return status;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="w-full max-w-4xl bg-white dark:bg-[#323940] rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700/50 custom-scrollbar"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 md:p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-4 w-full">
                            <CreditCard className="mt-1.5 text-gray-500 dark:text-gray-400" size={24} />
                            <div className="w-full">
                                <input
                                    className="w-full bg-transparent text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 border-2 border-transparent focus:border-domo-primary rounded px-1 -ml-1 outline-none transition-colors"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={handleTitleBlur}
                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                />
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span>목록:</span>
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-[#22272b] rounded underline cursor-pointer hover:text-domo-primary transition-colors">
                                        {getStatusLabel(task.status)}
                                    </span>
                                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                                    <div className="flex items-center gap-1.5">
                                        {STICKY_COLORS.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => onUpdate({ ...task, color: c.id })}
                                                className={`w-3.5 h-3.5 rounded-full ${c.dot} border border-black/10 transition-all hover:scale-125 ${task.color === c.id ? 'ring-2 ring-domo-primary ring-offset-1 dark:ring-offset-[#323940]' : ''}`}
                                                title={c.id}
                                            />
                                        ))}
                                        <div className="relative group/picker ml-1">
                                            <div className={`w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden transition-all hover:scale-125 cursor-pointer bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 ${task.color?.startsWith('#') ? 'ring-2 ring-domo-primary ring-offset-1 dark:ring-offset-[#323940]' : ''}`}
                                            >
                                                <Palette size={10} className="text-white drop-shadow-md" />
                                            </div>
                                            <input
                                                type="color"
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                value={task.color?.startsWith('#') ? task.color : '#ffffff'}
                                                onChange={(e) => onUpdate({ ...task, color: e.target.value })}
                                                title="Custom Color"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#22272b] rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-8">
                            <div className="block md:hidden mb-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setIsAddingTag(!isAddingTag)} className="btn-action-mobile">라벨</button>
                                    <button onClick={() => setIsEditingDate(!isEditingDate)} className="btn-action-mobile">날짜</button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                {task.taskType !== undefined && (
                                    <div className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-bold border cursor-default ${task.taskType === 0 ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200' : task.taskType === 2 ? 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-200' : 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200'}`}>
                                        {task.taskType === 0 ? <Briefcase size={12} /> : task.taskType === 2 ? <FileText size={12} /> : <StickyNote size={12} />}
                                        <span>{task.taskType === 0 ? '일' : task.taskType === 2 ? '파일' : '메모'}</span>
                                        <button onClick={() => onUpdate({ ...task, taskType: undefined })} className="ml-1 hover:bg-black/10 rounded-full p-0.5"><X size={12} /></button>
                                    </div>
                                )}

                                {task.tags && task.tags.length > 0 && (
                                    task.tags.map(tag => {
                                        // String()으로 감싸서 getStickyStyle에 전달
                                        const colorStyle = getStickyStyle(String(tag.id), tag.color);
                                        return (
                                            <div key={tag.id} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${colorStyle ? colorStyle.bg : 'bg-gray-100'} ${colorStyle ? colorStyle.text : 'text-gray-800'} ${colorStyle ? colorStyle.border : 'border-gray-200'}`}>
                                                <span>{tag.name}</span>
                                                <button onClick={() => removeTag(tag.id)} className="hover:bg-black/10 rounded-full p-0.5"><X size={10} /></button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <AlignLeft size={20} className="text-gray-500 dark:text-gray-400" />
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">설명</h3>
                                    {task.description && !isEditingDesc && (
                                        <button
                                            onClick={() => setIsEditingDesc(true)}
                                            className="text-xs bg-gray-200 dark:bg-[#22272b] px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-[#2c333a] transition-colors"
                                        >
                                            수정
                                        </button>
                                    )}
                                </div>
                                <div className="ml-8">
                                    {isEditingDesc ? (
                                        <div className="animate-in fade-in duration-200">
                                            <textarea
                                                autoFocus
                                                className="w-full bg-white dark:bg-[#22272b] text-gray-900 dark:text-gray-200 p-3 rounded-lg border-2 border-domo-primary focus:outline-none min-h-[150px] text-sm resize-y"
                                                placeholder="자세한 설명을 추가하세요..."
                                                value={desc}
                                                onChange={(e) => setDesc(e.target.value)}
                                            />
                                            <div className="flex items-center gap-2 mt-2">
                                                <button
                                                    onClick={handleSaveDesc}
                                                    className="px-4 py-1.5 bg-domo-primary hover:bg-domo-primary-hover text-white rounded font-medium text-sm transition-colors"
                                                >
                                                    저장
                                                </button>
                                                <button
                                                    onClick={() => { setIsEditingDesc(false); setDesc(task.description || ''); }}
                                                    className="px-4 py-1.5 hover:bg-gray-100 dark:hover:bg-[#22272b] text-gray-700 dark:text-gray-300 rounded font-medium text-sm transition-colors"
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setIsEditingDesc(true)}
                                            className={`w-full min-h-[80px] rounded-lg p-3 text-sm cursor-pointer transition-colors ${task.description ? 'hover:bg-gray-100 dark:hover:bg-[#2c333a] text-gray-700 dark:text-gray-300 whitespace-pre-wrap' : 'bg-gray-100 dark:bg-[#22272b] hover:bg-gray-200 dark:hover:bg-[#2c333a] text-gray-500 dark:text-gray-400 italic'}`}
                                        >
                                            {task.description || "자세한 설명을 추가하세요..."}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attachments Section for Folders */}
                            {task.files && task.files.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Paperclip size={20} className="text-gray-500 dark:text-gray-400" />
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">첨부 파일 ({task.files.length})</h3>
                                    </div>
                                    <div className="ml-8 grid gap-2">
                                        {task.files.map((file, idx) => (
                                            <div key={file.id || idx} className="group flex items-center justify-between p-3 bg-white dark:bg-[#22272b] border border-gray-200 dark:border-gray-700/50 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-[#2c333a] transition-colors">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center shrink-0">
                                                        <FileText size={16} className="text-gray-500 dark:text-gray-400" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{file.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {file.id ? (
                                                        <FileVersionDropdown
                                                            fileId={file.id}
                                                            filename={file.name}
                                                            buttonClassName="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400 hover:text-domo-primary transition-colors"
                                                        />
                                                    ) : (
                                                        <a
                                                            href={file.url}
                                                            download={file.name}
                                                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400 hover:text-domo-primary transition-colors"
                                                            title="다운로드"
                                                        >
                                                            <FileText size={16} />
                                                        </a>
                                                    )}
                                                    {file.id && (
                                                        <button
                                                            onClick={() => handleDetachFile(file.id!)}
                                                            disabled={detachingFileId === file.id}
                                                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-gray-400 hover:text-red-500 transition-all"
                                                            title="연결 해제"
                                                        >
                                                            {detachingFileId === file.id ? (
                                                                <Loader2 size={16} className="animate-spin" />
                                                            ) : (
                                                                <Unlink size={16} />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <List size={20} className="text-gray-500 dark:text-gray-400" />
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                            활동
                                            {isLoadingComments && (
                                                <Loader2 className="inline-block ml-2 animate-spin text-gray-400" size={14} />
                                            )}
                                        </h3>
                                    </div>
                                    <button className="text-sm bg-gray-200 dark:bg-[#22272b] hover:bg-gray-300 dark:hover:bg-[#2c333a] px-3 py-1.5 rounded text-gray-700 dark:text-gray-300 transition-colors">자세히 보기</button>
                                </div>

                                <div className="flex gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-full bg-domo-accent flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-md select-none">{currentUser.slice(0, 2).toUpperCase()}</div>
                                    <div className="flex-1">
                                        <div className="bg-white dark:bg-[#22272b] rounded-lg border border-gray-300 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600 transition-colors overflow-hidden focus-within:ring-1 focus-within:ring-domo-primary/50 shadow-sm">
                                            <input
                                                type="text"
                                                placeholder="댓글을 입력하세요..."
                                                className="w-full bg-transparent px-3 py-2.5 text-sm text-gray-900 dark:text-gray-200 outline-none placeholder-gray-500"
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleAddComment();
                                                    }
                                                }}
                                                disabled={isSavingComment}
                                            />
                                            <div className={`flex justify-between items-center px-2 py-1.5 bg-gray-50 dark:bg-[#2c333a]/50 border-t border-gray-200 dark:border-gray-700/30 transition-all duration-200 ${commentText ? 'opacity-100 max-h-10' : 'opacity-100 max-h-10'}`}>
                                                <div className="flex gap-1">
                                                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"><Paperclip size={14} /></button>
                                                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400">@</button>
                                                </div>
                                                <button
                                                    onClick={handleAddComment}
                                                    disabled={!commentText.trim() || isSavingComment}
                                                    className={`px-3 py-1 border border-transparent text-xs rounded font-medium transition-colors flex items-center gap-1 ${commentText.trim() && !isSavingComment ? 'bg-domo-primary text-white hover:bg-domo-primary-hover' : 'bg-gray-200 dark:bg-[#22272b] border-gray-300 dark:border-gray-600/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                                                >
                                                    {isSavingComment && <Loader2 className="animate-spin" size={12} />}
                                                    저장
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 ml-11 relative">
                                    <div className="absolute left-[-22px] top-2 bottom-2 w-[2px] bg-gray-200 dark:bg-gray-800"></div>
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3 group animate-in slide-in-from-left-2 duration-300">
                                            <div className="absolute left-[-26px] bg-white dark:bg-[#323940] py-1">
                                                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600"></div>
                                            </div>
                                            <div className="text-sm w-full">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{comment.user}</span>
                                                    <span className="text-xs text-gray-500">{comment.timestamp}</span>
                                                    {/* 삭제 버튼 (본인 댓글만) */}
                                                    {(comment.user_id === currentUserId || comment.user === currentUser) && (
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            disabled={deletingCommentId === comment.id}
                                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500 transition-all"
                                                            title="댓글 삭제"
                                                        >
                                                            {deletingCommentId === comment.id ? (
                                                                <Loader2 className="animate-spin" size={12} />
                                                            ) : (
                                                                <Trash2 size={12} />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="bg-white dark:bg-[#22272b] p-2.5 rounded-lg text-gray-800 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700/30">
                                                    {comment.text}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {comments.length === 0 && !isLoadingComments && (
                                        <div className="text-sm text-gray-400 dark:text-gray-500 italic py-4">
                                            아직 댓글이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:block w-[200px] space-y-6">
                            <div className="space-y-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">카드에 추가</span>
                                <button onClick={() => setIsSettingType(!isSettingType)} className="w-full flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#2A2E33] dark:hover:bg-[#38414a] px-3 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors font-medium text-left"><Bookmark size={14} /><span>분류</span></button>
                                {isSettingType && (
                                    <div className="bg-gray-100 dark:bg-[#22272b] p-2 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1 animate-in slide-in-from-top-2">
                                        <button onClick={() => setTaskType(0)} className="w-full text-left px-2 py-1.5 hover:bg-gray-200 dark:hover:bg-[#2c333a] rounded text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold"><Briefcase size={14} /><span>일</span></button>
                                        <button onClick={() => setTaskType(1)} className="w-full text-left px-2 py-1.5 hover:bg-gray-200 dark:hover:bg-[#2c333a] rounded text-sm flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold"><StickyNote size={14} /><span>메모</span></button>
                                    </div>
                                )}

                                <button onClick={() => setIsAddingTag(!isAddingTag)} className="w-full flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#2A2E33] dark:hover:bg-[#38414a] px-3 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors font-medium text-left"><Tag size={14} /><span>라벨</span></button>
                                {isAddingTag && (
                                    <div className="bg-gray-100 dark:bg-[#22272b] p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3 animate-in slide-in-from-top-2">
                                        <input autoFocus type="text" placeholder="라벨 이름" className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2c333a] outline-none" value={newTagText} onChange={(e) => setNewTagText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} />
                                        <div className="flex flex-wrap gap-1.5">{STICKY_COLORS.map(c => (<button key={c.id} onClick={() => setNewTagColor(c.id)} className={`w-5 h-5 rounded-full ${c.dot} border border-black/10 transition-transform hover:scale-110 ${newTagColor === c.id ? 'ring-2 ring-domo-primary ring-offset-1 dark:ring-offset-[#22272b]' : ''}`} />))}</div>
                                        <div className="flex justify-end gap-2"><button onClick={() => setIsAddingTag(false)} className="text-xs px-2 py-1 hover:underline">취소</button><button onClick={addTag} disabled={!newTagText.trim()} className="text-xs bg-domo-primary text-white px-3 py-1 rounded hover:bg-domo-primary-hover disabled:opacity-50">추가</button></div>
                                    </div>
                                )}
                                <button onClick={() => setIsEditingDate(!isEditingDate)} className="w-full flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#2A2E33] dark:hover:bg-[#38414a] px-3 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors font-medium text-left"><Clock size={14} /><span>날짜</span></button>
                                {isEditingDate && (
                                    <div className="bg-gray-100 dark:bg-[#22272b] p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3 animate-in slide-in-from-top-2">
                                        <div><label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">시작일</label><input type="date" className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2c333a] outline-none text-gray-900 dark:text-gray-100" value={startDate} onChange={(e) => { const newStart = e.target.value; setStartDate(newStart); updateTime(newStart, endDate); }} /></div>
                                        <div><label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">종료일</label><input type="date" className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2c333a] outline-none text-gray-900 dark:text-gray-100" value={endDate} min={startDate} onChange={(e) => { const newEnd = e.target.value; setEndDate(newEnd); updateTime(startDate, newEnd); }} /></div>
                                    </div>
                                )}
                                <button onClick={addMember} className="w-full flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#2A2E33] dark:hover:bg-[#38414a] px-3 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors font-medium text-left"><Plus size={14} /><span>멤버</span></button>
                                <button onClick={addChecklist} className="w-full flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#2A2E33] dark:hover:bg-[#38414a] px-3 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors font-medium text-left"><CheckSquare size={14} /><span>체크리스트</span></button>
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">작업</span>
                                <button className="w-full flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#2A2E33] dark:hover:bg-[#38414a] px-3 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors font-medium text-left"><ChevronRight size={14} /><span>이동</span></button>
                                <button onClick={() => { onClose(); }} className="w-full flex items-center gap-2 bg-gray-200 hover:bg-red-100 dark:bg-[#2A2E33] dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-200 px-3 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300 transition-colors font-medium text-left"><X size={14} /><span>아카이브</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};