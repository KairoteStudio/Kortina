import { create } from 'zustand';

export type UpdateChannel = 'nightly' | 'canary' | 'stable';

export type UpdateStatus = 
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
}

export interface UpdaterState {
  status: UpdateStatus;
  info: UpdateInfo | null;
  progress: number;
  error: string | null;
  channel: UpdateChannel;
  lastCheck: number | null;
}

interface UpdaterActions {
  setStatus: (status: UpdateStatus) => void;
  setInfo: (info: UpdateInfo | null) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setChannel: (channel: UpdateChannel) => void;
  setLastCheck: (timestamp: number) => void;
  reset: () => void;
}

const initialState: UpdaterState = {
  status: 'idle',
  info: null,
  progress: 0,
  error: null,
  channel: 'nightly',
  lastCheck: null,
};

export const useUpdaterStore = create<UpdaterState & UpdaterActions>()((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setInfo: (info) => set({ info }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  setChannel: (channel) => set({ channel }),
  setLastCheck: (lastCheck) => set({ lastCheck }),
  reset: () => set(initialState),
}));
