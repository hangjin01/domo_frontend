import type { Task, Connection, Member, EditingCard, Comment, Column } from '../../types';
import { API_CONFIG, apiFetch, mockDelay } from './config';
import {
  MOCK_TASKS,
  MOCK_CONNECTIONS,
  MOCK_MEMBERS,
  MOCK_EDITING_CARDS,
} from './mock-data';

// ============================================
// 백엔드 응답 타입 (내부용)
// ============================================

interface BackendCardResponse {
  id: number;
  title: string;
  content: string | null;
  order: number;
  column_id: number;
  card_type: string;
  x: number;
  y: number;
  created_at: string;
  updated_at: string;
  assignees: Array<{
    id: number;
    email: string;
    name: string;
    is_student_verified: boolean;
    profile_image?: string;
  }>;
  files: Array<{
    id: number;
    project_id: number;
    filename: string;
    owner_id: number;
    created_at: string;
    latest_version?: {
      id: number;
      version: number;
      file_size: number;
      created_at: string;
      uploader_id: number;
    };
  }>;
  start_date: string | null;
  due_date: string | null;
}

interface BackendColumnResponse {
  id: number;
  title: string;
  order: number;
  project_id: number;
}

interface BackendConnectionResponse {
  id: number;
  from: number;
  to: number;
  boardId: number;
  style: string;
  shape: string;
}

// ============================================
// 타입 변환 함수들
// ============================================

/**
 * 컬럼 제목으로 상태 추론
 */
function inferStatusFromColumn(columnTitle: string): Task['status'] {
  const lower = columnTitle.toLowerCase();
  if (lower.includes('done') || lower.includes('완료')) return 'done';
  if (lower.includes('doing') || lower.includes('진행')) return 'in-progress';
  if (lower.includes('inbox') || lower.includes('수신')) return 'inbox';
  return 'todo';
}

/**
 * 백엔드 날짜를 프론트엔드 time 형식으로 변환
 */
function formatTaskTime(startDate?: string | null, dueDate?: string | null): string | undefined {
  if (!startDate && !dueDate) return undefined;

  const formatDate = (d: string) => d.split('T')[0];

  if (startDate && dueDate) {
    return `${formatDate(startDate)}|${formatDate(dueDate)}`;
  }
  if (startDate) return formatDate(startDate);
  if (dueDate) return formatDate(dueDate);

  return undefined;
}

/**
 * 백엔드 Card 응답을 프론트엔드 Task로 변환
 */
function mapBackendCardToTask(
    card: BackendCardResponse,
    projectId: number,
    columnTitle: string
): Task {
  return {
    id: card.id,
    title: card.title,
    description: card.content || undefined,
    content: card.content || undefined,
    status: inferStatusFromColumn(columnTitle),
    x: card.x || 0,
    y: card.y || 0,
    boardId: projectId, // 중요: 프로젝트 ID를 boardId로 사용
    column_id: card.column_id,
    card_type: card.card_type,
    taskType: card.card_type === 'task' ? 0 : card.card_type === 'memo' ? 1 : undefined,
    assignees: (card.assignees || []).map(user => ({
      id: user.id,
      name: user.name,
      avatar: user.profile_image || null,
    })),
    files: (card.files || []).map(file => ({
      id: file.id,
      name: file.filename,
      url: file.latest_version
          ? `${API_CONFIG.BASE_URL}/files/download/${file.latest_version.id}`
          : '#',
      size: file.latest_version?.file_size || 0,
      type: getFileType(file.filename),
    })),
    comments: [], // 댓글은 별도 API로 로드
    start_date: card.start_date || undefined,
    due_date: card.due_date || undefined,
    time: formatTaskTime(card.start_date, card.due_date),
    created_at: card.created_at,
    updated_at: card.updated_at,
  };
}

/**
 * 파일 확장자로 MIME 타입 추론
 */
