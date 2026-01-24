import type { User } from '../types';
import { API_CONFIG, apiFetch, apiUpload, mockDelay } from './config';
import { MOCK_CURRENT_USER } from './mock-data';

// ============================================
// 사용자 API
// ============================================

/**
 * 현재 사용자 정보 조회
 */
export async function getMyInfo(): Promise<User> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return MOCK_CURRENT_USER;
  }

  // 백엔드: GET /api/users/me
  const response = await apiFetch<{
    id: number;
    email: string;
    name: string;
    is_student_verified: boolean;
    profile_image?: string;
  }>('/users/me');

  return {
    id: response.id,
    email: response.email,
    name: response.name,
    is_student_verified: response.is_student_verified,
    profile_image: response.profile_image,
  };
}

/**
 * 사용자 이름 수정
 */
export async function updateMyInfo(data: { name?: string }): Promise<User> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return { ...MOCK_CURRENT_USER, ...data };
  }

  // 백엔드: PATCH /api/users/me
  const response = await apiFetch<{
    id: number;
    email: string;
    name: string;
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
    is_student_verified: response.is_student_verified,
    profile_image: response.profile_image,
  };
}

/**
 * 프로필 이미지 변경
 */
export async function updateProfileImage(file: File): Promise<User> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(500);
    return {
      ...MOCK_CURRENT_USER,
      profile_image: URL.createObjectURL(file),
    };
  }

  // 백엔드: PATCH /api/users/me/profile-image (multipart/form-data)
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiUpload<{
    id: number;
    email: string;
    name: string;
    is_student_verified: boolean;
    profile_image?: string;
  }>('/users/me/profile-image', formData, { method: 'PATCH' });

  return {
    id: response.id,
    email: response.email,
    name: response.name,
    is_student_verified: response.is_student_verified,
    profile_image: response.profile_image,
  };
}
