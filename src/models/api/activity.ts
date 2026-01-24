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
        content: '📋 새로운 카드를 생성했습니다.',
        action_type: 'CREATE',
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: 1,
        content: '💾 파일을 업로드했습니다.',
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
        content: '👥 새로운 멤버가 참여했습니다.',
        action_type: 'JOIN',
        created_at: new Date().toISOString(),
      },
    ];
  }

  // 백엔드: GET /api/workspaces/{id}/activities
  return apiFetch<ActivityLog[]>(`/workspaces/${workspaceId}/activities`);
}