function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
  };
  return typeMap[ext] || 'application/octet-stream';
}

/**
 * 타임스탬프를 읽기 쉬운 형식으로 변환
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================
// 컬럼 API
// ============================================

/**
 * 프로젝트의 컬럼 목록 조회
 */
export async function getColumns(projectId: number): Promise<Column[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    // Mock 컬럼 데이터
    return [
      { id: 1, title: '할 일', status: 'todo', order: 0, project_id: projectId },
      { id: 2, title: '진행 중', status: 'in-progress', order: 1, project_id: projectId },
      { id: 3, title: '완료', status: 'done', order: 2, project_id: projectId },
    ];
  }

  const response = await apiFetch<BackendColumnResponse[]>(`/projects/${projectId}/columns`);

  return response.map(col => ({
    id: col.id,
    title: col.title,
    status: inferStatusFromColumn(col.title),
    order: col.order,
    project_id: col.project_id,
  }));
}

/**
 * 컬럼 생성
 */
export async function createColumn(
    projectId: number,
    data: { title: string; order?: number }
): Promise<Column> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return {
      id: Date.now(),
      title: data.title,
      status: 'todo',
      order: data.order || 0,
      project_id: projectId,
    };
  }

  const response = await apiFetch<BackendColumnResponse>(`/projects/${projectId}/columns`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return {
    id: response.id,
    title: response.title,
    status: inferStatusFromColumn(response.title),
    order: response.order,
    project_id: response.project_id,
  };
}

// ============================================
// 보드 API
// ============================================

/**
 * 프로젝트 전체 보드 조회 (컬럼 + 카드)
 */
export async function getBoard(projectId: number): Promise<{ column: Column; cards: Task[] }[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    const columns: Column[] = [
      { id: 1, title: '할 일', status: 'todo', order: 0, project_id: projectId },
      { id: 2, title: '진행 중', status: 'in-progress', order: 1, project_id: projectId },
      { id: 3, title: '완료', status: 'done', order: 2, project_id: projectId },
    ];

    return columns.map(col => ({
      column: col,
      cards: MOCK_TASKS.filter(t =>
          (t.boardId === projectId || projectId === 1) &&
          (t.status === col.status || (col.status === 'in-progress' && t.status === 'doing'))
      ),
    }));
  }

  const response = await apiFetch<{ column: BackendColumnResponse; cards: BackendCardResponse[] }[]>(
      `/projects/${projectId}/board`
  );

  return response.map(item => ({
    column: {
      id: item.column.id,
      title: item.column.title,
      status: inferStatusFromColumn(item.column.title),
      order: item.column.order,
      project_id: item.column.project_id,
    },
    cards: item.cards.map(card => mapBackendCardToTask(card, projectId, item.column.title)),
  }));
}

// ============================================
// 태스크(카드) API
// ============================================

/**
 * 프로젝트의 태스크 목록 조회
 */
export async function getTasks(projectId: number): Promise<Task[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return MOCK_TASKS.filter(t => t.boardId === projectId || projectId === 1);
  }

  // 실제 API: 프로젝트의 보드 데이터 조회 후 카드 추출
  const response = await apiFetch<{ column: BackendColumnResponse; cards: BackendCardResponse[] }[]>(
      `/projects/${projectId}/board`
  );

  // 모든 컬럼의 카드를 Task로 변환하여 반환
  return response.flatMap(item =>
      item.cards.map(card => mapBackendCardToTask(card, projectId, item.column.title))
  );
}

/**
 * 단일 태스크 조회
 */
export async function getTask(taskId: number): Promise<Task> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const task = MOCK_TASKS.find(t => t.id === taskId);
    if (!task) {
      throw new Error('태스크를 찾을 수 없습니다.');
    }
    return task;
  }

  const response = await apiFetch<BackendCardResponse>(`/cards/${taskId}`);

  // 단일 카드 조회 시 컬럼 정보가 없으므로 기본 상태 사용
  return mapBackendCardToTask(response, response.column_id, 'todo');
}

