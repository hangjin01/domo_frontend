"use client";

import { useState } from "react";
import { LoginScreen } from "./LoginScreen";
import { ProjectSelect } from "./ui/ProjectSelect";
import { WorkspaceBoard } from "./board/WorkspaceBoard"; // BlueprintBoard -> WorkspaceBoard로 교체
import type { Project, AuthUser } from "@/src/types";

export default function Home() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const handleLoginSuccess = (loggedInUser: AuthUser) => {
        setUser(loggedInUser);
    };

    const handleLogout = () => {
        setUser(null);
        setSelectedProject(null);
    };

    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
    };

    const handleBackToProjects = () => {
        setSelectedProject(null);
    };

    // 1. 로그인 안됨 → 로그인 화면
    if (!user) {
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    // 2. 로그인됨, 프로젝트 미선택 → 프로젝트 선택 화면
    if (!selectedProject) {
        return (
            <ProjectSelect
                user={user}
                onSelectProject={handleSelectProject}
                onLogout={handleLogout}
            />
        );
    }

    // 3. 프로젝트 선택됨 → 워크스페이스 보드 (우리가 수정한 파일)
    return (
        <WorkspaceBoard
            project={selectedProject}
            onBack={handleBackToProjects}
        />
    );
}