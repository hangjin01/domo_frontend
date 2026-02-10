# CLAUDE.md - domo_frontend 프로젝트 메모

## 커밋 규칙
- Co-Authored-By 절대 넣지 말 것
- 커밋 시 `-s` 플래그 사용 (Signed-off-by: Jiheon Yu <luv.wlgjs@gmail.com>)
- git add는 파일 단위로 개별 실행 (`git add .` / `git add -A` 금지), 논리적으로 관련된 파일은 하나의 커밋으로 묶기

## Git 리모트 구조
- origin: `uzih05/domo_frontend.git` (개인 fork, 작업용)
- upstream: `domo-univ/domo_frontend.git` (org 원본)
- 작업 흐름: origin에서 작업 → PR로 upstream에 머지 (또는 직접 push)

## 프로젝트 개요
- Next.js 16.1.3 기반 프론트엔드 (domo 협업 플랫폼)
- 백엔드 API: Next.js rewrites로 프록시 (`/api/:path*` → `API_URL/api/:path*`)
- 배포 서버: `testserver-liart.vercel.app`

## 백엔드 API 제약사항 (중요)
- `GET /api/workspaces/{id}` (단일 워크스페이스 조회) **미지원** → 405 Method Not Allowed
- 대안: `GET /api/workspaces` (목록 조회) 후 ID로 필터링
- `DELETE /api/workspaces/{id}`, `PATCH /api/workspaces/{id}` → 정상 동작 확인됨
- 서브 리소스 엔드포인트(`/workspaces/{id}/projects`, `/workspaces/{id}/members` 등)는 정상 동작

## 라우팅 구조
```
/ → 인증 확인 후 /workspaces 또는 /login 리다이렉트
(auth) 그룹: /login, /signup, /verify, /verify-success
  - 로그인 유저 접근 시 → /workspaces 리다이렉트
(app) 그룹: /workspaces, /workspaces/[id], /workspaces/[id]/projects/[pid]
  - 비로그인 유저 접근 시 → /login 리다이렉트
/invite/[token]: public 라우트 (인증 상태 자체 확인)
```

## 초대 → 워크스페이스 진입 전체 플로우
```
/invite/[token] → 로그인(필요시) → 초대 수락 → /workspaces → /workspaces/{id} → /workspaces/{id}/projects/{pid}
```

## 2026-02-06 작업 내역

### Git 설정
- origin을 `domo-univ` → `uzih05` fork로 변경
- upstream 리모트 추가 (`domo-univ/domo_frontend`)

### 버그 수정: 워크스페이스 진입 불가 (405)
- 증상: /workspaces/{id}로 갔다가 바로 /workspaces로 튕김
- 원인: 백엔드 GET /workspaces/{id} 미지원 + catch에서 silent redirect
- 수정 파일:
  - `src/models/api/workspace.ts`: getWorkspace(), getProjects(), createProject()에서 목록 필터링으로 변경
  - `src/app/(app)/workspaces/[workspaceId]/page.tsx`: 에러 상태 UI 추가
  - `src/app/(app)/workspaces/[workspaceId]/projects/[projectId]/page.tsx`: 에러 상태 UI 추가

### Co-Authored-By 제거
- domo-univ 원본 레포의 15개 커밋에서 Co-Authored-By 전부 제거 (rebase + force push)
- fork도 upstream에 맞춰 동기화 완료

### README 최신화
- 프로젝트 통계 갱신 (90파일, 20,080줄)
- 라우팅 구조를 (auth)/(app) 그룹 기반으로 갱신
- Data Flow를 라우트 기반 네비게이션으로 갱신
- GET /workspaces/{id} 미지원(405) 표기

### 최종 상태
- origin(uzih05)과 upstream(domo-univ) 모두 `7ea9c37` 커밋으로 동기화 완료

## 테스트 체크리스트
- [x] TC-4: 워크스페이스 목록 → 상세 진입
- [ ] TC-5: 존재하지 않는 워크스페이스 접근 시 에러 표시
- [ ] TC-6: 프로젝트 진입/복귀
- [ ] TC-8: 워크스페이스 생성 후 진입
- [x] 워크스페이스 삭제 (DELETE 엔드포인트 동작 확인)
- [x] 워크스페이스 수정 (PATCH 엔드포인트 동작 확인)
