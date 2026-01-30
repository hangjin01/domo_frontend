// src/models/api/mappers.ts
// 백엔드 API 응답 -> 프론트엔드 타입 변환 함수들
//
// NOTE: Task/Card/Connection 관련 매퍼는 board.ts에서 자체 정의하여 사용 중
// 이 파일에는 Workspace/Project/Member 관련 매퍼만 유지

import type { Project, Member } from '../types';

// ============================================
// 프로젝트 관련 매퍼
// ============================================

const PROJECT_COLORS = ['#FEF3C7', '#DBEAFE', '#FCE7F3', '#D1FAE5', '#E9D5FF'];

/**
 * 백엔드 프로젝트 응답을 프론트엔드 Project 타입으로 변환
 */
export function mapProjectResponse(
    proj: { id: number; name: string; workspace_id: number; description?: string },
    workspaceName: string,
    memberCount: number = 0
): Project {
  return {
    id: proj.id,
    name: proj.name,
    workspace: workspaceName,
    workspace_id: proj.workspace_id,
    description: proj.description,
    role: 'Member',
    progress: 0,
    memberCount,
    lastActivity: '방금 전',
    color: PROJECT_COLORS[proj.id % PROJECT_COLORS.length],
  };
}

// ============================================
// 멤버 관련 매퍼
// ============================================

/**
 * 백엔드 워크스페이스 멤버 응답을 프론트엔드 Member 타입으로 변환
 */
export function mapWorkspaceMemberToMember(member: {
  user_id: number;
  name: string;
  email: string;
  role: string;
}): Member {
  return {
    id: member.user_id,
    name: member.name,
    email: member.email,
    role: member.role,
    isOnline: false, // 별도 SSE로 확인
  };
}