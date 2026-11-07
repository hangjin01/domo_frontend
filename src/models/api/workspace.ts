/**
 * [파일 안내] frontend/src/models/api/workspace.ts
 * 담당 범위: 워크스페이스/프로젝트 CRUD·팀원·초대·온라인 상태.
 * 호출 흐름: 화면/훅 → 이 모듈 → 로컬 저장/샘플 또는 공통 HTTP 래퍼 → 응답을 화면 타입으로 반환합니다.
 * 단일 팀 상세 API가 없어 실제 모드 일부 조회는 목록을 읽고 ID로 찾습니다. mock 멤버/초대는 아직 stub입니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

import type { Workspace, Project, User, Member } from '../types';
import { API_CONFIG, apiFetch, mockDelay } from './config';
import { MOCK_WORKSPACES, MOCK_ONLINE_MEMBERS, MOCK_MEMBERS } from './mock-data';
import { mapProjectResponse, mapWorkspaceMemberToMember } from './mappers';
import { mockId, readMock, writeMock } from './mock-store';
import { requireMockUser } from './mock-auth';

// 팀 안에 projects를 함께 보관하는 단일 원본입니다. 별도 프로젝트 배열과의 동기화 오류를 피합니다.
// v2에 아직 저장값이 없으면 DOMO 데모 팀 1개와 샘플 프로젝트 1개를 반환합니다.
function mockWorkspaces(): Workspace[] { return readMock('workspaces', MOCK_WORKSPACES); }

// ============================================
// 백엔드 응답 타입 (내부용)
// ============================================

interface BackendMemberResponse {
  id: number;
  email: string;
  name: string;
  is_student_verified?: boolean;
  profile_image?: string | null;
  role?: string;
}

// ============================================
// 워크스페이스 API
// ============================================

/**
 * 워크스페이스 목록 조회
 */
export async function getWorkspaces(): Promise<Workspace[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return mockWorkspaces();
  }

  // 백엔드: GET /api/workspaces
  // 응답: WorkspaceResponse[] { id, name, owner_id, description }
  const response = await apiFetch<{
    id: number;
    name: string;
    owner_id: number;
    description?: string;
  }[]>('/workspaces');

  // 각 워크스페이스의 프로젝트 목록도 가져오기.
  // 팀 수만큼 추가 요청이 발생하는 구조입니다. 프로젝트 조회 실패를 빈 배열로 처리하므로
  // 빈 팀 표시가 실제 프로젝트 부재인지 네트워크 실패인지 UI에서 구별되지 않을 수 있습니다.
  const workspaces: Workspace[] = await Promise.all(
      response.map(async (ws) => {
        let projects: Project[] = [];
        try {
          projects = await getProjects(ws.id);
        } catch {
          // 프로젝트 조회 실패 시 빈 배열
        }
        return {
          id: ws.id,
          name: ws.name,
          description: ws.description || '',
          owner_id: ws.owner_id,
          projects,
        };
      })
  );

  return workspaces;
}

/**
 * 워크스페이스 상세 조회
 */
export async function getWorkspace(workspaceId: number): Promise<Workspace> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const workspace = mockWorkspaces().find(w => w.id === workspaceId);
    if (!workspace) {
      throw new Error('워크스페이스를 찾을 수 없습니다.');
    }
    return workspace;
  }

  // 백엔드가 GET /workspaces/{id}를 지원하지 않으므로 목록에서 필터링
  const [allWorkspaces, projects] = await Promise.all([
    apiFetch<{
      id: number;
      name: string;
      owner_id: number;
      description?: string;
    }[]>('/workspaces'),
    getProjects(workspaceId).catch(() => [] as Project[]),
  ]);

  const wsResponse = allWorkspaces.find(ws => ws.id === workspaceId);
  if (!wsResponse) {
    throw new Error('워크스페이스를 찾을 수 없습니다.');
  }

  return {
    id: wsResponse.id,
    name: wsResponse.name,
    description: wsResponse.description || '',
    owner_id: wsResponse.owner_id,
    projects,
  };
}

/**
 * 워크스페이스 생성
 */
