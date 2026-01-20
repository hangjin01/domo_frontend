// src/types/index.ts

// ============================================
// 1. 공통/기본 타입 (User, Auth)
// ============================================

export interface User {
  id: number | string;
  email: string;
  name: string;
  is_student_verified?: boolean;
}

export interface AuthUser {
  email: string;
  name: string;
}

export interface Member {
  id: number | string;
  name: string;
  email: string;
  isOnline: boolean;
  role: string;
  avatar?: string | null;
}

export interface Assignee {
  id: number | string;
  name: string;
  avatar: string | null;
}

// ============================================
// 2. 워크스페이스 & 프로젝트
// ============================================

export interface Project {
  id: number | string;
  name: string;
  workspace: string;
  role: string;
  progress: number;
  memberCount: number;
  lastActivity: string;
  color: string;
  description?: string;
}

export interface ProjectSummary {
  id: number | string;
  name: string;
  progress: number;
  memberCount: number;
  lastActivity: string;
}

export interface Workspace {
  id: number | string;
  name: string;
  description: string;
  owner_id: number | string;
  projects: Project[];
}

// ============================================
// 3. 보드 / 태스크 / 노드
// ============================================

export type ViewMode = 'dashboard' | 'inbox' | 'planner' | 'board' | 'calendar' | 'timeline' | 'profile' | 'settings';

export interface Tag {
  id: number | string;
  name: string;
  color: string;
}

export interface Comment {
  id: number | string;
  user: string;
  text: string;
  timestamp: string;
}

export interface TaskFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Task {
  id: number | string;
  title: string;
  status: 'inbox' | 'todo' | 'doing' | 'in-progress' | 'done' | string;
  time?: string;
  color?: string;
  tags?: Tag[];
  description?: string;
  comments?: Comment[];
  files?: TaskFile[];
  x?: number;
  y?: number;

  boardId?: string | number;

  taskType?: number;
  project?: string;
  dueTime?: string;
  assignee?: User | Assignee;
  assignees?: Assignee[];
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface Node {
  id: number | string;
  title: string;
  status: 'todo' | 'in-progress' | 'done' | string;
  x: number;
  y: number;
  assignees: Assignee[];
  boardId?: string | number;
  description?: string;
  project?: string;
}

export interface Column {
  id: number | string;
  title: string;
  status: Task['status'];
}

export interface Connection {
  id: number | string;
  from: string | number;
  to: string | number;
  shape?: 'bezier' | 'straight';
  style?: 'solid' | 'dashed';
  boardId?: string | number;
}

export interface Group {
  id: string | number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  boardId?: string | number;
}

export interface Board {
  id: number | string;
  title: string;
}

export interface EditingCard {
  id: number | string;
  title: string;
  user: string;
}

// ============================================
// 4. 파일 관련 (기존 코드 보존)
// ============================================

export interface FileItem {
  id: number | string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: User;
  versions?: FileVersion[];
}

export interface FileVersion {
  id: number | string;
  version: number;
  uploadedAt: string;
  uploadedBy: User;
  size: number;
}

// ============================================
// 5. API 응답 타입
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
  id: number | string;
  email: string;
  name: string;
  is_student_verified: boolean;
}

export interface VerifyResponse {
  message: string;
}

// ============================================
// 7. Global Declarations
// ============================================

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}