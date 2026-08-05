import React from 'react';

export function Logo({ showWordmark = true, size = 32 }: { showWordmark?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="20" width="160" height="160" rx="28" fill="#C9B59C" />
        <path
          d="M44 96 L100 140 L156 96 L156 152 Q156 160 148 160 L52 160 Q44 160 44 152 Z"
          fill="none" stroke="#2B241C" strokeWidth="4" strokeLinejoin="round"
        />
        <path d="M100 68 L152 148 L100 132 L76 148 Z" fill="#2B241C" />
        <path d="M100 68 L100 132" stroke="#F9F8F6" strokeWidth="2" />
      </svg>
      {showWordmark && (
        <span className="font-bold text-ink-900" style={{ fontSize: size * 0.7 }}>Flymail</span>
      )}
    </div>
  );
}
