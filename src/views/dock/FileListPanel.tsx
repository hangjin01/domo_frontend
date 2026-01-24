'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileMetadata } from '@/src/models/types';
import { getProjectFiles, uploadFile, deleteFile } from '@/src/models/api';
import { FileVersionDropdown } from '@/src/views/common';
import {
    X, Upload, Trash2, FileText, FileImage, File, Loader2, FolderOpen
} from 'lucide-react';

interface FileListPanelProps {
    projectId: number;
    isOpen: boolean;
    onClose: () => void;
    onFileDragStart: (file: FileMetadata, e: React.DragEvent) => void;
    onFileDeleted?: (fileId: number) => void;  // 파일 삭제 시 부모에게 알림
}

// 파일 확장자에 따른 아이콘 반환
const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // 이미지
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
        return <FileImage size={18} className="text-purple-500" />;
    }
    // 문서
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
        return <FileText size={18} className="text-blue-500" />;
    }
    // 기본
    return <File size={18} className="text-gray-500" />;
};

// 파일 크기 포맷
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const FileListPanel: React.FC<FileListPanelProps> = ({
                                                                projectId,
                                                                isOpen,
                                                                onClose,
                                                                onFileDragStart,
                                                                onFileDeleted,
                                                            }) => {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 파일 목록 로드
    useEffect(() => {
        if (isOpen && projectId) {
            loadFiles();
        }
    }, [isOpen, projectId]);

    const loadFiles = async () => {
        setIsLoading(true);
        try {
            const data = await getProjectFiles(projectId);
            setFiles(data);
        } catch (err) {
            console.error('Failed to load files:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // 파일 업로드
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of Array.from(selectedFiles)) {
                const uploaded = await uploadFile(projectId, file);
                // 같은 ID가 있으면 교체 (버전 업데이트), 없으면 추가
                setFiles(prev => {
                    const existingIndex = prev.findIndex(f => f.id === uploaded.id);
                    if (existingIndex >= 0) {
                        // 기존 파일 교체 (버전 업데이트)
                        const updated = [...prev];
                        updated[existingIndex] = uploaded;
                        return updated;
                    } else {
                        // 새 파일 추가
                        return [...prev, uploaded];
                    }
                });
            }
        } catch (err) {
            console.error('Failed to upload file:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // 파일 삭제
    const handleDelete = async (fileId: number) => {
        setDeletingFileId(fileId);
        try {
            await deleteFile(fileId);
            setFiles(prev => prev.filter(f => f.id !== fileId));
            // 부모에게 파일 삭제 알림 -> 연결된 카드에서도 제거
            onFileDeleted?.(fileId);
        } catch (err) {
            console.error('Failed to delete file:', err);
        } finally {
            setDeletingFileId(null);
        }
    };

    // 드래그 시작
    const handleDragStart = (file: FileMetadata, e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'file', fileId: file.id }));
        e.dataTransfer.effectAllowed = 'copy';
        onFileDragStart(file, e);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="glass-panel w-80 max-h-96 rounded-2xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <FolderOpen size={18} className="text-blue-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">프로젝트 파일</span>
                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                            {files.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                {/* 업로드 버튼 */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>업로드 중...</span>
                            </>
                        ) : (
                            <>
                                <Upload size={16} />
                                <span>파일 업로드</span>
                            </>
                        )}
                    </button>
                </div>

                {/* 파일 목록 */}
                <div className="flex-1 overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-blue-500" />
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <File size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">파일이 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {files.map(file => (
                                <div
                                    key={file.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(file, e)}
                                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 cursor-grab active:cursor-grabbing transition-colors"
                                >
                                    {/* 파일 아이콘 */}
                                    <div className="shrink-0">
                                        {getFileIcon(file.filename)}
                                    </div>

                                    {/* 파일 정보 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {file.filename}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {file.latest_version ? formatFileSize(file.latest_version.file_size) : '-'}
                                        </p>
                                    </div>

                                    {/* 액션 버튼 (hover 시 표시) */}
                                    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <FileVersionDropdown
                                            fileId={file.id}
                                            filename={file.filename}
                                            latestVersionId={file.latest_version?.id}
                                            compact
                                            buttonClassName="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                                        />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                                            disabled={deletingFileId === file.id}
                                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                            title="삭제"
                                        >
                                            {deletingFileId === file.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={14} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 드래그 힌트 */}
                <div className="px-4 py-2 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <p className="text-xs text-gray-500 text-center">
                        파일을 카드 위로 드래그하여 첨부하세요
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FileListPanel;