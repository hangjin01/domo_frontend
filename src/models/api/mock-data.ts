/**
 * [파일 안내] frontend/src/models/api/mock-data.ts
 * 담당 범위: 데모 초기 계정·팀·프로젝트·보드·게시판 샘플과 보드 변경 헬퍼.
 * 화면 상태와 영속 데이터의 경계를 담당하므로 저장 원본과 반환 객체, 브라우저 실행 여부를 구분해야 합니다.
 * 초기 샘플과 수정 가능한 배열을 구분합니다. board.ts는 mock 분기마다 loadMockBoard로 최신 저장값을 읽고 변경 헬퍼가 persistMockBoard로 저장합니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

import type {
  Member,
  Workspace,
  Project,
  Task,
  Connection,
  EditingCard,
  User,
  Column,
  Group,
  Post,
} from '../types';
import { mockId, readMock, writeMock } from './mock-store';
import { removeBoardGroup } from '../utils/boardIndex';
import { arrangeDemoLayout } from '../utils/demoLayout';

// ============================================
// 인증 관련 목업 데이터
// ============================================

export interface MockUser {
  email: string;
  password: string;
  name: string;
  is_student_verified: boolean;
}

export const MOCK_USERS: MockUser[] = [
  {
    email: 'test@gmail.com',
    password: '1234',
    name: '테스트 사용자',
    is_student_verified: true,
  },
  {
    email: 'admin@domo.com',
    password: 'admin1234',
    name: '관리자(Admin)',
    is_student_verified: true,
  },
];

// ============================================
// 사용자/멤버 관련 목업 데이터
// ============================================

export const MOCK_CURRENT_USER: User = {
  id: 1,
  email: 'test@gmail.com',
  name: '테스트 사용자',
  nickname: '도모',
  is_student_verified: true,
  profile_image: null,
};

export const MOCK_ONLINE_MEMBERS: User[] = [
  { id: 1, name: '김도모', email: 'student@jj.ac.kr' },
  { id: 2, name: '이협업', email: 'collab@jj.ac.kr' },
];

export const MOCK_MEMBERS: Member[] = [
  { id: 1, name: '김도모', email: 'student@jj.ac.kr', isOnline: true, role: 'PM' },
  { id: 2, name: '이협업', email: 'collab@jj.ac.kr', isOnline: true, role: 'Frontend' },
  { id: 3, name: '박개발', email: 'dev@jj.ac.kr', isOnline: false, role: 'Backend' },
  { id: 4, name: '최디자인', email: 'design@jj.ac.kr', isOnline: false, role: 'Designer' },
];

// ============================================
// 워크스페이스 관련 목업 데이터
// ============================================

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 1,
    name: 'DOMO 데모',
    description: '샘플 데이터로 기능을 확인하는 로컬 워크스페이스',
    owner_id: 1,
    projects: [
      {
        id: 1,
        name: 'Domo 협업 플랫폼',
        workspace: 'DOMO 데모',
        workspace_id: 1,
        role: 'PM',
        progress: 65,
        memberCount: 4,
        lastActivity: '2분 전',
        color: '#FEF3C7',
      },
    ],
  },
];

// ============================================
// 프로젝트 관련 목업 데이터
// ============================================

// 목록을 별도로 복제하지 않아 팀/프로젝트 샘플 정의가 서로 어긋나지 않게 합니다.
export const MOCK_PROJECTS: Project[] = MOCK_WORKSPACES.flatMap(workspace => workspace.projects || []);

// ============================================
// 컬럼 목업 데이터 (신규 - 백엔드 BoardColumn 매칭)
// ============================================

export let MOCK_COLUMNS: Column[] = [
  { id: 1, title: '할 일', status: 'todo', order: 0, project_id: 1 },
  { id: 2, title: '진행 중', status: 'in-progress', order: 1, project_id: 1 },
  { id: 3, title: '완료', status: 'done', order: 2, project_id: 1 },
];

// ============================================
// 그룹 목업 데이터 (화이트보드용 - BoardColumn 확장)
// ============================================

export let MOCK_GROUPS: Group[] = [
  {
    id: 101,
    title: '기획 단계',
    x: 80,
    y: 80,
    width: 320,
    height: 250,
    parentId: null,
    depth: 0,
    color: '#FEF3C7',
    collapsed: false,
    projectId: 1,
    order: 0,
  },
  {
    id: 102,
    title: '개발 단계',
    x: 420,
    y: 80,
    width: 320,
    height: 400,
    parentId: null,
    depth: 0,
    color: '#DBEAFE',
    collapsed: false,
    projectId: 1,
    order: 1,
  },
  {
    id: 103,
    title: '프론트엔드',
    x: 440,
    y: 220,
    width: 280,
    height: 200,
    parentId: 102,  // '개발 단계' 그룹 안에 중첩
    depth: 1,
    color: '#D1FAE5',
    collapsed: false,
    projectId: 1,
    order: 0,
  },
];

// ============================================
// 보드/태스크 관련 목업 데이터 (let으로 변경 - 수정 가능)
// ============================================

export let MOCK_TASKS: Task[] = [
  {
    id: 1,
    title: '기획서 작성',
    status: 'done',
    x: 100,
    y: 100,
    boardId: 1,
    column_id: 101, // '기획 단계' 그룹
    assignees: [{ id: 1, name: '김도모', avatar: null }],
  },
  {
    id: 2,
    title: 'UI 디자인',
    status: 'in-progress',
    x: 460,
    y: 240,
    boardId: 1,
    column_id: 103, // '프론트엔드' 그룹 (중첩)
    assignees: [{ id: 2, name: '이협업', avatar: null }],
  },
  {
    id: 3,
    title: '백엔드 API',
    status: 'in-progress',
    x: 440,
    y: 120,
    boardId: 1,
    column_id: 102, // '개발 단계' 그룹
    assignees: [{ id: 3, name: '박개발', avatar: null }],
  },
  {
    id: 4,
    title: '프론트엔드 개발',
    status: 'todo',
    x: 460,
    y: 340,
    boardId: 1,
    column_id: 103, // '프론트엔드' 그룹 (중첩)
    assignees: [
      { id: 1, name: '김도모', avatar: null },
      { id: 2, name: '이협업', avatar: null },
    ],
  },
  {
    id: 5,
    title: '테스트',
    status: 'todo',
    x: 100,
    y: 200,
    boardId: 1,
    column_id: 101, // '기획 단계' 그룹
    assignees: [],
  },
  {
    id: 6,
    title: '프로젝트 시작',
    status: 'todo',
    x: 800,
    y: 100,
    boardId: 1,
    column_id: undefined, // 그룹 없음 (자유 배치)
    description: 'DOMO 협업 플랫폼에 오신 것을 환영합니다!',
    assignees: [],
  },
];

export const MOCK_NODES = MOCK_TASKS;

export let MOCK_CONNECTIONS: Connection[] = [
  { id: 1, from: 1, to: 2, boardId: 1, style: 'solid', shape: 'bezier' },
  { id: 2, from: 1, to: 3, boardId: 1, style: 'solid', shape: 'bezier' },
  { id: 3, from: 2, to: 4, boardId: 1, style: 'solid', shape: 'bezier' },
  { id: 4, from: 3, to: 4, boardId: 1, style: 'solid', shape: 'bezier' },
  { id: 5, from: 4, to: 5, boardId: 1, style: 'solid', shape: 'bezier' },
];

// ============================================
// 기타 목업 데이터
// ============================================

export const MOCK_TODAY_TASKS: Task[] = [
  {
    id: 101,
    title: 'UI 디자인 완료',
    status: 'todo',
    x: 0,
    y: 0,
    boardId: 1,
  },
  {
    id: 102,
    title: 'API 연동 테스트',
    status: 'todo',
    x: 0,
    y: 0,
    boardId: 1,
  },
];

export const MOCK_EDITING_CARDS: EditingCard[] = [
  { id: 2, title: 'UI 디자인', user: '이협업' },
];

// ============================================
// 게시판 목업 데이터
// ============================================

export const MOCK_POSTS: Post[] = [
  {
    id: 1,
    project_id: 1,
    user_id: 1,
    title: 'DOMO 플랫폼 오픈 안내',
    content: '안녕하세요, DOMO 플랫폼이 오픈되었습니다! 자유롭게 의견을 남겨주세요.',
    created_at: new Date().toISOString(),
    user: { id: 1, name: '김도모', nickname: '도모', email: 'student@jj.ac.kr' },
    comments: [
      {
        id: 1,
        post_id: 1,
        user_id: 2,
        content: '오픈 축하드립니다! UI가 정말 예쁘네요.',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        user: { id: 2, name: '이협업', email: 'collab@jj.ac.kr' }
      }
    ]
  },
  {
    id: 2,
    project_id: 1,
    user_id: 2,
    title: '자유 게시판입니다',
    content: '서로 인사 나누고 정보 공유해요!',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    user: { id: 2, name: '이협업', email: 'collab@jj.ac.kr' },
    comments: []
  }
];

// ============================================
// 활동 로그 목업 데이터
// ============================================

export interface ActivityLog {
  id: number;
  user_id: number;
  content: string;
  action_type: string;
  created_at: string;
  workspace_id?: number;
}

export let MOCK_ACTIVITIES: ActivityLog[] = [
  {
    id: 1,
    user_id: 1,
    content: '새로운 프로젝트 "Domo 협업 플랫폼"을 생성했습니다.',
    action_type: 'CREATE',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    user_id: 1,
    content: '"기획서 작성" 카드의 상태를 완료로 변경했습니다.',
    action_type: 'UPDATE',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    user_id: 1,
    content: '"UI 가이드라인.pdf" 파일을 업로드했습니다.',
    action_type: 'UPLOAD',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

// ============================================
// Mock 데이터 조작 헬퍼 함수들 (CRUD)
// ============================================

// 최초 샘플의 스냅샷입니다. 이후 변경 가능한 배열과 분리해 초기화 기준을 보존합니다.
const initialBoard = structuredClone({
  tasks: MOCK_TASKS, connections: MOCK_CONNECTIONS, columns: MOCK_COLUMNS, groups: MOCK_GROUPS,
});

export function loadMockBoard(): void {
  // 읽기와 쓰기의 원본 배열을 함께 교체해 카드/연결/그룹이 서로 다른 시점의 상태가 되지 않게 합니다.
  const saved = readMock('board', initialBoard);
  MOCK_TASKS = saved.tasks;
  MOCK_CONNECTIONS = saved.connections;
  MOCK_COLUMNS = saved.columns;
  MOCK_GROUPS = saved.groups;
}

export function persistMockBoard(): void {
  // 보드 관련 배열을 하나의 키에 저장합니다. 전체 프로젝트 보드가 이 스냅샷에 함께 들어 있습니다.
  writeMock('board', { tasks: MOCK_TASKS, connections: MOCK_CONNECTIONS, columns: MOCK_COLUMNS, groups: MOCK_GROUPS });
}

/** 로컬 데모 전용 정리. 이전 위치 스냅샷을 보존하고 저장 성공 뒤에만 메모리를 바꿉니다. */
export function arrangeMockBoard(projectId: number, width: number) {
  loadMockBoard();
  const previous = { tasks: MOCK_TASKS, groups: MOCK_GROUPS, columns: MOCK_COLUMNS, connections: MOCK_CONNECTIONS };
  const arranged = arrangeDemoLayout(MOCK_TASKS.filter(task => task.boardId === projectId), MOCK_GROUPS.filter(group => group.projectId === projectId), width);
  const taskMap = new Map(arranged.tasks.map(task => [task.id, task]));
  const groupMap = new Map(arranged.groups.map(group => [group.id, group]));
  const next = { ...previous, tasks: MOCK_TASKS.map(task => taskMap.get(task.id) ?? task), groups: MOCK_GROUPS.map(group => groupMap.get(group.id) ?? group) };
  writeMock('board-before-arrange', previous);
  writeMock('board', next);
  MOCK_TASKS = next.tasks;
  MOCK_GROUPS = next.groups;
  return arranged;
}

