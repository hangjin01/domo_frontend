"use client";

import { useState } from "react";
import {
    LoginScreen,
    SignupScreen,
    VerifyEmailScreen,
    VerifySuccessScreen,
    WorkspaceListScreen,
    ProjectSelectScreen,
    BoardScreen,
} from "@/src/containers/screens";
import type { Project, AuthUser, Workspace } from "@/src/models/types";

type AuthScreen = 'login' | 'signup' | 'verify' | 'verify-success';

export default function Home() {
    // 인증 상태
    const [user, setUser] = useState<AuthUser | null>(null);
    const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
    const [pendingEmail, setPendingEmail] = useState<string>('');

    // 워크스페이스/프로젝트 상태
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // === 인증 핸들러 ===
    const handleLoginSuccess = (loggedInUser: AuthUser) => {
        setUser(loggedInUser);
    };

    const handleLogout = () => {
        setUser(null);
        setSelectedWorkspace(null);
        setSelectedProject(null);
        setAuthScreen('login');
    };

    const handleSignupSuccess = (email: string) => {
        setPendingEmail(email);
        setAuthScreen('verify');
    };

    const handleVerifySuccess = () => {
        setAuthScreen('verify-success');
    };

    const handleResendCode = async () => {
        // 인증 코드 재전송 로직 (API 구현 시 추가)
    };

    // === 워크스페이스/프로젝트 핸들러 ===
    const handleSelectWorkspace = (workspace: Workspace) => {
        setSelectedWorkspace(workspace);
    };

    const handleBackToWorkspaces = () => {
        setSelectedWorkspace(null);
        setSelectedProject(null);
    };

    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
    };

    const handleBackToProjects = () => {
        setSelectedProject(null);
    };

    // =====================================
    // 화면 렌더링 로직
    // =====================================

    // 1. 로그인 전 - 인증 화면들
    if (!user) {
        switch (authScreen) {
            case 'signup':
                return (
                    <SignupScreen
                        onSignupSuccess={handleSignupSuccess}
                        onBackToLogin={() => setAuthScreen('login')}
                    />
                );

            case 'verify':
                return (
                    <VerifyEmailScreen
                        email={pendingEmail}
                        onVerifySuccess={handleVerifySuccess}
                        onBackToSignup={() => setAuthScreen('signup')}
                        onResendCode={handleResendCode}
                    />
                );

            case 'verify-success':
                return (
                    <VerifySuccessScreen
                        onGoToLogin={() => setAuthScreen('login')}
                    />
                );

            default:
                return (
                    <LoginScreen
                        onLoginSuccess={handleLoginSuccess}
                        onGoToSignup={() => setAuthScreen('signup')}
                    />
                );
        }
    }

    // 2. 로그인됨, 워크스페이스 미선택 → 워크스페이스 목록 화면
    if (!selectedWorkspace) {
        return (
            <WorkspaceListScreen
                user={user}
                onSelectWorkspace={handleSelectWorkspace}
                onLogout={handleLogout}
            />
        );
    }

    // 3. 워크스페이스 선택됨, 프로젝트 미선택 → 프로젝트 선택 화면
    if (!selectedProject) {
        return (
            <ProjectSelectScreen
                workspace={selectedWorkspace}
                user={user}
                onSelectProject={handleSelectProject}
                onBack={handleBackToWorkspaces}
                onLogout={handleLogout}
            />
        );
    }

    // 4. 프로젝트 선택됨 → 보드 화면
    return (
        <div className="h-screen w-full overflow-hidden">
            <BoardScreen
                project={selectedProject}
                onBack={handleBackToProjects}
            />
        </div>
    );
}
