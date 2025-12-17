"use client";

import { useEffect, useState } from 'react';

export function AnimatedFlowerLogo() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Placeholder during SSR */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="40" fill="#7e22ce" opacity="0.5" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      {/* Rotating Flower Animation */}
      <svg
        className="absolute inset-0 w-full h-full animate-spin-slow"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="flowerGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#9333ea', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#7e22ce', stopOpacity: 1 }} />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Flower petals - 8 petals in a star pattern */}
        <g filter="url(#glow)">
          {[...Array(8)].map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const x1 = 100 + Math.cos(angle) * 30;
            const y1 = 100 + Math.sin(angle) * 30;
            const x2 = 100 + Math.cos(angle) * 70;
            const y2 = 100 + Math.sin(angle) * 70;
            const x3 = 100 + Math.cos(angle + 0.3) * 50;
            const y3 = 100 + Math.sin(angle + 0.3) * 50;
            const x4 = 100 + Math.cos(angle - 0.3) * 50;
            const y4 = 100 + Math.sin(angle - 0.3) * 50;
            
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} Q ${x3} ${y3} ${x2} ${y2} Q ${x4} ${y4} ${x1} ${y1} Z`}
                fill="url(#flowerGradient)"
                stroke="#7e22ce"
                strokeWidth="1"
                opacity="0.9"
              />
            );
          })}
          
          {/* Inner flower layer */}
          {[...Array(8)].map((_, i) => {
            const angle = ((i * 45 + 22.5) * Math.PI) / 180;
            const x1 = 100 + Math.cos(angle) * 20;
            const y1 = 100 + Math.sin(angle) * 20;
            const x2 = 100 + Math.cos(angle) * 50;
            const y2 = 100 + Math.sin(angle) * 50;
            const x3 = 100 + Math.cos(angle + 0.4) * 35;
            const y3 = 100 + Math.sin(angle + 0.4) * 35;
            const x4 = 100 + Math.cos(angle - 0.4) * 35;
            const y4 = 100 + Math.sin(angle - 0.4) * 35;
            
            return (
              <path
                key={`inner-${i}`}
                d={`M ${x1} ${y1} Q ${x3} ${y3} ${x2} ${y2} Q ${x4} ${y4} ${x1} ${y1} Z`}
                fill="#c084fc"
                stroke="#a855f7"
                strokeWidth="0.5"
                opacity="0.8"
              />
            );
          })}
          
          {/* Center circle */}
          <circle cx="100" cy="100" r="15" fill="#7e22ce" opacity="0.9" />
          <circle cx="100" cy="100" r="12" fill="#a855f7" opacity="0.8" />
        </g>
      </svg>

      {/* Project Name in Center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white drop-shadow-lg">AI</span>
      </div>
    </div>
  );
}