// --- Task CRUD ---

export function generateTaskId(): number {
  return mockId();
}

export function addMockTask(task: Task): Task {
  // ID가 없으면 생성
  const newTask = {
    ...task,
    id: task.id || generateTaskId(),
  };
  MOCK_TASKS = [...MOCK_TASKS, newTask];
  persistMockBoard();
  return newTask;
}

export function updateMockTask(taskId: number, updates: Partial<Task>): Task | null {
  const index = MOCK_TASKS.findIndex(t => t.id === taskId);
  if (index === -1) {
    return null;
  }

  const updatedTask = { ...MOCK_TASKS[index], ...updates };
  const nextTasks = [
    ...MOCK_TASKS.slice(0, index),
    updatedTask,
    ...MOCK_TASKS.slice(index + 1),
  ];
  // 저장 실패 시 메모리도 이전 상태로 유지해야 금액표와 화면 복원이 일치합니다.
  writeMock('board', { tasks: nextTasks, groups: MOCK_GROUPS, columns: MOCK_COLUMNS, connections: MOCK_CONNECTIONS });
  MOCK_TASKS = nextTasks;
  return updatedTask;
}

export function deleteMockTask(taskId: number): boolean {
  const initialLength = MOCK_TASKS.length;
  const tasks = MOCK_TASKS.filter(t => t.id !== taskId);
  const connections = MOCK_CONNECTIONS.filter(
      c => c.from !== taskId && c.to !== taskId
  );
  // 한 번의 저장이 성공한 뒤 메모리도 갱신합니다. 실패 시 카드와 연결선 모두 유지됩니다.
  writeMock('board', { tasks, connections, columns: MOCK_COLUMNS, groups: MOCK_GROUPS });
  MOCK_TASKS = tasks;
  MOCK_CONNECTIONS = connections;
  return tasks.length < initialLength;
}

