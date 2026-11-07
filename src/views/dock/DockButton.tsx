/**
 * [파일 안내] frontend/src/views/dock/DockButton.tsx
 * 도크 아이콘 버튼의 공통 외형·선택 상태·클릭 이벤트를 렌더링합니다.
 * 도메인 동작은 부모가 전달하는 콜백이 결정하므로 버튼 자체에서 저장 정책을 추가하지 않습니다.
 */


"use client";

import React from 'react';

interface DockButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function DockButton({ icon, label, isActive, onClick }: DockButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all hover:scale-110 active:scale-95 ${
        isActive ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-tertiary)]'
      }`}
      style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
    >
      {icon}

      {/* 툴팁 */}
      <span
        className="absolute bottom-full mb-2 px-2.5 py-1.5 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none glass"
        style={{ color: 'var(--text-primary)' }}
      >
        {label}
      </span>

      {/* Active indicator */}
      {isActive && (
        <span 
          className="absolute -bottom-1 w-1 h-1 rounded-full"
          style={{ backgroundColor: 'var(--text-primary)' }}
        />
      )}
    </button>
  );
}
