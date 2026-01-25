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
} from '../types';

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
    email: 'student@jj.ac.kr',
    password: 'test1234',
    name: '김도모',
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
  email: 'student@jj.ac.kr',
  name: '김도모',
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
    name: '캡스톤디자인',
    description: '2024-2 캡스톤 프로젝트',
    owner_id: 1,
    projects: [
      {
        id: 1,
        name: 'Domo 협업 플랫폼',
        workspace: '캡스톤디자인',
        workspace_id: 1,
        role: 'PM',
        progress: 65,
        memberCount: 4,
        lastActivity: '2분 전',
        color: '#FEF3C7',
      },
      {
        id: 2,
        name: 'API 문서 작성',
        workspace: '캡스톤디자인',
        workspace_id: 1,
        role: 'Frontend',
        progress: 30,
        memberCount: 4,
        lastActivity: '1시간 전',
        color: '#DBEAFE',
      },
    ],
  },
  {
    id: 2,
    name: '소프트웨어공학',
    description: '팀 과제',
    owner_id: 2,
    projects: [
      {
        id: 3,
        name: '요구사항 분석',
        workspace: '소프트웨어공학',
        workspace_id: 2,
        role: 'Researcher',
        progress: 100,
        memberCount: 3,
        lastActivity: '1일 전',
        color: '#FCE7F3',
      },
    ],
  },
];

// ============================================
// 프로젝트 관련 목업 데이터
// ============================================

export const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    name: 'Domo 협업 플랫폼',
    workspace: '캡스톤디자인',
    workspace_id: 1,
    role: 'PM',
    progress: 65,
    memberCount: 4,
    lastActivity: '2분 전',
    color: '#FEF3C7',
  },
  {
    id: 2,
    name: 'API 문서 작성',
    workspace: '캡스톤디자인',
    workspace_id: 1,
    role: 'Frontend',
    progress: 30,
    memberCount: 4,
    lastActivity: '1시간 전',
    color: '#DBEAFE',
  },
  {
    id: 3,
    name: '요구사항 분석',
    workspace: '소프트웨어공학',
    workspace_id: 2,
    role: 'Researcher',
    progress: 100,
    memberCount: 3,
    lastActivity: '1일 전',
    color: '#FCE7F3',
  },
];

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

// ID 생성용 카운터
let nextTaskId = 1000;
let nextConnectionId = 100;
let nextColumnId = 100;
let nextGroupId = 200;

// --- Task CRUD ---

export function generateTaskId(): number {
  return nextTaskId++;
}

export function addMockTask(task: Task): Task {
  // ID가 없으면 생성
  const newTask = {
    ...task,
    id: task.id || generateTaskId(),
  };
  MOCK_TASKS = [...MOCK_TASKS, newTask];
  console.log('[Mock] Task added:', newTask.id, newTask.title);
  return newTask;
}

export function updateMockTask(taskId: number, updates: Partial<Task>): Task | null {
  const index = MOCK_TASKS.findIndex(t => t.id === taskId);
  if (index === -1) {
    return null;
  }
  
  const updatedTask = { ...MOCK_TASKS[index], ...updates };
  MOCK_TASKS = [
    ...MOCK_TASKS.slice(0, index),
    updatedTask,
    ...MOCK_TASKS.slice(index + 1),
  ];
  console.log('[Mock] Task updated:', taskId, updates);
  return updatedTask;
}

export function deleteMockTask(taskId: number): boolean {
  const initialLength = MOCK_TASKS.length;
  MOCK_TASKS = MOCK_TASKS.filter(t => t.id !== taskId);
  
  // 관련 연결선도 삭제
  MOCK_CONNECTIONS = MOCK_CONNECTIONS.filter(
    c => c.from !== taskId && c.to !== taskId
  );
  
  const deleted = MOCK_TASKS.length < initialLength;
  console.log('[Mock] Task deleted:', taskId, deleted);
  return deleted;
}

export function getMockTask(taskId: number): Task | undefined {
  return MOCK_TASKS.find(t => t.id === taskId);
}

export function getMockTasksByProject(projectId: number): Task[] {
  return MOCK_TASKS.filter(t => t.boardId === projectId);
}

// --- Connection CRUD ---

export function generateConnectionId(): number {
  return nextConnectionId++;
}

export function addMockConnection(connection: Omit<Connection, 'id'>): Connection {
  const newConnection: Connection = {
    ...connection,
    id: generateConnectionId(),
    style: connection.style || 'solid',
    shape: connection.shape || 'bezier',
  };
  MOCK_CONNECTIONS = [...MOCK_CONNECTIONS, newConnection];
  console.log('[Mock] Connection added:', newConnection.id);
  return newConnection;
}

export function deleteMockConnection(connectionId: number): boolean {
  const initialLength = MOCK_CONNECTIONS.length;
  MOCK_CONNECTIONS = MOCK_CONNECTIONS.filter(c => c.id !== connectionId);
  const deleted = MOCK_CONNECTIONS.length < initialLength;
  console.log('[Mock] Connection deleted:', connectionId, deleted);
  return deleted;
}

export function getMockConnectionsByProject(projectId: number): Connection[] {
  return MOCK_CONNECTIONS.filter(c => c.boardId === projectId);
}

// --- Column CRUD ---

export function generateColumnId(): number {
  return nextColumnId++;
}

export function addMockColumn(column: Omit<Column, 'id'>): Column {
  const newColumn: Column = {
    ...column,
    id: generateColumnId(),
  };
  MOCK_COLUMNS = [...MOCK_COLUMNS, newColumn];
  console.log('[Mock] Column added:', newColumn.id, newColumn.title);
  return newColumn;
}

export function getMockColumnsByProject(projectId: number): Column[] {
  return MOCK_COLUMNS.filter(c => c.project_id === projectId);
}

export function getMockColumn(columnId: number): Column | undefined {
  return MOCK_COLUMNS.find(c => c.id === columnId);
}

// --- Group CRUD ---

export function generateGroupId(): number {
  return nextGroupId++;
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
  console.log('[Mock] Group added:', newGroup.id, newGroup.title);
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
  console.log('[Mock] Group updated:', groupId, updates);
  return updatedGroup;
}

export function deleteMockGroup(groupId: number): boolean {
  const initialLength = MOCK_GROUPS.length;
  
  // 자식 그룹들의 parentId를 null로 변경 (부모가 삭제되면 최상위로)
  MOCK_GROUPS = MOCK_GROUPS.map(g => 
    g.parentId === groupId ? { ...g, parentId: null, depth: 0 } : g
  );
  
  // 그룹 삭제
  MOCK_GROUPS = MOCK_GROUPS.filter(g => g.id !== groupId);
  
  // 소속된 카드들의 column_id를 undefined로 변경
  MOCK_TASKS = MOCK_TASKS.map(t => 
    t.column_id === groupId ? { ...t, column_id: undefined } : t
  );
  
  const deleted = MOCK_GROUPS.length < initialLength;
  console.log('[Mock] Group deleted:', groupId, deleted);
  return deleted;
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
  // 원본 데이터로 리셋 (개발 중 디버깅용)
  nextTaskId = 1000;
  nextConnectionId = 100;
  nextColumnId = 100;
  nextGroupId = 200;
  console.log('[Mock] Data reset');
}