export function getMockTask(taskId: number): Task | undefined {
  return MOCK_TASKS.find(t => t.id === taskId);
}

export function getMockTasksByProject(projectId: number): Task[] {
  return MOCK_TASKS.filter(t => t.boardId === projectId);
}

// --- Connection CRUD ---

export function generateConnectionId(): number {
  return mockId();
}

export function addMockConnection(connection: Omit<Connection, 'id'>): Connection {
  const newConnection: Connection = {
    ...connection,
    id: generateConnectionId(),
    style: connection.style || 'solid',
    shape: connection.shape || 'bezier',
  };
  MOCK_CONNECTIONS = [...MOCK_CONNECTIONS, newConnection];
  persistMockBoard();
  return newConnection;
}

export function deleteMockConnection(connectionId: number): boolean {
  const initialLength = MOCK_CONNECTIONS.length;
  MOCK_CONNECTIONS = MOCK_CONNECTIONS.filter(c => c.id !== connectionId);
  const deleted = MOCK_CONNECTIONS.length < initialLength;
  persistMockBoard();
  return deleted;
}

/** 선 종류 저장에 실패하면 화면뿐 아니라 메모리의 이전 값도 유지합니다. */
export function updateMockConnection(id: number, updates: Partial<Connection>): Connection {
  const previous = MOCK_CONNECTIONS.find(connection => connection.id === id);
  if (!previous) throw new Error('연결선을 찾을 수 없습니다.');
  const updated = { ...previous, ...updates, id };
  const connections = MOCK_CONNECTIONS.map(connection => connection.id === id ? updated : connection);
  writeMock('board', { tasks: MOCK_TASKS, groups: MOCK_GROUPS, columns: MOCK_COLUMNS, connections });
  MOCK_CONNECTIONS = connections;
  return { ...updated };
}

