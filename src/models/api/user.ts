/**
 * [파일 안내] frontend/src/models/api/user.ts
 * 담당 범위: 내 정보 조회·이름/닉네임 수정·프로필 이미지 변경.
 * 호출 흐름: 화면/훅 → 이 모듈 → 로컬 저장/샘플 또는 공통 HTTP 래퍼 → 응답을 화면 타입으로 반환합니다.
 * mock은 계정 배열, 실제 모드는 인증된 사용자 API를 사용합니다. 이미지 경로는 getImageUrl에서 화면 URL로 바꿉니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

import type { User } from '../types';
import { API_CONFIG, apiFetch, apiUpload, mockDelay } from './config';
import { requireMockUser, updateMockUser } from './mock-auth';
import { fileToDataUrl } from './mock-store';

// ============================================
// 사용자 API
// ============================================

/**
 * 현재 사용자 정보 조회
 */
export async function getMyInfo(): Promise<User> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return requireMockUser();
  }

  // 백엔드: GET /api/users/me
  const response = await apiFetch<{
    id: number;
    email: string;
    name: string;
    nickname?: string;
    is_student_verified: boolean;
    profile_image?: string;
  }>('/users/me');

  return {
    id: response.id,
    email: response.email,
    name: response.name,
    nickname: response.nickname,
    is_student_verified: response.is_student_verified,
    profile_image: response.profile_image,
  };
}

/**
 * 사용자 정보 수정 (이름, 닉네임)
 */
export async function updateMyInfo(data: { name?: string; nickname?: string }): Promise<User> {
  // 모든 편집 화면이 같은 검증을 거칩니다. 빈 닉네임은 삭제 요청이므로 유지합니다.
  data = { ...data };
  if (data.name !== undefined) {
    data.name = data.name.trim();
    if (!data.name) throw new Error('이름을 입력해 주세요. 공백만 사용할 수 없습니다.');
  }
  if (data.nickname !== undefined) data.nickname = data.nickname.trim();
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return updateMockUser(data);
  }

  // 백엔드: PATCH /api/users/me
  const response = await apiFetch<{
    id: number;
    email: string;
    name: string;
    nickname?: string;
    is_student_verified: boolean;
    profile_image?: string;
  }>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  return {
    id: response.id,
    email: response.email,
    name: response.name,
    nickname: response.nickname,
    is_student_verified: response.is_student_verified,
    profile_image: response.profile_image,
  };
}

/**
 * 프로필 이미지 변경
 */
export async function updateProfileImage(file: File): Promise<User> {
  // mock 이미지가 저장소를 과도하게 차지하지 않도록 실제 모드와 같은 입력 제한을 적용합니다.
  // 사용자 안내용 검사이며 실제 파일 내용에 대한 보안 검증은 서버에서도 수행해야 합니다.
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('JPG, PNG, WebP 이미지만 사용할 수 있습니다.');
  }
  if (!file.size || file.size > 2 * 1024 * 1024) {
    throw new Error('비어 있지 않은 2MB 이하 이미지를 선택해 주세요.');
  }
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(500);
    return updateMockUser({ profile_image: await fileToDataUrl(file) });
  }

  // 백엔드: PATCH /api/users/me/profile-image (multipart/form-data)
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiUpload<{
    id: number;
    email: string;
    name: string;
    nickname?: string;
    is_student_verified: boolean;
    profile_image?: string;
  }>('/users/me/profile-image', formData, { method: 'PATCH' });

  return {
    id: response.id,
    email: response.email,
    name: response.name,
    nickname: response.nickname,
    is_student_verified: response.is_student_verified,
    profile_image: response.profile_image,
  };
}
