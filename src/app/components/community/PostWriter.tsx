import React, { useState } from 'react';
import { createProjectPost, createCommunityPost } from '@/src/lib/api';
import { ArrowLeft, Loader2, Send, Image, X } from 'lucide-react';

interface PostWriterProps {
    projectId: number;
    mode: 'community' | 'project';
    onCancel: () => void;
    onSuccess: () => void;
}

export const PostWriter: React.FC<PostWriterProps> = ({ projectId, mode, onCancel, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Clean up preview URL on unmount
    React.useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setIsSubmitting(true);
        try {
            if (mode === 'community') {
                await createCommunityPost({
                    title,
                    content,
                    file: selectedFile || undefined
                });
            } else {
                await createProjectPost(projectId, {
                    title,
                    content
                });
            }
            onSuccess();
        } catch (error) {
            console.error('Failed to create post:', error);
            alert('게시글 작성에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">새 글 쓰기</h2>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-transparent focus:border-blue-500 text-lg font-bold outline-none transition-all placeholder:text-gray-400"
                    autoFocus
                />

                {mode === 'community' && (
                    <div className="relative group">
                        <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setSelectedFile(file);
                                    setPreviewUrl(URL.createObjectURL(file));
                                }
                            }}
                            className="hidden"
                        />

                        {previewUrl ? (
                            <div className="relative w-full h-64 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 group-hover:border-blue-500 transition-colors">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                                        setPreviewUrl(null);
                                        // Reset input value to allow selecting same file again
                                        const input = document.getElementById('image-upload') as HTMLInputElement;
                                        if (input) input.value = '';
                                    }}
                                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <label
                                htmlFor="image-upload"
                                className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 cursor-pointer transition-all group-hover:scale-[1.01]"
                            >
                                <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-blue-500">
                                    <Image size={32} />
                                    <span className="font-medium">이미지 추가하기 (선택)</span>
                                </div>
                            </label>
                        )}
                    </div>
                )}

                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="내용을 입력하세요..."
                    className="flex-1 w-full p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-transparent focus:border-blue-500 resize-none outline-none transition-all placeholder:text-gray-400 leading-relaxed custom-scrollbar"
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200/50 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 font-medium transition-colors"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !title.trim() || !content.trim()}
                        className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>등록 중...</span>
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                <span>등록하기</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
