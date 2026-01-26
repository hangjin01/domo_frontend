import type {
  Member,
  Workspace,
  Project,
  Task,
  Connection,
  EditingCard,
  User,
} from '../../types';
import { ActivityLog } from "@/src/lib/api/activity";

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
    role: 'Researcher',
    progress: 100,
    memberCount: 3,
    lastActivity: '1일 전',
    color: '#FCE7F3',
  },
];

// ============================================
// 보드/태스크 관련 목업 데이터
// ============================================

export const MOCK_TASKS: Task[] = [
  {
    id: 1,
    title: '기획서 작성',
    status: 'done',
    x: 100,
    y: 100,
    boardId: 1,
    assignees: [{ id: 1, name: '김도모', avatar: null }],
  },
  {
    id: 2,
    title: 'UI 디자인',
    status: 'in-progress',
    x: 350,
    y: 80,
    boardId: 1,
    assignees: [{ id: 2, name: '이협업', avatar: null }],
  },
  {
    id: 3,
    title: '백엔드 API',
    status: 'in-progress',
    x: 350,
    y: 220,
    boardId: 1,
    assignees: [{ id: 3, name: '박개발', avatar: null }],
  },
  {
    id: 4,
    title: '프론트엔드 개발',
    status: 'todo',
    x: 600,
    y: 150,
    boardId: 1,
    assignees: [
      { id: 1, name: '김도모', avatar: null },
      { id: 2, name: '이협업', avatar: null },
    ],
  },
  {
    id: 5,
    title: '테스트',
    status: 'todo',
    x: 850,
    y: 150,
    boardId: 1,
    assignees: [],
  },
  {
    id: 6,
    title: '프로젝트 시작',
    status: 'todo',
    x: 100,
    y: 300,
    boardId: 1,
    description: 'DOMO 협업 플랫폼에 오신 것을 환영합니다!',
    assignees: [],
  },
];

export const MOCK_NODES = MOCK_TASKS;

export const MOCK_CONNECTIONS: Connection[] = [
  { id: 1, from: 1, to: 2, boardId: 1 },
  { id: 2, from: 1, to: 3, boardId: 1 },
  { id: 3, from: 2, to: 4, boardId: 1 },
  { id: 4, from: 3, to: 4, boardId: 1 },
  { id: 5, from: 4, to: 5, boardId: 1 },
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
// 활동 로그 목업 데이터 (신규 추가)
// ============================================

export const MOCK_ACTIVITIES: ActivityLog[] = [
  {
    id: 1,
    user_id: 1,
    content: '📋 새로운 프로젝트 "Domo 협업 플랫폼"을 생성했습니다.',
    action_type: 'CREATE',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    user_id: 1,
    content: '📝 "기획서 작성" 카드의 상태를 완료로 변경했습니다.',
    action_type: 'UPDATE',
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1시간 전
  },
  {
    id: 3,
    user_id: 1,
    content: '💾 "UI 가이드라인.pdf" 파일을 업로드했습니다.',
    action_type: 'UPLOAD',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1일 전
  },
];

// ============================================
// 게시판 목업 데이터 (신규 추가)
// ============================================

export const MOCK_POSTS: import('../../types').Post[] = [
  {
    id: 1,
    project_id: 1, // 커뮤니티용 가상 프로젝트 ID
    user_id: 1,
    title: '📢 DOMO 플랫폼 오픈 안내',
    content: '안녕하세요, DOMO 플랫폼이 오픈되었습니다! 자유롭게 의견을 남겨주세요.',
    created_at: new Date().toISOString(),
    user: MOCK_USERS[0] as unknown as import('../../types').User,
    comments: [
      {
        id: 1,
        post_id: 1,
        user_id: 2,
        content: '오픈 축하드립니다! UI가 정말 예쁘네요.',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        user: { id: 2, name: '이협업', email: 'collab@jj.ac.kr' } as any
      }
    ]
  },
  {
    id: 2,
    project_id: 1,
    user_id: 2,
    title: '자유 게시판입니다 👋',
    content: '서로 인사 나누고 정보 공유해요!',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    user: { id: 2, name: '이협업', email: 'collab@jj.ac.kr' } as any,
    comments: []
  }
];
