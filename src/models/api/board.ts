import type { Task, Connection, Member, EditingCard, Comment, Column, Group } from '../types';
import { API_CONFIG, apiFetch, mockDelay } from './config';
import {
  MOCK_TASKS,
  MOCK_CONNECTIONS,
  MOCK_MEMBERS,
  MOCK_EDITING_CARDS,
  MOCK_COLUMNS,
  MOCK_GROUPS,
  // Mock 데이터 조작 헬퍼 함수들
  addMockTask,
  updateMockTask,
  deleteMockTask,
  getMockTask,
  getMockTasksByProject,
  addMockConnection,
  deleteMockConnection,
  getMockConnectionsByProject,
  addMockColumn,
  getMockColumnsByProject,
  getMockColumn,
  generateTaskId,
  // Group 관련
  addMockGroup,
  updateMockGroup,
  deleteMockGroup,
  getMockGroup,
  getMockGroupsByProject,
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
  // 확장 필드 (그룹 기능용) - 백엔드 alias에 따라 camelCase
  localX?: number;
  localY?: number;
  width?: number;
  height?: number;
  parentId?: number | null;
  depth?: number;
  color?: string;
  collapsed?: boolean;
  transform?: {
    scaleX: number;
    scaleY: number;
    rotation: number;
  };
}

interface BackendConnectionResponse {
  id: number;
  from: number;
  to: number;
  boardId: number;
  style: string;
  shape: string;
  // 백엔드가 snake_case 또는 camelCase로 보낼 수 있음
  sourceHandle?: string;
  targetHandle?: string;
  source_handle?: string;
  target_handle?: string;
}

// ============================================
// 타입 변환 함수들
// ============================================

/**
 * 컬럼 제목으로 상태 추론
 */
function inferStatusFromColumn(columnTitle: string): Task['status'] {
  const lower = columnTitle.toLowerCase();

  // 완료 상태
  if (lower.includes('done') || lower.includes('완료')) return 'done';

  // 진행 중 상태 - 다양한 표현 지원
  if (lower.includes('doing') ||
      lower.includes('progress') ||
      lower.includes('진행') ||
      lower.includes('작업')) return 'in-progress';

  // 수신함/인박스
  if (lower.includes('inbox') || lower.includes('수신')) return 'inbox';

  // 기본값: todo
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
    // Mock 컬럼 데이터 - 헬퍼 함수 사용
    const columns = getMockColumnsByProject(projectId);
    if (columns.length > 0) {
      return columns;
    }
    // 프로젝트에 컬럼이 없으면 기본 컬럼 반환
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
    // 위치 & 크기 (백엔드에서 받은 값 그대로 전달)
    localX: col.localX,
    localY: col.localY,
    width: col.width,
    height: col.height,
    // 계층 구조
    parentId: col.parentId,
    depth: col.depth,
    // 스타일
    color: col.color,
    collapsed: col.collapsed,
  }));
}

/**
 * 컬럼 생성
 */
export async function createColumn(
    projectId: number,
    data: {
      title: string;
      order?: number;
      localX?: number;
      localY?: number;
      width?: number;
      height?: number;
    }
): Promise<Column> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    // Mock 헬퍼 함수 사용
    const newColumn = addMockColumn({
      title: data.title,
      status: inferStatusFromColumn(data.title),
      order: data.order || 0,
      project_id: projectId,
    });
    return newColumn;
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
    localX: response.localX,
    localY: response.localY,
    width: response.width,
    height: response.height,
    parentId: response.parentId,
    depth: response.depth,
    color: response.color,
    collapsed: response.collapsed,
  };
}

// ============================================
// 그룹(Group) API - BoardColumn 확장 기능
// ============================================

/**
 * 백엔드 Column 응답을 프론트엔드 Group으로 변환
 */
function mapColumnToGroup(col: BackendColumnResponse): Group {
  return {
    id: col.id,
    title: col.title,
    x: col.localX ?? 0,
    y: col.localY ?? 0,
    width: col.width ?? 300,
    height: col.height ?? 500,
    parentId: col.parentId ?? null,
    depth: col.depth ?? 0,
    color: col.color ?? '#ffffff',
    collapsed: col.collapsed ?? false,
    projectId: col.project_id,
    order: col.order,
    transform: col.transform ?? {
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    },
  };
}

/**
 * 프로젝트의 그룹 목록 조회
 */
