import type { Workspace, Project, User } from '@/types';
import { API_CONFIG, apiFetch, mockDelay } from './config';
import { MOCK_WORKSPACES, MOCK_PROJECTS, MOCK_ONLINE_MEMBERS } from './mock-data';

// ============================================
// 워크스페이스 API
// ============================================

/**
 * 워크스페이스 목록 조회
 */
export async function getWorkspaces(): Promise<Workspace[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    return MOCK_WORKSPACES;
  }

  return apiFetch<Workspace[]>('/workspaces');
}

/**
 * 워크스페이스 상세 조회
 */
export async function getWorkspace(workspaceId: number): Promise<Workspace> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const workspace = MOCK_WORKSPACES.find(w => w.id === workspaceId);
    if (!workspace) {
      throw new Error('워크스페이스를 찾을 수 없습니다.');
    }
    return workspace;
  }

  return apiFetch<Workspace>(`/workspaces/${workspaceId}`);
}

// ============================================
// 프로젝트 API
// ============================================

/**
 * 내 프로젝트 전체 조회
 */
export async function getMyProjects(): Promise<Project[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(400);
    return MOCK_PROJECTS;
  }

  // 실제 API: 모든 워크스페이스의 프로젝트를 합쳐서 반환
  const workspaces = await apiFetch<Workspace[]>('/workspaces');
  const allProjects: Project[] = [];

  for (const ws of workspaces) {
    try {
      const projects = await apiFetch<Project[]>(`/workspaces/${ws.id}/projects`);
      projects.forEach(p => {
        allProjects.push({
          ...p,
          workspace: ws.name,
          role: 'Member',
          progress: 0,
          memberCount: 0,
          lastActivity: '-',
          color: '#F3F4F6',
        });
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
    const workspace = MOCK_WORKSPACES.find(w => w.id === workspaceId);
    return workspace?.projects || [];
  }

  return apiFetch<Project[]>(`/workspaces/${workspaceId}/projects`);
}

/**
 * 프로젝트 상세 조회
 */
export async function getProject(projectId: number): Promise<Project> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const project = MOCK_PROJECTS.find(p => p.id === projectId);
    if (!project) {
      throw new Error('프로젝트를 찾을 수 없습니다.');
    }
    return project;
  }

  return apiFetch<Project>(`/projects/${projectId}`);
}

// ============================================
// 멤버 API
// ============================================

/**
 * 워크스페이스 온라인 멤버 조회
 */
export async function getOnlineMembers(workspaceId: number): Promise<User[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return MOCK_ONLINE_MEMBERS;
  }

  return apiFetch<User[]>(`/workspaces/${workspaceId}/online-members`);
}

/**
 * 프로젝트 멤버 조회
 */
export async function getProjectMembers(projectId: number): Promise<User[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return MOCK_ONLINE_MEMBERS;
  }

  return apiFetch<User[]>(`/projects/${projectId}/members`);
}
