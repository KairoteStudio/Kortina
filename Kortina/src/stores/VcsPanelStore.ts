import { create } from 'zustand';
interface VcsPanelState {
  isMerged: boolean;
  mergedWidth: number;
}
interface VcsPanelActions {
  setIsMerged: (merged: boolean) => void;
  setMergedWidth: (width: number) => void;
  toggleVcsPanel: () => void;
}
export const useVcsPanelStore = create<VcsPanelState & VcsPanelActions>(set => ({
  isMerged: false,
  mergedWidth: 400,
  setIsMerged: isMerged => set({
    isMerged
  }),
  setMergedWidth: mergedWidth => set({
    mergedWidth
  }),
  toggleVcsPanel: () => set(state => ({
    isMerged: !state.isMerged
  }))
}));