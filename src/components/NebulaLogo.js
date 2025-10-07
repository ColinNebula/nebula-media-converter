import React from 'react';

const NebulaLogo = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 200 200" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <radialGradient id="nebulaGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style={{stopColor:'#667eea', stopOpacity:1}} />
        <stop offset="50%" style={{stopColor:'#764ba2', stopOpacity:0.8}} />
        <stop offset="100%" style={{stopColor:'#f093fb', stopOpacity:0.6}} />
      </radialGradient>
      
      <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{stopColor:'#00f5ff', stopOpacity:0.8}} />
        <stop offset="50%" style={{stopColor:'#ff6b6b', stopOpacity:0.6}} />
        <stop offset="100%" style={{stopColor:'#4ecdc4', stopOpacity:0.8}} />
      </linearGradient>
      
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* Background circle (nebula) */}
    <circle cx="100" cy="100" r="90" fill="url(#nebulaGradient)" opacity="0.3"/>
    
    {/* Outer ring */}
    <circle cx="100" cy="100" r="80" fill="none" stroke="url(#nebulaGradient)" strokeWidth="2" opacity="0.6"/>
    
    {/* Central "N" for Nebula */}
    <g transform="translate(100, 100)" filter="url(#glow)">
      <path 
        d="M-25,-30 L-25,30 M-25,-30 L25,30 M25,-30 L25,30" 
        stroke="#ffffff" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
    </g>
    
    {/* Audio wave elements */}
    <g transform="translate(100, 100)" opacity="0.7">
      {/* Left audio waves */}
      <path 
        d="M-50,-10 Q-45,-15 -40,-10 Q-35,-5 -30,-10" 
        stroke="url(#waveGradient)" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M-50,0 Q-45,-8 -40,0 Q-35,8 -30,0" 
        stroke="url(#waveGradient)" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M-50,10 Q-45,5 -40,10 Q-35,15 -30,10" 
        stroke="url(#waveGradient)" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
      
      {/* Right audio waves */}
      <path 
        d="M30,-10 Q35,-15 40,-10 Q45,-5 50,-10" 
        stroke="url(#waveGradient)" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M30,0 Q35,-8 40,0 Q45,8 50,0" 
        stroke="url(#waveGradient)" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
      <path 
        d="M30,10 Q35,5 40,10 Q45,15 50,10" 
        stroke="url(#waveGradient)" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
      />
    </g>
    
    {/* Media elements */}
    <g opacity="0.6">
      {/* Play button */}
      <polygon points="40,40 40,60 55,50" fill="#00f5ff"/>
      
      {/* Video icon */}
      <rect x="145" y="40" width="15" height="10" rx="2" fill="#ff6b6b"/>
      <circle cx="150" cy="45" r="2" fill="#ffffff"/>
      
      {/* Music note */}
      <circle cx="45" cy="155" r="4" fill="#4ecdc4"/>
      <path 
        d="M49,155 L49,140 Q52,138 55,140 L55,150" 
        stroke="#4ecdc4" 
        strokeWidth="2" 
        fill="none"
      />
      
      {/* Conversion arrows */}
      <path 
        d="M145,150 L155,150 M150,145 L155,150 L150,155" 
        stroke="#f093fb" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </g>
    
    {/* Animated particles */}
    <g opacity="0.8">
      <circle cx="60" cy="70" r="2" fill="#ffffff">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="140" cy="80" r="1.5" fill="#00f5ff">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="70" cy="140" r="1" fill="#ff6b6b">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="130" cy="130" r="1.5" fill="#4ecdc4">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite"/>
      </circle>
    </g>
  </svg>
);

export default NebulaLogo;