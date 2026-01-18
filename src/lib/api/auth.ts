import type { AuthUser, LoginResponse, SignupResponse, VerifyResponse } from '@/types';
import { API_CONFIG, apiFetch, mockDelay } from './config';
import { MOCK_USERS } from './mock-data';

// ============================================
// 인증 API
// ============================================

/**
 * 로그인
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(600);
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
    if (!user.is_student_verified) {
      throw new Error('이메일 인증이 완료되지 않았습니다.');
    }
    return {
      message: '로그인 성공',
      user: { email: user.email, name: user.name },
    };
  }

  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * 회원가입
 */
export async function signup(
  email: string,
  password: string,
  name: string
): Promise<SignupResponse> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(600);
    if (!email.endsWith('@jj.ac.kr')) {
      throw new Error('전주대학교 이메일(@jj.ac.kr)만 사용 가능합니다.');
    }
    if (MOCK_USERS.some(u => u.email === email)) {
      throw new Error('이미 가입된 이메일입니다.');
    }
    return {
      id: 999,
      email,
      name,
      is_student_verified: false,
    };
  }

  return apiFetch<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

/**
 * 이메일 인증
 */
export async function verify(email: string, code: string): Promise<VerifyResponse> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(400);
    if (code === '123456') {
      return { message: '이메일 인증이 완료되었습니다.' };
    }
    throw new Error('인증 코드가 일치하지 않거나 만료되었습니다.');
  }

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
    return { message: '로그아웃 되었습니다.' };
  }

  return apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

/**
 * 현재 사용자 정보 조회
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    // 목업에서는 로그인 상태 유지 안함
    return null;
  }

  try {
    return await apiFetch<AuthUser>('/auth/me');
  } catch {
    return null;
  }
}
