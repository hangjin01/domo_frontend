/**
 * [파일 안내] frontend/src/models/utils/image.ts
 * 상대 업로드 경로와 외부 URL을 이미지 태그에서 쓸 주소로 정규화합니다.
 * http(s), blob, data:image/ 주소를 구분합니다. mock 미리보기 data URL에 서버 주소를 잘못 덧붙이지 않도록 주의합니다.
 */

import { API_CONFIG } from '../api/config';

/**
 * 이미지 경로를 전체 URL로 변환합니다.
 * @param path 이미지 경로 (예: /static/profile.jpg)
 * @returns 전체 URL (예: https://api.example.com/static/profile.jpg)
 */
export function getImageUrl(path: string | undefined | null): string | undefined {
    if (!path) return undefined;

    // 이미 전체 URL인 경우 (외부 이미지 등)
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:image/')) {
        return path;
    }

    // REALTIME_URL을 사용하여 실제 백엔드 주소로 이미지 요청
    // REALTIME_URL: https://api.3.25.219.120.nip.io 또는 http://localhost:9000
    let baseUrl = API_CONFIG.REALTIME_URL;

    // /api로 끝나면 제거
    if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.slice(0, -4);
    }

    // path가 /로 시작하지 않으면 추가
    const safePath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${safePath}`;
}
