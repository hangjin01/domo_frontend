'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================
// 타입 정의
// ============================================

export type ChangeType = 'card-position' | 'group-position' | 'connection';

export type SyncStatus = 'idle' | 'pending' | 'syncing' | 'success' | 'error';
// idle: 변경 없음
// pending: 변경 있음, debounce 대기 중
// syncing: 실제 API 호출 중
// success: 저장 완료
// error: 저장 실패

export interface PendingChange<T = unknown, S = unknown> {
  id: string;
  type: ChangeType;
  entityId: number;
  payload: T;
  snapshot: S;           // 롤백용 이전 상태
  timestamp: number;
  retryCount: number;
}

export interface SyncError {
  changeId: string;
  entityId: number;
  type: ChangeType;
  error: Error;
  canRetry: boolean;
}

// ============================================
// Batch 모드 타입 정의
// ============================================

/** Batch 업데이트용 카드 위치 페이로드 */
export interface BatchCardPositionPayload {
  taskId: number;
  x: number;
  y: number;
  column_id?: number | null;
}

/** Batch 업데이트용 카드 스냅샷 */
export interface BatchCardSnapshot {
  x: number;
  y: number;
  column_id: number | undefined;
}

/** Batch 변경 항목 (개별 카드) */
export interface BatchChangeItem {
  entityId: number;
  payload: BatchCardPositionPayload;
  snapshot: BatchCardSnapshot;
}

/** Batch 변경 그룹 */
export interface BatchChange {
  id: string;
  type: 'card-position-batch';
  items: BatchChangeItem[];
  timestamp: number;
  retryCount: number;
}

// ============================================
// Options 타입
// ============================================

export interface UsePendingSyncOptions<T = unknown, S = unknown> {
  debounceMs?: number;           // 디바운스 대기 시간 (기본 400ms)
  maxRetries?: number;           // 최대 재시도 횟수 (기본 3회)
  retryDelayMs?: number;         // 재시도 간격 (기본 1000ms)
  onSyncStart?: () => void;
  onSyncSuccess?: (changeIds: string[]) => void;
  onSyncError?: (errors: SyncError[]) => void;
  // 롤백 콜백: 실패 시 호출됨. 
  // 주의: 이 콜백은 ref로 관리되어 항상 최신 함수가 호출됨
  onRollback?: (change: PendingChange<T, S>) => void;
  // Batch 롤백 콜백: Batch 실패 시 호출됨
  onBatchRollback?: (items: BatchChangeItem[]) => void;
  // Batch API 함수 (card-position 타입에만 사용)
  batchApiCall?: (payloads: BatchCardPositionPayload[]) => Promise<void>;
}

export interface UsePendingSyncReturn<T = unknown, S = unknown> {
  // 상태
  pendingCount: number;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  lastError: SyncError | null;
  pendingChanges: PendingChange<T, S>[];

  // 메서드 (기존 단건 API용)
  queueChange: (
      type: ChangeType,
      entityId: number,
      payload: T,
      snapshot: S,
      apiCall: (payload: T) => Promise<void>
  ) => void;

  // 메서드 (Batch API용)
  queueBatchChange: (items: BatchChangeItem[]) => void;

  flush: () => Promise<void>;
  clearError: () => void;
  retryFailed: () => void;

  // 유틸리티
  hasPendingChanges: boolean;
  getChangeForEntity: (entityId: number, type: ChangeType) => PendingChange<T, S> | undefined;
}

// ============================================
// 유틸리티
// ============================================

function generateChangeId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// 메인 훅
// ============================================

