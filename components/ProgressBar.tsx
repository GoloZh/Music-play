import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  currentTime: number;
  duration: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const formatTime = (seconds: number) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, currentTime, duration, onSeek }) => {
  return (
    <div className="flex items-center w-full gap-4 select-none">
      <span className="text-[10px] text-[var(--theme-color)] w-16 text-right font-mono">{formatTime(currentTime)}</span>
      
      <div className="relative flex-1 h-6 flex items-center">
        {/* Background Track - Bordered Box */}
        <div className="absolute w-full h-4 bg-black border-2 border-[var(--theme-color)]"></div>
        
        {/* Progress Fill - Blocky */}
        <div 
          className="absolute h-4 bg-[var(--theme-color)] border-y-2 border-l-2 border-[var(--theme-color)]"
          style={{ width: `${progress}%` }}
        />
        
        {/* Thumb - A square block */}
        <div 
          className="absolute h-6 w-3 bg-white border-2 border-black z-20 pointer-events-none"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        />

        {/* Input - Transparent Overlay */}
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="0.1"
          value={progress || 0} 
          onChange={onSeek}
          className="absolute w-full h-full opacity-0 cursor-pointer z-30"
        />
      </div>

      <span className="text-[10px] text-[var(--theme-color)] w-16 font-mono">{formatTime(duration)}</span>
    </div>
  );
};

export default ProgressBar;