export async function getGroups(projectId: number): Promise<Group[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return getMockGroupsByProject(projectId);
  }

  const response = await apiFetch<BackendColumnResponse[]>(`/projects/${projectId}/columns`);
  return response.map(mapColumnToGroup);
}

/**
 * 그룹 생성
 */
export async function createGroup(
    projectId: number,
    data: Partial<Group>
): Promise<Group> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return addMockGroup({
      ...data,
      projectId: projectId,
    });
  }

  const response = await apiFetch<BackendColumnResponse>(`/projects/${projectId}/columns`, {
    method: 'POST',
    body: JSON.stringify({
      title: data.title || 'New Group',
      localX: data.x ?? 0,
      localY: data.y ?? 0,
      width: data.width ?? 300,
      height: data.height ?? 400,
      parentId: data.parentId ?? null,
      depth: data.depth ?? 0,
      color: data.color ?? '#ffffff',
      collapsed: false,
      order: data.order ?? 0,
    }),
  });

  return mapColumnToGroup(response);
}

/**
 * 그룹 업데이트 (위치, 크기, 부모 등)
 */
export async function updateGroup(
    groupId: number,
    updates: Partial<Group>
): Promise<Group> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const updated = updateMockGroup(groupId, updates);
    if (!updated) {
      throw new Error('그룹을 찾을 수 없습니다.');
    }
    return updated;
  }

  // 백엔드 스키마에 맞게 변환 (camelCase → snake_case alias)
  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.x !== undefined) payload.localX = updates.x;
  if (updates.y !== undefined) payload.localY = updates.y;
  if (updates.width !== undefined) payload.width = updates.width;
  if (updates.height !== undefined) payload.height = updates.height;

  // parentId는 null을 명시적으로 전송해야 함 (최상위 그룹으로 분리할 때)
  if ('parentId' in updates) {
    payload.parentId = updates.parentId ?? null; // undefined는 null로 변환
  }

  if (updates.depth !== undefined) payload.depth = updates.depth;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.collapsed !== undefined) payload.collapsed = updates.collapsed;
  if (updates.order !== undefined) payload.order = updates.order;

  const response = await apiFetch<BackendColumnResponse>(`/columns/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  return mapColumnToGroup(response);
}

/**
 * 그룹 삭제
 */
export async function deleteGroup(groupId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    deleteMockGroup(groupId);
    return;
  }

  await apiFetch<void>(`/columns/${groupId}`, {
    method: 'DELETE',
  });
}

/**
 * 그룹 위치만 업데이트 (드래그용 - 최적화)
 */
export async function updateGroupPosition(
    groupId: number,
    x: number,
    y: number,
    parentId?: number | null
): Promise<Group> {
  return updateGroup(groupId, { x, y, parentId });
}

/**
 * 그룹 크기 업데이트 (리사이즈용)
 */
export async function updateGroupSize(
    groupId: number,
    width: number,
    height: number
): Promise<Group> {
  return updateGroup(groupId, { width, height });
}

/**
 * 카드를 그룹에 할당 (column_id 설정)
 */
export async function assignCardToGroup(
    cardId: number,
    groupId: number | null
): Promise<Task> {
  return updateTask(cardId, { column_id: groupId ?? undefined });
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
 * 프로젝트의 모든 카드 조회 (컬럼 유무 상관없이)
 * GET /api/projects/{project_id}/cards
 */
export async function getAllCards(projectId: number): Promise<Task[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return MOCK_TASKS.filter(t => t.boardId === projectId || projectId === 1);
  }

  const response = await apiFetch<BackendCardResponse[]>(
      `/projects/${projectId}/cards`
  );

  return response.map(card => mapBackendCardToTask(card, projectId, 'backlog'));
}

/**
 * 프로젝트의 보드 카드 조회 (컬럼에 속한 카드만)
 * GET /api/projects/{project_id}/board
 */
export async function getBoardCards(projectId: number): Promise<Task[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return MOCK_TASKS.filter(t => t.boardId === projectId || projectId === 1);
  }

  const response = await apiFetch<{ column: BackendColumnResponse; cards: BackendCardResponse[] }[]>(
      `/projects/${projectId}/board`
  );

  // 모든 컬럼의 카드를 Task로 변환하여 반환
  return response.flatMap(item =>
      item.cards.map(card => mapBackendCardToTask(card, projectId, item.column.title))
  );
}

/**
 * 프로젝트의 태스크 목록 조회 (모든 카드 - 중복 제거)
 * 컬럼에 속한 카드 + 컬럼 없는 카드 모두 포함
 */
export async function getTasks(projectId: number): Promise<Task[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    // Mock 헬퍼 함수 사용
    return getMockTasksByProject(projectId);
  }

  // 모든 카드 조회 (컬럼 유무 상관없이)
  const allCards = await apiFetch<BackendCardResponse[]>(
      `/projects/${projectId}/cards`
  );

  // 보드 데이터도 조회 (컬럼 정보를 얻기 위해)
  const boardData = await apiFetch<{ column: BackendColumnResponse; cards: BackendCardResponse[] }[]>(
      `/projects/${projectId}/board`
  );

  // 컬럼 ID → 컬럼 제목 매핑 생성
  const columnTitleMap = new Map<number, string>();
  boardData.forEach(item => {
    columnTitleMap.set(item.column.id, item.column.title);
  });

  // 모든 카드를 Task로 변환 (컬럼 제목 매핑 적용)
  return allCards.map(card => {
    const columnTitle = card.column_id ? columnTitleMap.get(card.column_id) || 'backlog' : 'backlog';
    return mapBackendCardToTask(card, projectId, columnTitle);
  });
}

/**
 * 단일 태스크 조회
 */
export async function getTask(taskId: number): Promise<Task> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    // Mock 헬퍼 함수 사용
    const task = getMockTask(taskId);
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
 * @param projectId - 프로젝트 ID (boardId)
 * @param task - 생성할 태스크 데이터 (column_id 포함)
 */
export async function createTask(
    projectId: number,
    task: Omit<Task, 'id'>
): Promise<Task> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    // Mock 헬퍼 함수 사용 - 새 태스크 추가
    const newTask: Task = {
      ...task,
      id: generateTaskId(),
      boardId: projectId,
      status: task.status || 'todo',
    } as Task;

    addMockTask(newTask);
    return newTask;
  }

  // 백엔드: POST /api/projects/{project_id}/cards
  const response = await apiFetch<BackendCardResponse>(`/projects/${projectId}/cards`, {
    method: 'POST',
    body: JSON.stringify({
      title: task.title,
      content: task.content || task.description,
      column_id: task.column_id || null,  // 컬럼 ID는 body에 포함
      order: 0,
      x: task.x,
      y: task.y,
      assignee_ids: task.assignees?.map(a => a.id) || [],
      start_date: task.start_date,
      due_date: task.due_date,
      card_type: task.taskType === 0 ? 'task' : task.taskType === 1 ? 'memo' : 'task',
    }),
  });

  return mapBackendCardToTask(response, projectId, 'todo');
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
    // Mock 헬퍼 함수 사용
    const updatedTask = updateMockTask(taskId, updates);
    if (!updatedTask) {
      throw new Error('태스크를 찾을 수 없습니다.');
    }
    return updatedTask;
  }

  // 백엔드 형식으로 변환
  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.description !== undefined) payload.content = updates.description;
  if (updates.x !== undefined) payload.x = updates.x;
  if (updates.y !== undefined) payload.y = updates.y;

  // column_id는 null을 명시적으로 전송해야 함 (그룹에서 분리할 때)
  // updates 객체에 column_id 키가 있으면 (undefined가 아닌 값으로 설정되었으면) 전송
  if ('column_id' in updates) {
    payload.column_id = updates.column_id ?? null; // undefined는 null로 변환
  }

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
    // Mock 헬퍼 함수 사용
    deleteMockTask(taskId);
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
    // Mock 헬퍼 함수 사용
    return getMockConnectionsByProject(projectId);
  }

  const response = await apiFetch<BackendConnectionResponse[]>(`/projects/${projectId}/connections`);

  return response.map(conn => ({
    id: conn.id,
    from: conn.from,
    to: conn.to,
    boardId: conn.boardId,
    style: conn.style as 'solid' | 'dashed',
    shape: conn.shape as 'bezier' | 'straight',
    // 백엔드가 snake_case로 보내면 변환
    sourceHandle: (conn.sourceHandle || conn.source_handle || 'right') as 'left' | 'right',
    targetHandle: (conn.targetHandle || conn.target_handle || 'left') as 'left' | 'right',
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
    // Mock 헬퍼 함수 사용
    const newConnection = addMockConnection({
      ...connection,
      boardId: projectId,
    });
    return newConnection;
  }

  const response = await apiFetch<BackendConnectionResponse>(`/cards/connections`, {
    method: 'POST',
    body: JSON.stringify({
      from: connection.from,
      to: connection.to,
      style: connection.style || 'solid',
      shape: connection.shape || 'bezier',
      sourceHandle: connection.sourceHandle || 'right',
      targetHandle: connection.targetHandle || 'left',
    }),
  });

  return {
    id: response.id,
    from: response.from,
    to: response.to,
    boardId: response.boardId || projectId,
    style: response.style as 'solid' | 'dashed',
    shape: response.shape as 'bezier' | 'straight',
    sourceHandle: (response.sourceHandle || response.source_handle || 'right') as 'left' | 'right',
    targetHandle: (response.targetHandle || response.target_handle || 'left') as 'left' | 'right',
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
    // Mock 헬퍼 함수 사용
    deleteMockConnection(connectionId);
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

  const response = await apiFetch<BackendConnectionResponse>(
      `/cards/connections/${connectionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          from: updates.from,
          to: updates.to,
          style: updates.style,
          shape: updates.shape,
          sourceHandle: updates.sourceHandle,
          targetHandle: updates.targetHandle,
        }),
      }
  );

  return {
    id: response.id,
    from: response.from,
    to: response.to,
    boardId: response.boardId,
    style: response.style as 'solid' | 'dashed',
    shape: response.shape as 'bezier' | 'straight',
    sourceHandle: (response.sourceHandle || response.source_handle || 'right') as 'left' | 'right',
    targetHandle: (response.targetHandle || response.target_handle || 'left') as 'left' | 'right',
  };
}

