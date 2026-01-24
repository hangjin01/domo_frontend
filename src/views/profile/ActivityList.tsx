'use client';

import React from 'react';
import { ActivityLog } from '@/src/models/api';
import { Clock } from 'lucide-react';

interface Props {
    activities: ActivityLog[];
}

export function ActivityList({ activities }: Props) {
    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
                <Clock size={48} className="mb-4 opacity-20" />
                <p>No recent activities found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/40 dark:bg-[#1E212B]/60 backdrop-blur-md border border-white/20 dark:border-gray-700/50 rounded-2xl p-6 shadow-xl h-full overflow-hidden flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 px-2">
                Recent Activity
            </h3>

            <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-3">
                {activities.map((log) => (
                    <div
                        key={log.id}
                        className="group flex gap-4 p-3 rounded-xl hover:bg-white/50 dark:hover:bg-black/20 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700/50"
                    >
                        <div className="flex-shrink-0 mt-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-xs font-bold text-white ${getActionColor(log.action_type)}`}>
                                {log.action_type.charAt(0)}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug break-words">
                                {log.content}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                  {log.action_type}
                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-600">
                  {new Date(log.created_at).toLocaleString()}
                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getActionColor(type: string): string {
    // layout.tsx의 colors.domo 참조
    switch (type.toUpperCase()) {
        case 'CREATE': return 'bg-green-500';
        case 'UPDATE': return 'bg-blue-500';
        case 'DELETE': return 'bg-red-500';
        case 'UPLOAD': return 'bg-domo-highlight'; // #E879F9
        default: return 'bg-domo-primary'; // #8D6E63
    }
}