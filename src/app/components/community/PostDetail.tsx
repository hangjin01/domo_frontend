
import React, { useState, useEffect } from 'react';
import {
    getProjectPost, getCommunityPost,
    createCommunityComment, createProjectComment,
    deleteCommunityPost, deleteProjectPost,
    deleteCommunityComment, deleteProjectComment,
    updateCommunityPost, updateProjectPost,
    getCurrentUser
} from '@/src/lib/api';
import type { Post, PostComment, User } from '@/src/types';
import { ArrowLeft, Loader2, User as UserIcon, Send, Trash2, Clock } from 'lucide-react';
import { getImageUrl } from '@/src/lib/utils/image';

interface PostDetailProps {
    postId: number;
    mode: 'community' | 'project';
    onBack: () => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ postId, mode, onBack }) => {
    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [commentContent, setCommentContent] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const postPromise = mode === 'community'
                    ? getCommunityPost(postId)
                    : getProjectPost(postId);

                const [postData, userData] = await Promise.all([
                    postPromise,
                    getCurrentUser()
                ]);
                setPost(postData);
                setCurrentUser(userData);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [postId, mode]);

    const handleDeletePost = async () => {
        if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;

        setIsDeleting(true);
        try {
            if (mode === 'community') {
                await deleteCommunityPost(postId);
            } else {
                await deleteProjectPost(postId);
            }
            onBack(); // 목록으로 돌아가기
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('게시글 삭제에 실패했습니다.');
            setIsDeleting(false);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentContent.trim()) return;

        setIsSubmittingComment(true);
        try {
            let newComment;
            if (mode === 'community') {
                newComment = await createCommunityComment(postId, { content: commentContent });
            } else {
                newComment = await createProjectComment(postId, { content: commentContent });
            }

            // 댓글 목록 업데이트
            setPost(prev => prev ? {
                ...prev,
                comments: [newComment, ...(prev.comments || [])]
            } : null);
            setCommentContent('');
        } catch (error) {
            console.error('Failed to create comment:', error);
            alert('댓글 작성에 실패했습니다.');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;

        try {
            if (mode === 'community') {
                await deleteCommunityComment(commentId);
            } else {
                await deleteProjectComment(commentId);
            }

            setPost(prev => prev ? {
                ...prev,
                comments: prev.comments?.filter(c => c.id !== commentId)
            } : null);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('댓글 삭제에 실패했습니다.');
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        if (post) {
            setEditTitle(post.title);
            setEditContent(post.content);
        }
    }, [post]);

    const handleUpdatePost = async () => {
        if (!editTitle.trim() || !editContent.trim()) return;

        try {
            let updatedPost;
            if (mode === 'community') {
                updatedPost = await updateCommunityPost(postId, {
                    title: editTitle,
                    content: editContent
                });
            } else {
                updatedPost = await updateProjectPost(postId, {
                    title: editTitle,
                    content: editContent
                });
            }

            setPost(prev => prev ? { ...prev, title: updatedPost.title, content: updatedPost.content } : null);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update post:', error);
            alert('게시글 수정에 실패했습니다.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-gray-500">게시글을 찾을 수 없습니다.</p>
                <button onClick={onBack} className="text-blue-500 underline">돌아가기</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/50 dark:border-white/5">
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 text-2xl font-bold bg-transparent border-b-2 border-blue-500 outline-none text-gray-900 dark:text-white px-2 py-1"
                            placeholder="제목을 입력하세요"
                        />
                    ) : (
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white line-clamp-1">{post.title}</h2>
                    )}
                </div>

                {/* 작성자 본인일 경우 처리 (수정/삭제) */}
                {currentUser && post.user_id === currentUser.id && (
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleUpdatePost}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    완료
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-lg transition-colors"
                                >
                                    취소
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-lg transition-colors"
                                >
                                    수정
                                </button>
                                <button
                                    onClick={handleDeletePost}
                                    disabled={isDeleting}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="게시글 삭제"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {/* Post Info */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {post.user?.profile_image ? (
                            <img src={getImageUrl(post.user.profile_image)} alt={post.user.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            (post.user?.nickname || post.user?.name || '?').slice(0, 1)
                        )}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {post.user?.nickname || post.user?.name || '알 수 없음'}
                            <span className="text-xs font-normal text-gray-400 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10">작성자</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <Clock size={12} />
                            <span>
                                {(() => {
                                    let dateStr = post.created_at;
                                    if (dateStr && !dateStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(dateStr)) {
                                        dateStr += 'Z';
                                    }
                                    return new Date(dateStr).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
                                })()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Post Content */}
                {isEditing ? (
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-64 p-4 mb-12 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800 dark:text-gray-200 leading-relaxed custom-scrollbar"
                        placeholder="내용을 입력하세요..."
                    />
                ) : (
                    <div className="prose dark:prose-invert max-w-none mb-12 text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                        {post.content}
                    </div>
                )}

                {/* Comments Section */}
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        댓글 <span className="text-blue-500">{post.comments?.length || 0}</span>
                    </h3>

                    <form onSubmit={handleCommentSubmit} className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            placeholder="댓글을 남겨보세요..."
                            className="flex-1 px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-transparent focus:border-blue-500 outline-none transition-all"
                        />
                        <button
                            type="submit"
                            disabled={isSubmittingComment || !commentContent.trim()}
                            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={20} />
                        </button>
                    </form>

                    <div className="space-y-4">
                        {post.comments?.map((comment) => (
                            <div key={comment.id} className="flex gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl group">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300 flex-shrink-0">
                                    {comment.user?.profile_image ? (
                                        <img src={getImageUrl(comment.user.profile_image)} alt={comment.user.name} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        (comment.user?.nickname || comment.user?.name || '?').slice(0, 1)
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                                            {comment.user?.nickname || comment.user?.name || '익명'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">
                                                {(() => {
                                                    let dateStr = comment.created_at;
                                                    if (dateStr && !dateStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(dateStr)) {
                                                        dateStr += 'Z';
                                                    }
                                                    return new Date(dateStr).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
                                                })()}
                                            </span>
                                            {currentUser && comment.user_id === currentUser.id && (
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
