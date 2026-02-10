// src/models/types/index.ts

// ============================================
// 1. 공통/기본 타입 (User, Auth)
// ============================================

export interface User {
  id: number;
  email: string;
  name: string;
  nickname?: string;
  is_student_verified?: boolean;
  profile_image?: string | null;
}

export interface AuthUser {
  email: string;
  name: string;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  isOnline: boolean;
  role: string;
  avatar?: string | null;
}

export interface Assignee {
  id: number;
  name: string;
  avatar: string | null;
}

// ============================================
// 2. 워크스페이스 & 프로젝트
// ============================================

export interface Project {
  id: number;
  name: string;
  workspace: string;
  workspace_id?: number;
  role: string;
  progress: number;
  memberCount: number;
  lastActivity: string;
  color: string;
  description?: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
  progress: number;
  memberCount: number;
  lastActivity: string;
}

export interface Workspace {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  projects: Project[];
}

// ============================================
// 3. 보드 / 태스크 / 노드 (프론트엔드용)
// ============================================

export type ViewMode = 'dashboard' | 'inbox' | 'planner' | 'board' | 'calendar' | 'timeline' | 'profile' | 'settings' | 'community' | 'chat';

export type TaskStatus = 'inbox' | 'todo' | 'doing' | 'in-progress' | 'done';

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface Comment {
  id: number;
  user: string;
  user_id?: number;
  text: string;
  timestamp: string;
}

export interface TaskFile {
  id?: number;
  name: string;
  url: string;
  size: number;
  type: string;
}

// 프론트엔드 캔버스용 Task (UI에서 사용)
export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  content?: string;
  description?: string;

  // ============================================
  // 좌표 시스템 - 상대 좌표 (Relative Coordinate System)
  // ============================================
  //
  // [그룹에 속한 카드] (column_id가 있음)
  //   x, y = 그룹 좌상단 기준 상대 좌표 (offset)
  //   예: x=20, y=70 → 그룹 내부 패딩 + 헤더 이후 첫 번째 슬롯
  //   렌더링 시 절대 좌표 = group.x + card.x, group.y + card.y
  //   그룹 이동 시 카드 좌표 업데이트 불필요 (그룹 위치만 변경)
  //
  // [자유 배치 카드] (column_id가 없음)
  //   x, y = 캔버스 절대 좌표
  //   렌더링 시 그대로 사용
  //
  // 장점:
  // - 그룹 이동 시 API 호출 최소화 (N개 카드 → 1회 그룹 위치만 저장)
  // - 데이터 일관성 유지 용이
  // - 로직 단순화
  // ============================================
  x: number;
  y: number;

  // 분류
  boardId: number;       // 프론트에서 프로젝트 ID를 boardId로 사용
  column_id?: number;    // 백엔드 컬럼 ID (그룹 ID). 없으면 자유 배치.
  taskType?: number;     // 0: 일, 1: 메모, 2: 파일
  card_type?: string;    // 백엔드 card_type (task, memo)

  // 시간
  time?: string;         // 프론트 표시용 (start|end 형식)
  start_date?: string;
  due_date?: string;

  // 관계
  color?: string;
  tags?: Tag[];
  comments?: Comment[];
  files?: TaskFile[];
  assignees?: Assignee[];

  // 메타
  created_at?: string;
  updated_at?: string;
}

export interface Column {
  id: number;
  title: string;
  status: TaskStatus;
  order: number;
  project_id: number;

  // 위치 & 크기 (백엔드 BoardColumn 확장)
  localX?: number;
  localY?: number;
  width?: number;
  height?: number;

  // 계층 구조
  parentId?: number | null;
  depth?: number;

  // 스타일
  color?: string;
  collapsed?: boolean;
}

export interface Connection {
  id: number;
  from: number;
  to: number;
  shape?: 'bezier' | 'straight';
  style?: 'solid' | 'dashed';
  boardId?: number;
  sourceHandle?: 'left' | 'right';
  targetHandle?: 'left' | 'right';
}

export interface Group {
  id: number;
  title: string;

  // 캔버스 절대 좌표 (부모가 있으면 부모 기준, 없으면 캔버스 기준)
  x: number;       // local_x
  y: number;       // local_y
  width: number;
  height: number;

  // 계층 구조
  parentId?: number | null;  // 부모 그룹 ID (중첩 지원)
  depth: number;             // 0: 최상위, 1: 1단계 중첩...

  // 스타일
  color?: string;
  collapsed?: boolean;

  // 연결
  projectId: number;         // boardId → projectId로 명확화
  order?: number;

  // Transform (확장용)
  transform?: {
    scaleX: number;
    scaleY: number;
    rotation: number;
  };
}

export interface Board {
  id: number;
  title: string;
}

export interface EditingCard {
  id: number;
  title: string;
  user: string;
}

// ============================================
// 4. 파일 관련
// ============================================

export interface FileVersion {
  id: number;
  version: number;
  file_size: number;
  created_at: string;
  uploader_id: number;
}

export interface FileMetadata {
  id: number;
  project_id: number;
  filename: string;
  owner_id: number;
  created_at: string;
  latest_version?: FileVersion;
}

// ============================================
// 5. API 응답 타입 (프론트엔드용)
// ============================================

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
}

export interface SignupResponse {
  id: number;
  email: string;
  name: string;
  nickname?: string;
  is_student_verified: boolean;
}

