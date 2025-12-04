
import React, { useEffect, useState, useRef } from 'react';
import { Song, LyricLine } from '../types';
import { RETRO_LOGS } from '../constants';

interface LyricsDisplayProps {
  song?: Song;
  currentTime: number;
  isPlaying: boolean;
  analyser?: AnalyserNode | null;
  themeColor?: string;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ 
  song, 
  currentTime, 
  isPlaying, 
  analyser, 
  themeColor = '#4ade80' 
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  // Audio Visualization Loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      if (!analyser) {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      // Draw mirrored spectrum from center
      const centerX = canvas.width / 2;
      
      // Use fewer bins for retro look (low res)
      const step = 4; 
      
      for (let i = 0; i < bufferLength; i += step) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.5;

        // Dynamic color opacity based on volume
        const alpha = 0.1 + (dataArray[i] / 255) * 0.4;
        ctx.fillStyle = themeColor + Math.floor(alpha * 255).toString(16).padStart(2, '0');

        // Right side
        ctx.fillRect(centerX + x, (canvas.height - barHeight) / 2, barWidth * step - 1, barHeight);
        // Left side
        ctx.fillRect(centerX - x - (barWidth * step), (canvas.height - barHeight) / 2, barWidth * step - 1, barHeight);

        x += barWidth * step;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    if (isPlaying && analyser) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying, themeColor]);

  // Effect: Generate logs if no lyrics
  useEffect(() => {
    if (!song) return;
    if (song.lyrics && song.lyrics.length > 0) return;

    const interval = setInterval(() => {
      if (!isPlaying) return;
      const randomLog = RETRO_LOGS[Math.floor(Math.random() * RETRO_LOGS.length)];
      const timestamp = new Date().toLocaleTimeString([], { hour12: false });
      setLogs(prev => [...prev.slice(-8), `[${timestamp}] ${randomLog}`]);
    }, 2000);

    return () => clearInterval(interval);
  }, [song, isPlaying]);

  // Effect: Auto Scroll for Lyrics (Synchronized)
  useEffect(() => {
    if (song?.lyrics && song.lyrics.length > 0 && activeLineRef.current && scrollRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } else if (!song?.lyrics?.length && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentTime, song]);

  // Handle Empty State
  if (!song) {
    return (
      <div className="h-full w-full bg-black border-4 border-gray-700 p-4 relative overflow-hidden flex flex-col items-center justify-center shadow-inner">
         <div className="absolute top-0 left-0 w-full h-1 bg-[var(--theme-color)] opacity-20 animate-pulse"></div>
         <div className="text-[var(--theme-color)] font-mono text-center space-y-4">
            <div className="text-4xl animate-pulse">_</div>
            <div>
              <p className="text-sm font-bold mb-2">SYSTEM IDLE</p>
              <p className="text-[10px] opacity-50">WAITING FOR MEDIA...</p>
            </div>
         </div>
      </div>
    );
  }

  const hasLyrics = song.lyrics && song.lyrics.length > 0;
  let activeIndex = -1;
  if (hasLyrics) {
    activeIndex = song.lyrics!.findIndex((line) => line.time > currentTime) - 1;
    if (activeIndex === -2) {
      activeIndex = song.lyrics!.length - 1;
    }
  }

  return (
    <div className="h-full w-full bg-black border-4 border-gray-700 p-4 relative overflow-hidden flex flex-col shadow-inner">
       {/* Visualizer Canvas Layer (Behind Text) */}
       <canvas 
         ref={canvasRef} 
         className="absolute inset-0 w-full h-full pointer-events-none opacity-50 z-0"
       />

       {/* Top Header */}
       <div className="border-b-2 border-dashed border-[var(--theme-color)] pb-4 mb-4 text-center relative z-10 bg-black/50 backdrop-blur-sm">
          <h1 className="text-sm md:text-base text-[var(--theme-color)] mb-2 truncate">NOW PLAYING: {song.title}</h1>
          <div className="flex justify-between text-[10px] text-gray-400">
             <span>ARTIST: {song.artist}</span>
             <span>ALBUM: {song.album.substring(0, 15)}{song.album.length > 15 ? '...' : ''}</span>
          </div>
       </div>

       {/* Scrollable Lyrics Area */}
       <div 
         ref={scrollRef}
         className="flex-1 overflow-y-auto space-y-4 text-center scrollbar-hide relative z-10"
       >
          {hasLyrics ? (
            <>
              <div className="h-[40%]"></div>
              {song.lyrics!.map((line, index) => {
                const isActive = index === activeIndex;
                return (
                  <p 
                    key={index} 
                    ref={isActive ? activeLineRef : null}
                    className={`
                      text-sm md:text-base uppercase tracking-widest cursor-pointer transition-all duration-300
                      ${isActive 
                        ? 'text-[var(--theme-color)] scale-110 font-bold drop-shadow-[0_0_5px_var(--theme-color)] bg-black/80 inline-block px-2' 
                        : 'text-gray-600 hover:text-gray-400'
                      }
                    `}
                    style={{ textShadow: isActive ? '2px 2px 0px black' : 'none' }}
                  >
                    {line.text}
                  </p>
                );
              })}
              <div className="h-[40%]"></div>
            </>
          ) : (
            <div className="font-mono text-xs text-[var(--theme-color)] text-left space-y-2 h-full flex flex-col justify-end">
              <div className="opacity-50 text-[10px] mb-4">
                NO LYRICS DATA FOUND.<br/>
                INITIATING AUDIO VISUALIZATION PROTOCOL...
              </div>
              {logs.map((log, i) => (
                <div key={i} className="animate-pulse bg-black/60">
                  <span className="opacity-70 mr-2">{">"}</span>
                  {log}
                </div>
              ))}
            </div>
          )}
       </div>
       
       <div className="absolute bottom-2 right-2 animate-pulse z-20">
         <div className={`w-3 h-3 ${isPlaying ? 'bg-[var(--theme-color)]' : 'bg-red-500'}`}></div>
       </div>
    </div>
  );
};

export default LyricsDisplay;