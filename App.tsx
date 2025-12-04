
import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Search, Disc, Music, User,
  Globe, Volume2, VolumeX, Volume1,
  Shuffle, Upload, FileAudio, Trash2, Library, Heart, Star, PlayCircle
} from 'lucide-react';
import { DEFAULT_ITUNES_SONGS } from './constants';
import { Song, LyricLine } from './types';
import PixelButton from './components/PixelButton';
import LyricsDisplay from './components/Visualizer';
import ProgressBar from './components/ProgressBar';
import { saveSongToDB, getAllSongsFromDB, deleteSongFromDB } from './db';

// Helper to generate consistent pixel colors based on string
const generateCoverColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// Updated Helper to parse LRC lyrics with timestamps
const parseLRC = (lrcString: string): LyricLine[] => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const result: LyricLine[] = [];
  const timeReg = /\[(\d{2}):(\d{2})(\.\d{2,3})?\]/;

  for (const line of lines) {
    const match = timeReg.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = match[3] ? parseFloat(match[3]) : 0;
      const time = min * 60 + sec + ms;
      const text = line.replace(timeReg, '').trim();
      
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result;
};

const THEMES = [
  { color: '#4ade80', name: 'MATRIX' }, // Green
  { color: '#fbbf24', name: 'AMBER' },  // Amber
  { color: '#22d3ee', name: 'CYAN' },   // Cyan
  { color: '#f472b6', name: 'SYNTH' },  // Pink
  { color: '#ef4444', name: 'DANGER' }  // Red
];

// Curated list of Retro/Cyberpunk/Vaporwave images for idle state
const IDLE_COVERS = [
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop", // Retro Room
  "https://images.unsplash.com/photo-1614726365723-49cfae95843b?q=80&w=600&auto=format&fit=crop", // Neon City
  "https://images.unsplash.com/photo-1592147159781-b586e3e56637?q=80&w=600&auto=format&fit=crop", // Cassette
  "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=600&auto=format&fit=crop", // Matrix Code
  "https://images.unsplash.com/photo-1515549832467-8783363e19b6?q=80&w=600&auto=format&fit=crop", // Vaporwave Statue
  "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop", // Neon Sign
];

// Expanded Discovery Keywords for Random Mix to reduce repetition
const DISCOVERY_TAGS = [
  // Mandopop / C-Pop
  "周杰伦", "陈奕迅", "林俊杰", "邓紫棋", "王力宏", "五月天", "孙燕姿", "蔡依林", "李荣浩", "薛之谦",
  "伍佰", "张学友", "王菲", "陶喆", "苏打绿", "张惠妹", "莫文蔚", "徐佳莹", "田馥甄", "告五人",
  "草东没有派对", "万能青年旅店", "赵雷", "朴树", "许巍", "李健", "毛不易", "周深", "张杰", "华晨宇",
  
  // Genres / Moods
  "抖音热歌", "网络热歌", "经典老歌", "车载音乐", "助眠纯音乐", "游戏原声", "古风", "民谣", "说唱", "摇滚",
  "R&B", "Jazz", "Lo-Fi", "Hip-Hop", "Electronic", "Synthwave", "Vaporwave", "City Pop", "Cyberpunk",
  "Classical", "Piano", "Violin", "Guitar", "Study Music", "Workout", "Relaxing", "Sad Songs",
  
  // Western / International
  "Taylor Swift", "Justin Bieber", "Ed Sheeran", "Adele", "Bruno Mars", "Coldplay", "Imagine Dragons", "Maroon 5",
  "Billie Eilish", "Ariana Grande", "The Weeknd", "Post Malone", "Eminem", "Drake", "Rihanna", "Beyonce",
  "Linkin Park", "Green Day", "Queen", "The Beatles", "Michael Jackson", "Madonna", "Britney Spears",
  
  // Asian Pop (K-Pop / J-Pop)
  "BTS", "BLACKPINK", "Twice", "NewJeans", "EXO", "Big Bang", "IU", "G-Dragon",
  "Kenshi Yonezu", "YOASOBI", "Official Hige Dandism", "King Gnu", "Fujii Kaze", "Radwimps", "One OK Rock",
  "Lisa", "Aimer", "Ghibli", "Anime OST", "Naruto", "One Piece"
];

