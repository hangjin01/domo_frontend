import type { Post, PostCreateRequest, PostUpdateRequest, PostComment, PostCommentCreateRequest } from '../../types';
import { API_CONFIG, apiFetch, apiUpload, mockDelay } from './config';
import { MOCK_POSTS } from './mock-data';

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
        return MOCK_POSTS.filter(p => p.project_id === projectId).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    const posts = await apiFetch<Post[]>(`/projects/${projectId}/posts`);

    return posts.map(post => ({
        ...post,
        title: post.title || 'Untitled', // 백엔드 데이터 보정
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
        return MOCK_POSTS.filter(p => !p.project_id || p.project_id === 1).sort((a, b) =>
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
        const newPost: Post = {
            id: Date.now(),
            project_id: projectId,
            user_id: 1, // Mock user
            title: data.title,
            content: data.content,
            created_at: new Date().toISOString(),
            user: { id: 1, name: '김도모', email: 'student@jj.ac.kr' } as any,
            comments: []
        };
        return newPost;
    }

    // 프로젝트 게시글은 JSON 전송 (파일 업로드 미지원 가정)
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
        const newPost: Post = {
            id: Date.now(),
            project_id: 1,
            user_id: 1, // Mock user
            title: data.title,
            content: data.content,
            image_url: data.file ? URL.createObjectURL(data.file) : undefined,
            created_at: new Date().toISOString(),
            user: { id: 1, name: '김도모', email: 'student@jj.ac.kr' } as any,
            comments: []
        };
        return newPost;
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
        const post = MOCK_POSTS.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');
        return post;
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
        const post = MOCK_POSTS.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');
        return post;
    }
    return apiFetch<Post>(`/posts/${postId}`);
}

/**
 * 커뮤니티 게시글 수정
 * PATCH /community/{post_id}
 */
export async function updateCommunityPost(postId: number, data: PostUpdateRequest): Promise<Post> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(500);
        const post = MOCK_POSTS.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');

        const updatedPost = { ...post, ...data, updated_at: new Date().toISOString() };
        return updatedPost;
    }

    return apiFetch<Post>(`/community/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

/**
 * 프로젝트 게시글 수정
 * PATCH /posts/{post_id}
 */
export async function updateProjectPost(postId: number, data: PostUpdateRequest): Promise<Post> {
    if (API_CONFIG.USE_MOCK) {
        await mockDelay(500);
        const post = MOCK_POSTS.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');
        return { ...post, ...data, updated_at: new Date().toISOString() };
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
        const index = MOCK_POSTS.findIndex(p => p.id === postId);
        if (index === -1) throw new Error('Post not found');
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
        const index = MOCK_POSTS.findIndex(p => p.id === postId);
        if (index === -1) throw new Error('Post not found');
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
        const newComment: PostComment = {
            id: Date.now(),
            post_id: postId,
            user_id: 1,
            content: data.content,
            created_at: new Date().toISOString(),
            user: { id: 1, name: '김도모', email: 'student@jj.ac.kr' } as any
        };
        return newComment;
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
        const newComment: PostComment = {
            id: Date.now(),
            post_id: postId,
            user_id: 1,
            content: data.content,
            created_at: new Date().toISOString(),
            user: { id: 1, name: '김도모', email: 'student@jj.ac.kr' } as any
        };
        return newComment;
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
        return { message: '댓글이 삭제되었습니다.' };
    }

    return apiFetch<{ message: string }>(`/posts/comments/${commentId}`, {
        method: 'DELETE',
    });
}
