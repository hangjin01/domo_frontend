// src/lib/api/mappers.ts
// 백엔드 API 응답 -> 프론트엔드 타입 변환 함수들

import type {
  Task,
  TaskStatus,
  Project,
  Member,
  User,
  Assignee,
  Comment,
  TaskFile,
  Connection,
  Column,
  BackendCardResponse,
  BackendBoardResponse,
  BackendBoardColumnResponse,
  BackendCardCommentResponse,
  BackendFileResponse,
  BackendUserResponse,
  BackendCardConnectionResponse,
} from '../types';

// ============================================
// 상태 매핑 헬퍼
// ============================================

/**
 * 컬럼 제목을 프론트 TaskStatus로 변환
 */
export function mapColumnTitleToStatus(columnTitle: string): TaskStatus {
  const lower = columnTitle.toLowerCase();

  if (lower.includes('done') || lower.includes('완료')) return 'done';
  if (lower.includes('doing') || lower.includes('진행')) return 'doing';
  if (lower.includes('in-progress') || lower.includes('in progress')) return 'in-progress';
  if (lower.includes('inbox') || lower.includes('수신')) return 'inbox';

  return 'todo';
}

/**
 * 백엔드 card_type을 프론트 taskType으로 변환
 */
export function mapCardTypeToTaskType(cardType: string): number | undefined {
  switch (cardType) {
    case 'task': return 0;
    case 'memo': return 1;
    case 'file': return 2;
    default: return undefined;
  }
}

// ============================================
// 사용자 관련 매퍼
// ============================================

export function mapBackendUserToUser(user: BackendUserResponse): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    is_student_verified: user.is_student_verified,
    profile_image: user.profile_image,
  };
}

export function mapBackendUserToAssignee(user: BackendUserResponse): Assignee {
  return {
    id: user.id,
    name: user.name,
    avatar: user.profile_image || null,
  };
}

export function mapWorkspaceMemberToMember(member: {
  user_id: number;
  name: string;
  email: string;
  role: string;
}): Member {
  return {
    id: member.user_id,
    name: member.name,
    email: member.email,
    role: member.role,
    isOnline: false, // 별도 API로 확인 필요
  };
}

// ============================================
// 파일 관련 매퍼
// ============================================

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
    webp: 'image/webp',
  };
  return typeMap[ext] || 'application/octet-stream';
}

export function mapBackendFileToTaskFile(file: BackendFileResponse, baseUrl: string = ''): TaskFile {
  const downloadUrl = file.latest_version
      ? `${baseUrl}/api/files/download/${file.latest_version.id}`
      : '#';

  return {
    id: file.id,
    name: file.filename,
    url: downloadUrl,
    size: file.latest_version?.file_size || 0,
    type: getFileType(file.filename),
  };
}

// ============================================
// 댓글 관련 매퍼
// ============================================

function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return '방금 전';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return date.toLocaleDateString('ko-KR');
}

export function mapBackendCommentToComment(comment: BackendCardCommentResponse): Comment {
  return {
    id: comment.id,
    user: comment.user?.name || `User ${comment.user_id}`,
    user_id: comment.user_id,
    text: comment.content,
    timestamp: formatTimestamp(comment.created_at),
  };
}

// ============================================
// 카드(Task) 관련 매퍼 (핵심!)
// ============================================

/**
 * 백엔드 start_date, due_date를 프론트 time 형식으로 변환
 * 예: "2024-01-15" | "2024-01-20" -> "2024-01-15|2024-01-20"
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
 * 백엔드 CardResponse → 프론트 Task 변환 (핵심 함수!)
 */
export function mapBackendCardToTask(
    card: BackendCardResponse,
    projectId: number,
    columnTitle: string,
    baseUrl: string = ''
): Task {
  return {
    // 기본 정보
    id: card.id,
    title: card.title,
    description: card.content || undefined,
    content: card.content || undefined,

    // 상태 (컬럼 제목에서 추론)
    status: mapColumnTitleToStatus(columnTitle),

    // 위치
    x: card.x || 0,
    y: card.y || 0,

    // 분류
    boardId: projectId,              // 프로젝트 ID를 boardId로 사용
    column_id: card.column_id,
    card_type: card.card_type,
    taskType: mapCardTypeToTaskType(card.card_type),

    // 시간
    time: formatTaskTime(card.start_date, card.due_date),
    start_date: card.start_date || undefined,
    due_date: card.due_date || undefined,

    // 관계
    assignees: card.assignees.map(mapBackendUserToAssignee),
    files: card.files.map(f => mapBackendFileToTaskFile(f, baseUrl)),
    comments: [], // 댓글은 별도 API로 로드

    // 메타
    created_at: card.created_at,
    updated_at: card.updated_at,
  };
}

/**
 * 백엔드 Board 응답 전체를 Task 배열로 변환
 */
export function mapBackendBoardToTasks(
    boardData: BackendBoardResponse[],
    projectId: number,
    baseUrl: string = ''
): Task[] {
  const tasks: Task[] = [];

  for (const colData of boardData) {
    const columnTitle = colData.column.title;

    for (const card of colData.cards) {
      tasks.push(mapBackendCardToTask(card, projectId, columnTitle, baseUrl));
    }
  }

  return tasks;
}

// ============================================
// 컬럼 관련 매퍼
// ============================================

export function mapBackendColumnToColumn(col: BackendBoardColumnResponse): Column {
  return {
    id: col.id,
    title: col.title,
    order: col.order,
    project_id: col.project_id,
    status: mapColumnTitleToStatus(col.title),
  };
}

// ============================================
// 연결선(Connection) 관련 매퍼
// ============================================

export function mapBackendConnectionToConnection(conn: BackendCardConnectionResponse): Connection {
  return {
    id: conn.id,
    from: conn.from,
    to: conn.to,
    boardId: conn.boardId,
    style: conn.style as 'solid' | 'dashed',
    shape: conn.shape as 'bezier' | 'straight',
  };
}

// ============================================
// 프로젝트 관련 매퍼
// ============================================

const PROJECT_COLORS = ['#FEF3C7', '#DBEAFE', '#FCE7F3', '#D1FAE5', '#E9D5FF'];

export function mapProjectResponse(
    proj: { id: number; name: string; workspace_id: number; description?: string },
    workspaceName: string,
    memberCount: number = 0
): Project {
  return {
    id: proj.id,
    name: proj.name,
    workspace: workspaceName,
    workspace_id: proj.workspace_id,
    description: proj.description,
    role: 'Member',
    progress: 0,
    memberCount,
    lastActivity: '방금 전',
    color: PROJECT_COLORS[proj.id % PROJECT_COLORS.length],
  };
}

// ============================================
// 프론트 → 백엔드 변환 (요청 시)
// ============================================

/**
 * 프론트 Task → 백엔드 CardCreate/CardUpdate 페이로드 변환
 */
export function mapTaskToCardPayload(task: Partial<Task>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (task.title !== undefined) payload.title = task.title;
  if (task.description !== undefined) payload.content = task.description;
  if (task.content !== undefined) payload.content = task.content;
  if (task.x !== undefined) payload.x = task.x;
  if (task.y !== undefined) payload.y = task.y;
  if (task.column_id !== undefined) payload.column_id = task.column_id;

  if (task.assignees !== undefined) {
    payload.assignee_ids = task.assignees.map(a => a.id);
  }

  if (task.start_date !== undefined) payload.start_date = task.start_date;
  if (task.due_date !== undefined) payload.due_date = task.due_date;

  if (task.taskType !== undefined) {
    payload.card_type = task.taskType === 0 ? 'task' : 'memo';
  }

  return payload;
}