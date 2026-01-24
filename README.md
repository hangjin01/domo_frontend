# DOMO - 협업 워크스페이스 플랫폼

비전 있는 팀을 위한 현대적인 협업 도구. 실시간 보드, 캔버스 기반 태스크 관리, 파일 공유, **음성 채팅**을 하나의 플랫폼에서 제공합니다.

---

## 목차
1. [기술 스택](#1-기술-스택)
2. [프로젝트 구조 (MVC 패턴)](#2-프로젝트-구조-mvc-패턴)
3. [폴더별 상세 설명](#3-폴더별-상세-설명)
4. [핵심 기능](#4-핵심-기능)
5. [타입 시스템](#5-타입-시스템)
6. [개발 가이드](#6-개발-가이드)
7. [환경 설정](#7-환경-설정)
8. [배포](#8-배포)
9. [트러블슈팅](#9-트러블슈팅)

---

## 1. 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| **Node.js** | 22.15.0 | 런타임 |
| **Next.js** | 16+ | App Router 기반 프레임워크 |
| **React** | 19+ | UI 라이브러리 |
| **TypeScript** | 5.8+ | 타입 안전성 (Strict Mode) |
| **Tailwind CSS** | 4 | 스타일링 |
| **Lucide React** | - | 아이콘 라이브러리 |

### 실시간 통신
| 기술 | 용도 |
|------|------|
| **WebSocket** | 시그널링 서버 연결 |
| **WebRTC** | P2P 음성 채팅 |
| **STUN Server** | NAT 트래버설 (`stun.l.google.com`) |

### Backend Integration
- **API Client**: Custom `apiFetch` wrapper (Fetch API 기반, 쿠키 인증)
- **Data Layer**: `/models/api` - Type-safe API interface
- **Mock Mode**: 개발 환경용 Mock 데이터 지원

---

## 2. 프로젝트 구조 (MVC 패턴)

프로젝트는 **MVC(Model-View-Controller) 패턴**을 React/Next.js에 맞게 적용하여 구성되어 있습니다.

```
src/
├── app/                    # Next.js App Router (진입점)
│
├── models/                 # [M] 데이터 & 비즈니스 로직
│   ├── api/                #     API 통신 함수
│   ├── types/              #     TypeScript 타입 정의
│   └── utils/              #     유틸리티 함수
│
├── views/                  # [V] 순수 UI 컴포넌트 (props만 받아서 렌더링)
│   ├── board/              #     캔버스 보드 UI
│   ├── task/               #     태스크 카드/모달 UI
│   ├── calendar/           #     캘린더 뷰 UI
│   ├── timeline/           #     타임라인 뷰 UI
│   ├── profile/            #     프로필/설정 UI
│   ├── dock/               #     하단 독바 UI
│   └── common/             #     공통 UI (Mascot 등)
│
└── containers/             # [C] 상태 관리 & 화면 조합
    ├── screens/            #     화면 단위 컨트롤러
    └── hooks/              #     비즈니스 로직 Hooks
        ├── common/         #         공통 Hooks
        └── board/          #         보드 전용 Hooks
```

### MVC 역할 분담

| 레이어 | 폴더 | 역할 | 예시 |
|--------|------|------|------|
| **Model** | `models/` | 데이터 구조, API 통신, 비즈니스 로직 | `api/board.ts`, `types/index.ts` |
| **View** | `views/` | 순수 UI 렌더링 (props만 받음) | `BoardCanvas.tsx`, `TaskCard.tsx` |
| **Controller** | `containers/` | 상태 관리, 이벤트 핸들링, View와 Model 연결 | `BoardScreen.tsx`, `useBoardData.ts` |

---

## 3. 폴더별 상세 설명

### 3.1 `app/` - Next.js App Router

```
app/
├── page.tsx          # 라우팅 진입점 (인증 상태에 따른 화면 분기)
├── layout.tsx        # 루트 레이아웃
├── globals.css       # Tailwind 글로벌 스타일 + 다크모드
└── favicon.ico
```

`page.tsx`는 현재 인증 상태와 선택된 워크스페이스/프로젝트에 따라 적절한 Screen을 렌더링합니다:

```typescript
// 화면 흐름
로그인 전    → LoginScreen / SignupScreen / VerifyEmailScreen
로그인 후    → WorkspaceListScreen (워크스페이스 선택)
→ ProjectSelectScreen (프로젝트 선택)
→ BoardScreen (보드 작업)
```

---

### 3.2 `models/` - 데이터 레이어

#### 3.2.1 `models/api/` - API 통신

| 파일 | 역할 | 주요 함수 |
|------|------|-----------|
| `config.ts` | API 설정 | `apiFetch()`, `API_CONFIG`, `getWebSocketUrl()` |
| `auth.ts` | 인증 | `login()`, `signup()`, `verify()`, `logout()`, `checkAuth()` |
| `board.ts` | 보드/태스크 | `getTasks()`, `createTask()`, `updateTask()`, `deleteTask()` |
| `workspace.ts` | 워크스페이스 | `getWorkspaces()`, `createWorkspace()`, `getProjects()` |
| `file.ts` | 파일 관리 | `getProjectFiles()`, `uploadFile()`, `deleteFile()`, `getFileVersions()`, `attachFileToCard()`, `detachFileFromCard()` |
| `user.ts` | 사용자 | `getMyInfo()`, `updateMyInfo()`, `updateProfileImage()` |
| `activity.ts` | 활동 로그 | `getMyActivities()` |
| `schedule.ts` | 일정 | `getMySchedules()`, `getCommonFreeTime()` |
| `mappers.ts` | 타입 변환 | Backend ↔ Frontend 타입 매핑 |
| `mock-data.ts` | Mock 데이터 | 개발용 더미 데이터 |
| `index.ts` | 통합 Export | 모든 API 함수 re-export |

**사용 예시:**
```typescript
import { getTasks, createTask, login } from '@/src/models/api';
```

#### 3.2.2 `models/types/` - 타입 정의

모든 TypeScript 타입이 `index.ts`에 정의되어 있습니다:

```typescript
import type { Task, Project, User, Connection } from '@/src/models/types';
```

주요 타입:
- `User`, `AuthUser`, `Member` - 사용자 관련
- `Workspace`, `Project` - 워크스페이스/프로젝트
- `Task`, `Column`, `Connection`, `Group` - 보드/태스크
- `BackendCardResponse`, `BackendBoardResponse` - API 응답 타입

#### 3.2.3 `models/utils/` - 유틸리티

```
utils/
└── canvas.ts         # 캔버스 색상/스타일 유틸리티 (getStickyStyle 등)
```

---

### 3.3 `views/` - UI 컴포넌트 레이어

**원칙**: View 컴포넌트는 **순수 UI**만 담당합니다. 상태 관리나 API 호출 없이 props만 받아서 렌더링합니다.

#### 3.3.1 `views/board/` - 캔버스 보드

| 파일 | 역할 |
|------|------|
| `BoardCanvas.tsx` | 무한 캔버스, 드래그&드롭, 연결선 렌더링 |
| `SortableGroup.tsx` | 그룹 컴포넌트, 정렬 가능한 카드 컨테이너 |
| `DropZoneOverlay.tsx` | 드롭 영역 오버레이 |
| `index.ts` | Export |

**사용:**
```typescript
import { BoardCanvas, SortableGroup } from '@/src/views/board';
```

#### 3.3.2 `views/task/` - 태스크 UI

| 파일 | 역할 |
|------|------|
| `TaskCard.tsx` | 포스트잇 스타일 태스크 카드 |
| `TaskDetailModal.tsx` | 태스크 상세 모달 (댓글, 파일, 날짜 등) |
| `index.ts` | Export |

**사용:**
```typescript
import { TaskCard, TaskDetailModal } from '@/src/views/task';
```

#### 3.3.3 `views/calendar/` - 캘린더 뷰

```typescript
import { CalendarView } from '@/src/views/calendar';

<CalendarView tasks={tasks} onTaskSelect={handleTaskSelect} />
```

#### 3.3.4 `views/timeline/` - 타임라인 뷰

```typescript
import { TimelineView } from '@/src/views/timeline';

<TimelineView tasks={tasks} onTaskSelect={handleTaskSelect} />
```

#### 3.3.5 `views/profile/` - 프로필/설정

| 파일 | 역할 |
|------|------|
| `ProfileCard.tsx` | 프로필 카드 (이미지/이름 수정) |
| `ActivityList.tsx` | 활동 로그 리스트 |
| `SettingsView.tsx` | 설정 화면 (프로필 탭 + 환경설정 탭) |
| `MyPageView.tsx` | 마이페이지 메인 뷰 |
| `index.ts` | Export |

**사용:**
```typescript
import { ProfileCard, SettingsView, ActivityList } from '@/src/views/profile';
```

#### 3.3.6 `views/dock/` - 하단 독바

| 파일 | 역할 |
|------|------|
| `Dock.tsx` | macOS 스타일 하단 독 (뷰 전환, 음성채팅, 멤버) |
| `DockButton.tsx` | 독 버튼 컴포넌트 |
| `FileListPanel.tsx` | 프로젝트 파일 목록 패널 (업로드, 삭제, 드래그&드롭) |
| `index.ts` | Export |

**사용:**
```typescript
import { Dock, DockButton, FileListPanel } from '@/src/views/dock';
```

#### 3.3.7 `views/common/` - 공통 UI

| 파일 | 역할 |
|------|------|
| `Mascot.tsx` | 마스코트 컴포넌트 |
| `FileVersionDropdown.tsx` | 파일 버전 히스토리 드롭다운 (Portal 기반) |
| `index.ts` | Export |

**사용:**
```typescript
import { Mascot, FileVersionDropdown } from '@/src/views/common';
```

---

### 3.4 `containers/` - 컨트롤러 레이어

#### 3.4.1 `containers/screens/` - 화면 컨트롤러

각 Screen은 **상태 관리 + API 호출 + View 조합**을 담당합니다.

| 파일 | 역할 | 주요 기능 |
|------|------|-----------|
| `LoginScreen.tsx` | 로그인 화면 | 로그인 폼, 인증 처리 |
| `SignupScreen.tsx` | 회원가입 화면 | 회원가입 폼, 이메일 검증 |
| `VerifyEmailScreen.tsx` | 이메일 인증 화면 | 인증 코드 입력 |
| `VerifySuccessScreen.tsx` | 인증 완료 화면 | 성공 메시지 |
| `WorkspaceListScreen.tsx` | 워크스페이스 목록 | 워크스페이스 선택/생성/삭제 |
| `ProjectSelectScreen.tsx` | 프로젝트 선택 | 프로젝트 목록, 프로필, 설정 |
| `BoardScreen.tsx` | 보드 메인 화면 | 캔버스, 뷰 전환, 태스크 CRUD |
| `index.ts` | 통합 Export | 모든 Screen re-export |

**사용:**
```typescript
import {
    LoginScreen,
    SignupScreen,
    WorkspaceListScreen,
    ProjectSelectScreen,
    BoardScreen,
} from '@/src/containers/screens';
```

#### 3.4.2 `containers/hooks/` - 비즈니스 로직 Hooks

**`hooks/common/` - 공통 Hooks**

| 파일 | 역할 |
|------|------|
| `useVoiceChat.ts` | WebRTC 음성 채팅 (참여/퇴장, 음소거) |
| `useDragAndDrop.ts` | 범용 드래그 앤 드롭 로직 |
| `index.ts` | Export |

**`hooks/board/` - 보드 전용 Hooks**

| 파일 | 역할 |
|------|------|
| `useSortableGrid.ts` | 그룹 내 카드 정렬 로직 |
| `index.ts` | Export |

**사용:**
```typescript
import { useVoiceChat, useDragAndDrop } from '@/src/containers/hooks/common';
import { useSortableGrid } from '@/src/containers/hooks/board';
```

---

## 4. 핵심 기능

### 4.1 무한 캔버스 보드

| 기능 | 설명 |
|------|------|
| **드래그 앤 드롭** | 포스트잇 스타일 태스크 카드 자유 배치 |
| **연결선** | 태스크 간 관계 시각화 (Bezier/Straight, Solid/Dashed) |
| **연결선 호버 피드백** | 마우스 위치 기반 가까운 끝점 하이라이트 |
| **그룹핑** | 여러 카드를 그룹으로 묶기 (`Ctrl + Drag`로 선택 후 `C`) |
| **우클릭 팬** | 우클릭 + 드래그로 캔버스 이동 |
| **스냅 투 그리드** | 정렬 도우미 |
| **파일 카드** | 파일 업로드 → 캔버스에 파일 카드 생성 |
| **카드 드래그 Threshold** | 8px 이상 이동 시 드래그 시작 (클릭과 구분) |

### 4.2 다중 뷰 모드

| 뷰 | 컴포넌트 | 설명 |
|------|------|------|
| **Board** | `BoardCanvas` | 무한 캔버스 (기본) |
| **Calendar** | `CalendarView` | 월별 캘린더 뷰 |
| **Timeline** | `TimelineView` | 간트 차트 스타일 타임라인 |
| **Settings** | `SettingsView` | 프로필 설정 + 환경설정 |

### 4.3 파일 관리 시스템

| 기능 | 설명 |
|------|------|
| **파일 목록 패널** | Dock 파일 버튼으로 토글, 프로젝트 파일 목록 표시 |
| **파일 업로드** | 드래그&드롭 또는 버튼 클릭으로 업로드 |
| **네이티브 파일 드롭** | 바탕화면에서 캔버스로 직접 파일 드래그 앤 드롭 |
| **카드에 파일 드롭** | 파일을 카드 위에 드롭하면 업로드 + 카드에 첨부 |
| **배경에 파일 드롭** | 파일을 캔버스 배경에 드롭하면 프로젝트 파일로 업로드 + 파일 패널 열림 |
| **버전 관리** | 동일 파일명 업로드 시 자동 버전 업데이트 (v1, v2, ...) |
| **버전 히스토리** | 다운로드 버튼 클릭 시 버전 목록에서 원하는 버전 선택 |
| **카드 첨부** | 파일을 카드 위로 드래그하여 첨부 |
| **파일 연결 해제** | 카드 상세에서 첨부 파일 연결 해제 |

```
┌─────────────────────┐     ┌──────────────────┐
│ 프로젝트 파일       │     │ 버전 히스토리     │
│                     │     │                  │
│ 📄 기획서.pdf  [⬇]──┼────►│ v3 (최신) 1.2MB  │
│ 📄 시안.png   [⬇]  │     │ v2 - 1.0MB       │
│ 📄 회의록.docx [⬇] │     │ v1 - 0.8MB       │
└─────────────────────┘     └──────────────────┘
```

### 4.4 실시간 음성 채팅 (WebRTC)

```
┌─────────────┐     WebSocket      ┌──────────────┐
│   Client A  │ ◄─────────────────► │ Signal Server│
└──────┬──────┘                     └──────┬───────┘
       │                                   │
       │  Offer/Answer/ICE                 │
       │◄──────────────────────────────────┤
       │                                   │
       │         P2P Audio Stream          │
       │◄─────────────────────────────────►│
       │                                   │
┌──────▼──────┐                     ┌──────▼───────┐
│   Client B  │ ◄─────────────────► │ Signal Server│
└─────────────┘     WebSocket       └──────────────┘
```

**기능:**
- 음성 채널 참여/퇴장
- 마이크 음소거 (Mute)
- 스피커 음소거 (Deafen)
- 현재 음성 채팅 참여자 표시

### 4.5 인증 & 권한

| 기능 | 설명 |
|------|------|
| **학교 이메일 인증** | `@jj.ac.kr` 도메인 검증 |
| **쿠키 기반 세션** | `credentials: 'include'` |
| **워크스페이스 멤버십** | 초대 링크 기반 팀 구성 |

---

## 5. 타입 시스템

### 5.1 주요 타입 (models/types/index.ts)

```typescript
// 사용자
interface User {
    id: number;
    email: string;
    name: string;
    is_student_verified?: boolean;
    profile_image?: string | null;
}

// 워크스페이스 & 프로젝트
interface Workspace {
    id: number;
    name: string;
    description: string;
    owner_id: number;
    projects: Project[];
}

interface Project {
    id: number;
    name: string;
    workspace: string;
    workspace_id?: number;
    role: string;
    progress: number;
    memberCount: number;
}

// 태스크
interface Task {
    id: number;
    title: string;
    status: TaskStatus;  // 'inbox' | 'todo' | 'doing' | 'in-progress' | 'done'
    content?: string;
    x: number;
    y: number;
    boardId: number;
    column_id?: number;
    tags?: Tag[];
    comments?: Comment[];
    files?: TaskFile[];
    assignees?: Assignee[];
}

// 연결선
interface Connection {
    id: number;
    from: number;
    to: number;
    shape?: 'bezier' | 'straight';
    style?: 'solid' | 'dashed';
    sourceHandle?: 'left' | 'right';
    targetHandle?: 'left' | 'right';
}

// 그룹
interface Group {
    id: number;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    localX?: number;     // 백엔드 저장 위치 (새로고침 시 복원용)
    localY?: number;     // 백엔드 저장 위치 (새로고침 시 복원용)
    parentId?: number | null;
    depth: number;
    collapsed?: boolean;
    projectId: number;
}
```

---

## 6. 개발 가이드

### 6.1 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env.local 생성)
NEXT_PUBLIC_API_URL=http://localhost:9000/api
NEXT_PUBLIC_WS_URL=ws://localhost:9000
NEXT_PUBLIC_USE_MOCK=false

# 3. 개발 서버 실행
npm run dev

# 4. 빌드
npm run build
```

### 6.2 Import 경로 규칙

프로젝트는 `@/src/` alias를 사용합니다:

```typescript
// Models (데이터/API)
import { getTasks, createTask } from '@/src/models/api';
import type { Task, User } from '@/src/models/types';
import { getStickyStyle } from '@/src/models/utils/canvas';

// Views (UI 컴포넌트)
import { BoardCanvas } from '@/src/views/board';
import { TaskCard, TaskDetailModal } from '@/src/views/task';
import { CalendarView } from '@/src/views/calendar';
import { TimelineView } from '@/src/views/timeline';
import { ProfileCard, SettingsView } from '@/src/views/profile';
import { Dock } from '@/src/views/dock';
import { Mascot } from '@/src/views/common';

// Containers (Screens & Hooks)
import { BoardScreen, LoginScreen } from '@/src/containers/screens';
import { useVoiceChat } from '@/src/containers/hooks/common';
import { useSortableGrid } from '@/src/containers/hooks/board';
```

### 6.3 새 기능 추가 방법

#### Step 1: 타입 정의 (`models/types/index.ts`)
```typescript
export interface NewFeature {
    id: number;
    name: string;
}
```

#### Step 2: API 함수 작성 (`models/api/new-feature.ts`)
```typescript
import { API_CONFIG, apiFetch, mockDelay } from './config';
import type { NewFeature } from '../types';

export async function getNewFeatures(): Promise<NewFeature[]> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(200);
        return [{ id: 1, name: 'Mock Feature' }];
    }
    return apiFetch<NewFeature[]>('/new-features');
}
```

#### Step 3: Export 추가 (`models/api/index.ts`)
```typescript
export { getNewFeatures } from './new-feature';
```

#### Step 4: View 컴포넌트 작성 (`views/new-feature/NewFeatureCard.tsx`)
```typescript
'use client';

import React from 'react';
import type { NewFeature } from '@/src/models/types';

interface Props {
    feature: NewFeature;
    onClick: (feature: NewFeature) => void;
}

export function NewFeatureCard({ feature, onClick }: Props) {
    return (
        <div onClick={() => onClick(feature)}>
    {feature.name}
    </div>
);
}
```

#### Step 5: index.ts 작성 (`views/new-feature/index.ts`)
```typescript
export { NewFeatureCard } from './NewFeatureCard';
```

#### Step 6: Screen에서 조합 (`containers/screens/SomeScreen.tsx`)
```typescript
import { getNewFeatures } from '@/src/models/api';
import { NewFeatureCard } from '@/src/views/new-feature';

// Screen에서 데이터 fetch + View 렌더링
```

### 6.4 컴포넌트 개발 패턴

#### 낙관적 UI 업데이트 (Optimistic Update)
```typescript
const handleCreateTask = async (taskData: Partial<Task>) => {
    // 1. 즉시 UI 업데이트 (임시 ID)
    const tempTask = { ...taskData, id: Date.now() } as Task;
    setTasks(prev => [...prev, tempTask]);

    try {
        // 2. 실제 API 호출
        const savedTask = await createTask(projectId, taskData);

        // 3. 실제 데이터로 교체
        setTasks(prev => prev.map(t =>
            t.id === tempTask.id ? savedTask : t
        ));
    } catch (err) {
        // 4. 실패 시 롤백
        setTasks(prev => prev.filter(t => t.id !== tempTask.id));
        console.error('Failed to create task:', err);
    }
};
```

#### View와 Controller 분리 원칙
```typescript
// View: 순수 UI만 (props로 모든 것을 받음)
// views/task/TaskCard.tsx
export function TaskCard({ task, onClick, onDelete }: TaskCardProps) {
    return (
        <div onClick={() => onClick(task)}>
    {task.title}
    <button onClick={() => onDelete(task.id)}>Delete</button>
    </div>
);
}

// Controller: 상태 관리 + API 호출
// containers/screens/BoardScreen.tsx
export function BoardScreen({ project }) {
    const [tasks, setTasks] = useState<Task[]>([]);

    const handleTaskClick = (task: Task) => { /* ... */ };
    const handleTaskDelete = async (taskId: number) => {
        await deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    return (
        <TaskCard
            task={task}
    onClick={handleTaskClick}
    onDelete={handleTaskDelete}
    />
);
}
```

---

## 7. 환경 설정

### 7.1 환경 변수 (`.env.local`)

```bash
# API 서버 주소
NEXT_PUBLIC_API_URL=http://localhost:9000/api

# WebSocket 서버 주소 (음성 채팅 시그널링)
NEXT_PUBLIC_WS_URL=ws://localhost:9000

# Mock 모드 (개발용) - true면 백엔드 없이 UI 개발 가능
NEXT_PUBLIC_USE_MOCK=false

# 선택 사항
NEXT_PUBLIC_FILE_UPLOAD_MAX_SIZE=10485760  # 10MB
```

### 7.2 TypeScript 설정 (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 7.3 Tailwind 설정 (`app/globals.css`)

```css
@import "tailwindcss";

:root {
    --bg-primary: #f5f5f7;
    --accent: #0071e3;
    --domo-primary: #3b82f6;
    --domo-highlight: #8b5cf6;
}

.dark {
    --bg-primary: #000000;
    --accent: #0a84ff;
}

/* Glass morphism */
.glass-panel {
    @apply bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-xl;
}

.glass-card {
    @apply bg-white/60 dark:bg-[#1c1c1e]/60 backdrop-blur-lg
    border border-white/20 dark:border-white/10;
}
```

---

## 8. 배포

### 8.1 프로덕션 빌드

```bash
# 빌드
npm run build

# 로컬 프로덕션 테스트
npm run start
```

### 8.2 Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

**환경 변수 설정** (Vercel Dashboard):
- `NEXT_PUBLIC_API_URL`: 프로덕션 API 서버 주소
- `NEXT_PUBLIC_WS_URL`: 프로덕션 WebSocket 서버 주소
- `NEXT_PUBLIC_USE_MOCK`: `false`

---

## 9. 트러블슈팅

### Q: "Module not found: Can't resolve '@/src/...'"
**A:** `tsconfig.json`의 `paths` 설정 확인
```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  }
}
```

### Q: Import 경로가 헷갈림
**A:** 다음 규칙을 따르세요:
- 데이터/API → `@/src/models/...`
- UI 컴포넌트 → `@/src/views/...`
- 화면/Hooks → `@/src/containers/...`

### Q: API 호출 시 CORS 에러
**A:** 백엔드에서 CORS 허용 설정 필요
```python
# FastAPI 예시
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Q: 쿠키가 전송되지 않음
**A:** `credentials: 'include'` 확인 (`models/api/config.ts`의 `apiFetch`)

### Q: Mock 모드가 적용 안 됨
**A:** `.env.local` 파일 수정 후 **서버 재시작 필수**

### Q: 음성 채팅이 연결되지 않음
**A:**
- WebSocket URL 확인 (`NEXT_PUBLIC_WS_URL`)
- STUN 서버 접근 가능 여부 확인
- 브라우저 마이크 권한 허용 확인

### Q: View와 Screen 중 어디에 코드를 작성해야 하나요?
**A:**
- **View**: 순수 UI만 (props → 렌더링). 상태 관리 X, API 호출 X
- **Screen**: 상태 관리, API 호출, 이벤트 핸들링, View 조합

### Q: 그룹 위치가 새로고침 시 초기화됨
**A:** `board.ts` API에서 백엔드가 반환하는 `localX`, `localY` 필드를 보존해야 함. 프론트에서 위치를 재계산하면 안 됨.

### Q: 연결선 호버 피드백이 안 보임
**A:** SVG z-index(z-10)가 카드(z-20)보다 낮아 가려짐. 호버된 끝점을 별도 레이어(z-30)에 렌더링하여 해결.

### Q: 파일 드롭 시 브라우저가 파일을 열어버림
**A:** 캔버스 컨테이너에 `onDragOver`, `onDrop` 이벤트에서 `e.preventDefault()` 호출 필요.

### Q: 카드 클릭 시 의도치 않게 드래그가 시작됨
**A:** 카드 드래그에 threshold(8px) 적용. 8px 이상 이동해야 드래그 시작, 그 전에 놓으면 클릭으로 처리.

---

## 참고 문서

- [Next.js App Router](https://nextjs.org/docs/app)
- [React 19 Docs](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 라이선스

MIT License

---

## Contributors

- Team DOMO

---

## 개발 상태

### 완료된 기능 (2025-01-25)
- [x] 그룹 위치 백엔드 저장/복원
- [x] 연결선 호버 시 끝점 피드백
- [x] 우클릭 캔버스 팬
- [x] 네이티브 파일 드롭 (카드/배경)
- [x] 카드 드래그 threshold

### 진행 중
- [ ] 온라인 멤버 실시간 표시 (SSE 백엔드 대기)

### 예정
- [ ] 낙관적 UI 업데이트 (성능 최적화)

---

**Last Updated**: 2025-01-25