export function usePendingSync<T = unknown, S = unknown>(
    options: UsePendingSyncOptions<T, S> = {}
): UsePendingSyncReturn<T, S> {
  const {
    debounceMs = 400,  // 100ms → 400ms로 변경 (연속 드래그 대응)
    maxRetries = 3,
    retryDelayMs = 1000,
    onSyncStart,
    onSyncSuccess,
    onSyncError,
    onRollback,
    onBatchRollback,
    batchApiCall,
  } = options;

  // 상태
  const [pendingChanges, setPendingChanges] = useState<PendingChange<T, S>[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastError, setLastError] = useState<SyncError | null>(null);

  // Batch 변경 상태
  const [batchChange, setBatchChange] = useState<BatchChange | null>(null);

  // Refs (클로저 문제 방지)
  const pendingChangesRef = useRef<PendingChange<T, S>[]>([]);
  const batchChangeRef = useRef<BatchChange | null>(null);
  const apiCallsRef = useRef<Map<string, (payload: T) => Promise<void>>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // 콜백 refs (항상 최신 함수 참조)
  const onSyncStartRef = useRef(onSyncStart);
  const onSyncSuccessRef = useRef(onSyncSuccess);
  const onSyncErrorRef = useRef(onSyncError);
  const onRollbackRef = useRef(onRollback);
  const onBatchRollbackRef = useRef(onBatchRollback);
  const batchApiCallRef = useRef(batchApiCall);

  // 콜백 refs 업데이트
  useEffect(() => {
    onSyncStartRef.current = onSyncStart;
    onSyncSuccessRef.current = onSyncSuccess;
    onSyncErrorRef.current = onSyncError;
    onRollbackRef.current = onRollback;
    onBatchRollbackRef.current = onBatchRollback;
    batchApiCallRef.current = batchApiCall;
  }, [onSyncStart, onSyncSuccess, onSyncError, onRollback, onBatchRollback, batchApiCall]);

  // pendingChanges 동기화
  useEffect(() => {
    pendingChangesRef.current = pendingChanges;
  }, [pendingChanges]);

  // batchChange 동기화
  useEffect(() => {
    batchChangeRef.current = batchChange;
  }, [batchChange]);

  // ============================================
  // Batch 동기화 실행
  // ============================================

  const executeBatchSync = useCallback(async (): Promise<boolean> => {
    const batch = batchChangeRef.current;
    if (!batch || batch.items.length === 0) return true;

    const batchApi = batchApiCallRef.current;
    if (!batchApi) {
      console.warn('[Optimistic] Batch API 콜이 설정되지 않음');
      return true;
    }

    console.log('[Optimistic] Batch 동기화 시작, 카드 수:', batch.items.length);

    try {
      // Batch API 호출
      const payloads = batch.items.map(item => item.payload);
      await batchApi(payloads);

      console.log('[Optimistic] Batch 동기화 성공');

      // 성공 시 Batch 상태 초기화
      setBatchChange(null);
      batchChangeRef.current = null;

      return true;
    } catch (err) {
      console.error('[Optimistic] Batch 동기화 실패:', err);

      const canRetry = batch.retryCount < maxRetries;

      if (canRetry) {
        // 재시도 횟수 증가
        const updatedBatch: BatchChange = {
          ...batch,
          retryCount: batch.retryCount + 1,
        };
        setBatchChange(updatedBatch);
        batchChangeRef.current = updatedBatch;
      } else {
        // 최대 재시도 초과 - 롤백
        console.log('[Optimistic] Batch 최대 재시도 초과, 롤백 실행');
        onBatchRollbackRef.current?.(batch.items);

        // Batch 상태 초기화
        setBatchChange(null);
        batchChangeRef.current = null;
      }

      return false;
    }
  }, [maxRetries]);

  // ============================================
  // 단건 동기화 실행 (기존 로직)
  // ============================================

  const executeSingleSync = useCallback(async (): Promise<{
    successIds: string[];
    errors: SyncError[];
    updatedChanges: PendingChange<T, S>[];
  }> => {
    const changes = [...pendingChangesRef.current];
    const successIds: string[] = [];
    const errors: SyncError[] = [];
    const updatedChanges: PendingChange<T, S>[] = [];

    for (const change of changes) {
      const apiCall = apiCallsRef.current.get(change.id);
      if (!apiCall) {
        console.warn('[Optimistic] API 콜 없음, 스킵:', change.id);
        successIds.push(change.id);
        continue;
      }

      try {
        console.log('[Optimistic] 단건 API 호출 중:', change.id, change.type);
        await apiCall(change.payload);
        console.log('[Optimistic] 단건 API 성공:', change.id);
        successIds.push(change.id);
        apiCallsRef.current.delete(change.id);
      } catch (err) {
        console.error('[Optimistic] 단건 API 실패:', change.id, err);
        const error = err instanceof Error ? err : new Error(String(err));
        const canRetry = change.retryCount < maxRetries;

        if (canRetry) {
          updatedChanges.push({
            ...change,
            retryCount: change.retryCount + 1,
          });
        } else {
          errors.push({
            changeId: change.id,
            entityId: change.entityId,
            type: change.type,
            error,
            canRetry: false,
          });
          onRollbackRef.current?.(change);
          apiCallsRef.current.delete(change.id);
        }
      }
    }

    return { successIds, errors, updatedChanges };
  }, [maxRetries]);

  // ============================================
  // 통합 동기화 실행
  // ============================================

  const executeSync = useCallback(async () => {
    const hasBatchChanges = batchChangeRef.current && batchChangeRef.current.items.length > 0;
    const hasSingleChanges = pendingChangesRef.current.length > 0;

    if ((!hasBatchChanges && !hasSingleChanges) || isSyncingRef.current) return;

    console.log('[Optimistic] executeSync 시작, Batch:', hasBatchChanges, ', 단건:', hasSingleChanges);

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncStatus('syncing');
    onSyncStartRef.current?.();

    let allSuccess = true;
    const allSuccessIds: string[] = [];
    const allErrors: SyncError[] = [];

    // 1. Batch 동기화 먼저 실행
    if (hasBatchChanges) {
      const batchSuccess = await executeBatchSync();
      if (batchSuccess && batchChangeRef.current === null) {
        allSuccessIds.push('batch-' + generateChangeId());
      } else {
        allSuccess = false;
      }
    }

    // 2. 단건 동기화 실행
    if (hasSingleChanges) {
      const { successIds, errors, updatedChanges } = await executeSingleSync();
      allSuccessIds.push(...successIds);
      allErrors.push(...errors);

      // 상태 업데이트
      setPendingChanges(updatedChanges);
      pendingChangesRef.current = updatedChanges;

      if (errors.length > 0 || updatedChanges.length > 0) {
        allSuccess = false;
      }
    }

    isSyncingRef.current = false;
    setIsSyncing(false);

    if (allErrors.length > 0) {
      setSyncStatus('error');
      setLastError(allErrors[0]);
      onSyncErrorRef.current?.(allErrors);
    } else if (allSuccessIds.length > 0 && allSuccess) {
      setSyncStatus('success');
      setLastError(null);
      onSyncSuccessRef.current?.(allSuccessIds);

      // 성공 상태 2초 후 idle로 전환
      setTimeout(() => {
        setSyncStatus(prev => (prev === 'success' ? 'idle' : prev));
      }, 2000);
    }

    // 재시도할 변경 사항이 있으면 다시 스케줄링
    const hasRetryBatch = batchChangeRef.current && batchChangeRef.current.retryCount > 0;
    const hasRetrySingle = pendingChangesRef.current.length > 0;

    if (hasRetryBatch || hasRetrySingle) {
      setTimeout(() => {
        executeSync();
      }, retryDelayMs);
    }
  }, [executeBatchSync, executeSingleSync, retryDelayMs]);

  // ============================================
  // 디바운스된 동기화 스케줄링
  // ============================================

  const scheduleSync = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      executeSync();
    }, debounceMs);
  }, [debounceMs, executeSync]);

  // ============================================
  // Batch 변경 사항 큐에 추가
  // ============================================

  const queueBatchChange = useCallback((items: BatchChangeItem[]) => {
    if (items.length === 0) return;

    setBatchChange(prev => {
      const existingItems = prev?.items || [];
      const mergedItems: BatchChangeItem[] = [...existingItems];

      for (const newItem of items) {
        const existingIndex = mergedItems.findIndex(
            item => item.entityId === newItem.entityId
        );

        if (existingIndex >= 0) {
          // 기존 항목 업데이트 (payload만 변경, snapshot 유지)
          mergedItems[existingIndex] = {
            ...mergedItems[existingIndex],
            payload: newItem.payload,
            // snapshot은 최초 값 유지
          };
        } else {
          // 새 항목 추가
          mergedItems.push(newItem);
        }
      }

      return {
        id: prev?.id || generateChangeId(),
        type: 'card-position-batch',
        items: mergedItems,
        timestamp: Date.now(),
        retryCount: prev?.retryCount || 0,
      };
    });

    // pending 상태로 설정
    setSyncStatus('pending');

    // 동기화 스케줄링
    scheduleSync();
  }, [scheduleSync]);

  // ============================================
  // 단건 변경 사항 큐에 추가 (기존 로직)
  // ============================================

  const queueChange = useCallback((
      type: ChangeType,
      entityId: number,
      payload: T,
      snapshot: S,
      apiCall: (payload: T) => Promise<void>
  ) => {
    setPendingChanges(prev => {
      // 같은 엔티티의 기존 변경이 있으면 병합 (마지막 값으로 덮어쓰기)
      const existingIndex = prev.findIndex(
          c => c.entityId === entityId && c.type === type
      );

      const changeId = existingIndex >= 0
          ? prev[existingIndex].id
          : generateChangeId();

      // API 콜 저장/업데이트
      apiCallsRef.current.set(changeId, apiCall);

      const newChange: PendingChange<T, S> = {
        id: changeId,
        type,
        entityId,
        payload,
        snapshot: existingIndex >= 0 ? prev[existingIndex].snapshot : snapshot, // 최초 스냅샷 유지
        timestamp: Date.now(),
        retryCount: 0,
      };

      if (existingIndex >= 0) {
        // 기존 변경 업데이트
        const updated = [...prev];
        updated[existingIndex] = newChange;
        return updated;
      } else {
        // 새 변경 추가
        return [...prev, newChange];
      }
    });

    // pending 상태로 설정 (debounce 대기 중)
    setSyncStatus('pending');

    // 동기화 스케줄링
    scheduleSync();
  }, [scheduleSync]);

  // ============================================
  // 즉시 동기화 강제
  // ============================================

  const flush = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await executeSync();
  }, [executeSync]);

  // ============================================
  // 에러 관련
  // ============================================

  const clearError = useCallback(() => {
    setLastError(null);
    setSyncStatus('idle');
  }, []);

  const retryFailed = useCallback(() => {
    // 실패한 변경들의 재시도 횟수 리셋
    setPendingChanges(prev =>
        prev.map(c => ({ ...c, retryCount: 0 }))
    );

    // Batch 재시도 횟수도 리셋
    setBatchChange(prev => prev ? { ...prev, retryCount: 0 } : null);

    setLastError(null);
    scheduleSync();
  }, [scheduleSync]);

  // ============================================
  // 유틸리티
  // ============================================

  const getChangeForEntity = useCallback((
      entityId: number,
      type: ChangeType
  ): PendingChange<T, S> | undefined => {
    return pendingChangesRef.current.find(
        c => c.entityId === entityId && c.type === type
    );
  }, []);

  // ============================================
  // 페이지 이탈 경고
  // ============================================

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasPending = isSyncingRef.current ||
          pendingChangesRef.current.length > 0 ||
          (batchChangeRef.current && batchChangeRef.current.items.length > 0);

      if (hasPending) {
        e.preventDefault();
        const message = isSyncingRef.current
            ? '저장 중입니다. 잠시만 기다려주세요.'
            : '저장되지 않은 변경 사항이 있습니다. 페이지를 떠나시겠습니까?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // ============================================
  // 클린업 - 컴포넌트 unmount 시 pending 변경사항 즉시 저장
  // ============================================

  useEffect(() => {
    // cleanup 함수가 실행될 때 ref 값이 변경될 수 있으므로
    // effect 내에서 미리 복사해둠 (린트 규칙 준수)
    const apiCallsMap = apiCallsRef.current;
    const debounceTimer = debounceTimerRef;
    const batchChangeSnapshot = batchChangeRef;
    const pendingChangesSnapshot = pendingChangesRef;
    const isSyncingSnapshot = isSyncingRef;
    const batchApiSnapshot = batchApiCallRef;

    return () => {
      // debounce 타이머 취소
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      // Batch 변경사항 즉시 저장
      const batchToSave = batchChangeSnapshot.current;
      if (batchToSave && batchToSave.items.length > 0 && !isSyncingSnapshot.current) {
        console.log('[Optimistic] Unmount 시 Batch 저장 시작:', batchToSave.items.length, '개');
        const batchApi = batchApiSnapshot.current;
        if (batchApi) {
          const payloads = batchToSave.items.map(item => item.payload);
          batchApi(payloads).catch(err => {
            console.error('[Optimistic] Unmount Batch 저장 실패:', err);
          });
        }
      }

      // 단건 변경사항 즉시 저장
      const pendingToSave = pendingChangesSnapshot.current;
      if (pendingToSave.length > 0 && !isSyncingSnapshot.current) {
        console.log('[Optimistic] Unmount 시 단건 저장 시작:', pendingToSave.length, '개');
        pendingToSave.forEach(change => {
          const apiCall = apiCallsMap.get(change.id);
          if (apiCall) {
            apiCall(change.payload).catch(err => {
              console.error('[Optimistic] Unmount 단건 저장 실패:', change.id, err);
            });
          }
        });
      }
    };
  }, []);

  // ============================================
  // 총 pending 개수 계산
  // ============================================

  const totalPendingCount = pendingChanges.length + (batchChange?.items.length || 0);

  // ============================================
  // 반환
  // ============================================

  return {
    // 상태
    pendingCount: totalPendingCount,
    isSyncing,
    syncStatus,
    lastError,
    pendingChanges,

    // 메서드
    queueChange,
    queueBatchChange,
    flush,
    clearError,
    retryFailed,

    // 유틸리티
    hasPendingChanges: totalPendingCount > 0,
    getChangeForEntity,
  };
}

export default usePendingSync;