export async function createWorkspace(name: string, description?: string): Promise<Workspace> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    const workspace: Workspace = {
      id: mockId(),
      name,
      description: description || '',
      owner_id: requireMockUser().id,
      projects: [],
    };
    writeMock('workspaces', [...mockWorkspaces(), workspace]);
    return workspace;
  }

  // 백엔드: POST /api/workspaces
  const response = await apiFetch<{
    id: number;
    name: string;
    owner_id: number;
    description?: string;
  }>('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });

  return {
    id: response.id,
    name: response.name,
    description: response.description || '',
    owner_id: response.owner_id,
    projects: [],
  };
}

/**
 * 워크스페이스 수정
 */
export async function updateWorkspace(
    workspaceId: number,
    data: { name?: string; description?: string }
): Promise<Workspace> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const workspaces = mockWorkspaces();
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) throw new Error('워크스페이스를 찾을 수 없습니다.');
    Object.assign(ws, data);
    ws.projects?.forEach(project => { project.workspace = ws.name; });
    writeMock('workspaces', workspaces);
    return ws;
  }

  // 백엔드: PATCH /api/workspaces/{id}
  const response = await apiFetch<{
    id: number;
    name: string;
    owner_id: number;
    description?: string;
  }>(`/workspaces/${workspaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  return {
    id: response.id,
    name: response.name,
    description: response.description || '',
    owner_id: response.owner_id,
    projects: [],
  };
}

/**
 * 워크스페이스 삭제
 */
export async function deleteWorkspace(workspaceId: number): Promise<void> {
  // mock은 목록 항목만 제거합니다. board/posts/chat의 고아 데이터 연쇄 정리는 아직 없습니다.
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    writeMock('workspaces', mockWorkspaces().filter(ws => ws.id !== workspaceId));
    return;
  }

  // 백엔드: DELETE /api/workspaces/{id}
  await apiFetch<{ message: string }>(`/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });
}

// ============================================
// 프로젝트 API
// ============================================

/**
 * 내 프로젝트 전체 조회 (모든 워크스페이스)
 */
export async function getMyProjects(): Promise<Project[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(400);
    return mockWorkspaces().flatMap(ws => ws.projects || []);
  }

  // 1. 모든 워크스페이스 조회
  const workspaces = await apiFetch<{
    id: number;
    name: string;
    owner_id: number;
    description?: string;
  }[]>('/workspaces');

  // 2. 각 워크스페이스의 프로젝트 + 멤버 수 조회
  const allProjects: Project[] = [];

  for (const ws of workspaces) {
    try {
      // 프로젝트 목록
      const projects = await apiFetch<{
        id: number;
        name: string;
        workspace_id: number;
        description?: string;
      }[]>(`/workspaces/${ws.id}/projects`);

      // 멤버 수 (워크스페이스 레벨)
      let memberCount = 0;
      try {
        const members = await apiFetch<BackendMemberResponse[]>(`/workspaces/${ws.id}/members`);
        memberCount = members.length;
      } catch {
        // 멤버 조회 실패 시 0
      }

      projects.forEach(p => {
        allProjects.push(mapProjectResponse(p, ws.name, memberCount));
      });
    } catch {
      // 개별 워크스페이스 조회 실패 시 무시
    }
  }

  return allProjects;
}

/**
 * 워크스페이스의 프로젝트 목록 조회
 */
export async function getProjects(workspaceId: number): Promise<Project[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const workspace = mockWorkspaces().find(w => w.id === workspaceId);
    return workspace?.projects || [];
  }

  // 백엔드: GET /api/workspaces/{id}/projects
  const [projects, workspace, members] = await Promise.all([
    apiFetch<{
      id: number;
      name: string;
      workspace_id: number;
      description?: string;
    }[]>(`/workspaces/${workspaceId}/projects`),
    apiFetch<{ id: number; name: string }[]>('/workspaces')
        .then(list => list.find(ws => ws.id === workspaceId) ?? { name: '워크스페이스' })
        .catch(() => ({ name: '워크스페이스' })),
    apiFetch<BackendMemberResponse[]>(`/workspaces/${workspaceId}/members`).catch(() => []),
  ]);

  return projects.map(p => mapProjectResponse(p, workspace.name, members.length));
}

