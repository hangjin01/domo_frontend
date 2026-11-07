/**
 * [파일 안내] frontend/src/models/api/post.ts
 * 담당 범위: 프로젝트 게시판과 전역 커뮤니티의 글 CRUD·댓글 생성/삭제.
 * 호출 흐름: 화면/훅 → 이 모듈 → 로컬 저장/샘플 또는 공통 HTTP 래퍼 → 응답을 화면 타입으로 반환합니다.
 * 두 게시판의 저장 범위를 분리합니다. 프로젝트 글은 JSON, 전역 글 이미지 업로드는 FormData 경로를 사용합니다.
 * 함수의 성공 응답과 실제 기능 지원 여부는 같지 않습니다. 미구현/제약은 docs/05-recovery-and-backlog.md를 함께 확인하세요.
 */

import type { Post, PostCreateRequest, PostUpdateRequest, PostComment, PostCommentCreateRequest } from '../types';
import { API_CONFIG, apiFetch, apiUpload, mockDelay } from './config';
import { MOCK_POSTS } from './mock-data';
import { fileToDataUrl, mockId, readMock, writeMock } from './mock-store';
import { requireMockUser } from './mock-auth';

type PostScope = 'community' | 'project';
// 전역 글은 project_id 없이, 프로젝트 글은 ID를 유지한 채 서로 다른 키에서 읽습니다.
// 기본 샘플의 본문이 같더라도 이후 생성/수정/삭제는 각 영역에 독립적으로 적용됩니다.
function mockPosts(scope: PostScope): Post[] {
    const seed = scope === 'community' ? MOCK_POSTS.map(post => ({ ...post, project_id: undefined })) : MOCK_POSTS;
    return readMock(`posts:${scope}`, seed);
}
function savePost(scope: PostScope, post: Post): Post {
    // 같은 ID의 이전 글을 제거하고 새 값을 넣습니다. 조회 시 created_at 기준으로 다시 정렬합니다.
    const posts = mockPosts(scope).filter(existing => existing.id !== post.id);
    writeMock(`posts:${scope}`, [...posts, post]);
    return post;
}
function findPost(scope: PostScope, id: number): Post {
    const post = mockPosts(scope).find(post => post.id === id);
    if (!post) throw new Error('게시글을 찾을 수 없습니다.');
    return post;
}
function removePost(scope: PostScope, id: number): void {
    findPost(scope, id);
    writeMock(`posts:${scope}`, mockPosts(scope).filter(post => post.id !== id));
}
function saveComment(scope: PostScope, postId: number, content: string): PostComment {
    // 댓글은 해당 글의 comments에 포함되어 저장됩니다. 작성자 정보는 로그인 세션에서 가져옵니다.
    const post = findPost(scope, postId);
    const user = requireMockUser();
    const comment: PostComment = { id: mockId(), post_id: postId, user_id: user.id,
        content, created_at: new Date().toISOString(), user };
    savePost(scope, { ...post, comments: [...(post.comments || []), comment] });
    return comment;
}
function removeComment(scope: PostScope, id: number): void {
    const post = mockPosts(scope).find(post => post.comments?.some(comment => comment.id === id));
    if (!post) throw new Error('댓글을 찾을 수 없습니다.');
    savePost(scope, { ...post, comments: post.comments!.filter(comment => comment.id !== id) });
}

// ============================================
// 게시판 API
// ============================================

/**
 * 프로젝트 게시글 목록 조회
 * GET /projects/{project_id}/posts
 */
export async function getProjectPosts(projectId: number): Promise<Post[]> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(400);
        return mockPosts('project').filter(p => p.project_id === projectId).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    const posts = await apiFetch<Post[]>(`/projects/${projectId}/posts`);

    return posts.map(post => ({
        ...post,
        title: post.title || 'Untitled',
        project_id: projectId,
        user: post.user || {
            id: post.user_id,
            name: post.user_name || 'Unknown',
            email: '',
            is_student_verified: false
        }
    }));
}

/**
 * 전체 커뮤니티 게시글 목록 조회
 * GET /community
 */
export async function getCommunityPosts(): Promise<Post[]> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(400);
        return mockPosts('community').sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    const posts = await apiFetch<Post[]>('/community');

    return posts.map(post => ({
        ...post,
        title: post.title || 'Untitled',
        user: post.user || {
            id: post.user_id,
            name: post.user_name || 'Unknown',
            email: '',
            is_student_verified: false
        }
    }));
}

/**
 * 프로젝트 게시글 작성
 * POST /projects/{project_id}/posts
 */
export async function createProjectPost(projectId: number, data: PostCreateRequest): Promise<Post> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(600);
        const user = requireMockUser();
        const newPost: Post = {
            id: mockId(),
            project_id: projectId,
            user_id: user.id,
            title: data.title,
            content: data.content,
            created_at: new Date().toISOString(),
            user,
            comments: []
        };
        return savePost('project', newPost);
    }

    // 프로젝트 게시글은 JSON 전송 (파일 업로드 미지원)
    return apiFetch<Post>(`/projects/${projectId}/posts`, {
        method: 'POST',
        body: JSON.stringify({
            title: data.title,
            content: data.content
        })
    });
}