// ============================================
// 팀 멤버 API (보드용)
// ============================================

/**
 * 프로젝트 팀 멤버 조회 (온/오프라인 상태 포함)
 * 백엔드에 /projects/{id}/members API가 없으므로 워크스페이스 멤버 활용
 */
export async function getBoardMembers(projectId: number): Promise<Member[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return MOCK_MEMBERS;
  }

  // 프로젝트 정보에서 workspace_id를 가져와서 워크스페이스 멤버 조회
  try {
    // 1. 프로젝트 정보를 통해 workspace_id 확인
    const { getMyProjects, getWorkspaceMembers } = await import('./workspace');
    const allProjects = await getMyProjects();
    const project = allProjects.find(p => p.id === projectId);

    if (!project?.workspace_id) {
      return MOCK_MEMBERS;
    }

    // 2. 워크스페이스 멤버 조회
    const members = await getWorkspaceMembers(project.workspace_id);
    return members;
  } catch (error) {
    
    return MOCK_MEMBERS;
  }
}

// ============================================
// 실시간 편집 상태 API
// ⚠️ 백엔드에 해당 엔드포인트가 아직 구현되지 않음
// 에러 발생 시 빈 배열/무시 처리
// ============================================

/**
 * 현재 수정 중인 카드 목록 조회
 * ⚠️ 백엔드 API 미구현 - fallback으로 빈 배열 반환
 */
