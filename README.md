# DOMO - 협업 워크스페이스 플랫폼

비전 있는 팀을 위한 현대적인 협업 도구. 실시간 보드, 캔버스 기반 태스크 관리, 파일 공유를 하나의 플랫폼에서 제공합니다.

---

## 📚 목차
1. [기술 스택](#1-기술-스택-tech-stack)
2. [프로젝트 구조](#2-프로젝트-구조-project-structure)
3. [핵심 기능](#3-핵심-기능-core-features)
4. [API 아키텍처](#4-api-아키텍처-api-architecture)
5. [개발 가이드](#5-개발-가이드-development-guide)
6. [환경 설정](#6-환경-설정-environment-setup)
7. [배포](#7-배포-deployment)

---

## 1. 기술 스택 (Tech Stack)

### Frontend
- **Runtime**: Node.js 22.15.0
- **Framework**: Next.js 15+ (App Router)
- **Library**: React 19+
- **Language**: TypeScript 5.8+ (Strict Mode)
- **Styling**: Tailwind CSS 4 (Inline @theme)
- **Icons**: Lucide React
- **State Management**: React Hooks + Custom API Layer

### Backend Integration
- **API Client**: Custom `apiFetch` wrapper (fetch API 기반)
- **Data Layer**: `/src/lib/api` - Type-safe API interface
- **Mock Mode**: 개발 환경용 Mock 데이터 지원

---

## 2. 프로젝트 구조 (Project Structure)

```bash
src/
├── app/                      # Next.js App Router
│   ├── components/           # React 컴포넌트
│   │   ├── board/            # 🎯 핵심: 캔버스 보드 시스템
│   │   │   ├── BoardCanvas.tsx       # 무한 캔버스, 드래그&드롭, 연결선
│   │   │   ├── WorkspaceBoard.tsx    # 프로젝트 보드 메인 컨테이너
│   │   │   └── Views.tsx             # Calendar/Timeline/Settings 뷰
│   │   ├── dock/             # macOS 스타일 하단 독바
│   │   │   ├── Dock.tsx
│   │   │   └── DockButton.tsx
│   │   ├── ui/               # 재사용 가능한 UI 컴포넌트
│   │   │   ├── TaskCard.tsx          # 태스크 카드 (포스트잇/파일)
│   │   │   ├── TaskDetailModal.tsx   # 태스크 상세 모달
│   │   │   ├── ProjectSelect.tsx     # 프로젝트 선택 화면
│   │   │   └── Mascot.tsx            # 브랜드 마스코트 SVG
│   │   ├── LoginScreen.tsx   # 인증 화면
│   │   └── page.tsx          # 메인 페이지 컴포넌트
│   ├── globals.css           # Tailwind 글로벌 스타일
│   ├── layout.tsx            # 루트 레이아웃
│   └── page.tsx              # 루트 페이지 (인증 분기)
│
├── lib/                      # 비즈니스 로직 & 유틸리티
│   ├── api/                  # 🔥 백엔드 통신 계층 (상세 하단)
│   │   ├── config.ts         # API 설정 (Mock/Real, Base URL)
│   │   ├── mappers.ts        # Backend ↔ Frontend 타입 변환
│   │   ├── auth.ts           # 인증 (로그인, 회원가입, 이메일 인증)
│   │   ├── board.ts          # 보드, 컬럼, 카드(태스크), 연결선, 댓글
│   │   ├── workspace.ts      # 워크스페이스, 프로젝트, 멤버, 초대
│   │   ├── file.ts           # 파일 업로드/다운로드/버전 관리
│   │   ├── user.ts           # 사용자 정보 조회/수정
│   │   ├── activity.ts       # 활동 로그
│   │   ├── schedule.ts       # 시간표, 팀 공통 빈 시간, 프로젝트 일정
│   │   ├── mock-data.ts      # 개발용 Mock 데이터
│   │   └── index.ts          # API 통합 export
│   └── utils/
│       └── canvas.ts         # 캔버스 색상/스타일 유틸리티
│
└── types/
    └── index.ts              # 📝 TypeScript 타입 정의 (전역)
```

---

## 3. 핵심 기능 (Core Features)

### 🎨 무한 캔버스 보드
- **드래그 앤 드롭**: 포스트잇 스타일 태스크 카드
- **연결선**: 태스크 간 관계 시각화 (Bezier/Straight, Solid/Dashed)
- **그룹핑**: 여러 카드를 그룹으로 묶기 (`Ctrl + Select`)
- **스냅 투 그리드**: 정렬 도우미
- **파일/폴더**: 파일 업로드 → 캔버스에 파일 카드 생성

### 📋 다중 뷰 모드
- **Board**: 무한 캔버스 (기본)
- **Calendar**: 월별 캘린더 뷰
- **Timeline**: 간트 차트 스타일 타임라인
- **Settings**: 계정 설정, 테마 전환

### 💬 실시간 협업
- **댓글 시스템**: 카드별 댓글 (생성/삭제)
- **온라인 멤버**: 현재 접속 중인 팀원 표시
- **편집 중 표시**: 다른 사용자가 편집 중인 카드 하이라이트

### 🔐 인증 & 권한
- **학교 이메일 인증**: `@jj.ac.kr` 도메인 검증
- **워크스페이스 멤버십**: 초대 링크 기반 팀 구성
- **역할 기반 권한**: Owner, Member 등

---

## 4. API 아키텍처 (API Architecture)

### 4.1 구조 개요

```
┌─────────────┐
│  Component  │  (UI Layer)
└──────┬──────┘
       │ calls
┌──────▼──────────────┐
│  API Functions      │  (src/lib/api/*.ts)
│  - getTasks()       │
│  - createTask()     │
│  - login()          │
└──────┬──────────────┘
       │
   ┌───▼────┐
   │ Mock?  │  (config.USE_MOCK)
   └───┬────┘
       │
   ┌───▼────────────────┐
   │ YES: mock-data.ts  │
   │ NO:  apiFetch()    │  → Backend API
   └────────────────────┘
```

### 4.2 주요 API 모듈

| 파일 | 역할 | 주요 함수 |
|------|------|-----------|
| `auth.ts` | 인증 | `login()`, `signup()`, `verify()`, `logout()` |
| `board.ts` | 보드/태스크 | `getTasks()`, `createTask()`, `updateTask()`, `deleteTask()` |
| | 댓글 | `getCardComments()`, `createCardComment()`, `deleteCardComment()` |
| | 연결선 | `getConnections()`, `createConnection()`, `deleteConnection()` |
| `workspace.ts` | 워크스페이스 | `getWorkspaces()`, `createWorkspace()`, `updateWorkspace()` |
| | 프로젝트 | `getMyProjects()`, `createProject()`, `deleteProject()` |
| | 멤버 | `getWorkspaceMembers()`, `addWorkspaceMember()`, `createInvitation()` |
| `file.ts` | 파일 관리 | `uploadFile()`, `deleteFile()`, `attachFileToCard()` |
| `schedule.ts` | 일정 | `getMySchedules()`, `getCommonFreeTime()`, `getProjectEvents()` |
| `user.ts` | 사용자 | `getMyInfo()`, `updateMyInfo()`, `updateProfileImage()` |

### 4.3 타입 매퍼 (`mappers.ts`)

백엔드 API 응답과 프론트엔드 타입 간 변환을 담당:

```typescript
// 백엔드 Card → 프론트 Task
mapCardToTask(card, boardId, columnOrder): Task

// 프론트 Task → 백엔드 CardPayload
mapTaskToCardPayload(task): CardCreate | CardUpdate

// Column order → Status
order: 0 → status: 'todo'
order: 1 → status: 'in-progress'
order: 2 → status: 'done'
```

### 4.4 Mock vs Real 모드

**Mock 모드** (`USE_MOCK=true`):
```typescript
export async function getTasks(projectId: number): Promise<Task[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return MOCK_TASKS.filter(t => t.boardId === projectId);
  }
  // Real API call
  return apiFetch<Task[]>(`/projects/${projectId}/tasks`);
}
```

**Real 모드** (`USE_MOCK=false`):
- `apiFetch()`를 통해 실제 백엔드 서버 호출
- Base URL: `NEXT_PUBLIC_API_URL` (기본값: `http://localhost:9000/api`)

---

## 5. 개발 가이드 (Development Guide)

### 5.1 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env.local 생성)
NEXT_PUBLIC_API_URL=http://localhost:9000/api
NEXT_PUBLIC_USE_MOCK=false  # true = Mock 모드

# 3. 개발 서버 실행
npm run dev
```

### 5.2 Mock 모드 활용

백엔드 서버 없이 UI 개발:

1. `.env.local`에서 `NEXT_PUBLIC_USE_MOCK=true` 설정
2. `src/lib/api/mock-data.ts`에 테스트 데이터 추가
3. 각 API 함수에서 Mock 로직 구현:

```typescript
if (API_CONFIG.USE_MOCK) {
  await mockDelay(300);
  return MOCK_DATA;
}
```

### 5.3 새 API 추가 방법

**Step 1**: 타입 정의 (`src/types/index.ts`)
```typescript
export interface NewFeature {
  id: number;
  name: string;
  // ...
}
```

**Step 2**: API 함수 작성 (`src/lib/api/new-feature.ts`)
```typescript
export async function getNewFeature(): Promise<NewFeature[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return MOCK_NEW_FEATURES;
  }
  return apiFetch<NewFeature[]>('/new-features');
}
```

**Step 3**: Export (`src/lib/api/index.ts`)
```typescript
export { getNewFeature } from './new-feature';
```

**Step 4**: 컴포넌트에서 사용
```typescript
import { getNewFeature } from '@/src/lib/api';

const data = await getNewFeature();
```

### 5.4 백엔드 연동 체크리스트

- [ ] 백엔드 API 스키마 문서 확인
- [ ] `src/types/index.ts`에 타입 정의
- [ ] `mappers.ts`에 변환 함수 작성
- [ ] API 함수에서 Mock/Real 분기 처리
- [ ] 에러 핸들링 추가 (try-catch)
- [ ] 낙관적 UI 업데이트 고려

### 5.5 주요 개발 패턴

#### 📌 낙관적 UI 업데이트
```typescript
const handleCreateTask = async (taskData) => {
  // 1. 즉시 UI 업데이트 (임시 ID)
  const tempTask = { ...taskData, id: Date.now() };
  setTasks([...tasks, tempTask]);

  try {
    // 2. 실제 API 호출
    const savedTask = await createTask(taskData);
    
    // 3. 실제 데이터로 교체
    setTasks(prev => prev.map(t => 
      t.id === tempTask.id ? savedTask : t
    ));
  } catch (err) {
    // 4. 실패 시 롤백
    setTasks(prev => prev.filter(t => t.id !== tempTask.id));
  }
};
```

#### 📌 상태 동기화 (Column ID ↔ Status)
```typescript
// 백엔드: column_id (0, 1, 2)
// 프론트: status ('todo', 'in-progress', 'done')

// 생성 시: status → column_id
const columnId = statusToColumnId(task.status);
await createTask(columnId, task);

// 조회 시: column order → status
const task = mapCardToTask(card, boardId, column.order);
```

---

## 6. 환경 설정 (Environment Setup)

### 6.1 환경 변수 (`.env.local`)

```bash
# API 서버 주소
NEXT_PUBLIC_API_URL=http://localhost:9000/api

# Mock 모드 (개발용)
NEXT_PUBLIC_USE_MOCK=false

# 선택 사항
NEXT_PUBLIC_FILE_UPLOAD_MAX_SIZE=10485760  # 10MB
```

### 6.2 TypeScript 설정

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 6.3 Tailwind 설정

`src/app/globals.css`:
```css
@import "tailwindcss";

:root {
  --bg-primary: #f5f5f7;
  --accent: #0071e3;
  /* ... */
}

.dark {
  --bg-primary: #000000;
  --accent: #0a84ff;
  /* ... */
}
```

---

## 7. 배포 (Deployment)

### 7.1 프로덕션 빌드

```bash
# 빌드
npm run build

# 로컬 프로덕션 테스트
npm run start
```

### 7.2 Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

**환경 변수 설정**:
- Vercel Dashboard → Project Settings → Environment Variables
- `NEXT_PUBLIC_API_URL`: 프로덕션 API 서버 주소
- `NEXT_PUBLIC_USE_MOCK`: `false`

---

## 📝 주요 타입 정의 (Key Types)

### Task (카드)
```typescript
interface Task {
  id: number;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  x: number;        // 캔버스 위치
  y: number;
  boardId: number;
  column_id?: number;  // 백엔드 컬럼 ID
  description?: string;
  assignees?: Assignee[];
  tags?: Tag[];
  comments?: Comment[];
  files?: TaskFile[];
  // ...
}
```

### Connection (연결선)
```typescript
interface Connection {
  id: number;
  from: number;     // Task ID
  to: number;       // Task ID
  shape?: 'bezier' | 'straight';
  style?: 'solid' | 'dashed';
}
```

### Project
```typescript
interface Project {
  id: number;
  name: string;
  workspace: string;
  workspace_id?: number;
  memberCount: number;
  progress: number;
  lastActivity: string;
}
```

---

## 🎯 개발 팁 (Tips)

### 1. Hot Reload가 느릴 때
```bash
# Turbopack 사용 (Next.js 15+)
npm run dev -- --turbo
```

### 2. API 디버깅
```typescript
// config.ts에서 로깅 활성화
export async function apiFetch<T>(endpoint: string, options?) {
  console.log('[API]', endpoint, options);
  const response = await fetch(...);
  console.log('[Response]', await response.clone().json());
  return response.json();
}
```

### 3. Mock 데이터 빠르게 생성
```typescript
// mock-data.ts
const generateMockTasks = (count: number) => 
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Task ${i + 1}`,
    status: 'todo',
    x: Math.random() * 1000,
    y: Math.random() * 600,
    boardId: 1,
  }));
```

---

## 🔧 트러블슈팅 (Troubleshooting)

### Q: "Module not found: Can't resolve '@/src/...'"
→ `tsconfig.json`의 `paths` 설정 확인

### Q: API 호출 시 CORS 에러
→ 백엔드에서 CORS 허용 설정 필요
```python
# FastAPI 예시
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
)
```

### Q: Mock 모드가 적용 안 됨
→ `.env.local` 파일 수정 후 서버 재시작 필수

### Q: 타입 에러: "Property 'column_id' does not exist"
→ `src/types/index.ts`에 필드 추가 후 컴파일 재시작

---

## 📚 참고 문서

- [Next.js App Router](https://nextjs.org/docs/app)
- [React 19 Docs](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📄 라이선스

MIT License

---

## 👥 기여자

- [@your-team](https://github.com/your-team)

---

**Last Updated**: 2025-01-20