import React from 'react';
import type { Post } from '@/src/types';
import { MessageSquare, Heart, Eye, User as UserIcon, Bookmark, RefreshCw, Image } from 'lucide-react';
import { getImageUrl } from '@/src/lib/utils/image';

interface PostListProps {
    posts: Post[];
    onPostClick: (postId: number) => void;
    layout?: 'grid' | 'table';
}

export const PostList: React.FC<PostListProps> = ({ posts, onPostClick, layout = 'table' }) => {
    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p>게시글이 없습니다.</p>
                <p className="text-sm">가장 먼저 글을 작성해보세요!</p>
            </div>
        );
    }

    const formatTimeAgo = (dateString: string) => {
        let safeDateString = dateString;
        if (dateString && !dateString.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(dateString)) {
            safeDateString += 'Z';
        }

        const date = new Date(safeDateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const adjustDiff = diff < 0 ? 0 : diff;
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            const minutes = Math.floor(adjustDiff / 60000);
            if (minutes < 1) return '방금 전';
            if (minutes < 60) return `${minutes}분 전`;

            return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        }

        return date.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
    };

    // 3D/Gradient 플레이스홀더 패턴 (이미지가 없을 때 사용)
    const getGradient = (id: number) => {
        const gradients = [
            'bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/40 dark:to-indigo-800/40',
            'bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-900/40 dark:to-teal-800/40',
            'bg-gradient-to-br from-orange-100 to-rose-200 dark:from-orange-900/40 dark:to-rose-800/40',
            'bg-gradient-to-br from-violet-100 to-purple-200 dark:from-violet-900/40 dark:to-purple-800/40',
        ];
        return gradients[id % gradients.length];
    };

    if (layout === 'grid') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                {posts.map((post) => (
                    <div
                        key={post.id}
                        onClick={() => onPostClick(post.id)}
                        className="group flex flex-col bg-white dark:bg-[#1E212B] rounded-2xl overflow-hidden border border-gray-100 dark:border-white/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    >
                        {/* Card Image Area */}
                        <div className={`relative w-full aspect-[4/3] overflow-hidden ${post.image_url ? 'bg-gray-100 dark:bg-gray-800' : getGradient(post.id)} flex items-center justify-center`}>
                            {/* Bookmark Icon */}
                            <div className="absolute top-3 left-3 z-10">
                                <div className="bg-white/90 dark:bg-black/50 p-1.5 rounded-md shadow-sm backdrop-blur-sm cursor-default hover:scale-110 transition-transform">
                                    <Bookmark size={16} className="text-blue-500 fill-blue-500" />
                                </div>
                            </div>

                            {/* Image or Placeholder Content */}
                            <div className="transform group-hover:scale-105 transition-transform duration-500 w-full h-full flex items-center justify-center">
                                {post.image_url ? (
                                    <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                                ) : (
                                    <h3 className="text-6xl font-black text-black/10 dark:text-white/10 select-none">
                                        {post.title.slice(0, 1)}
                                    </h3>
                                )}
                            </div>
                        </div>

                        {/* Card Content Area */}
                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-blue-500 transition-colors">
                                {post.title}
                            </h3>

                            {/* Author Info */}
                            <div className="flex items-center gap-2 mt-auto pt-4">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                    {post.user?.profile_image ? (
                                        <img src={getImageUrl(post.user.profile_image)} alt={post.user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-[10px] font-bold">
                                            {(post.user?.nickname || post.user?.name || '?').slice(0, 1)}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                                    {post.user?.nickname || post.user?.name || '익명'}
                                </span>

                                <div className="ml-auto flex items-center gap-3 text-gray-400 text-xs">
                                    <span className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                        {formatTimeAgo(post.created_at)}
                                    </span>
                                    <div className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                                        <MessageSquare size={12} />
                                        <span>{post.comments?.length || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Default: Table Layout
    return (
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-[#1E212B]">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                    <tr>
                        <th scope="col" className="px-6 py-4 font-medium text-center w-20">번호</th>
                        <th scope="col" className="px-6 py-4 font-medium">제목</th>
                        <th scope="col" className="px-6 py-4 font-medium text-center w-32">작성자</th>
                        <th scope="col" className="px-6 py-4 font-medium text-center w-24">날짜</th>
                        <th scope="col" className="px-6 py-4 font-medium text-center w-20">댓글</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {posts.map((post) => (
                        <tr
                            key={post.id}
                            onClick={() => onPostClick(post.id)}
                            className="bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        >
                            <td className="px-6 py-4 text-center text-gray-400 dark:text-gray-500">
                                {post.id}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-500">
                                        {post.title}
                                    </span>
                                    {post.image_url && (
                                        <div className="text-blue-500" title="사진 있음">
                                            <Image size={14} />
                                        </div>
                                    )}
                                    {new Date(post.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
                                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 ml-1 text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 rounded">
                                            N
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                        {post.user?.profile_image ? (
                                            <img src={getImageUrl(post.user.profile_image)} alt={post.user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-[8px] font-bold">
                                                {(post.user?.nickname || post.user?.name || '?').slice(0, 1)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-gray-600 dark:text-gray-300 truncate max-w-[80px]">
                                        {post.user?.nickname || post.user?.name || '익명'}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatTimeAgo(post.created_at)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {post.comments && post.comments.length > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                        <MessageSquare size={12} />
                                        {post.comments.length}
                                    </span>
                                ) : (
                                    <span className="text-gray-300 dark:text-gray-600">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
