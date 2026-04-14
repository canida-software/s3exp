import { create } from 'zustand';

import { type FileEntry } from '@/lib/s3-object-storage';

type S3BrowserStore = {
  currentEntries: FileEntry[];
  currentPath: string;
  setCurrentEntries: (entries: FileEntry[]) => void;
  setCurrentPath: (path: string) => void;
  reset: () => void;
};

export const useS3BrowserStore = create<S3BrowserStore>()((set) => ({
  currentEntries: [],
  currentPath: '',
  setCurrentEntries: (entries) => set({ currentEntries: entries }),
  setCurrentPath: (path) => set({ currentPath: path }),
  reset: () => set({ currentEntries: [], currentPath: '' }),
}));