/**
 * 프로젝트 상세 조회
 */
export async function getProject(projectId: number): Promise<Project> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const project = mockWorkspaces().flatMap(ws => ws.projects || []).find(p => p.id === projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }
    return project;
  }

  // 백엔드에는 개별 프로젝트 조회 API가 없으므로
  // 모든 프로젝트에서 찾기
  const allProjects = await getMyProjects();
  const project = allProjects.find(p => p.id === projectId);

  if (!project) {
    throw new Error('프로젝트를 찾을 수 없습니다.');
  }

  return project;
}

/**
 * 프로젝트 생성 (기본 컬럼 3개 자동 생성)
 */
export async function createProject(
    workspaceId: number,
    name: string,
    description?: string
): Promise<Project> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    const workspaces = mockWorkspaces();
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) throw new Error('워크스페이스를 찾을 수 없습니다.');
    const project: Project = {
      id: mockId(),
      name,
      workspace: workspace.name,
      workspace_id: workspaceId,
      description,
      role: 'Member',
      progress: 0,
      memberCount: 1,
      lastActivity: '방금 전',
      color: '#DBEAFE',
    };
    workspace.projects = [...(workspace.projects || []), project];
    writeMock('workspaces', workspaces);
    return project;
  }

  // 백엔드: POST /api/workspaces/{id}/projects
  const response = await apiFetch<{
    id: number;
    name: string;
    workspace_id: number;
    description?: string;
  }>(`/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });

  // 워크스페이스 이름 조회 (단일 조회 미지원으로 목록에서 필터링)
  let workspaceName = '워크스페이스';
  try {
    const list = await apiFetch<{ id: number; name: string }[]>('/workspaces');
    workspaceName = list.find(ws => ws.id === workspaceId)?.name ?? workspaceName;
  } catch {}

  return mapProjectResponse(response, workspaceName, 1);
}

/**
 * 프로젝트 수정
 */
export async function updateProject(
    projectId: number,
    data: { name?: string; description?: string }
): Promise<Project> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const workspaces = mockWorkspaces();
    const proj = workspaces.flatMap(ws => ws.projects || []).find(p => p.id === projectId);
    if (!proj) throw new Error('프로젝트를 찾을 수 없습니다.');
    Object.assign(proj, data);
    writeMock('workspaces', workspaces);
    return proj;
  }

  // 백엔드: PATCH /api/projects/{id}
  const response = await apiFetch<{
    id: number;
    name: string;
    workspace_id: number;
    description?: string;
  }>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  return mapProjectResponse(response, '워크스페이스', 0);
}

/**
 * 프로젝트 삭제
 */
export async function deleteProject(projectId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    writeMock('workspaces', mockWorkspaces().map(ws => ({
      ...ws, projects: (ws.projects || []).filter(project => project.id !== projectId),
    })));
    return;
  }

  // 백엔드: DELETE /api/projects/{id}
  await apiFetch<{ message: string }>(`/projects/${projectId}`, {
    method: 'DELETE',
  });
}

// ============================================
// 멤버 API
// ============================================

/**
 * 워크스페이스 멤버 목록 조회
 */
export async function getWorkspaceMembers(workspaceId: number): Promise<Member[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return MOCK_MEMBERS;
  }

  // 백엔드: GET /api/workspaces/{id}/members
  // 응답: WorkspaceMemberResponse[] { user_id, name, email, role }
  const response = await apiFetch<{
    user_id: number;
    name: string;
    email: string;
    role: string;
  }[]>(`/workspaces/${workspaceId}/members`);

  return response.map(mapWorkspaceMemberToMember);
}

/**
 * 워크스페이스 온라인 멤버 SSE 구독
 * @param workspaceId 워크스페이스 ID
 * @param onUpdate 온라인 멤버 목록 업데이트 콜백
 * @param onError SSE 연결 에러 콜백 (optional)
 * @returns cleanup 함수 (구독 해제용)
 */
export function subscribeOnlineMembers(
    workspaceId: number,
    onUpdate: (members: User[]) => void,
    onError?: (error: Event) => void
): () => void {
  if (API_CONFIG.USE_MOCK) {
    // Mock 모드: interval로 시뮬레이션 (5초 주기)
    const interval = setInterval(() => {
      onUpdate(MOCK_ONLINE_MEMBERS);
    }, 5000);

    // 최초 1회 즉시 호출
    onUpdate(MOCK_ONLINE_MEMBERS);

    return () => clearInterval(interval);
  }

  // SSE 연결: REALTIME_URL 사용 (개발환경 프록시 버퍼링 우회)
  const eventSource = new EventSource(
      `/api/workspaces/${workspaceId}/online-members/stream`,
      { withCredentials: true }
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const members: User[] = data.online_members.map((u: {
        id: number;
        name: string;
        email: string;
        profile_image?: string;
      }) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        is_student_verified: true,
        profile_image: u.profile_image,
      }));
      onUpdate(members);
    } catch (err) {
      // SSE parsing error
    }
  };

  eventSource.onerror = (error) => {
    onError?.(error);
  };

  // cleanup 함수 반환
  return () => {
    eventSource.close();
  };
}

/**
 * 워크스페이스에 멤버 추가 (이메일로)
 */
export async function addWorkspaceMember(
    workspaceId: number,
    email: string
): Promise<{ message: string }> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return { message: '멤버가 추가되었습니다.' };
  }

  // 백엔드: POST /api/workspaces/{id}/members
  return apiFetch<{ message: string }>(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * 워크스페이스 멤버 삭제
 */
export async function removeWorkspaceMember(
    workspaceId: number,
    userId: number
): Promise<{ message: string }> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return { message: '멤버가 삭제되었습니다.' };
  }

  // 백엔드: DELETE /api/workspaces/{id}/members/{user_id}
  return apiFetch<{ message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * 초대 링크 생성
 */
export async function createInvitation(
    workspaceId: number,
    role: string = 'member',
    expiresInHours: number = 24
): Promise<{ invite_link: string; expires_at: string }> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return {
      invite_link: `http://localhost:3000/invite/mock-token-${Date.now()}`,
      expires_at: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
    };
  }

  // 백엔드: POST /api/workspaces/{id}/invitations
  return apiFetch<{ invite_link: string; expires_at: string }>(
      `/workspaces/${workspaceId}/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({ role, expires_in_hours: expiresInHours }),
      }
  );
}

/**
 * 초대 수락
 */
export async function acceptInvitation(token: string): Promise<{ message: string }> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return { message: '워크스페이스에 참여했습니다.' };
  }

  // 백엔드: POST /api/invitations/{token}/accept
  return apiFetch<{ message: string }>(`/invitations/${token}/accept`, {
    method: 'POST',
  });
}

/**
 * 초대 정보 조회 (수락 전 확인용)
 */
export async function getInvitationInfo(token: string): Promise<{
  workspace_name: string;
  inviter_name: string;
  role: string;
}> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return {
      workspace_name: 'Mock 워크스페이스',
      inviter_name: '김도모',
      role: 'member',
    };
  }

  // 백엔드: GET /api/invitations/{token}
  return apiFetch<{
    workspace_name: string;
    inviter_name: string;
    role: string;
  }>(`/invitations/${token}`);
}

/**
 * 프로젝트 멤버 조회 (= 워크스페이스 멤버와 동일)
 * 프로젝트가 속한 워크스페이스의 멤버를 반환합니다.
 */
export async function getProjectMembers(projectId: number): Promise<User[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return MOCK_ONLINE_MEMBERS;
  }

  // 프로젝트 → 워크스페이스 → 멤버 조회
  // 1. 먼저 프로젝트 정보를 가져와서 workspace_id 확인
  try {
    const project = await getProject(projectId);
    if (!project.workspace_id) {
      return [];
    }

    // 2. 워크스페이스 멤버 조회
    const members = await getWorkspaceMembers(project.workspace_id);

    // 3. Member 타입을 User 타입으로 변환
    return members.map(member => ({
      id: member.id,
      email: member.email,
      name: member.name,
      is_student_verified: true, // 기본값
      profile_image: member.avatar || undefined,
    }));
  } catch (error) {

    return [];
  }
}
