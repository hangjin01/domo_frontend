import { API_CONFIG } from '../api/config';

/**
 * 이미지 경로를 전체 URL로 변환합니다.
 * @param path 이미지 경로 (예: /static/profile.jpg)
<<<<<<< HEAD:src/models/utils/image.ts
 * @returns 전체 URL (예: https://api.example.com/static/profile.jpg)
=======
 * @returns 전체 URL (예: http://localhost:9000/static/profile.jpg)
>>>>>>> upstream/main:src/lib/utils/image.ts
 */
export function getImageUrl(path: string | undefined | null): string | undefined {
    if (!path) return undefined;

    // 이미 전체 URL인 경우 (외부 이미지 등)
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
        return path;
    }

<<<<<<< HEAD:src/models/utils/image.ts
    // REALTIME_URL을 사용하여 실제 백엔드 주소로 이미지 요청
    // REALTIME_URL: https://api.3.25.219.120.nip.io 또는 http://localhost:9000
    let baseUrl = API_CONFIG.REALTIME_URL;

    // /api로 끝나면 제거
    if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.slice(0, -4);
    }
=======
    // API Base URL에서 /api 제거 후 static 경로 결합
    // 예: http://localhost:9000/api -> http://localhost:9000
    const baseUrl = API_CONFIG.BASE_URL.endsWith('/api')
        ? API_CONFIG.BASE_URL.slice(0, -4)
        : API_CONFIG.BASE_URL;
>>>>>>> upstream/main:src/lib/utils/image.ts

    // path가 /로 시작하지 않으면 추가
    const safePath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${safePath}`;
<<<<<<< HEAD:src/models/utils/image.ts
}
=======
}
>>>>>>> upstream/main:src/lib/utils/image.ts