/**
 * 태스크 생성
 */
export async function createTask(
    columnId: number,
    task: Omit<Task, 'id'>
): Promise<Task> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return {
      ...task,
      id: Date.now(),
      status: task.status || 'todo',
    } as Task;
  }

  const response = await apiFetch<BackendCardResponse>(`/columns/${columnId}/cards`, {
    method: 'POST',
    body: JSON.stringify({
      title: task.title,
      content: task.content || task.description,
      x: task.x,
      y: task.y,
      assignee_ids: task.assignees?.map(a => a.id) || [],
      start_date: task.start_date,
      due_date: task.due_date,
      card_type: task.taskType === 0 ? 'task' : task.taskType === 1 ? 'memo' : 'task',
    }),
  });

  return mapBackendCardToTask(response, task.boardId, 'todo');
}

/**
 * 태스크 수정
 */
export async function updateTask(
    taskId: number,
    updates: Partial<Task>
): Promise<Task> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const task = MOCK_TASKS.find(t => t.id === taskId);
    if (!task) {
      throw new Error('태스크를 찾을 수 없습니다.');
    }
    return { ...task, ...updates };
  }

  // 백엔드 형식으로 변환
  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.description !== undefined) payload.content = updates.description;
  if (updates.x !== undefined) payload.x = updates.x;
  if (updates.y !== undefined) payload.y = updates.y;
  if (updates.column_id !== undefined) payload.column_id = updates.column_id;
  if (updates.assignees !== undefined) {
    payload.assignee_ids = updates.assignees.map(a => a.id);
  }
  if (updates.start_date !== undefined) payload.start_date = updates.start_date;
  if (updates.due_date !== undefined) payload.due_date = updates.due_date;
  if (updates.taskType !== undefined) {
    payload.card_type = updates.taskType === 0 ? 'task' : 'memo';
  }

  const response = await apiFetch<BackendCardResponse>(`/cards/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return mapBackendCardToTask(response, updates.boardId || response.column_id, 'todo');
}

/**
 * 태스크 삭제
 */
export async function deleteTask(taskId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return;
  }

  await apiFetch<void>(`/cards/${taskId}`, {
    method: 'DELETE',
  });
}

// ============================================
// 댓글 API
// ============================================

/**
 * 카드의 댓글 목록 조회
 */
export async function getCardComments(cardId: number): Promise<Comment[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    // Mock 데이터에서 해당 카드의 댓글 반환
    const task = MOCK_TASKS.find(t => t.id === cardId);
    return task?.comments || [];
  }

  const response = await apiFetch<{
    id: number;
    card_id: number;
    user_id: number;
    content: string;
    created_at: string;
    updated_at: string;
    user?: { id: number; name: string; email: string };
  }[]>(`/cards/${cardId}/comments`);

  // 백엔드 응답을 프론트엔드 Comment 타입으로 변환
  return response.map(c => ({
    id: c.id,
    user: c.user?.name || `User ${c.user_id}`,
    user_id: c.user_id,
    text: c.content,
    timestamp: formatTimestamp(c.created_at),
  }));
}

/**
 * 카드에 댓글 추가
 */
export async function createCardComment(cardId: number, content: string): Promise<Comment> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return {
      id: Date.now(),
      user: '김도모',
      user_id: 1,
      text: content,
      timestamp: '방금 전',
    };
  }

  const response = await apiFetch<{
    id: number;
    card_id: number;
    user_id: number;
    content: string;
    created_at: string;
    updated_at: string;
    user?: { id: number; name: string; email: string };
  }>(`/cards/${cardId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

  return {
    id: response.id,
    user: response.user?.name || `User ${response.user_id}`,
    user_id: response.user_id,
    text: response.content,
    timestamp: formatTimestamp(response.created_at),
  };
}

/**
 * 댓글 삭제
 */
export async function deleteCardComment(commentId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return;
  }

  await apiFetch<void>(`/cards/comments/${commentId}`, {
    method: 'DELETE',
  });
}