export async function getEditingCards(projectId: number): Promise<EditingCard[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(100);
    return MOCK_EDITING_CARDS;
  }

  try {
    return await apiFetch<EditingCard[]>(`/projects/${projectId}/editing-cards`);
  } catch (error) {
    // 백엔드 API가 없으면 빈 배열 반환 (기능 비활성화)
    return [];
  }
}

/**
 * 카드 편집 시작 알림
 * ⚠️ 백엔드 API 미구현 - 에러 무시
 */
export async function startEditingCard(cardId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(100);
    return;
  }

  try {
    await apiFetch<void>(`/cards/${cardId}/editing`, {
      method: 'POST',
    });
  } catch (error) {
    // 백엔드 API가 없으면 무시
  }
}

/**
 * 카드 편집 종료 알림
 * ⚠️ 백엔드 API 미구현 - 에러 무시
 */
export async function stopEditingCard(cardId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(100);
    return;
  }

  try {
    await apiFetch<void>(`/cards/${cardId}/editing`, {
      method: 'DELETE',
    });
  } catch (error) {
    // 백엔드 API가 없으면 무시
  }
}

// ============================================
// 하위 호환용 (기존 코드에서 사용하던 함수명)
// ============================================

export const getNodes = getTasks;
export const createNode = createTask;
export const updateNode = updateTask;
export const deleteNode = deleteTask;