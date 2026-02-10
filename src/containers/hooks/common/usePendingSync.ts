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
  /**
   * [Race Condition Guard] 엔티티 Lock 체크 함수
   * 해당 엔티티가 현재 드래그/상호작용 중인지 확인
   * true를 반환하면 해당 엔티티에 대한 롤백을 스킵함
   */
  isEntityLocked?: (entityId: number) => boolean;
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
    isEntityLocked, // [Race Condition Guard] Lock 체크 함수
  } = options;

  // 개발 환경에서만 로그 출력
  const isDev = process.env.NODE_ENV === 'development';

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
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 콜백 refs (항상 최신 함수 참조)
  const onSyncStartRef = useRef(onSyncStart);
  const onSyncSuccessRef = useRef(onSyncSuccess);
  const onSyncErrorRef = useRef(onSyncError);
  const onRollbackRef = useRef(onRollback);
  const onBatchRollbackRef = useRef(onBatchRollback);
  const batchApiCallRef = useRef(batchApiCall);
  const isEntityLockedRef = useRef(isEntityLocked); // [Race Condition Guard]

  // 콜백 refs 업데이트
  useEffect(() => {
    onSyncStartRef.current = onSyncStart;
    onSyncSuccessRef.current = onSyncSuccess;
    onSyncErrorRef.current = onSyncError;
    onRollbackRef.current = onRollback;
    onBatchRollbackRef.current = onBatchRollback;
    batchApiCallRef.current = batchApiCall;
    isEntityLockedRef.current = isEntityLocked; // [Race Condition Guard]
  }, [onSyncStart, onSyncSuccess, onSyncError, onRollback, onBatchRollback, batchApiCall, isEntityLocked]);

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
      if (isDev) console.warn('[Optimistic] Batch API 콜이 설정되지 않음');
      return true;
    }

    if (isDev) console.log('[Optimistic] Batch 동기화 시작, 카드 수:', batch.items.length);

    try {
      // Batch API 호출
      const payloads = batch.items.map(item => item.payload);
      await batchApi(payloads);

      if (isDev) console.log('[Optimistic] Batch 동기화 성공');

      // 성공 시 Batch 상태 초기화
      setBatchChange(null);
      batchChangeRef.current = null;

      return true;
    } catch (err) {
      if (isDev) console.error('[Optimistic] Batch 동기화 실패:', err);

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
        if (isDev) console.log('[Optimistic] Batch 최대 재시도 초과, 롤백 실행');

        // [Race Condition Guard] Lock된 엔티티는 롤백에서 제외
        const isLockedFn = isEntityLockedRef.current;
        if (isLockedFn) {
          // 각 엔티티의 Lock 상태를 개별 체크하고 로깅
          const lockCheckResults = batch.items.map(item => ({
            entityId: item.entityId,
            isLocked: isLockedFn(item.entityId),
          }));
          if (isDev) console.log('[Optimistic] 🔍 Batch 롤백 Lock 체크:', lockCheckResults);

          const lockedIds = lockCheckResults.filter(r => r.isLocked).map(r => r.entityId);
          const unlockedIds = lockCheckResults.filter(r => !r.isLocked).map(r => r.entityId);

          if (lockedIds.length > 0) {
            if (isDev) console.log('[Optimistic] 🛡️ Lock된 엔티티 롤백 스킵:', lockedIds);
          }
          if (unlockedIds.length > 0) {
            if (isDev) console.log('[Optimistic] ⚠️ Lock 안된 엔티티 롤백 진행:', unlockedIds);
          }

          const itemsToRollback = batch.items.filter(item => !isLockedFn(item.entityId));
          if (itemsToRollback.length > 0) {
            onBatchRollbackRef.current?.(itemsToRollback);
          }
        } else {
          if (isDev) console.log('[Optimistic] ⚠️ isEntityLocked 함수 없음, 전체 롤백');
          onBatchRollbackRef.current?.(batch.items);
        }

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
        if (isDev) console.warn('[Optimistic] API 콜 없음, 스킵:', change.id);
        successIds.push(change.id);
        continue;
      }

      try {
        if (isDev) console.log('[Optimistic] 단건 API 호출 중:', change.id, change.type);
        await apiCall(change.payload);
        if (isDev) console.log('[Optimistic] 단건 API 성공:', change.id);
        successIds.push(change.id);
        apiCallsRef.current.delete(change.id);
      } catch (err) {
        if (isDev) console.error('[Optimistic] 단건 API 실패:', change.id, err);
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

          // [Race Condition Guard] Lock된 엔티티는 롤백 스킵
          const isLockedFn = isEntityLockedRef.current;
          const entityIsLocked = isLockedFn ? isLockedFn(change.entityId) : false;
          if (isDev) console.log(`[Optimistic] 🔍 단건 롤백 Lock 체크 - entityId: ${change.entityId}, isLocked: ${entityIsLocked}`);

          if (entityIsLocked) {
            if (isDev) console.log('[Optimistic] 🛡️ Lock된 엔티티 롤백 스킵:', change.entityId);
          } else {
            if (isDev) console.log('[Optimistic] ⚠️ Lock 안된 엔티티 롤백 진행:', change.entityId);
            onRollbackRef.current?.(change);
          }

          apiCallsRef.current.delete(change.id);
        }
      }
    }

    return { successIds, errors, updatedChanges };
  }, [maxRetries, isDev]);

  // ============================================
  // 통합 동기화 실행
  // ============================================

  const executeSync = useCallback(async () => {
    const hasBatchChanges = batchChangeRef.current && batchChangeRef.current.items.length > 0;
    const hasSingleChanges = pendingChangesRef.current.length > 0;

    if ((!hasBatchChanges && !hasSingleChanges) || isSyncingRef.current) return;

    // 이전 사이클의 타이머 정리 (재진입 시 누적 방지)
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (isDev) console.log('[Optimistic] executeSync 시작, Batch:', hasBatchChanges, ', 단건:', hasSingleChanges);

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

      // [Race Condition 방지] 비동기 실행 중 queueChange로 새로 추가된 변경사항 보호
      // 기존: setPendingChanges(updatedChanges) → 새 변경사항 유실
      // 수정: 처리 완료된 ID만 제거하고, 새로 추가된 변경사항은 유지
      const processedIds = new Set([
        ...successIds,
        ...errors.map(e => e.changeId),
      ]);
      const retryMap = new Map(updatedChanges.map(c => [c.id, c]));
      const merged = pendingChangesRef.current
          .filter(c => !processedIds.has(c.id))   // 성공/최종실패만 제거
          .map(c => retryMap.get(c.id) || c);      // retry 아이템은 retryCount 업데이트

      pendingChangesRef.current = merged;
      setPendingChanges(merged);

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

      // 성공 상태 2초 후 idle로 전환 (ref로 추적하여 unmount 시 정리)
      successTimerRef.current = setTimeout(() => {
        successTimerRef.current = null;
        setSyncStatus(prev => (prev === 'success' ? 'idle' : prev));
      }, 2000);
    }

    // 재시도할 변경 사항이 있으면 다시 스케줄링
    const hasRetryBatch = batchChangeRef.current && batchChangeRef.current.retryCount > 0;
    const hasRetrySingle = pendingChangesRef.current.length > 0;

    if (hasRetryBatch || hasRetrySingle) {
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
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

    // ref에서 직접 읽어서 동기적으로 계산 (flush와의 race condition 방지)
    const prev = batchChangeRef.current;
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

    const newBatch: BatchChange = {
      id: prev?.id || generateChangeId(),
      type: 'card-position-batch',
      items: mergedItems,
      timestamp: Date.now(),
      retryCount: prev?.retryCount || 0,
    };

    // ref와 state 동시 업데이트 (race condition 방지)
    batchChangeRef.current = newBatch;
    setBatchChange(newBatch);

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
    // ref에서 직접 읽어서 동기적으로 계산 (flush와의 race condition 방지)
    const prev = pendingChangesRef.current;
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

    let newChanges: PendingChange<T, S>[];
    if (existingIndex >= 0) {
      newChanges = [...prev];
      newChanges[existingIndex] = newChange;
    } else {
      newChanges = [...prev, newChange];
    }

    // ref와 state 동시 업데이트 (race condition 방지)
    pendingChangesRef.current = newChanges;
    setPendingChanges(newChanges);

    setSyncStatus('pending');
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
    const successTimer = successTimerRef;
    const retryTimer = retryTimerRef;
    const batchChangeSnapshot = batchChangeRef;
    const pendingChangesSnapshot = pendingChangesRef;
    const isSyncingSnapshot = isSyncingRef;
    const batchApiSnapshot = batchApiCallRef;
    const isDevEnv = process.env.NODE_ENV === 'development';

    return () => {
      // debounce 타이머 취소
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      // success→idle 전환 타이머 취소
      if (successTimer.current) {
        clearTimeout(successTimer.current);
        successTimer.current = null;
      }

      // 재시도 타이머 취소
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }

      // Batch 변경사항 즉시 저장
      const batchToSave = batchChangeSnapshot.current;
      if (batchToSave && batchToSave.items.length > 0 && !isSyncingSnapshot.current) {
        if (isDevEnv) console.log('[Optimistic] Unmount 시 Batch 저장 시작:', batchToSave.items.length, '개');
        const batchApi = batchApiSnapshot.current;
        if (batchApi) {
          const payloads = batchToSave.items.map(item => item.payload);
          batchApi(payloads).catch(err => {
            if (isDevEnv) console.error('[Optimistic] Unmount Batch 저장 실패:', err);
          });
        }
      }

      // 단건 변경사항 즉시 저장
      const pendingToSave = pendingChangesSnapshot.current;
      if (pendingToSave.length > 0 && !isSyncingSnapshot.current) {
        if (isDevEnv) console.log('[Optimistic] Unmount 시 단건 저장 시작:', pendingToSave.length, '개');
        pendingToSave.forEach(change => {
          const apiCall = apiCallsMap.get(change.id);
          if (apiCall) {
            apiCall(change.payload).catch(err => {
              if (isDevEnv) console.error('[Optimistic] Unmount 단건 저장 실패:', change.id, err);
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