// ============================================
// 연결선 API
// ============================================

/**
 * 프로젝트의 연결선 목록 조회
 */
export async function getConnections(projectId: number): Promise<Connection[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return MOCK_CONNECTIONS.filter(c => c.boardId === projectId || projectId === 1);
  }

  const response = await apiFetch<BackendConnectionResponse[]>(`/projects/${projectId}/connections`);

  return response.map(conn => ({
    id: conn.id,
    from: conn.from,
    to: conn.to,
    boardId: conn.boardId,
    style: conn.style as 'solid' | 'dashed',
    shape: conn.shape as 'bezier' | 'straight',
  }));
}

/**
 * 연결선 생성
 */
export async function createConnection(
    projectId: number,
    connection: Omit<Connection, 'id'>
): Promise<Connection> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return {
      ...connection,
      id: Date.now(),
    };
  }

  const response = await apiFetch<BackendConnectionResponse>(`/cards/connections`, {
    method: 'POST',
    body: JSON.stringify({
      from: connection.from,
      to: connection.to,
      style: connection.style || 'solid',
      shape: connection.shape || 'bezier',
    }),
  });

  return {
    id: response.id,
    from: response.from,
    to: response.to,
    boardId: response.boardId || projectId,
    style: response.style as 'solid' | 'dashed',
    shape: response.shape as 'bezier' | 'straight',
  };
}

/**
 * 연결선 삭제
 */
export async function deleteConnection(
    projectId: number,
    connectionId: number
): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return;
  }

  await apiFetch<void>(`/cards/connections/${connectionId}`, {
    method: 'DELETE',
  });
}

/**
 * 연결선 업데이트
 */
export async function updateConnection(
    connectionId: number,
    updates: Partial<Connection>
): Promise<Connection> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const conn = MOCK_CONNECTIONS.find(c => c.id === connectionId);
    if (!conn) {
      throw new Error('연결선을 찾을 수 없습니다.');
    }
    return { ...conn, ...updates };
  }

  // 현재 백엔드에 PATCH API가 없으므로 삭제 후 재생성하거나
  // 로컬에서만 처리 (추후 백엔드 API 추가 시 수정)
  console.warn('Connection update API not implemented on backend');
  throw new Error('연결선 업데이트 API가 구현되지 않았습니다.');
}

// ============================================
// 팀 멤버 API (보드용)
// ============================================

/**
 * 프로젝트 팀 멤버 조회 (온/오프라인 상태 포함)
 */
export async function getBoardMembers(projectId: number): Promise<Member[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return MOCK_MEMBERS;
  }

  return apiFetch<Member[]>(`/projects/${projectId}/members`);
}

// ============================================
// 실시간 편집 상태 API
// ============================================

/**
 * 현재 수정 중인 카드 목록 조회
 */
export async function getEditingCards(projectId: number): Promise<EditingCard[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(100);
    return MOCK_EDITING_CARDS;
  }

  return apiFetch<EditingCard[]>(`/projects/${projectId}/editing-cards`);
}

/**
 * 카드 편집 시작 알림
 */
export async function startEditingCard(cardId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(100);
    return;
  }

  await apiFetch<void>(`/cards/${cardId}/editing`, {
    method: 'POST',
  });
}

/**
 * 카드 편집 종료 알림
 */
export async function stopEditingCard(cardId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(100);
    return;
  }

  await apiFetch<void>(`/cards/${cardId}/editing`, {
    method: 'DELETE',
  });
}

// ============================================
// 하위 호환용 (기존 코드에서 사용하던 함수명)
// ============================================

export const getNodes = getTasks;
export const createNode = createTask;
export const updateNode = updateTask;
export const deleteNode = deleteTask;