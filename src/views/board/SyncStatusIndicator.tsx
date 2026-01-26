'use client';

import React, { useEffect, useState } from 'react';
import { Check, AlertCircle, Loader2, Cloud, RefreshCw } from 'lucide-react';
import type { SyncStatus, SyncError } from '@/src/containers/hooks/common/usePendingSync';

// ============================================
// 타입 정의
// ============================================

export interface SyncStatusIndicatorProps {
  status: SyncStatus;
  pendingCount: number;
  error: SyncError | null;
  onRetry?: () => void;
  onDismissError?: () => void;
  className?: string;
}

// ============================================
// 상태별 설정
// ============================================

interface StatusConfig {
  icon: React.ReactNode;
  text: string;
  bgColor: string;
  textColor: string;
  animate?: boolean;
}

const STATUS_CONFIGS: Record<SyncStatus, StatusConfig> = {
  idle: {
    icon: <Cloud size={14} />,
    text: '동기화됨',
    bgColor: 'bg-transparent',
    textColor: 'text-gray-400 dark:text-gray-500',
  },
  pending: {
    icon: <Cloud size={14} />,
    text: '변경됨',
    bgColor: 'bg-transparent',
    textColor: 'text-gray-400 dark:text-gray-500',
  },
  syncing: {
    icon: <Loader2 size={14} className="animate-spin" />,
    text: '저장 중...',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    animate: true,
  },
  success: {
    icon: <Check size={14} />,
    text: '저장됨',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: <AlertCircle size={14} />,
    text: '저장 실패',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
  },
};

// ============================================
// 메인 컴포넌트
// ============================================

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
                                                                          status,
                                                                          pendingCount,
                                                                          error,
                                                                          onRetry,
                                                                          onDismissError,
                                                                          className = '',
                                                                        }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [displayStatus, setDisplayStatus] = useState<SyncStatus>(status);

  // 상태 변경 시 가시성 관리
  // 조건부 setState로 불필요한 리렌더링 방지
  useEffect(() => {
    // pending 상태는 표시하지 않음 (debounce 대기 중)
    // syncing, success, error 상태만 표시
    if (status === 'idle' || status === 'pending') {
      // idle/pending 상태면 서서히 숨김
      const timer = setTimeout(() => {
        setIsVisible(prev => prev ? false : prev); // 이미 false면 setState 스킵
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // 상태가 변경될 때만 업데이트
      setIsVisible(prev => prev ? prev : true);
      setDisplayStatus(prev => prev !== status ? status : prev);
    }
  }, [status, pendingCount]);

  // success 상태 2초 유지 후 idle로 전환
  useEffect(() => {
    if (status === 'success') {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setDisplayStatus(prev => prev !== 'idle' ? 'idle' : prev);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const config = STATUS_CONFIGS[displayStatus];

  // 완전히 숨김 상태 (idle, pending일 때)
  if (!isVisible && (displayStatus === 'idle' || displayStatus === 'pending')) {
    return null;
  }

  return (
      <div
          className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        transition-all duration-300 ease-in-out
        ${config.bgColor} ${config.textColor}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        ${className}
      `}
      >
        {/* 아이콘 */}
        <span className={config.animate ? 'animate-pulse' : ''}>
        {config.icon}
      </span>

        {/* 텍스트 */}
        <span className="text-xs font-medium whitespace-nowrap">
        {displayStatus === 'syncing' && pendingCount > 0
            ? `저장 중... (${pendingCount})`
            : config.text
        }
      </span>

        {/* 에러 시 재시도 버튼 */}
        {displayStatus === 'error' && onRetry && (
            <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
                className="
            ml-1 p-1 rounded-full
            hover:bg-red-100 dark:hover:bg-red-900/50
            transition-colors duration-150
          "
                title="재시도"
            >
              <RefreshCw size={12} />
            </button>
        )}

        {/* 에러 시 닫기 버튼 */}
        {displayStatus === 'error' && onDismissError && (
            <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissError();
                }}
                className="
            ml-1 p-1 rounded-full
            hover:bg-red-100 dark:hover:bg-red-900/50
            transition-colors duration-150
            text-red-400 hover:text-red-600
          "
                title="닫기"
            >
              ×
            </button>
        )}
      </div>
  );
};

// ============================================
// 토스트 스타일 에러 알림 (선택적)
// ============================================

export interface SyncErrorToastProps {
  error: SyncError;
  onRetry: () => void;
  onDismiss: () => void;
}

export const SyncErrorToast: React.FC<SyncErrorToastProps> = ({
                                                                error,
                                                                onRetry,
                                                                onDismiss,
                                                              }) => {
  // 자동 닫힘 (10초)
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const getErrorMessage = () => {
    switch (error.type) {
      case 'card-position':
        return '카드 위치 저장에 실패했습니다.';
      case 'group-position':
        return '그룹 위치 저장에 실패했습니다.';
      case 'connection':
        return '연결선 저장에 실패했습니다.';
      default:
        return '변경 사항 저장에 실패했습니다.';
    }
  };

  return (
      <div
          className="
        fixed bottom-4 right-4 z-[100]
        flex items-start gap-3 p-4
        bg-white dark:bg-gray-800
        border border-red-200 dark:border-red-800
        rounded-xl shadow-lg
        animate-in slide-in-from-right duration-300
        max-w-sm
      "
      >
        <div className="flex-shrink-0 p-1 bg-red-100 dark:bg-red-900/30 rounded-full">
          <AlertCircle size={18} className="text-red-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {getErrorMessage()}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            원래 위치로 복원됩니다.
          </p>

          <div className="mt-3 flex gap-2">
            <button
                onClick={onRetry}
                className="
              px-3 py-1.5 text-xs font-medium
              bg-red-50 dark:bg-red-900/30
              text-red-600 dark:text-red-400
              rounded-lg
              hover:bg-red-100 dark:hover:bg-red-900/50
              transition-colors duration-150
            "
            >
              재시도
            </button>
            <button
                onClick={onDismiss}
                className="
              px-3 py-1.5 text-xs font-medium
              text-gray-500 dark:text-gray-400
              rounded-lg
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors duration-150
            "
            >
              무시
            </button>
          </div>
        </div>

        <button
            onClick={onDismiss}
            className="
          flex-shrink-0 p-1
          text-gray-400 hover:text-gray-600
          dark:text-gray-500 dark:hover:text-gray-300
          transition-colors duration-150
        "
        >
          ×
        </button>
      </div>
  );
};

export default SyncStatusIndicator;