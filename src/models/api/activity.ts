/**
 * [파일 안내] frontend/src/models/api/activity.ts
 * 담당 범위: 사용자/워크스페이스 활동 로그 조회.
 * 호출 흐름: 화면/훅 → 이 모듈 → 로컬 저장/샘플 또는 공통 HTTP 래퍼 → 응답을 화면 타입으로 반환합니다.
 * UI에서 읽는 기록입니다. mock 샘플은 모든 편집의 자동 감사 추적이 아니며 실제 기록 생성은 서버 logger를 확인합니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

import { API_CONFIG, apiFetch, mockDelay } from './config';

// ============================================
// 활동 로그 타입
// ============================================

export interface ActivityLog {
  id: number;
  user_id: number;
  content: string;
  action_type: string;
  created_at: string;
}

// ============================================
// 활동 로그 API
// ============================================

/**
 * 내 활동 로그 조회
 */
export async function getMyActivities(): Promise<ActivityLog[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return [
      {
        id: 1,
        user_id: 1,
        content: '새로운 카드를 생성했습니다.',
        action_type: 'CREATE',
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        content: '파일을 업로드했습니다.',
        action_type: 'UPLOAD',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  }

  // 백엔드: GET /api/users/me/activities
  return apiFetch<ActivityLog[]>('/users/me/activities');
}

/**
 * 워크스페이스 활동 로그 조회
 */
export async function getWorkspaceActivities(workspaceId: number): Promise<ActivityLog[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return [
      {
        id: 1,
        user_id: 1,
        content: '새로운 멤버가 참여했습니다.',
        action_type: 'JOIN',
        created_at: new Date().toISOString(),
      },
    ];
  }

  // 백엔드: GET /api/workspaces/{id}/activities
  return apiFetch<ActivityLog[]>(`/workspaces/${workspaceId}/activities`);
}
