"use client";

import { useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { ProjectSelect } from "./components/ProjectSelect";
import { BlueprintBoard } from "./components/BlueprintBoard";

interface Project {
    id: number;
    name: string;
    workspace: string;
    role: string;
    progress: number;
    memberCount: number;
    lastActivity: string;
    color: string;
}

export default function Home() {
    const [user, setUser] = useState<{ email: string; name: string } | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const handleLoginSuccess = (loggedInUser: { email: string; name: string }) => {
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

    // 3. 프로젝트 선택됨 → 블루프린트 보드
    return (
        <BlueprintBoard
            project={selectedProject}
            onBack={handleBackToProjects}
        />
    );
}