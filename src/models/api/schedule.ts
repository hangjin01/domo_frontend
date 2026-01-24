import { API_CONFIG, apiFetch, mockDelay } from './config';

// ============================================
// 스케줄 타입
// ============================================

export interface Schedule {
  id: number;
  user_id: number;
  day_of_week: number; // 0:월 ~ 6:일
  start_time: string;  // "HH:MM:SS"
  end_time: string;
  description?: string;
}

export interface ScheduleCreate {
  day_of_week: number;
  start_time: string;
  end_time: string;
  description?: string;
}

export interface FreeTimeSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface ProjectEvent {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  created_by: number;
  created_at: string;
}

export interface ProjectEventCreate {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
}

// ============================================
// 개인 시간표 API
// ============================================

/**
 * 내 시간표 조회
 */
export async function getMySchedules(): Promise<Schedule[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return [
      {
        id: 1,
        user_id: 1,
        day_of_week: 0,
        start_time: '09:00:00',
        end_time: '10:30:00',
        description: '소프트웨어공학',
      },
      {
        id: 2,
        user_id: 1,
        day_of_week: 2,
        start_time: '14:00:00',
        end_time: '15:30:00',
        description: '캡스톤디자인',
      },
    ];
  }

  // 백엔드: GET /api/schedules/me
  return apiFetch<Schedule[]>('/schedules/me');
}

/**
 * 시간표 추가
 */
export async function createSchedule(data: ScheduleCreate): Promise<Schedule> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return {
      id: Date.now(),
      user_id: 1,
      ...data,
    };
  }

  // 백엔드: POST /api/schedules
  return apiFetch<Schedule>('/schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 시간표 수정
 */
export async function updateSchedule(
  scheduleId: number,
  data: Partial<ScheduleCreate>
): Promise<Schedule> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return {
      id: scheduleId,
      user_id: 1,
      day_of_week: data.day_of_week || 0,
      start_time: data.start_time || '09:00:00',
      end_time: data.end_time || '10:00:00',
      description: data.description,
    };
  }

  // 백엔드: PATCH /api/schedules/{id}
  return apiFetch<Schedule>(`/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * 시간표 삭제
 */
export async function deleteSchedule(scheduleId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return;
  }

  // 백엔드: DELETE /api/schedules/{id}
  await apiFetch<{ message: string }>(`/schedules/${scheduleId}`, {
    method: 'DELETE',
  });
}

// ============================================
// 팀 공통 빈 시간 API
// ============================================

/**
 * 워크스페이스 팀원들의 공통 빈 시간 조회
 */
export async function getCommonFreeTime(workspaceId: number): Promise<FreeTimeSlot[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return [
      { day_of_week: 0, start_time: '12:00:00', end_time: '14:00:00' },
      { day_of_week: 2, start_time: '16:00:00', end_time: '18:00:00' },
      { day_of_week: 4, start_time: '10:00:00', end_time: '12:00:00' },
    ];
  }

  // 백엔드: GET /api/workspaces/{id}/free-time
  return apiFetch<FreeTimeSlot[]>(`/workspaces/${workspaceId}/free-time`);
}

// ============================================
// 프로젝트 일정 API
// ============================================

/**
 * 프로젝트 일정 목록 조회
 */
export async function getProjectEvents(projectId: number): Promise<ProjectEvent[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return [
      {
        id: 1,
        project_id: projectId,
        title: '팀 회의',
        description: '주간 진행 상황 공유',
        start_datetime: new Date().toISOString(),
        end_datetime: new Date(Date.now() + 3600000).toISOString(),
        created_by: 1,
        created_at: new Date().toISOString(),
      },
    ];
  }

  // 백엔드: GET /api/projects/{id}/events
  return apiFetch<ProjectEvent[]>(`/projects/${projectId}/events`);
}

/**
 * 프로젝트 일정 생성
 */
export async function createProjectEvent(
  projectId: number,
  data: ProjectEventCreate
): Promise<ProjectEvent> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return {
      id: Date.now(),
      project_id: projectId,
      ...data,
      created_by: 1,
      created_at: new Date().toISOString(),
    };
  }

  // 백엔드: POST /api/projects/{id}/events
  return apiFetch<ProjectEvent>(`/projects/${projectId}/events`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 프로젝트 일정 수정
 */
export async function updateProjectEvent(
  eventId: number,
  data: Partial<ProjectEventCreate>
): Promise<ProjectEvent> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return {
      id: eventId,
      project_id: 1,
      title: data.title || '일정',
      description: data.description,
      start_datetime: data.start_datetime || new Date().toISOString(),
      end_datetime: data.end_datetime || new Date().toISOString(),
      created_by: 1,
      created_at: new Date().toISOString(),
    };
  }

  // 백엔드: PATCH /api/projects/events/{id}
  return apiFetch<ProjectEvent>(`/projects/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * 프로젝트 일정 삭제
 */
export async function deleteProjectEvent(eventId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return;
  }

  // 백엔드: DELETE /api/events/{id}
  await apiFetch<{ message: string }>(`/events/${eventId}`, {
    method: 'DELETE',
  });
}
