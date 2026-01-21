// src/types/index.ts

// ============================================
// 1. 공통/기본 타입 (User, Auth)
// ============================================

export interface User {
  id: number;
  email: string;
  name: string;
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

export type ViewMode = 'dashboard' | 'inbox' | 'planner' | 'board' | 'calendar' | 'timeline' | 'profile' | 'settings';

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

  // 캔버스 위치
  x: number;
  y: number;

  // 분류
  boardId: number;       // 프론트에서 프로젝트 ID를 boardId로 사용
  column_id?: number;    // 백엔드 컬럼 ID
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
}

export interface Connection {
  id: number;
  from: number;
  to: number;
  shape?: 'bezier' | 'straight';
  style?: 'solid' | 'dashed';
  boardId?: number;
}

export interface Group {
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  boardId?: number;
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
  is_student_verified: boolean;
}

export interface VerifyResponse {
  message: string;
}

// ============================================
// 6. 백엔드 API 스키마 (백엔드 응답과 1:1 매칭)
// ============================================

// 백엔드 UserResponse
export interface BackendUserResponse {
  id: number;
  email: string;
  name: string;
  is_student_verified: boolean;
  profile_image?: string | null;
}

// 백엔드 FileVersionResponse
export interface BackendFileVersionResponse {
  id: number;
  version: number;
  file_size: number;
  created_at: string;
  uploader_id: number;
}

// 백엔드 FileResponse
export interface BackendFileResponse {
  id: number;
  project_id: number;
  filename: string;
  owner_id: number;
  created_at: string;
  latest_version?: BackendFileVersionResponse | null;
}

// 백엔드 CardCommentResponse
export interface BackendCardCommentResponse {
  id: number;
  card_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user?: BackendUserResponse | null;
}

// 백엔드 CardResponse (핵심!)
export interface BackendCardResponse {
  id: number;
  title: string;
  content: string | null;
  order: number;
  column_id: number;
  card_type: string;          // "task" | "memo"
  x: number;
  y: number;
  created_at: string;
  updated_at: string;
  assignees: BackendUserResponse[];
  files: BackendFileResponse[];
  start_date: string | null;
  due_date: string | null;
}

// 백엔드 BoardColumnResponse
export interface BackendBoardColumnResponse {
  id: number;
  title: string;
  order: number;
  project_id: number;
}

// 백엔드 Board 응답 (컬럼 + 카드)
export interface BackendBoardResponse {
  column: BackendBoardColumnResponse;
  cards: BackendCardResponse[];
}

// 백엔드 CardConnectionResponse
export interface BackendCardConnectionResponse {
  id: number;
  from: number;       // serialization_alias로 변환됨
  to: number;
  boardId: number;
  style: string;
  shape: string;
}

// ============================================
// 7. Global Declarations
// ============================================

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// ============================================
// 8. 음성 채팅 / WebRTC
// ============================================

export interface SignalData {
  type: 'join' | 'offer' | 'answer' | 'ice' | 'user_left';
  senderId: number;
  targetId?: number;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface VoiceChatState {
  isConnected: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  activePeerIds: number[];
}