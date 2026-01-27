'use client';

import React, { useState } from 'react';
import {
    X,
    Link,
    Mail,
    Copy,
    Check,
    Loader2,
    Clock,
    UserPlus,
    Send
} from 'lucide-react';
import { createInvitation, addWorkspaceMember } from '@/src/models/api';

interface InviteModalProps {
    workspaceId: number;
    workspaceName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

type InviteTab = 'link' | 'direct';

export const InviteModal: React.FC<InviteModalProps> = ({
    workspaceId,
    workspaceName,
    isOpen,
    onClose,
    onSuccess
}) => {
    const [activeTab, setActiveTab] = useState<InviteTab>('link');

    // 링크 초대 상태
    const [inviteLink, setInviteLink] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string>('member');
    const [selectedExpiry, setSelectedExpiry] = useState<number>(24);

    // 직접 초대 상태
    const [email, setEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [directInviteResult, setDirectInviteResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    if (!isOpen) return null;

    // 초대 링크 생성
    const handleGenerateLink = async () => {
        setIsGenerating(true);
        setInviteLink('');
        try {
            const response = await createInvitation(workspaceId, selectedRole, selectedExpiry);
            setInviteLink(response.invite_link);
            setExpiresAt(response.expires_at);
        } catch (error) {
            console.error('Failed to generate invitation link:', error);
            alert('초대 링크 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    // 클립보드 복사
    const handleCopyLink = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            // fallback
            const textArea = document.createElement('textarea');
            textArea.value = inviteLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    // 직접 초대 (강제 추가)
    const handleDirectInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsInviting(true);
        setDirectInviteResult(null);
        try {
            const response = await addWorkspaceMember(workspaceId, email);
            setDirectInviteResult({
                success: true,
                message: response.message || '멤버가 추가되었습니다.'
            });
            setEmail('');
            onSuccess?.();
        } catch (error: any) {
            setDirectInviteResult({
                success: false,
                message: error.message || '멤버 추가에 실패했습니다.'
            });
        } finally {
            setIsInviting(false);
        }
    };

    // 만료 시간 포맷
    const formatExpiry = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('ko-KR', {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-[#1E212B] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            팀원 초대
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {workspaceName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-white/10">
                    <button
                        onClick={() => setActiveTab('link')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'link'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <Link size={16} />
                        초대 링크
                    </button>
                    <button
                        onClick={() => setActiveTab('direct')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'direct'
                                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <UserPlus size={16} />
                        직접 추가
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'link' ? (
                        <div className="space-y-4">
                            {/* 역할 선택 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    초대 역할
                                </label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value="member">멤버</option>
                                    <option value="admin">관리자</option>
                                </select>
                            </div>

                            {/* 만료 시간 선택 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    링크 유효 기간
                                </label>
                                <select
                                    value={selectedExpiry}
                                    onChange={(e) => setSelectedExpiry(Number(e.target.value))}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                >
                                    <option value={1}>1시간</option>
                                    <option value={6}>6시간</option>
                                    <option value={24}>24시간</option>
                                    <option value={72}>3일</option>
                                    <option value={168}>7일</option>
                                </select>
                            </div>

                            {/* 링크 생성 버튼 */}
                            <button
                                onClick={handleGenerateLink}
                                disabled={isGenerating}
                                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        생성 중...
                                    </>
                                ) : (
                                    <>
                                        <Link size={18} />
                                        초대 링크 생성
                                    </>
                                )}
                            </button>

                            {/* 생성된 링크 표시 */}
                            {inviteLink && (
                                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                                                초대 링크가 생성되었습니다!
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-400 truncate font-mono">
                                                {inviteLink}
                                            </p>
                                            {expiresAt && (
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                                                    <Clock size={12} />
                                                    만료: {formatExpiry(expiresAt)}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleCopyLink}
                                            className={`p-2 rounded-lg transition-all ${
                                                isCopied
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-300 dark:hover:bg-green-700'
                                            }`}
                                        >
                                            {isCopied ? <Check size={18} /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                이미 가입된 사용자를 이메일로 바로 추가합니다.
                            </p>

                            <form onSubmit={handleDirectInvite}>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="이메일 주소 입력"
                                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isInviting || !email.trim()}
                                        className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                                    >
                                        {isInviting ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : (
                                            <Send size={18} />
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* 결과 메시지 */}
                            {directInviteResult && (
                                <div
                                    className={`p-4 rounded-xl border ${
                                        directInviteResult.success
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                    }`}
                                >
                                    <p
                                        className={`text-sm font-medium ${
                                            directInviteResult.success
                                                ? 'text-green-800 dark:text-green-300'
                                                : 'text-red-800 dark:text-red-300'
                                        }`}
                                    >
                                        {directInviteResult.message}
                                    </p>
                                </div>
                            )}

                            <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                                <strong>참고:</strong> 직접 추가는 이미 DOMO에 가입된 사용자만 가능합니다.
                                가입하지 않은 사용자에게는 초대 링크를 공유해주세요.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
