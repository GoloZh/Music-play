import { Song } from './types';

const DB_NAME = 'PixelTunesDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

// Open Database
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Save a song (Metadata + File Blob)
export const saveSongToDB = async (song: Song, file: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // We store the file blob directly
    const record = {
      ...song,
      fileBlob: file, // Store the binary data
      audioUrl: '' // Clear the blob URL as it expires on reload
    };

    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get all songs and regenerate Blob URLs
export const getAllSongsFromDB = async (): Promise<Song[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result;
      // Convert stored Blobs back to URLs
      const songs: Song[] = records.map((record: any) => ({
        ...record,
        audioUrl: URL.createObjectURL(record.fileBlob)
      }));
      resolve(songs);
    };
    request.onerror = () => reject(request.error);
  });
};

// Delete a song
export const deleteSongFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};