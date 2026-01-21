// ============================================
// API 설정
// ============================================

console.log("Current Env Check:", {
  envValue: process.env.NEXT_PUBLIC_USE_MOCK,
  isMock: process.env.NEXT_PUBLIC_USE_MOCK !== 'false'
});

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api',
  USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK === 'true',
} as const;

// ============================================
// API 헬퍼 함수
// ============================================

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * 기본 fetch 래퍼 - 공통 에러 처리 및 타임아웃 지원
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: 'include', // 쿠키 포함 (세션 인증용)
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status} 에러`);
    }

    // 204 No Content 처리
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 파일 업로드용 fetch (multipart/form-data)
 */
export async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
  options: Omit<FetchOptions, 'body'> = {}
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method: 'POST',
      ...fetchOptions,
      signal: controller.signal,
      credentials: 'include',
      body: formData,
      // Content-Type 헤더를 설정하지 않음 (브라우저가 자동으로 boundary 설정)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status} 에러`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('업로드 시간이 초과되었습니다.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 목업 데이터 지연 시뮬레이션
 */
export function mockDelay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * API Base URL을 기반으로 WebSocket URL 생성
 * 예: http://localhost:9000/api -> ws://localhost:9000/ws
 */
export function getWebSocketUrl(path: string): string {
  let baseUrl = API_CONFIG.BASE_URL;

  // 1. 프로토콜 변환 (http -> ws, https -> wss)
  if (baseUrl.startsWith('https')) {
    baseUrl = baseUrl.replace('https', 'wss');
  } else {
    baseUrl = baseUrl.replace('http', 'ws');
  }

  // 2. /api 접미사 제거 (백엔드 라우팅 구조에 따라 조정)
  // 기존: http://locahost:9000/api
  // 목표: ws://localhost:9000/ws/...
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4);
  }

  // 3. 경로 결합
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}