export function getMockConnectionsByProject(projectId: number): Connection[] {
  return MOCK_CONNECTIONS.filter(c => c.boardId === projectId);
}

// --- Column CRUD ---

export function generateColumnId(): number {
  return mockId();
}

export function addMockColumn(column: Omit<Column, 'id'>): Column {
  const group = addMockGroup({
    id: generateColumnId(), title: column.title, projectId: column.project_id,
    x: column.localX, y: column.localY, width: column.width, height: column.height,
    parentId: column.parentId, depth: column.depth, color: column.color,
    collapsed: column.collapsed, order: column.order,
  });
  return groupToColumn(group);
}

export function getMockColumnsByProject(projectId: number): Column[] {
  return MOCK_GROUPS.filter(group => group.projectId === projectId).map(groupToColumn);
}

export function getMockColumn(columnId: number): Column | undefined {
  const group = MOCK_GROUPS.find(group => group.id === columnId);
  return group ? groupToColumn(group) : undefined;
}

function groupToColumn(group: Group): Column {
  return { id: group.id, title: group.title, status: 'todo', order: group.order ?? 0,
    project_id: group.projectId, localX: group.x, localY: group.y,
    width: group.width, height: group.height, parentId: group.parentId,
    depth: group.depth, color: group.color, collapsed: group.collapsed };
}

