'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileVersion } from '@/src/models/types';
import { getFileVersions, getFileDownloadUrl } from '@/src/models/api';
import { Download, ChevronDown, Loader2, Clock, X } from 'lucide-react';

interface FileVersionDropdownProps {
    fileId: number;
    filename: string;
    latestVersionId?: number;
    buttonClassName?: string;
    compact?: boolean;  // true면 아이콘만 표시
}

// 파일 크기 포맷
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// 상대 시간 포맷
const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
    return `${Math.floor(diffDays / 365)}년 전`;
};

export const FileVersionDropdown: React.FC<FileVersionDropdownProps> = ({
                                                                            fileId,
                                                                            filename,
                                                                            latestVersionId,
                                                                            buttonClassName = '',
                                                                            compact = false,
                                                                        }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [versions, setVersions] = useState<FileVersion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ bottom: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // 패널 위치 계산 - 하단 정렬 (위로 솟아나게)
    const updatePanelPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // 버튼의 하단 기준으로 패널 하단 맞춤
            // bottom = 뷰포트 하단에서 버튼 하단까지의 거리
            setPanelPosition({
                bottom: viewportHeight - rect.bottom,
                left: rect.right + 8,  // 버튼 오른쪽에 8px 간격
            });
        }
    };

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                panelRef.current &&
                !panelRef.current.contains(target) &&
                buttonRef.current &&
                !buttonRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', updatePanelPosition);
            window.addEventListener('scroll', updatePanelPosition, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePanelPosition);
            window.removeEventListener('scroll', updatePanelPosition, true);
        };
    }, [isOpen]);

    // 드롭다운 열 때 버전 목록 로드
    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isOpen) {
            updatePanelPosition();
            setIsOpen(true);
            setIsLoading(true);
            try {
                const data = await getFileVersions(fileId);
                setVersions(data);
            } catch (err) {
                console.error('Failed to load versions:', err);
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsOpen(false);
        }
    };

    // 버전 다운로드
    const handleDownload = (versionId: number, version: number) => {
        const url = getFileDownloadUrl(versionId);
        const link = document.createElement('a');
        link.href = url;
        link.download = `v${version}_${filename}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsOpen(false);
    };

    // 닫기
    const handleClose = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
    };

    // Portal로 렌더링할 패널
    const panel = isOpen && typeof window !== 'undefined' ? createPortal(
        <div
            ref={panelRef}
            className="fixed w-64 h-72 bg-white dark:bg-[#2c333a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[100] animate-in fade-in slide-in-from-left-2 duration-150 flex flex-col"
            style={{
                bottom: panelPosition.bottom,
                left: panelPosition.left,
            }}
        >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#22272b] shrink-0">
                <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        버전 히스토리
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[180px]" title={filename}>
                        {filename}
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                    <X size={16} className="text-gray-500" />
                </button>
            </div>

            {/* 버전 목록 - 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-blue-500" />
                    </div>
                ) : versions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                        버전 정보가 없습니다
                    </div>
                ) : (
                    <div className="p-2">
                        {versions.map((ver, idx) => (
                            <button
                                key={ver.id}
                                onClick={() => handleDownload(ver.id, ver.version)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-[#38414a] rounded-xl transition-colors text-left mb-1"
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                        v{ver.version}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatFileSize(ver.file_size)}
                                        </span>
                                        {idx === 0 && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full font-medium">
                                                최신
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Clock size={10} />
                                        <span>{formatRelativeTime(ver.created_at)}</span>
                                    </div>
                                </div>
                                <Download size={16} className="text-gray-400 shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <>
            {/* 트리거 버튼 */}
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className={buttonClassName || `p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1`}
                title="버전 선택 다운로드"
            >
                <Download size={compact ? 14 : 16} />
                {!compact && <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            {/* Portal로 렌더링되는 패널 */}
            {panel}
        </>
    );
};

export default FileVersionDropdown;