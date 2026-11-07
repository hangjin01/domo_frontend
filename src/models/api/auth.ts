/**
 * [파일 안내] frontend/src/models/api/auth.ts
 * 담당 범위: 로그인·학교 이메일 가입/인증·로그아웃·현재 사용자 조회.
 * 호출 흐름: 화면/훅 → 이 모듈 → 로컬 저장/샘플 또는 공통 HTTP 래퍼 → 응답을 화면 타입으로 반환합니다.
 * mock-auth의 탭 세션과 서버 session_id 쿠키는 서로 다른 인증 수단입니다. 모드 전환으로 계정이 이관되지 않습니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

import type { AuthUser, LoginResponse, SignupResponse, VerifyResponse, User } from '../types';
import { API_CONFIG, apiFetch, mockDelay } from './config';
import { getMockUser, loginMock, logoutMock, signupMock, verifyMock } from './mock-auth';

// ============================================
// 인증 API
// ============================================

/**
 * 로그인
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(600);
    const user = loginMock(email, password);
    return {
      message: '로그인 성공',
      user: { email: user.email, name: user.name },
    };
  }

  // 백엔드: POST /api/auth/login
  // 응답: { message: string, user: { email, name } }
  const response = await apiFetch<{ message: string; user: { email: string; name: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return {
    message: response.message,
    user: {
      email: response.user.email,
      name: response.user.name,
    },
  };
}

/**
 * 회원가입
 */
export async function signup(
  email: string,
  password: string,
  name: string,
  nickname?: string
): Promise<SignupResponse> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(600);
    return signupMock(email, password, name, nickname) as SignupResponse;
  }

  // 백엔드: POST /api/auth/signup
  // 요청: { email, password, name, nickname }
  // 응답: UserResponse { id, email, name, nickname, is_student_verified, profile_image }
  const response = await apiFetch<{
    id: number;
    email: string;
    name: string;
    nickname?: string;
    is_student_verified: boolean;
    profile_image?: string;
  }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, nickname }),
  });

  return {
    id: response.id,
    email: response.email,
    name: response.name,
    nickname: response.nickname,
    is_student_verified: response.is_student_verified,
  };
}

/**
 * 이메일 인증
 */
export async function verify(email: string, code: string): Promise<VerifyResponse> {
  // 안전 장치: 이메일이 넘어오지 않았다면 요청 전에 에러 발생
  if (!email) {
    throw new Error("이메일 정보가 없습니다.");
  }

  // Mock 모드
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(400);
    verifyMock(email, code);
    return { message: '이메일 인증이 완료되었습니다.' };
  }

  // 실제 서버 통신
  return apiFetch<VerifyResponse>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

/**
 * 로그아웃
 */
export async function logout(): Promise<{ message: string }> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    logoutMock();
    return { message: '로그아웃 되었습니다.' };
  }

  // 백엔드: POST /api/auth/logout
  return apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

/**
 * 현재 사용자 정보 조회
 */
export async function getCurrentUser(): Promise<User | null> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return getMockUser();
  }

  try {
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
  } catch {
    return null;
  }
}
