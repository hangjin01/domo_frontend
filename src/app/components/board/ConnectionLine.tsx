"use client";

import React from 'react';
import type { Node, Connection } from '@/types';

interface ConnectionLinesProps {
  connections: Connection[];
  nodes: Node[];
  isDark: boolean;
  isConnecting: boolean;
  connectFrom: number | null;
}

// 베지어 곡선 경로 계산
function getConnectionPath(from: Node, to: Node): string {
  const startX = from.x + 220;
  const startY = from.y + 50;
  const endX = to.x;
  const endY = to.y + 50;
  const midX = (startX + endX) / 2;

  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
}

export function ConnectionLines({
  connections,
  nodes,
  isDark,
  isConnecting,
  connectFrom,
}: ConnectionLinesProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', minWidth: '2000px', minHeight: '1000px' }}
    >
      {/* 기존 연결선들 */}
      {connections.map((conn, idx) => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (!fromNode || !toNode) return null;

        return (
          <path
            key={idx}
            d={getConnectionPath(fromNode, toNode)}
            fill="none"
            stroke={isDark ? '#6e6e80' : '#acacbe'}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}

      {/* 연결 중일 때 시작점 표시 */}
      {isConnecting && connectFrom !== null && (
        <circle
          cx={(nodes.find(n => n.id === connectFrom)?.x ?? 0) + 220}
          cy={(nodes.find(n => n.id === connectFrom)?.y ?? 0) + 50}
          r="8"
          fill="#3b82f6"
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

export { getConnectionPath };
