export interface LyricLine {
  time: number;
  text: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number; // seconds
  lyrics?: LyricLine[]; // Structured lyrics with timestamps
  
  // New fields for GDStudio API Lazy Loading
  source?: string;
  pic_id?: string;
  lyric_id?: string;
}

export enum PlayMode {
  SEQUENCE = 'SEQUENCE',
  LOOP = 'LOOP',
  SHUFFLE = 'SHUFFLE',
}