/**
 * [파일 안내] frontend/src/models/api/config.ts
 * 담당 범위: mock/실제 모드 선택·공통 fetch/upload·실시간 URL 생성.
 * 화면 상태와 영속 데이터의 경계를 담당하므로 저장 원본과 반환 객체, 브라우저 실행 여부를 구분해야 합니다.
 * HTTP는 상대 /api 프록시를, WS는 NEXT_PUBLIC_API_URL을 사용합니다. apiFetch는 10초, 업로드는 30초 기본 제한이며 쿠키를 포함합니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

// ============================================
// API 설정
// ============================================

export const API_CONFIG = {
  BASE_URL: '/api' as string,

  // SSE/WebSocket: 환경변수에서 직접 참조
  REALTIME_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000',

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

      // detail이 배열이면 메시지 추출, 아니면 그대로 사용
      let message: string;
      if (Array.isArray(errorData.detail)) {
        message = errorData.detail
            .map((d: any) => `${d.loc?.join('.') || 'error'}: ${d.msg}`)
            .join(', ');
      } else {
        message = errorData.detail || `HTTP ${response.status} 에러`;
      }

      throw new Error(message);
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

      // detail이 배열이면 메시지 추출, 아니면 그대로 사용
      let message: string;
      if (Array.isArray(errorData.detail)) {
        message = errorData.detail
            .map((d: any) => `${d.loc?.join('.') || 'error'}: ${d.msg}`)
            .join(', ');
      } else {
        message = errorData.detail || `HTTP ${response.status} 에러`;
      }

      throw new Error(message);
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
 * WebSocket URL 생성
 * REALTIME_URL 기반으로 ws/wss 프로토콜 변환
 */
export function getWebSocketUrl(path: string): string {
  let baseUrl = API_CONFIG.REALTIME_URL;

  // 상대경로인 경우 현재 호스트 기준으로 변환
  if (baseUrl.startsWith('/')) {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    baseUrl = `${protocol}//${host}${baseUrl}`;
  }

  // 프로토콜 변환 (http -> ws, https -> wss)
  if (baseUrl.startsWith('https')) {
    baseUrl = baseUrl.replace('https', 'wss');
  } else if (baseUrl.startsWith('http')) {
    baseUrl = baseUrl.replace('http', 'ws');
  }

  // /api 접미사 제거 (WebSocket은 /ws 경로 사용)
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4);
  }

  // trailing slash 제거 (이중 슬래시 방지)
  baseUrl = baseUrl.replace(/\/+$/, '');

  // path 정규화 (선행 슬래시 보장 + 이중 슬래시 제거)
  const normalizedPath = '/' + path.replace(/^\/+/, '');

  return `${baseUrl}${normalizedPath}`;
}
