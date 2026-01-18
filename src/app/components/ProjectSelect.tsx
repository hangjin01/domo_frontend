"use client";

import React, { useState, useEffect } from 'react';
import { getMyProjects, logout, API_CONFIG } from '@/lib/api';
import type { Project, AuthUser } from '@/types';

// ============================================
// 컴포넌트
// ============================================
interface ProjectSelectProps {
    user: AuthUser;
    onSelectProject: (project: Project) => void;
    onLogout: () => void;
}

export function ProjectSelect({ user, onSelectProject, onLogout }: ProjectSelectProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await getMyProjects();
            setProjects(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        onLogout();
    };

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: 'var(--bg-primary)' }}
        >
            {/* Header */}
            <header
                className="h-14 border-b flex items-center justify-between px-6"
                style={{ borderColor: 'var(--border-primary)' }}
            >
                <h1
                    className="text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                >
                    Domo
                </h1>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className="p-2 rounded-md transition-colors hover:bg-[var(--bg-secondary)]"
                    >
                        {isDark ? (
                            <svg className="w-4 h-4" fill="none" stroke="var(--text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="5"/>
                                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="var(--text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                            </svg>
                        )}
                    </button>

                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {user.name}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-sm px-3 py-1.5 rounded-md transition-colors hover:bg-[var(--bg-secondary)]"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        로그아웃
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-5xl mx-auto px-6 py-12">
                <div className="mb-8">
                    <h2
                        className="text-2xl font-semibold mb-2"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        My Workspace
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        프로젝트를 선택하여 타임라인을 확인하세요
                    </p>
                </div>

                {isLoading ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>로딩 중...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {projects.map(project => (
                            <div
                                key={project.id}
                                onClick={() => onSelectProject(project)}
                                className="relative rounded-xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                                style={{
                                    backgroundColor: isDark ? 'var(--bg-secondary)' : project.color,
                                }}
                            >
                                {/* 역할 태그 */}
                                <div className="absolute top-4 left-4">
                                    <span
                                        className="text-xs px-2 py-1 rounded-md"
                                        style={{
                                            backgroundColor: isDark ? 'var(--bg-tertiary)' : 'rgba(0,0,0,0.1)',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {project.role}
                                    </span>
                                </div>

                                <div className="p-5 pt-12">
                                    <h3
                                        className="text-lg font-semibold mb-4"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        {project.name}
                                    </h3>

                                    {/* 진행률 */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
                                            <span style={{ color: 'var(--text-primary)' }}>{project.progress}%</span>
                                        </div>
                                        <div
                                            className="h-1.5 rounded-full overflow-hidden"
                                            style={{ backgroundColor: isDark ? 'var(--bg-tertiary)' : 'rgba(0,0,0,0.1)' }}
                                        >
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${project.progress}%`,
                                                    backgroundColor: isDark ? 'var(--text-primary)' : 'var(--text-primary)',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* 메타 */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span style={{ color: 'var(--text-tertiary)' }}>
                                            👥 {project.memberCount}
                                        </span>
                                        <span style={{ color: 'var(--text-tertiary)' }}>
                                            🕐 {project.lastActivity}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* 새 프로젝트 */}
                        <div
                            className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-[var(--border-secondary)]"
                            style={{
                                borderColor: 'var(--border-primary)',
                                minHeight: '180px',
                            }}
                        >
                            <span
                                className="text-3xl mb-2"
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                +
                            </span>
                            <span
                                className="text-sm"
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                New Project
                            </span>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}