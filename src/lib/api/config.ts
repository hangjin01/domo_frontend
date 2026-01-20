// ============================================
// API 설정
// ============================================

console.log("Current Env Check:", {
  envValue: process.env.NEXT_PUBLIC_USE_MOCK,
  isMock: process.env.NEXT_PUBLIC_USE_MOCK !== 'false'
});

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api',
  // 확실하게 false 문자열인지 체크 (기본값을 false로 두고 싶다면 로직 반대로)
  USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK !== 'false',
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