export interface VerifyResponse {
  message: string;
}

// ============================================
// 6. Global Declarations
// ============================================

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// ============================================
// 7. 음성 채팅 / WebRTC
// ============================================

export interface SignalData {
  type: 'join' | 'offer' | 'answer' | 'ice' | 'user_left' | 'user_joined' | 'existing_users';
  senderId?: number;
  targetId?: number;
  /** 백엔드 targeted delivery용 수신자 ID */
  to?: number;
  /** 백엔드 user_joined / user_left 에서 사용하는 발신자 ID */
  userId?: number;
  /** existing_users 응답: 현재 방에 있는 참여자 ID 목록 */
  users?: number[];
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface VoiceChatState {
  isConnected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  activePeerIds: number[];
}

export interface VoiceParticipant {
  id: number;
  name: string;
  avatar?: string | null;
  isSpeaking: boolean;
  isMuted: boolean;
  isCurrentUser: boolean;
}

export type VoiceChatErrorType =
    | 'permission_denied'
    | 'not_supported'
    | 'connection_failed'
    | 'unknown';

export interface VoiceChatError {
  type: VoiceChatErrorType;
  message: string;
}

// ============================================
// 8. 게시판 (Community Board)
// ============================================

export interface PostComment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user?: User;
  user_name?: string;
}

export interface Post {
  id: number;
  project_id?: number;
  user_id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  user?: User;
  user_name?: string;
  comments?: PostComment[];
}

export interface PostCreateRequest {
  title: string;
  content: string;
  file?: File;
}

export interface PostUpdateRequest {
  title?: string;
  content?: string;
  image_url?: string;
}

export interface PostCommentCreateRequest {
  content: string;
}

// ============================================
// 9. 초대 (Invitation)
// ============================================

export interface Invitation {
  id: number;
  token: string;
  workspace_id: number;
  inviter_id: number;
  role: string;
  target_email?: string;
  expires_at: string;
  created_at: string;
  is_used: boolean;
}

export interface InvitationCreateRequest {
  role?: string;
  expires_in_hours?: number;
}

export interface InvitationResponse {
  invite_link: string;
  expires_at: string;
}

export interface InvitationInfo {
  workspace_name: string;
  inviter_name: string;
  role: string;
}

export interface DirectInviteRequest {
  email: string;
}

// ============================================
// 10. WebSocket 이벤트 타입 (Board 실시간 동기화)
// ============================================

/**
 * 보드 WebSocket 이벤트 타입
 */
export type BoardEventType =
    | 'CARD_CREATED'
    | 'CARD_UPDATED'
    | 'CARD_DELETED'
    | 'CARD_BATCH_UPDATED'
    | 'COLUMN_CREATED'
    | 'COLUMN_UPDATED'
    | 'COLUMN_DELETED'
    | 'CONNECTION_CREATED'
    | 'CONNECTION_UPDATED'
    | 'CONNECTION_DELETED'
    | 'FILE_UPLOADED'
    | 'FILES_UPLOADED'
    | 'FILE_DELETED'
    | 'CURSOR_MOVE'
    | 'POST_CREATED'
    | 'POST_DELETED'
    | 'POST_UPDATED'
    | 'POST_COMMENT_CREATED'
    | 'POST_COMMENT_DELETED';

/**
 * 백엔드 WebSocket 메시지 구조
 */
export interface BoardSocketMessage<T = unknown> {
  type: BoardEventType;
  data: T;
}

/**
 * 백엔드 Card 데이터 (Snake Case - WebSocket 수신용)
 */
export interface BackendCardSocketData {
  id: number;
  title: string;
  content: string | null;
  order: number;
  column_id: number | null;
  project_id: number;
  card_type: string;
  x: number;
  y: number;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  due_date: string | null;
  assignees?: Array<{
    id: number;
    email: string;
    name: string;
    is_student_verified: boolean;
    profile_image?: string | null;
  }>;
  files?: Array<{
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
    } | null;
  }>;
}

/**
 * 백엔드 Column 데이터 (Snake Case - WebSocket 수신용)
 */
export interface BackendColumnSocketData {
  id: number;
  title: string;
  order: number;
  project_id: number;
  local_x?: number;
  local_y?: number;
  width?: number;
  height?: number;
  parent_id?: number | null;
  depth?: number;
  color?: string;
  collapsed?: boolean;
  scale_x?: number;
  scale_y?: number;
  rotation?: number;
}

/**
 * 백엔드 Connection 데이터 (WebSocket 수신용)
 */
export interface BackendConnectionSocketData {
  id: number;
  from?: number;
  to?: number;
  from_card_id?: number;
  to_card_id?: number;
  board_id?: number;
  style?: string;
  shape?: string;
  source_handle?: string;
  target_handle?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * 삭제 이벤트 데이터
 */
export interface DeleteEventData {
  id: number;
}

/**
 * WebSocket 연결 상태
 */
export type SocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * useBoardSocket 훅 반환 타입
 */
export interface UseBoardSocketReturn {
  connectionState: SocketConnectionState;
  isConnected: boolean;
  lastError: string | null;
  reconnectAttempts: number;
  reconnect: () => void;
  disconnect: () => void;
  sendMessage: (message: Record<string, unknown>) => void;
}
