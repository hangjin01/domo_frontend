/**
 * [파일 안내] frontend/src/models/api/chat.ts
 * 담당 범위: 프로젝트 채팅 이력 조회와 로컬 데모 메시지 저장.
 * 호출 흐름: 화면/훅 → 이 모듈 → 로컬 저장/샘플 또는 공통 HTTP 래퍼 → 응답을 화면 타입으로 반환합니다.
 * 실제 전송은 useChatSocket이 담당합니다. 여기의 mock 저장은 프로젝트별 localStorage이며 다중 사용자 동기화가 아닙니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

// src/models/api/chat.ts

import { apiFetch, API_CONFIG, mockDelay } from './config';
import { mockId, readMock, writeMock } from './mock-store';
import { requireMockUser } from './mock-auth';

export function sendMockChatMessage(projectId: number, content: string): ChatMessage {
    // 빈 메시지를 거르고 현재 사용자/시각을 붙입니다. ID와 저장 키는 프로젝트 범위 이력에 사용됩니다.
    const user = requireMockUser();
    const message: ChatMessage = { id: mockId(), project_id: projectId, user_id: user.id,
        content: content.trim(), created_at: new Date().toISOString(), user };
    if (!message.content) throw new Error('메시지를 입력해주세요.');
    const key = `chat:${projectId}`;
    // 저장 성공 후에만 호출자가 메시지를 전달받습니다. 실패하면 UI 콜백까지 성공처럼 진행하지 않습니다.
    writeMock(key, [...readMock<ChatMessage[]>(key, []), message]);
    return message;
}

export interface ChatUser {
    id: number;
    name: string;
    nickname?: string | null;
    email: string;
    profile_image?: string | null;
}

export interface ChatMessage {
    id: number;
    project_id: number;
    user_id: number;
    content: string;
    created_at: string;
    user?: ChatUser | null;
}

/**
 * 채팅 메시지 목록 조회 (입장 시 이전 메시지 로드)
 */
export async function getChatMessages(
    projectId: number,
    limit: number = 50,
    afterId: number = 0
): Promise<ChatMessage[]> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay();
        return readMock<ChatMessage[]>(`chat:${projectId}`, [])
            .filter(message => message.id > afterId).slice(-limit);
    }

    const params = new URLSearchParams({ limit: String(limit) });
    if (afterId > 0) params.set('after_id', String(afterId));

    return apiFetch<ChatMessage[]>(`/projects/${projectId}/chat?${params}`);
}
