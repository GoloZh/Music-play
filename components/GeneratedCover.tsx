import React from 'react';

interface GeneratedCoverProps {
  themeColor: string;
}

const GeneratedCover: React.FC<GeneratedCoverProps> = ({ themeColor }) => {
  return (
    <div className="w-full h-full bg-black relative overflow-hidden flex items-center justify-center">
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full absolute inset-0"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="sky-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#16213e" />
          </linearGradient>
          <linearGradient id="sun-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={themeColor} stopOpacity="1" />
            <stop offset="100%" stopColor="#ff0080" stopOpacity="1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="500" height="500" fill="url(#sky-gradient)" />

        {/* Retro Grid (Perspective) */}
        <g opacity="0.3">
             <path d="M 0 300 L 500 300" stroke={themeColor} strokeWidth="1" />
             <path d="M 0 340 L 500 340" stroke={themeColor} strokeWidth="1" />
             <path d="M 0 390 L 500 390" stroke={themeColor} strokeWidth="2" />
             <path d="M 0 450 L 500 450" stroke={themeColor} strokeWidth="2" />
             
             <path d="M 250 300 L 0 500" stroke={themeColor} strokeWidth="1" />
             <path d="M 250 300 L 500 500" stroke={themeColor} strokeWidth="1" />
             <path d="M 250 300 L 100 500" stroke={themeColor} strokeWidth="1" />
             <path d="M 250 300 L 400 500" stroke={themeColor} strokeWidth="1" />
             <path d="M 250 300 L 250 500" stroke={themeColor} strokeWidth="1" />
        </g>

        {/* Retro Sun */}
        <circle cx="250" cy="200" r="100" fill="url(#sun-gradient)" filter="url(#glow)" />
        
        {/* Sun Cut Lines */}
        <rect x="100" y="210" width="300" height="8" fill="#1a1a2e" opacity="0.8" />
        <rect x="100" y="230" width="300" height="12" fill="#1a1a2e" opacity="0.8" />
        <rect x="100" y="255" width="300" height="18" fill="#1a1a2e" opacity="0.8" />
        <rect x="100" y="285" width="300" height="24" fill="#1a1a2e" opacity="0.8" />

        {/* Mountains */}
        <path d="M -50 300 L 100 150 L 250 300 Z" fill="#0f0f1a" stroke={themeColor} strokeWidth="2" />
        <path d="M 250 300 L 400 120 L 550 300 Z" fill="#0f0f1a" stroke={themeColor} strokeWidth="2" />
        <path d="M 100 300 L 250 180 L 400 300 Z" fill="#000" stroke={themeColor} strokeWidth="2" />

        {/* Text */}
        <text 
            x="250" y="80" 
            textAnchor="middle" 
            fill="white" 
            fontFamily="monospace" 
            fontSize="42" 
            fontWeight="bold" 
            letterSpacing="6" 
            filter="url(#glow)"
            style={{ textShadow: `4px 4px 0px ${themeColor}` }}
        >
            PIXEL TUNES
        </text>
        <text 
            x="250" y="460" 
            textAnchor="middle" 
            fill={themeColor} 
            fontFamily="monospace" 
            fontSize="18" 
            letterSpacing="8"
            className="animate-pulse"
        >
            DEMO EDITION
        </text>
      </svg>
      
      {/* Scanline Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50"></div>
    </div>
  );
};

export default GeneratedCover;