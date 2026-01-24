import type { AuthUser, LoginResponse, SignupResponse, VerifyResponse, User } from '../types';
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

  // 백엔드: POST /api/auth/signup
  // 요청: { email, password, name }
  // 응답: UserResponse { id, email, name, is_student_verified, profile_image }
  const response = await apiFetch<{
    id: number;
    email: string;
    name: string;
    is_student_verified: boolean;
    profile_image?: string;
  }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });

  return {
    id: response.id,
    email: response.email,
    name: response.name,
    is_student_verified: response.is_student_verified,
  };
}

/**
 * 이메일 인증
 */
export async function verify(email: string, code: string): Promise<VerifyResponse> {
  // 1. 안전 장치: 이메일이 넘어오지 않았다면 요청 전에 에러 발생시키기 (디버깅용)
  if (!email) {
    console.error("🚨 verify 함수 호출 시 email 인자가 누락되었습니다!");
    throw new Error("이메일 정보가 없습니다.");
  }

  // 2. Mock 모드일 때 (테스트용)
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(400);
    // 테스트할 때 이메일 상관없이 코드만 맞으면 통과시키려면 아래 유지
    if (code === '123456') {
      return { message: '이메일 인증이 완료되었습니다.' };
    }
    throw new Error('인증 코드가 일치하지 않거나 만료되었습니다.');
  }

  // 3. 실제 서버 통신 (핵심 수정 부분)
  // 이제 body에 email과 code가 모두 담겨서 전송됩니다.
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
    return null;
  }

  try {
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
  } catch {
    return null;
  }
}
