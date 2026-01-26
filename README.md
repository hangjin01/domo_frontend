# DOMO - Collaborative Workspace Platform

캔버스 기반의 실시간 협업 워크스페이스 플랫폼. 태스크 보드, 파일 공유, 음성 채팅을 하나의 인터페이스에서 제공한다.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Getting Started](#2-getting-started)
3. [Project Architecture](#3-project-architecture)
4. [Key Features and Patterns](#4-key-features-and-patterns)
5. [Convention](#5-convention)
6. [Code Quality Status](#6-code-quality-status)

---

## 1. Project Overview

### 프로젝트 소개

DOMO는 팀 협업을 위한 웹 기반 워크스페이스 플랫폼이다. 사용자는 무한 캔버스 위에서 태스크 카드를 자유롭게 배치하고, 드래그 앤 드롭으로 그룹화하며, 실시간으로 팀원과 협업할 수 있다.

### Tech Stack

| Category | Technology | Version | Description |
|----------|------------|---------|-------------|
| **Runtime** | Node.js | 22.15.0+ | JavaScript 런타임 |
| **Framework** | Next.js | 16.1.3 | App Router 기반 React 프레임워크 |
| **Language** | TypeScript | 5.x | 정적 타입 시스템 (Strict Mode) |
| **UI Library** | React | 19.x | 컴포넌트 기반 UI |
| **Styling** | Tailwind CSS | 4.x | 유틸리티 기반 CSS |
| **Icons** | Lucide React | 0.562.0 | 아이콘 라이브러리 |
| **Backend** | FastAPI | - | Python 기반 REST API (별도 저장소) |
| **Real-time** | WebSocket / WebRTC | - | 시그널링 및 P2P 음성 채팅 |

### Project Stats

| Metric | Value |
|--------|-------|
| 총 TypeScript 파일 | 64개 |
| 총 코드 라인 | 16,258줄 |
| containers/ | 13개 파일 |
| views/ | 28개 파일 |
| models/ | 19개 파일 |

---

## 2. Getting Started

### 2.1 Prerequisites

```bash
# Node.js 버전 확인 (22.15.0 이상 권장)
node -v

# npm 버전 확인
npm -v
```

### 2.2 Installation

```bash
# 1. 저장소 클론
git clone <repository-url>
cd domo_front

# 2. 의존성 설치
npm install
```

### 2.3 Environment Variables

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 내용을 설정한다.

```bash
# .env.local

# API 서버 URL (FastAPI 백엔드)
NEXT_PUBLIC_API_URL=https://api.example.com

# WebSocket 서버 URL (음성 채팅용)
NEXT_PUBLIC_WS_URL=wss://ws.example.com

# Mock 데이터 사용 여부 (개발 시 true, 운영 시 false)
NEXT_PUBLIC_USE_MOCK=true
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | FastAPI 백엔드 API 엔드포인트 |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket 시그널링 서버 (음성 채팅용) |
| `NEXT_PUBLIC_USE_MOCK` | No | `true` 설정 시 Mock 데이터 사용 |

### 2.4 Run Development Server

```bash
# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 린트 검사
npm run lint

# 타입 검사
npx tsc --noEmit
```

---

## 3. Project Architecture

### 3.1 Design Pattern: Views - Containers - Models

프로젝트는 관심사 분리(Separation of Concerns) 원칙에 따라 3-Layer 아키텍처를 적용한다.

```
┌─────────────────────────────────────────────────────────────┐
│                        app/ (Entry Point)                   │
│                    Next.js App Router                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     containers/ (Logic Layer)               │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │    screens/     │    │          hooks/             │    │
│  │  (Page Units)   │◄───│   (Business Logic Hooks)    │    │
│  └─────────────────┘    └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│   views/ (UI Layer) │    │       models/ (Data Layer)      │
│  Presentational     │    │  ┌───────┐ ┌─────┐ ┌─────────┐ │
│  Components         │    │  │  api/ │ │types│ │constants│ │
│  (Props Only)       │    │  └───────┘ └─────┘ └─────────┘ │
└─────────────────────┘    └─────────────────────────────────┘
```

### 3.2 Data Flow Chain

```
app/page.tsx
    │
    ├── [인증 전] LoginScreen / SignupScreen / VerifyEmailScreen
    │
    ├── [인증 후] WorkspaceListScreen
    │       └── getWorkspaces() → models/api/workspace.ts
    │
    ├── [워크스페이스 선택] ProjectSelectScreen
    │       └── getProjects() → models/api/workspace.ts
    │
    └── [프로젝트 선택] BoardScreen (920 lines)
            │
            ├── loadProjectData()
            │   ├── getTasks() ──────────┐
            │   ├── getConnections() ────┼── models/api/board.ts
            │   └── getColumns() ────────┘
            │
            ├── handleTaskCreate/Update/Delete
            │   └── createTask/updateTask/deleteTask → models/api/board.ts
            │
            └── BoardCanvas (1830 lines)
                    │
                    ├── usePendingSync (Optimistic UI)
                    │   └── batchUpdateCardPositions → models/api/board.ts
                    │
                    └── useSortableGrid (Drag & Drop)
                        └── calculateShiftTransitions / updateDrag / endDrag
```

### 3.3 Directory Structure

```
src/
├── app/                          # Next.js App Router (진입점)
│   ├── page.tsx                  #   메인 라우트 (인증 상태별 화면 분기)
│   ├── layout.tsx                #   루트 레이아웃
│   └── globals.css               #   전역 스타일 + 다크모드
│
├── containers/                   # [Logic Layer] 상태 관리 및 비즈니스 로직
│   ├── screens/                  #   화면 단위 컨트롤러
│   │   ├── BoardScreen.tsx       #     메인 보드 화면 (920 lines)
│   │   ├── LoginScreen.tsx       #     로그인 화면
│   │   ├── SignupScreen.tsx      #     회원가입 화면
│   │   ├── ProjectSelectScreen.tsx    프로젝트 선택 화면 (837 lines)
│   │   ├── WorkspaceListScreen.tsx    워크스페이스 목록 화면 (421 lines)
│   │   ├── VerifyEmailScreen.tsx #     이메일 인증 화면
│   │   └── VerifySuccessScreen.tsx    인증 완료 화면
│   │
│   └── hooks/                    #   재사용 가능한 비즈니스 로직
│       ├── common/               #     공통 Hooks
│       │   ├── usePendingSync.ts #       Optimistic UI + Batch API (641 lines)
│       │   └── useVoiceChat.ts   #       WebRTC 음성 채팅 (313 lines)
│       └── board/                #     보드 전용 Hooks
│           └── useSortableGrid.ts#       드래그 앤 드롭 그리드 (587 lines)
│
├── views/                        # [UI Layer] 순수 프레젠테이션 컴포넌트
│   ├── board/                    #   캔버스 보드 UI
│   │   ├── BoardCanvas.tsx       #     메인 캔버스 (1830 lines)
│   │   ├── SortableGroup.tsx     #     그룹 컴포넌트 (321 lines)
│   │   └── SyncStatusIndicator.tsx    동기화 상태 표시기
│   ├── task/                     #   태스크 관련 UI
│   │   ├── TaskCard.tsx          #     태스크 카드 (534 lines)
│   │   └── TaskDetailModal.tsx   #     태스크 상세 모달 (609 lines)
│   ├── calendar/                 #   캘린더 뷰
│   │   └── CalendarView.tsx
│   ├── timeline/                 #   타임라인 뷰
│   │   └── TimelineView.tsx
│   ├── profile/                  #   프로필/설정
│   │   ├── ProfileCard.tsx
│   │   ├── MyPageView.tsx
│   │   ├── SettingsView.tsx      #     설정 화면 (312 lines)
│   │   └── ActivityList.tsx
│   ├── dock/                     #   하단 독바
│   │   ├── Dock.tsx
│   │   ├── DockButton.tsx
│   │   └── FileListPanel.tsx
│   ├── community/                #   커뮤니티 게시판
│   │   ├── CommunityBoard.tsx
│   │   ├── PostList.tsx
│   │   ├── PostDetail.tsx        #     게시글 상세 (345 lines)
│   │   └── PostWriter.tsx
│   └── common/                   #   공통 UI 컴포넌트
│       ├── Mascot.tsx            #     마스코트 애니메이션
│       └── FileVersionDropdown.tsx    파일 버전 선택
│
├── models/                       # [Data Layer] 데이터 정의 및 API
│   ├── api/                      #   API 통신 함수
│   │   ├── config.ts             #     API 설정 (apiFetch wrapper)
│   │   ├── auth.ts               #     인증 API
│   │   ├── board.ts              #     보드/태스크/연결선 API (1155 lines)
│   │   ├── workspace.ts          #     워크스페이스 API (568 lines)
│   │   ├── file.ts               #     파일 업로드 API
│   │   ├── user.ts               #     사용자 API
│   │   ├── post.ts               #     게시글 API
│   │   ├── activity.ts           #     활동 로그 API
│   │   ├── schedule.ts           #     일정 API
│   │   ├── mappers.ts            #     API 응답 변환기 (328 lines)
│   │   └── mock-data.ts          #     개발용 Mock 데이터 (603 lines)
│   ├── types/                    #   TypeScript 타입 정의
│   │   └── index.ts              #     모든 인터페이스/타입 (433 lines)
│   ├── constants/                #   상수 정의
│   │   └── grid.ts               #     그리드 레이아웃 상수
│   └── utils/                    #   유틸리티 함수
│       ├── canvas.ts             #     캔버스 계산 유틸
│       ├── groupLayout.ts        #     그룹 레이아웃 계산 (350 lines)
│       └── image.ts              #     이미지 처리 유틸
│
└── lib/                          # [Legacy] 마이그레이션 대기 (향후 삭제 예정)
    ├── api/mock-data.ts          #     → models/api/mock-data.ts로 이전 완료
    └── contexts/UserContext.tsx  #     → 미사용 (삭제 예정)
```

### 3.4 Layer Responsibilities

| Layer | Directory | Responsibility | Example |
|-------|-----------|----------------|---------|
| **Views** | `views/` | 순수 UI 렌더링. Props만 받아서 화면에 표시. 상태 관리 금지. | `TaskCard.tsx`, `CalendarView.tsx` |
| **Containers** | `containers/` | 상태 관리, API 호출 조율, 이벤트 핸들링. Views와 Models 연결. | `BoardScreen.tsx`, `usePendingSync.ts` |
| **Models** | `models/` | 데이터 구조 정의, API 통신, 순수 유틸리티 함수. UI 로직 금지. | `api/board.ts`, `types/index.ts` |

### 3.5 File Placement Guidelines

새로운 파일을 추가할 때 아래 기준을 따른다.

| 파일 유형 | 배치 위치 | 판단 기준 |
|-----------|-----------|-----------|
| UI 컴포넌트 (Props Only) | `views/<domain>/` | `useState`, `useEffect` 없이 props만으로 렌더링 가능한가? |
| 화면 컨트롤러 | `containers/screens/` | 여러 컴포넌트를 조합하고 상태를 관리하는가? |
| 재사용 로직 | `containers/hooks/` | 여러 화면에서 공유되는 상태/로직인가? |
| API 함수 | `models/api/` | 서버와 통신하는 함수인가? |
| 타입 정의 | `models/types/` | 인터페이스 또는 타입 선언인가? |
| 순수 함수 | `models/utils/` | 입력값만으로 출력이 결정되는 순수 함수인가? |

---

## 4. Key Features and Patterns

### 4.1 Optimistic UI Pattern

사용자 경험 향상을 위해 API 응답을 기다리지 않고 즉시 UI를 업데이트한다.

```
[사용자 액션] → [즉시 UI 업데이트] → [백그라운드 API 호출] → [실패 시 롤백]
```

**구현 위치:** `src/containers/hooks/common/usePendingSync.ts`

```typescript
// 사용 예시
const { queueChange, syncStatus, pendingCount } = usePendingSync({
  debounceMs: 400,      // 연속 드래그 대응
  maxRetries: 3,        // 실패 시 최대 3회 재시도
  onRollback: (change) => {
    // 실패 시 이전 상태로 복원
    revertToSnapshot(change.snapshot);
  }
});

// 카드 위치 변경 시
queueChange({
  type: 'card-position',
  entityId: taskId,
  payload: { x: newX, y: newY },
  snapshot: { x: oldX, y: oldY },  // 롤백용 스냅샷
  apiCall: () => updateTaskPosition(taskId, newX, newY)
});
```

**개발 시 주의사항:**
- 모든 변경 사항에 `snapshot`을 반드시 포함하여 롤백 가능하게 할 것
- 네트워크 오류 시 사용자에게 `SyncStatusIndicator`로 상태를 표시할 것

### 4.2 Batch API Pattern

다수의 카드를 동시에 이동할 때 (예: 그룹 생성) 개별 API 호출 대신 일괄 처리한다.

```
[개별 호출]  PUT /tasks/1  →  PUT /tasks/2  →  PUT /tasks/3  (3회 호출)
[Batch 호출] PUT /tasks/batch  { items: [task1, task2, task3] }  (1회 호출)
```

**구현 위치:** `src/containers/hooks/common/usePendingSync.ts`

```typescript
// Batch 사용 예시
const { queueBatchChange } = usePendingSync({ ... });

// 그룹 생성 시 여러 카드를 한 번에 업데이트
queueBatchChange([
  { entityId: 1, payload: { x: 100, y: 100, column_id: groupId }, snapshot: { ... } },
  { entityId: 2, payload: { x: 200, y: 100, column_id: groupId }, snapshot: { ... } },
  { entityId: 3, payload: { x: 100, y: 200, column_id: groupId }, snapshot: { ... } },
]);
```

**성능 개선 효과:**
- API 호출 횟수: N회 → 1회
- 네트워크 오버헤드 감소
- 트랜잭션 일관성 보장 (전체 성공 또는 전체 롤백)

### 4.3 Ref Pattern for Performance Optimization

고빈도 이벤트 핸들러(드래그, 키보드)에서 불필요한 함수 재생성을 방지한다.

**문제 상황:**
```typescript
// Bad: tasks가 변경될 때마다 handleDelete가 재생성됨
const handleDelete = useCallback(() => {
  onTasksUpdate(tasks.filter(t => !selected.has(t.id)));
}, [tasks, selected, onTasksUpdate]);  // tasks 의존성으로 인한 재생성
```

**해결 패턴:**
```typescript
// Good: tasksRef를 사용하여 의존성 제거
const tasksRef = useRef(tasks);
useEffect(() => { tasksRef.current = tasks; }, [tasks]);

const handleDelete = useCallback(() => {
  onTasksUpdate(tasksRef.current.filter(t => !selected.has(t.id)));
}, [selected, onTasksUpdate]);  // tasks 의존성 제거됨
```

**구현 위치:** `src/views/board/BoardCanvas.tsx`

**적용 대상:**
- `tasksRef`: 태스크 배열 참조
- `connectionsRef`: 연결선 배열 참조
- `groupsRef`: 그룹 배열 참조

**주의사항:**
- `tasksRef.current`는 로직 참조용으로만 사용할 것
- JSX 렌더링에는 반드시 `tasks` props를 직접 사용할 것
- 상태 변경은 반드시 `onTasksUpdate()` 등 setter를 통해 수행할 것

### 4.4 Drag and Drop Grid System

카드와 그룹의 드래그 앤 드롭을 처리하는 그리드 시스템이다.

**구현 위치:** `src/containers/hooks/board/useSortableGrid.ts`

**주요 기능:**
- 그리드 기반 위치 계산 (스냅 투 그리드)
- 드롭 프리뷰 표시
- 카드 밀어내기 애니메이션
- 그룹 간 카드 이동

```typescript
const {
  dragContext,      // 현재 드래그 상태
  dropPreview,      // 드롭 위치 프리뷰
  startDrag,        // 드래그 시작
  updateDrag,       // 드래그 중 위치 업데이트
  endDrag,          // 드래그 종료
  cancelDrag,       // 드래그 취소 (ESC)
} = useSortableGrid({ tasks, groups, gridConfig, onTasksUpdate, onGroupsUpdate });
```

---

## 5. Convention

### 5.1 Git Branch Strategy

```
main                 # 프로덕션 배포 브랜치
  └── develop        # 개발 통합 브랜치
        ├── feature/board-optimization    # 기능 개발
        ├── feature/voice-chat            # 기능 개발
        ├── fix/drag-drop-bug             # 버그 수정
        └── refactor/batch-api            # 리팩토링
```

| Branch | Purpose | Merge Target |
|--------|---------|--------------|
| `main` | 프로덕션 배포용. 직접 커밋 금지. | - |
| `develop` | 개발 통합. 다음 릴리스 준비. | `main` |
| `feature/*` | 새 기능 개발 | `develop` |
| `fix/*` | 버그 수정 | `develop` |
| `refactor/*` | 코드 개선 (기능 변경 없음) | `develop` |
| `hotfix/*` | 긴급 프로덕션 버그 수정 | `main`, `develop` |

### 5.2 Commit Message Convention

Conventional Commits 형식을 따른다.

```
<type>: <subject>

<body>
```

**Type 목록:**

| Type | Description | Example |
|------|-------------|---------|
| `feat` | 새로운 기능 추가 | `feat: Add batch API for card position update` |
| `fix` | 버그 수정 | `fix: Resolve drag preview position offset` |
| `refactor` | 코드 리팩토링 (기능 변경 없음) | `refactor: Extract useBoardData hook from BoardScreen` |
| `perf` | 성능 개선 | `perf: Apply tasksRef pattern to reduce re-renders` |
| `style` | 코드 포맷팅 (세미콜론, 들여쓰기 등) | `style: Format BoardCanvas with Prettier` |
| `docs` | 문서 수정 | `docs: Update README with architecture diagram` |
| `test` | 테스트 추가/수정 | `test: Add unit tests for usePendingSync` |
| `chore` | 빌드, 설정 파일 수정 | `chore: Update ESLint configuration` |

**Commit Message 예시:**

```bash
# 기능 추가
git commit -s -m "feat: Implement optimistic UI for card deletion" -m "- Add snapshot for rollback support
- Integrate with usePendingSync hook
- Display error state in SyncStatusIndicator"

# 버그 수정
git commit -s -m "fix: Prevent stale ref access in cleanup function" -m "- Copy ref values at effect start
- Resolves exhaustive-deps lint warning"

# 성능 개선
git commit -s -m "perf: Reduce event listener re-registration in BoardCanvas" -m "- Use tasksRef instead of tasks in useCallback deps
- Remove tasks from useEffect dependency array"
```

### 5.3 Code Style

**Import 순서:**

```typescript
// 1. React/Next.js
import { useState, useCallback, useRef, useEffect } from 'react';

// 2. External Libraries
import { Camera, Trash2 } from 'lucide-react';

// 3. Internal: Models
import { getTasks, createTask } from '@/src/models/api';
import type { Task, Connection } from '@/src/models/types';

// 4. Internal: Containers
import { usePendingSync } from '@/src/containers/hooks/common';

// 5. Internal: Views
import { TaskCard } from '@/src/views/task';
```

**Naming Convention:**

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `BoardCanvas`, `TaskCard` |
| Hook | camelCase with `use` prefix | `usePendingSync`, `useSortableGrid` |
| Function | camelCase | `handleDragEnd`, `calculatePosition` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `GRID_SIZE` |
| Type/Interface | PascalCase | `Task`, `ConnectionProps` |
| File (Component) | PascalCase.tsx | `BoardCanvas.tsx` |
| File (Hook) | camelCase.ts | `usePendingSync.ts` |
| File (Util) | camelCase.ts | `groupLayout.ts` |

---

## 6. Code Quality Status

### 6.1 Current Status (2026-01-27)

| Check | Status | Note |
|-------|--------|------|
| TypeScript Compilation | PASS | 에러 0개 |
| Git Conflict Markers | PASS | 충돌 마커 없음 |
| Import Path Integrity | PASS | 잘못된 경로 없음 |
| Circular Dependencies | PASS | 순환 참조 없음 |
| Legacy Folder Cleanup | PASS | `app/components/` 삭제 완료 |

### 6.2 Known Warnings (Non-blocking)

아래 항목들은 배포를 막지 않는 경고 수준이다.

| Category | Item | Priority |
|----------|------|----------|
| **Unused Imports** | `CARD_WIDTH`, `CARD_HEIGHT` in BoardScreen.tsx | Low |
| **Unused Variables** | `draggingFile`, `uploadingCardId` in BoardScreen.tsx | Low |
| **Tailwind Suggestion** | `rounded-[2rem]` → `rounded-4xl` | Low |
| **Next.js Warning** | `<img>` → `<Image />` 권장 | Low |

### 6.3 Architecture Compliance

```
models/ → views/ 참조 없음 (순방향 의존성 준수)
views/ → containers/ 참조 4개 (hooks 사용 - 정상)
containers/ → models/ 참조 18개 (API 호출 - 정상)
```

### 6.4 Critical Patterns Verified

| Pattern | Location | Status |
|---------|----------|--------|
| `tasksRef` for stale closure prevention | BoardCanvas.tsx:203-208 | PASS |
| `calculateShiftTransitions` hoisting | useSortableGrid.ts:245 < updateDrag:269 | PASS |
| Cleanup ref snapshot | usePendingSync.ts:565-609 | PASS |
| mock-data CRUD helpers | mock-data.ts:413-603 | PASS (24 exports) |

---

## Appendix

### A. Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `N` | 새 카드 생성 | 캔버스 |
| `C` | 선택된 카드들로 그룹 생성 | 카드 선택 시 |
| `Delete` / `Backspace` | 선택된 카드 삭제 | 카드 선택 시 |
| `Escape` | 드래그 취소 / 선택 해제 | 드래그 중 |

### B. API Endpoints (Backend)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks` | 태스크 목록 조회 |
| `POST` | `/tasks` | 태스크 생성 |
| `PUT` | `/tasks/{id}` | 태스크 수정 |
| `PUT` | `/tasks/batch` | 태스크 일괄 수정 (Batch API) |
| `DELETE` | `/tasks/{id}` | 태스크 삭제 |
| `GET` | `/groups` | 그룹 목록 조회 |
| `POST` | `/groups` | 그룹 생성 |
| `GET` | `/connections` | 연결선 목록 조회 |
| `POST` | `/connections` | 연결선 생성 |

### C. Troubleshooting

**문제: 개발 서버 실행 시 모듈을 찾을 수 없음**

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

**문제: TypeScript 타입 에러**

```bash
# 타입 검사 실행
npx tsc --noEmit

# 자동 수정 가능한 린트 에러 수정
npm run lint -- --fix
```

**문제: 환경 변수가 적용되지 않음**

- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- `NEXT_PUBLIC_` 접두사가 있는지 확인 (클라이언트에서 접근하려면 필수)
- 개발 서버 재시작 필요

---

**Last Updated:** 2026-01-27  
**Code Audit:** PASS  
**Maintainer:** DOMO Frontend Team