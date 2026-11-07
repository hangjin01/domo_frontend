/**
 * [파일 안내] frontend/src/models/api/mappers.ts
 * 담당 범위: 백엔드 응답을 화면용 프로젝트/멤버 타입으로 변환.
 * 화면 상태와 영속 데이터의 경계를 담당하므로 저장 원본과 반환 객체, 브라우저 실행 여부를 구분해야 합니다.
 * 서버 필드와 화면 표시용 기본값의 경계입니다. 원본에 없는 진행률/표시 문자열을 실제 집계 데이터로 오해하지 마세요.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

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
