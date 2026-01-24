
import React from 'react';

export const Mascot: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="10" y="20" width="80" height="70" rx="15" fill="#8D6E63" stroke="#5D4037" strokeWidth="3" />
      <path d="M35 90 L35 98 A 5 5 0 0 0 45 98 L 45 90" fill="#8D6E63" stroke="#5D4037" strokeWidth="3" />
      <path d="M55 90 L55 98 A 5 5 0 0 0 65 98 L 65 90" fill="#8D6E63" stroke="#5D4037" strokeWidth="3" />
      <path d="M10 50 Q 0 60 10 70" fill="none" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
      <path d="M90 50 Q 100 60 90 70" fill="none" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 20 Q 20 5 40 5 L 50 5 Q 75 5 75 25 Q 75 40 50 35 Q 40 33 45 25" fill="#A1887F" stroke="#5D4037" strokeWidth="3" />
      <circle cx="35" cy="55" r="6" fill="white" stroke="#3E2723" strokeWidth="2" />
      <circle cx="65" cy="55" r="6" fill="white" stroke="#3E2723" strokeWidth="2" />
      <path d="M42 65 L 50 72 L 58 65" fill="none" stroke="#3E2723" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