const App: React.FC = () => {
  const [themeColor, setThemeColor] = useState('#4ade80');
  
  // Playlists
  const [onlinePlaylist, setOnlinePlaylist] = useState<Song[]>(DEFAULT_ITUNES_SONGS);
  const [localPlaylist, setLocalPlaylist] = useState<Song[]>([]);
  const [favoritesPlaylist, setFavoritesPlaylist] = useState<Song[]>([]);

  // Navigation & Mode
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'LIBRARY' | 'FAVORITES'>('SEARCH');
  const [mode, setMode] = useState<'SEARCH' | 'LOCAL' | 'FAVORITES'>('SEARCH');
  
  // Player State
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Random Idle Cover - Pick one immediately
  const [idleCover, setIdleCover] = useState<string>(() => {
    return IDLE_COVERS[Math.floor(Math.random() * IDLE_COVERS.length)];
  });

  // Smart Random State
  const [recentTags, setRecentTags] = useState<string[]>([]);
  
  // Notification Toast
  const [toast, setToast] = useState<string | null>(null);
  
  // Audio Analysis State to pass to Visualizer
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  
  // Audio Analysis Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Helper to determine which list we are viewing vs playing
  const getVisibleList = () => {
    switch (activeTab) {
      case 'LIBRARY': return localPlaylist;
      case 'FAVORITES': return favoritesPlaylist;
      default: return onlinePlaylist;
    }
  };
  
  const getCurrentPlayingList = () => {
    switch (mode) {
      case 'LOCAL': return localPlaylist;
      case 'FAVORITES': return favoritesPlaylist;
      default: return onlinePlaylist;
    }
  };

  const visiblePlaylist = getVisibleList();
  const currentList = getCurrentPlayingList();
  const currentSong = currentList[currentSongIndex];
  
  // Check if current song is favored
  const isCurrentFav = currentSong ? favoritesPlaylist.some(s => s.id === currentSong.id) : false;

  // Initialize Local Library & Favorites
  useEffect(() => {
    const loadData = async () => {
      // 1. Load Local Files
      try {
        const songs = await getAllSongsFromDB();
        setLocalPlaylist(songs);
      } catch (err) {
        console.error("Failed to load local DB", err);
      }
      
      // 2. Load Favorites from LocalStorage
      try {
        const savedFavs = localStorage.getItem('pixel_tunes_favs');
        if (savedFavs) {
          setFavoritesPlaylist(JSON.parse(savedFavs));
        }
      } catch (err) {
        console.error("Failed to load favorites", err);
      }
    };
    loadData();
  }, []);

  // Initialize Audio Context
  const initAudioAnalyzer = () => {
    if (!audioRef.current) return;
    
    if (!audioContextRef.current) {
       const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
       audioContextRef.current = new AudioCtx();
       
       const newAnalyser = audioContextRef.current.createAnalyser();
       newAnalyser.fftSize = 256;
       
       try {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceRef.current.connect(newAnalyser);
          newAnalyser.connect(audioContextRef.current.destination);
          setAnalyser(newAnalyser); // Save to state to pass to child
       } catch (e) {
          console.log("Audio source already connected");
       }
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  useEffect(() => {
    if (isPlaying) {
      initAudioAnalyzer();
    }
  }, [isPlaying]);


  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      if (currentSong && isPlaying && !isBuffering) {
        if (currentSong.audioUrl) {
           const playPromise = audioRef.current.play();
           if (playPromise !== undefined) {
             playPromise.catch(e => {
               console.error("Playback error:", e);
               setIsPlaying(false);
             });
           }
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isBuffering, currentSongIndex, mode, onlinePlaylist, localPlaylist, favoritesPlaylist, currentSong]);

  // Fetch Song Details (GDStudio API)
  const fetchSongDetails = async (song: Song): Promise<Song | null> => {
     if (!song.source || !song.id) return song; 

     try {
        const urlRes = await fetch(`https://music-api.gdstudio.xyz/api.php?types=url&source=${song.source}&id=${song.id}&br=320`);
        const urlData = await urlRes.json();
        
        let finalCoverUrl = "";
        if (song.pic_id) {
           const picRes = await fetch(`https://music-api.gdstudio.xyz/api.php?types=pic&source=${song.source}&id=${song.pic_id}&size=500`);
           const picData = await picRes.json();
           finalCoverUrl = picData.url;
        }

        let finalLyrics: LyricLine[] = [];
        if (song.lyric_id) {
           const lrcRes = await fetch(`https://music-api.gdstudio.xyz/api.php?types=lyric&source=${song.source}&id=${song.lyric_id}`);
           const lrcData = await lrcRes.json();
           if (lrcData.lyric) {
              finalLyrics = parseLRC(lrcData.lyric);
           }
        }

        if (!urlData.url) {
           throw new Error("No audio URL returned from API");
        }

        return {
           ...song,
           audioUrl: urlData.url,
           coverUrl: finalCoverUrl || song.coverUrl,
           lyrics: finalLyrics
        };

     } catch (err) {
        console.error("Failed to fetch song details", err);
        return null;
     }
  };

  const searchMusic = async (term: string) => {
    if (!term.trim()) return;
    
    // Direct URL handling
    if (term.startsWith('http')) {
      const customSong: Song = {
        id: 'custom-' + Date.now(),
        title: 'CUSTOM URL STREAM',
        artist: 'UNKNOWN ARTIST',
        album: 'LOCAL IMPORT',
        coverUrl: '', 
        audioUrl: term,
        duration: 0,
        lyrics: [] 
      };
      setOnlinePlaylist([customSong]);
      setCurrentSongIndex(0);
      setMode('SEARCH');
      setActiveTab('SEARCH');
      setIsPlaying(true);
      setSearchQuery("");
      return;
    }

    setIsSearching(true);
    setSearchQuery(term);
    setMode('SEARCH');
    setActiveTab('SEARCH');
    
    try {
      const source = 'netease';
      const response = await fetch(`https://music-api.gdstudio.xyz/api.php?types=search&source=${source}&name=${encodeURIComponent(term)}&count=20`);
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        const newSongs: Song[] = data.map((item: any) => ({
          id: String(item.id),
          title: item.name,
          artist: Array.isArray(item.artist) ? item.artist.join(', ') : item.artist,
          album: item.album || 'Single',
          coverUrl: '', 
          audioUrl: '', 
          duration: 0, 
          lyrics: [],
          source: item.source,
          pic_id: item.pic_id,
          lyric_id: item.lyric_id
        }));
        
        setOnlinePlaylist(newSongs);
        setCurrentSongIndex(0);
        setIsPlaying(false);
        
        // Auto play first song if random mix
        if (DISCOVERY_TAGS.includes(term)) {
           setTimeout(() => playSongAtIndex(0, 'SEARCH'), 100);
        }

      } else {
        showToast("NO RESULTS FOUND");
      }
    } catch (error) {
      console.error("Search failed:", error);
      showToast("CONNECTION ERROR");
    } finally {
      setIsSearching(false);
    }
  };

  // Smart Random Mix with History
  const handleRandomMix = () => {
    // Filter out recently used tags to prevent repetition
    const availableTags = DISCOVERY_TAGS.filter(tag => !recentTags.includes(tag));
    
    // If we exhausted almost all tags (unlikely), reset or use full list
    const pool = availableTags.length > 0 ? availableTags : DISCOVERY_TAGS;
    
    const randomTag = pool[Math.floor(Math.random() * pool.length)];

    // Update history
    setRecentTags(prev => {
       const newTags = [randomTag, ...prev];
       if (newTags.length > 20) newTags.pop(); // Keep memory of last 20
       return newTags;
    });

    searchMusic(randomTag);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const newSong: Song = {
      id: `local-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'LOCAL LIBRARY',
      album: 'MY UPLOADS',
      coverUrl: '', 
      audioUrl: URL.createObjectURL(file),
      duration: 0,
      lyrics: [] 
    };

    try {
      await saveSongToDB(newSong, file);
      setLocalPlaylist(prev => [newSong, ...prev]);
      setActiveTab('LIBRARY');
      // Auto Play
      setMode('LOCAL');
      setCurrentSongIndex(0);
      setIsPlaying(true);
      showToast("FILE UPLOADED");
    } catch (err) {
      console.error("Storage failed", err);
      showToast("STORAGE FULL");
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (deleteConfirmId === id) {
      try {
        await deleteSongFromDB(id);
        setLocalPlaylist(prev => {
           const newList = prev.filter(s => s.id !== id);
           // Logic to handle deleting currently playing local song
           if (mode === 'LOCAL' && currentSong?.id === id) {
              setIsPlaying(false);
              if (newList.length === 0) {
                 setCurrentSongIndex(0);
              } else {
                 setCurrentSongIndex(prevIdx => prevIdx >= newList.length ? 0 : prevIdx);
              }
           }
           return newList;
        });
        setDeleteConfirmId(null);
        showToast("FILE DELETED");
      } catch (error) {
        console.error("Delete failed:", error);
      }
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => {
        setDeleteConfirmId(prev => prev === id ? null : prev);
      }, 3000);
    }
  }

  // Toast System
  const showToast = (message: string) => {
     if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
     setToast(message);
     toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2000);
  };

  // Favorites Logic
  const toggleFavorite = (e: React.MouseEvent | null, song: Song) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const exists = favoritesPlaylist.some(s => s.id === song.id);
    let newFavs = [];
    if (exists) {
      newFavs = favoritesPlaylist.filter(s => s.id !== song.id);
      showToast("REMOVED FROM FAVORITES");
    } else {
      newFavs = [...favoritesPlaylist, song];
      showToast("SAVED TO FAVORITES");
    }
    
    setFavoritesPlaylist(newFavs);
    localStorage.setItem('pixel_tunes_favs', JSON.stringify(newFavs));
  };
  
  const playAllFavorites = () => {
     if (favoritesPlaylist.length === 0) {
       showToast("NO FAVORITES YET");
       return;
     }
     setMode('FAVORITES');
     setCurrentSongIndex(0);
     playSongAtIndex(0, 'FAVORITES');
     showToast("PLAYING FAVORITES");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchMusic(searchQuery);
    }
  };

  const togglePlay = () => {
    if (!currentSong) return;
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && isFinite(audioRef.current.currentTime)) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSongEnd = () => {
    playNext();
  };

  const playSongAtIndex = async (index: number, forcedMode?: 'SEARCH' | 'LOCAL' | 'FAVORITES') => {
    // Determine which list initiated the play
    const targetMode = forcedMode || (activeTab === 'LIBRARY' ? 'LOCAL' : activeTab === 'FAVORITES' ? 'FAVORITES' : 'SEARCH');
    
    if (mode !== targetMode) setMode(targetMode);
    
    setCurrentSongIndex(index);
    setIsBuffering(true);
    setIsPlaying(false);
    setCurrentTime(0);

    let targetList: Song[] = [];
    if (targetMode === 'LOCAL') targetList = localPlaylist;
    else if (targetMode === 'FAVORITES') targetList = favoritesPlaylist;
    else targetList = onlinePlaylist;

    const songToPlay = targetList[index];

    // Lazy load logic for API songs
    if (targetMode !== 'LOCAL' && songToPlay && !songToPlay.audioUrl && songToPlay.id && songToPlay.source) {
       try {
         const detailedSong = await fetchSongDetails(songToPlay);
         if (detailedSong) {
            // Update the source list with details so we don't fetch again
            if (targetMode === 'FAVORITES') {
                setFavoritesPlaylist(prev => {
                    const newList = [...prev];
                    newList[index] = detailedSong;
                    localStorage.setItem('pixel_tunes_favs', JSON.stringify(newList));
                    return newList;
                });
            } else {
                setOnlinePlaylist(prev => {
                   const newList = [...prev];
                   newList[index] = detailedSong;
                   return newList;
                });
            }
         } else {
            showToast("RESOURCE BLOCKED / API ERROR");
         }
       } catch (e) {
         console.error(e);
       }
    }
    
    setTimeout(() => {
      setIsBuffering(false);
      setIsPlaying(true);
    }, 500);
  };

  const playNext = () => {
    const currentList = getCurrentPlayingList();
    if (currentList.length === 0) return;
    const nextIndex = (currentSongIndex + 1) % currentList.length;
    playSongAtIndex(nextIndex, mode);
  };

  const playPrev = () => {
    const currentList = getCurrentPlayingList();
    if (currentList.length === 0) return;
    const prevIndex = (currentSongIndex - 1 + currentList.length) % currentList.length;
    playSongAtIndex(prevIndex, mode);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentSong) return;
    const percent = parseFloat(e.target.value);
    if (audioRef.current && duration) {
      const newTime = (percent / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0) setIsMuted(false);
  };

  return (
    <div 
      className="flex flex-col h-screen w-full relative overflow-hidden font-sans"
      style={{
        '--theme-color': themeColor,
        '::selection': { backgroundColor: themeColor }
      } as React.CSSProperties}
    >
      {/* Background Layer - Simple Grid */}
      <div className="absolute inset-0 bg-[#0d0d12] z-0" />
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
           backgroundImage: `
             linear-gradient(to right, var(--theme-color) 1px, transparent 1px),
             linear-gradient(to bottom, var(--theme-color) 1px, transparent 1px)
           `,
           backgroundSize: '40px 40px',
        }}
      />
      {/* Vignette Effect */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

      <style>{`
        ::selection {
          background-color: var(--theme-color);
          color: black;
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[var(--theme-color)] text-black px-6 py-3 border-4 border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] z-[100] font-bold text-sm uppercase animate-bounce">
           {toast}
        </div>
      )}

      <audio
        ref={audioRef}
        src={currentSong?.audioUrl || ''}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleSongEnd}
        crossOrigin="anonymous"
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="audio/*" 
        className="hidden" 
      />

      {/* Main Content Wrapper */}
      <div className="z-10 flex flex-col h-full w-full scanlines">
        
        <div className="flex flex-1 overflow-hidden p-4 gap-4">
          {/* Sidebar */}
          <div className="w-72 bg-[#111] border-4 border-gray-600 flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] z-20 shrink-0">
            <div className="p-4 bg-[var(--theme-color)] text-black border-b-4 border-gray-600 mb-2">
              <div className="flex items-center gap-3">
                  <Disc size={24} className={isPlaying ? "animate-spin" : ""} />
                  <span className="text-sm font-bold" style={{fontFamily: '"Press Start 2P"'}}>PIXEL-TUNES</span>
              </div>
            </div>

            <div className="flex border-b-4 border-gray-600">
              <button 
                onClick={() => setActiveTab('SEARCH')}
                className={`flex-1 py-2 text-[10px] font-bold ${activeTab === 'SEARCH' ? 'bg-[var(--theme-color)] text-black' : 'bg-[#222] text-gray-500 hover:text-white'}`}
              >
                ONLINE
              </button>
              <button 
                onClick={() => setActiveTab('FAVORITES')}
                className={`flex-1 py-2 text-[10px] font-bold ${activeTab === 'FAVORITES' ? 'bg-[var(--theme-color)] text-black' : 'bg-[#222] text-gray-500 hover:text-white'}`}
              >
                FAV
              </button>
              <button 
                onClick={() => setActiveTab('LIBRARY')}
                className={`flex-1 py-2 text-[10px] font-bold ${activeTab === 'LIBRARY' ? 'bg-[var(--theme-color)] text-black' : 'bg-[#222] text-gray-500 hover:text-white'}`}
              >
                LIB
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide relative z-30">
              <div className="px-2 text-[10px] text-gray-500 mb-2 uppercase flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activeTab === 'SEARCH' && <Globe size={12} />}
                    {activeTab === 'LIBRARY' && <Library size={12} />}
                    {activeTab === 'FAVORITES' && <Heart size={12} />}
                    <span>
                      {activeTab} ({visiblePlaylist.length})
                    </span>
                  </div>
                  {isSearching && <span className="animate-pulse text-[var(--theme-color)]">LOADING...</span>}
              </div>
              
              {visiblePlaylist.length === 0 && activeTab === 'LIBRARY' && (
                <div className="p-4 text-[10px] text-gray-600 text-center border-2 border-dashed border-gray-700 m-2">
                  NO LOCAL FILES.<br/>CLICK UPLOAD BELOW.
                </div>
              )}
              
              {visiblePlaylist.length === 0 && activeTab === 'FAVORITES' && (
                <div className="p-4 text-[10px] text-gray-600 text-center border-2 border-dashed border-gray-700 m-2">
                  NO FAVORITES.<br/>CLICK HEART ICON TO ADD.
                </div>
              )}
              
              {activeTab === 'FAVORITES' && visiblePlaylist.length > 0 && (
                 <button 
                   onClick={playAllFavorites}
                   className="w-full text-[10px] bg-[#222] text-gray-300 hover:bg-[var(--theme-color)] hover:text-black py-2 mb-2 border border-gray-700 flex items-center justify-center gap-2"
                 >
                    <PlayCircle size={12} />
                    PLAY ALL FAVORITES
                 </button>
              )}

              <div className="space-y-2 pb-4">
                {visiblePlaylist.map((song, index) => {
                  const isItemPlaying = (mode === (activeTab === 'LIBRARY' ? 'LOCAL' : activeTab === 'FAVORITES' ? 'FAVORITES' : 'SEARCH')) && index === currentSongIndex;
                  const isConfirmingDelete = deleteConfirmId === song.id;
                  const isFav = favoritesPlaylist.some(s => s.id === song.id);

                  return (
                    <div 
                      key={song.id}
                      className={`
                        relative flex items-stretch border-2 transition-all duration-100 min-h-[50px]
                        ${isItemPlaying 
                          ? 'bg-[var(--theme-color)] text-black border-white shadow-[2px_2px_0px_0px_#fff]' 
                          : 'border-transparent text-gray-400 border-gray-800 hover:border-[var(--theme-color)]'}
                      `}
                    >
                        <button 
                          onClick={() => playSongAtIndex(index)}
                          className={`flex-1 flex items-center px-3 py-2 cursor-pointer gap-3 min-w-0 text-left outline-none ${!isItemPlaying ? 'hover:bg-black/50' : ''}`}
                        >
                          <div className="shrink-0">
                            {isItemPlaying && isPlaying ? (
                              <div className="w-3 h-3 bg-black animate-pulse" />
                            ) : (
                              <Music size={14} />
                            )}
                          </div>
                          <div className="flex flex-col overflow-hidden min-w-0">
                            <span className="text-[10px] tracking-wide font-bold truncate">{song.title}</span>
                            <span className={`text-[8px] truncate ${isItemPlaying ? 'text-black' : 'text-gray-600 group-hover:text-[var(--theme-color)]'}`}>{song.artist}</span>
                          </div>
                        </button>
                        
                        {/* Action Buttons: Fav or Delete */}
                        <div className="flex items-center">
                           {activeTab !== 'LIBRARY' && (
                              <button
                                onClick={(e) => toggleFavorite(e, song)}
                                className={`px-2 h-full flex items-center justify-center outline-none ${isFav ? 'text-red-500' : isItemPlaying ? 'text-black/50 hover:text-red-500' : 'text-gray-600 hover:text-red-500'}`}
                              >
                                 <Heart size={14} fill={isFav ? "currentColor" : "none"} />
                              </button>
                           )}

                           {activeTab === 'LIBRARY' && (
                              <button 
                                onClick={(e) => handleDeleteClick(e, song.id)}
                                className={`
                                  relative h-full flex items-center justify-center border-l-2 cursor-pointer transition-all duration-200 z-[100] outline-none px-2
                                  ${isConfirmingDelete 
                                      ? 'bg-red-600 text-white w-20 border-white'  
                                      : isItemPlaying 
                                          ? 'border-black hover:bg-red-500 hover:text-white' 
                                          : 'border-gray-800 hover:bg-red-900 hover:text-white bg-[#0f0f0f]'
                                  }
                                `}
                                type="button"
                              >
                                {isConfirmingDelete ? (
                                  <span className="text-[10px] font-bold animate-pulse whitespace-nowrap">SURE?</span>
                                ) : (
                                  <Trash2 size={16} className={`pointer-events-none ${isItemPlaying ? "text-black group-hover:text-red-900" : "text-gray-600 group-hover:text-white"}`} />
                                )}
                              </button>
                           )}
                        </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="border-t-4 border-gray-600 bg-[#0a0a0a] flex flex-col divide-y divide-gray-800 relative z-50">
              <div className="flex justify-between items-center p-2 bg-[#151515]">
                <div className="flex gap-2 mx-auto">
                  {THEMES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => setThemeColor(t.color)}
                      title={t.name}
                      className={`w-4 h-4 border-2 ${themeColor === t.color ? 'border-white scale-125' : 'border-gray-600 hover:border-white'}`}
                      style={{ backgroundColor: t.color }}
                    />
                  ))}
                </div>
              </div>

              {activeTab === 'SEARCH' && (
                <div 
                  onClick={handleRandomMix}
                  className={`p-3 cursor-pointer transition-colors flex justify-center items-center gap-2 hover:bg-[#222] text-[var(--theme-color)] bg-[#1a1a1a]`}
                >
                    <Shuffle size={14} className={isSearching ? "animate-spin" : ""} />
                    <span className="text-[10px] font-bold">RANDOM MIX</span>
                </div>
              )}
              
              <div 
                onClick={handleUploadClick}
                className={`p-3 cursor-pointer transition-colors flex justify-center items-center gap-2 hover:bg-[#222] text-[var(--theme-color)] bg-[#1a1a1a]`}
              >
                <Upload size={14} />
                <span className="text-[10px] font-bold">UPLOAD TO LIBRARY</span>
              </div>
            </div>
          </div>

          {/* Right Panel Container */}
          <div className="flex-1 flex flex-col bg-[#151515]/90 border-4 border-gray-600 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] relative min-w-0 z-20 backdrop-blur-sm">
             
             {/* TOP SEARCH BAR */}
             <div className="h-14 border-b-4 border-gray-800 flex items-center justify-between px-4 md:px-6 bg-[#222]/80">
                <div className="flex items-center text-[var(--theme-color)] gap-2 flex-1 max-w-md mr-4">
                   <Search size={16} className="shrink-0"/>
                   <input 
                    type="text" 
                    value={searchQuery}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={mode === 'LOCAL' ? "LOCAL LIBRARY MODE" : "SEARCH ARTIST / SONG..."}
                    disabled={mode === 'LOCAL'}
                    className="bg-transparent border-none outline-none text-xs text-[var(--theme-color)] placeholder-gray-600 w-full uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{fontFamily: '"Press Start 2P"'}}
                   />
                </div>

                <div className="flex items-center gap-4 shrink-0">
                   <div className="hidden md:flex items-center gap-2 border-2 border-gray-700 px-2 py-1 bg-black">
                      <User size={14} className="text-[var(--theme-color)]" />
                      <span className="text-[10px] text-[var(--theme-color)]" style={{fontFamily: '"Press Start 2P"'}}>
                        {mode === 'LOCAL' ? 'LOCAL_USER' : activeTab === 'FAVORITES' ? 'FAV_LIST' : 'VIP_USER'}
                      </span>
                   </div>
                </div>
             </div>

             {/* Main View Area (Art + Lyrics) */}
             <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 px-4 md:px-8 py-4 overflow-hidden relative">
                
                {(isBuffering || isSearching) && (
                  <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center flex-col gap-4">
                    <div className="w-16 h-16 border-4 border-[var(--theme-color)] border-t-transparent animate-spin"></div>
                    <span className="text-[var(--theme-color)] text-sm animate-pulse tracking-widest" style={{fontFamily: '"Press Start 2P"'}}>
                      {isSearching ? "SEARCHING API..." : "DOWNLOADING DATA..."}
                    </span>
                  </div>
                )}

                {/* Left: Album Art Box */}
                <div className="relative group shrink-0">
                  <div className={`
                      aspect-square
                      w-[240px] md:w-[320px] lg:w-[420px] xl:w-[480px]
                      border-4 border-white bg-black p-2 transition-all duration-300
                      ${isPlaying ? 'shadow-[0px_0px_20px_0px_var(--theme-color)] border-[var(--theme-color)]' : 'shadow-[8px_8px_0px_0px_var(--theme-color)]'}
                  `}>
                      {!currentSong ? (
                        <div className="w-full h-full relative group cursor-pointer overflow-hidden border-4 border-gray-800 bg-black">
                             {/* Background Idle Image */}
                             <img 
                               src={idleCover} 
                               alt="System Idle" 
                               className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                               style={{ imageRendering: 'pixelated' }}
                             />
                             {/* Overlay UI */}
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                <div className="text-[var(--theme-color)] text-center animate-pulse drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                                    <Disc size={48} className="mx-auto mb-4" />
                                    <h2 className="text-xs md:text-sm font-bold mb-2 tracking-widest bg-black/60 px-2">SYSTEM READY</h2>
                                    <p className="text-[8px] md:text-[10px] opacity-80 bg-black/60 px-1">WAITING FOR INPUT...</p>
                                </div>
                             </div>
                             {/* Scanline overlay for the image specifically */}
                             <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10"></div>
                        </div>
                      ) : currentSong.coverUrl && !currentSong.coverUrl.includes('via.placeholder') ? (
                        <img 
                          src={currentSong.coverUrl} 
                          alt="Art"
                          className="w-full h-full object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
                          style={{ backgroundColor: generateCoverColor(currentSong.title || 'Unknown') }}
                        >
                          <div className="absolute inset-0 opacity-20" style={{ 
                              backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2.5px)',
                              backgroundSize: '10px 10px'
                          }}></div>
                          <div className="w-20 h-20 bg-black/30 border-4 border-black flex items-center justify-center backdrop-blur-sm">
                              <Music size={40} className="text-white" />
                          </div>
                          <span className="mt-4 text-[8px] text-white font-bold bg-black px-2 py-1 border-2 border-white/50 truncate max-w-[80%] text-center">
                              {currentSong.title?.substring(0, 10)}
                          </span>
                        </div>
                      )}
                  </div>
                  {isPlaying && currentSong && (
                      <div className="absolute -top-3 -right-3 bg-[var(--theme-color)] text-black text-[10px] font-bold px-2 py-1 border-2 border-white animate-bounce" style={{fontFamily: '"Press Start 2P"'}}>
                        {mode === 'LOCAL' ? 'DISK' : 'PLAYING'}
                      </div>
                  )}
                </div>

                {/* Right: Lyrics Terminal */}
                <div className="flex-1 w-full h-[240px] md:h-[320px] lg:h-[420px] xl:h-[480px] min-w-0">
                  <LyricsDisplay 
                    song={currentSong} 
                    currentTime={currentTime} 
                    isPlaying={isPlaying} 
                    analyser={analyser}
                    themeColor={themeColor}
                  />
                </div>
             </div>
          </div>

        </div>

        {/* Bottom Player Controller */}
        <div className="h-24 bg-[#111] border-t-4 border-gray-600 flex items-center justify-between px-4 md:px-8 z-50 shrink-0">
          
          <div className="flex items-center gap-4 w-1/4 min-w-[150px]">
              <div className={`w-12 h-12 shrink-0 border-2 border-gray-500 flex items-center justify-center transition-colors ${isPlaying ? 'bg-[var(--theme-color)] text-black' : 'bg-gray-800 text-gray-500'}`}>
                {mode === 'LOCAL' ? <FileAudio size={20} /> : <Music size={20} />}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs md:text-sm text-[var(--theme-color)] uppercase truncate">{currentSong?.title || "NO DISC"}</span>
                <span className="text-[10px] text-gray-500 uppercase truncate">{currentSong?.artist || "INSERT DISC"}</span>
              </div>
              {/* Fav button for current song */}
              {currentSong && mode !== 'LOCAL' && (
                 <button 
                   onClick={() => toggleFavorite(null, currentSong)}
                   className={`${isCurrentFav ? 'text-red-500' : 'text-gray-500 hover:text-white'}`}
                 >
                    <Heart size={16} fill={isCurrentFav ? "currentColor" : "none"} />
                 </button>
              )}
          </div>

          <div className="flex flex-col items-center flex-1 max-w-xl px-2">
              <div className="flex items-center gap-6 mb-2">
                  <PixelButton 
                    variant="secondary" 
                    size="sm" 
                    onClick={playPrev} 
                    disabled={!currentSong}
                    className={`h-10 w-10 flex items-center justify-center p-0 ${!currentSong ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <SkipBack size={16} fill="currentColor" />
                  </PixelButton>
                  
                  <PixelButton 
                    onClick={togglePlay} 
                    variant="primary"
                    disabled={!currentSong}
                    className={`w-12 h-12 flex items-center justify-center !p-0 ${!currentSong ? 'opacity-50 grayscale' : ''}`}
                  >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1"/>}
                  </PixelButton>

                  <PixelButton 
                    variant="secondary" 
                    size="sm" 
                    onClick={playNext} 
                    disabled={!currentSong}
                    className={`h-10 w-10 flex items-center justify-center p-0 ${!currentSong ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <SkipForward size={16} fill="currentColor" />
                  </PixelButton>
              </div>
              
              <div className="w-full">
                  <ProgressBar 
                    progress={duration ? (currentTime / duration) * 100 : 0}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={handleSeek}
                  />
              </div>
          </div>

          <div className="w-1/4 min-w-[150px] flex justify-end items-center gap-3">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-[var(--theme-color)] hover:text-white transition-colors focus:outline-none"
              >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
              </button>
              
              <div className="w-24 h-4 relative flex items-center">
                  <div className="absolute w-full h-2 bg-black border border-[var(--theme-color)]"></div>
                  <div 
                    className="absolute h-2 bg-[var(--theme-color)]" 
                    style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                  ></div>
                  
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="absolute w-full h-full opacity-0 cursor-pointer"
                  />
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;