/**
 * 커뮤니티 게시글 작성 (이미지 포함 가능)
 * POST /community
 */
export async function createCommunityPost(data: PostCreateRequest): Promise<Post> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(600);
        const user = requireMockUser();
        const newPost: Post = {
            id: mockId(),
            user_id: user.id,
            title: data.title,
            content: data.content,
            image_url: data.file ? await fileToDataUrl(data.file) : undefined,
            created_at: new Date().toISOString(),
            user,
            comments: []
        };
        return savePost('community', newPost);
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    if (data.file) {
        formData.append('file', data.file);
    }

    return apiUpload<Post>('/community', formData);
}

/**
 * 게시글 상세 조회 (커뮤니티)
 * GET /community/{post_id}
 */
export async function getCommunityPost(postId: number): Promise<Post> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(300);
        return findPost('community', postId);
    }
    return apiFetch<Post>(`/community/${postId}`);
}

/**
 * 게시글 상세 조회 (프로젝트)
 * GET /posts/{post_id}
 */
export async function getProjectPost(postId: number): Promise<Post> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(300);
        return findPost('project', postId);
    }
    return apiFetch<Post>(`/posts/${postId}`);
}

/**
 * 커뮤니티 게시글 수정 (이미지 변경 지원)
 * PATCH /community/{post_id}
 */
export async function updateCommunityPost(postId: number, data: PostUpdateRequest & { file?: File; removeImage?: boolean }): Promise<Post> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(500);
        const post = findPost('community', postId);
        const { file, removeImage, ...updates } = data;
        const image_url = file ? await fileToDataUrl(file) : removeImage ? undefined : post.image_url;
        return savePost('community', { ...post, ...updates, image_url, updated_at: new Date().toISOString() });
    }

    const formData = new FormData();
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.content !== undefined) formData.append('content', data.content);
    if (data.file) formData.append('file', data.file);
    if (data.removeImage) formData.append('remove_image', 'true');

    return apiUpload<Post>(`/community/${postId}`, formData, { method: 'PATCH' });
}

/**
 * 프로젝트 게시글 수정
 * PATCH /posts/{post_id}
 */
export async function updateProjectPost(postId: number, data: PostUpdateRequest): Promise<Post> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(500);
        const post = findPost('project', postId);
        return savePost('project', { ...post, ...data, updated_at: new Date().toISOString() });
    }

    return apiFetch<Post>(`/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

/**
 * 커뮤니티 게시글 삭제
 * DELETE /community/{post_id}
 */
export async function deleteCommunityPost(postId: number): Promise<{ message: string }> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(400);
        removePost('community', postId);
        return { message: '게시글이 삭제되었습니다.' };
    }

    return apiFetch<{ message: string }>(`/community/${postId}`, {
        method: 'DELETE',
    });
}

/**
 * 프로젝트 게시글 삭제
 * DELETE /posts/{post_id}
 */
export async function deleteProjectPost(postId: number): Promise<{ message: string }> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(400);
        removePost('project', postId);
        return { message: '게시글이 삭제되었습니다.' };
    }

    return apiFetch<{ message: string }>(`/posts/${postId}`, {
        method: 'DELETE',
    });
}

/**
 * 커뮤니티 댓글 작성
 * POST /community/{post_id}/comments
 */
export async function createCommunityComment(postId: number, data: PostCommentCreateRequest): Promise<PostComment> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(400);
        return saveComment('community', postId, data.content);
    }

    return apiFetch<PostComment>(`/community/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 프로젝트 댓글 작성
 * POST /posts/{post_id}/comments
 */
export async function createProjectComment(postId: number, data: PostCommentCreateRequest): Promise<PostComment> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(400);
        return saveComment('project', postId, data.content);
    }

    return apiFetch<PostComment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * 커뮤니티 댓글 삭제
 * DELETE /community/comments/{comment_id}
 */
export async function deleteCommunityComment(commentId: number): Promise<{ message: string }> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(300);
        removeComment('community', commentId);
        return { message: '댓글이 삭제되었습니다.' };
    }

    return apiFetch<{ message: string }>(`/community/comments/${commentId}`, {
        method: 'DELETE',
    });
}

/**
 * 프로젝트 댓글 삭제
 * DELETE /posts/comments/{comment_id}
 */
export async function deleteProjectComment(commentId: number): Promise<{ message: string }> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(300);
        removeComment('project', commentId);
        return { message: '댓글이 삭제되었습니다.' };
    }

    return apiFetch<{ message: string }>(`/posts/comments/${commentId}`, {
        method: 'DELETE',
    });
}
