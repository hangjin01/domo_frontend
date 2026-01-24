'use client';

import React from 'react';
import { DropZone } from '@/src/containers/hooks/common/useDragAndDrop';
import { Plus, ArrowDown } from 'lucide-react';

interface DropZoneIndicatorProps {
  zone: DropZone;
  isActive: boolean;
}

/**
 * 드롭 존 시각적 표시 컴포넌트
 * 카드를 드래그할 때 드롭 가능한 영역을 표시합니다.
 */
export const DropZoneIndicator: React.FC<DropZoneIndicatorProps> = ({
  zone,
  isActive,
}) => {
  // 빈 그룹 드롭 존
  if (zone.type === 'into-group') {
    return (
      <div
        className={`
          absolute rounded-xl border-2 border-dashed
          flex items-center justify-center gap-2
          transition-all duration-200 ease-out
          ${isActive 
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 scale-105' 
            : 'border-gray-300 dark:border-gray-600 bg-gray-50/30 dark:bg-gray-800/30'
          }
        `}
        style={{
          left: zone.x,
          top: zone.y,
          width: zone.width,
          height: zone.height,
          opacity: isActive ? 1 : 0.6,
          pointerEvents: 'none',
        }}
      >
        <Plus 
          size={20} 
          className={`${isActive ? 'text-blue-500' : 'text-gray-400'} transition-colors`}
        />
        <span className={`text-sm font-medium ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
          여기에 놓기
        </span>
      </div>
    );
  }

  // 카드 사이 드롭 존 (선형 인디케이터)
  return (
    <div
      className={`
        absolute transition-all duration-200 ease-out
        ${isActive ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        left: zone.x,
        top: zone.y + zone.height / 2 - 2,
        width: zone.width,
        height: 4,
        pointerEvents: 'none',
      }}
    >
      {/* 메인 라인 */}
      <div 
        className={`
          w-full h-1 rounded-full
          ${isActive ? 'bg-blue-500' : 'bg-gray-300'}
          transition-all duration-200
        `}
      />
      
      {/* 양쪽 끝 원형 장식 */}
      <div 
        className={`
          absolute -left-1.5 top-1/2 -translate-y-1/2
          w-3 h-3 rounded-full
          ${isActive ? 'bg-blue-500' : 'bg-gray-300'}
          transition-all duration-200
        `}
      />
      <div 
        className={`
          absolute -right-1.5 top-1/2 -translate-y-1/2
          w-3 h-3 rounded-full
          ${isActive ? 'bg-blue-500' : 'bg-gray-300'}
          transition-all duration-200
        `}
      />

      {/* 드롭 힌트 아이콘 */}
      {isActive && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 -top-8 
                     bg-blue-500 text-white px-2 py-1 rounded-lg
                     text-xs font-medium shadow-lg
                     animate-bounce"
        >
          <ArrowDown size={12} className="inline-block mr-1" />
          놓기
        </div>
      )}
    </div>
  );
};

interface DropZoneOverlayProps {
  dropZones: DropZone[];
  activeDropZone: DropZone | null;
  isDragging: boolean;
}

/**
 * 전체 드롭 존 오버레이
 * 드래그 중일 때만 표시됩니다.
 */
export const DropZoneOverlay: React.FC<DropZoneOverlayProps> = ({
  dropZones,
  activeDropZone,
  isDragging,
}) => {
  if (!isDragging) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {dropZones.map(zone => (
        <DropZoneIndicator
          key={zone.id}
          zone={zone}
          isActive={activeDropZone?.id === zone.id}
        />
      ))}
    </div>
  );
};

export default DropZoneOverlay;