// --- Group CRUD ---

export function generateGroupId(): number {
  return mockId();
}

export function addMockGroup(group: Partial<Group>): Group {
  const newGroup: Group = {
    id: group.id || generateGroupId(),
    title: group.title || 'New Group',
    x: group.x ?? 0,
    y: group.y ?? 0,
    width: group.width ?? 300,
    height: group.height ?? 400,
    parentId: group.parentId ?? null,
    depth: group.depth ?? 0,
    color: group.color ?? '#ffffff',
    collapsed: group.collapsed ?? false,
    projectId: group.projectId ?? 1,
    order: group.order ?? 0,
  };
  MOCK_GROUPS = [...MOCK_GROUPS, newGroup];
  persistMockBoard();
  return newGroup;
}

export function updateMockGroup(groupId: number, updates: Partial<Group>): Group | null {
  const index = MOCK_GROUPS.findIndex(g => g.id === groupId);
  if (index === -1) {
    return null;
  }

  const updatedGroup = { ...MOCK_GROUPS[index], ...updates };
  MOCK_GROUPS = [
    ...MOCK_GROUPS.slice(0, index),
    updatedGroup,
    ...MOCK_GROUPS.slice(index + 1),
  ];
  persistMockBoard();
  return updatedGroup;
}

export function deleteMockGroup(groupId: number): boolean {
  if (!MOCK_GROUPS.some(group => group.id === groupId)) return false;
  const next = removeBoardGroup(MOCK_TASKS, MOCK_GROUPS, groupId);
  const columns = MOCK_COLUMNS.filter(column => column.id !== groupId);
  writeMock('board', { ...next, columns, connections: MOCK_CONNECTIONS });
  MOCK_TASKS = next.tasks;
  MOCK_GROUPS = next.groups;
  MOCK_COLUMNS = columns;
  return true;
}

export function getMockGroup(groupId: number): Group | undefined {
  return MOCK_GROUPS.find(g => g.id === groupId);
}

export function getMockGroupsByProject(projectId: number): Group[] {
  return MOCK_GROUPS.filter(g => g.projectId === projectId);
}

export function getMockTasksByGroup(groupId: number): Task[] {
  return MOCK_TASKS.filter(t => t.column_id === groupId);
}

// --- 유틸리티 ---

export function resetMockData(): void {
  // 보드 데이터만 초기화합니다. 계정/워크스페이스/게시글/채팅까지 지우는 전체 리셋 함수가 아닙니다.
  writeMock('board', initialBoard);
  loadMockBoard();
}
