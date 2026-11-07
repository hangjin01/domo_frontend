/**
 * [파일 안내] frontend/src/models/api/file.ts
 * 담당 범위: 프로젝트 파일 목록·업로드·버전·다운로드 URL·카드 첨부.
 * 호출 흐름: 화면/훅 → 이 모듈 → 로컬 저장/샘플 또는 공통 HTTP 래퍼 → 응답을 화면 타입으로 반환합니다.
 * mock은 샘플 위주로 실제 바이너리 보존/다운로드가 미완성입니다. 실제 서버 다운로드 권한도 별도 보강 대상입니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

import type { FileMetadata, FileVersion } from '../types';
import { API_CONFIG, apiFetch, apiUpload, mockDelay } from './config';

// ============================================
// 파일 관리 API
// ============================================

/**
 * 프로젝트의 파일 목록 조회
 */
export async function getProjectFiles(projectId: number): Promise<FileMetadata[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(300);
    const baseId = projectId * 1000;
    return [
      {
        id: baseId + 1,
        project_id: projectId,
        filename: '프로젝트_기획서.pdf',
        owner_id: 1,
        created_at: new Date().toISOString(),
        latest_version: {
          id: baseId + 101,
          version: 1,
          file_size: 1024000,
          created_at: new Date().toISOString(),
          uploader_id: 1,
        },
      },
      {
        id: baseId + 2,
        project_id: projectId,
        filename: '디자인_시안.png',
        owner_id: 1,
        created_at: new Date().toISOString(),
        latest_version: {
          id: baseId + 102,
          version: 2,
          file_size: 2048000,
          created_at: new Date().toISOString(),
          uploader_id: 1,
        },
      },
      {
        id: baseId + 3,
        project_id: projectId,
        filename: '회의록_01.docx',
        owner_id: 2,
        created_at: new Date().toISOString(),
        latest_version: {
          id: baseId + 103,
          version: 1,
          file_size: 512000,
          created_at: new Date().toISOString(),
          uploader_id: 2,
        },
      },
    ];
  }

  return apiFetch<FileMetadata[]>(`/projects/${projectId}/files`);
}

/**
 * 프로젝트에 파일 업로드
 */
export async function uploadFile(
    projectId: number,
    file: File
): Promise<FileMetadata> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(500);
    return {
      id: Date.now(),
      project_id: projectId,
      filename: file.name,
      owner_id: 1,
      created_at: new Date().toISOString(),
      latest_version: {
        id: Date.now(),
        version: 1,
        file_size: file.size,
        created_at: new Date().toISOString(),
        uploader_id: 1,
      },
    };
  }

  const formData = new FormData();
  formData.append('file', file);

  return apiUpload<FileMetadata>(`/projects/${projectId}/files`, formData);
}

/**
 * 파일 다운로드 URL 생성
 */
export function getFileDownloadUrl(versionId: number): string {
  return `${API_CONFIG.BASE_URL}/files/download/${versionId}`;
}

/**
 * 파일 버전 히스토리 조회
 */
export async function getFileVersions(fileId: number): Promise<FileVersion[]> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    const now = new Date();
    return [
      {
        id: fileId * 100 + 3,
        version: 3,
        file_size: 1228800,
        created_at: now.toISOString(),
        uploader_id: 1,
      },
      {
        id: fileId * 100 + 2,
        version: 2,
        file_size: 1024000,
        created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        uploader_id: 1,
      },
      {
        id: fileId * 100 + 1,
        version: 1,
        file_size: 819200,
        created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        uploader_id: 2,
      },
    ];
  }

  return apiFetch<FileVersion[]>(`/files/${fileId}/versions`);
}

/**
 * 파일 삭제
 */
export async function deleteFile(fileId: number): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return;
  }

  await apiFetch<{ message: string }>(`/files/${fileId}`, {
    method: 'DELETE',
  });
}

/**
 * 카드에 파일 첨부
 */
export async function attachFileToCard(
    cardId: number,
    fileId: number
): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return;
  }

  await apiFetch<void>(`/cards/${cardId}/files/${fileId}`, {
    method: 'POST',
  });
}

/**
 * 카드에서 파일 분리
 */
export async function detachFileFromCard(
    cardId: number,
    fileId: number
): Promise<void> {
  if (API_CONFIG.USE_MOCK) {
    await mockDelay(200);
    return;
  }

  await apiFetch<{ message: string }>(`/cards/${cardId}/files/${fileId}`, {
    method: 'DELETE',
  });
}
