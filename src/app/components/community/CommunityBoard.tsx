'use client';

import React, { useState, useEffect } from 'react';
import { PostList } from './PostList';
import { PostDetail } from './PostDetail';
import { PostWriter } from './PostWriter';
import { getProjectPosts, getCommunityPosts } from '@/src/lib/api';
import type { Post } from '@/src/types';
import { Loader2, Plus, Search } from 'lucide-react';

interface CommunityBoardProps {
    projectId?: number; // 커뮤니티용 프로젝트 ID (기본값: 1)
    viewType?: 'grid' | 'table';
}

type ViewMode = 'list' | 'detail' | 'write';

export const CommunityBoard: React.FC<CommunityBoardProps> = ({ projectId = 1, viewType = 'table' }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [sortBy, setSortBy] = useState<'latest' | 'comments'>('latest');

    const fetchPosts = async () => {
        setIsLoading(true);
        try {
            let data;
            if (viewType === 'grid') {
                data = await getCommunityPosts();
            } else {
                data = await getProjectPosts(projectId);
            }
            setPosts(data);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [projectId, viewType]);

    const handlePostClick = (postId: number) => {
        setSelectedPostId(postId);
        setViewMode('detail');
    };

    const handleBackToList = () => {
        setSelectedPostId(null);
        setViewMode('list');
        fetchPosts(); // 목록 갱신
    };

    const handleWriteSuccess = () => {
        setViewMode('list');
        fetchPosts(); // 목록 갱신
    };

    const filteredPosts = posts
        .filter(post =>
            post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'latest') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            } else {
                return (b.comments?.length || 0) - (a.comments?.length || 0);
            }
        });

    return (
        <div className="flex-1 h-full flex flex-col bg-gray-50 dark:bg-[#0F111A] overflow-hidden relative">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-400/5 dark:bg-blue-900/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-400/5 dark:bg-purple-900/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="flex-1 relative z-10 flex flex-col max-w-5xl mx-auto w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">커뮤니티</h1>
                        <p className="text-gray-500 dark:text-gray-400">자유롭게 소통하고 정보를 공유하세요.</p>
                    </div>

                    {viewMode === 'list' && (
                        <button
                            onClick={() => setViewMode('write')}
                            className="flex items-center gap-2 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500/30"
                        >
                            <Plus size={20} />
                            <span>새 글 쓰기</span>
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 glass-card rounded-[2rem] border border-white/20 dark:border-white/5 overflow-hidden flex flex-col relative shadow-xl backdrop-blur-xl bg-white/40 dark:bg-black/40">

                    {/* Search Bar & Sort (List Mode Only) */}
                    {viewMode === 'list' && (
                        <div className="p-6 border-b border-gray-200/50 dark:border-white/5 flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="관심있는 내용을 검색해보세요..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/50 dark:bg-white/5 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-black/20 outline-none transition-all"
                                />
                            </div>
                            <div className="flex bg-white/50 dark:bg-white/5 rounded-xl p-1 border border-gray-200/50 dark:border-white/5">
                                <button
                                    onClick={() => setSortBy('latest')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'latest'
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                                        }`}
                                >
                                    최신순
                                </button>
                                <button
                                    onClick={() => setSortBy('comments')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'comments'
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                                        }`}
                                >
                                    댓글순
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                                <Loader2 className="animate-spin" size={40} />
                                <p>로딩 중...</p>
                            </div>
                        ) : (
                            <>
                                {viewMode === 'list' && (
                                    <PostList posts={filteredPosts} onPostClick={handlePostClick} layout={viewType} />
                                )}
                                {viewMode === 'detail' && selectedPostId && (
                                    <PostDetail
                                        postId={selectedPostId}
                                        mode={viewType === 'grid' ? 'community' : 'project'}
                                        onBack={handleBackToList}
                                    />
                                )}
                                {viewMode === 'write' && (
                                    <PostWriter
                                        projectId={projectId}
                                        mode={viewType === 'grid' ? 'community' : 'project'}
                                        onCancel={() => setViewMode('list')}
                                        onSuccess={handleWriteSuccess}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
