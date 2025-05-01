import { create } from 'zustand';

interface MissingValuesResults {
  outputPath: string;
  rowsBefore: number;
  rowsAfter: number;
  columns: string[];
}

interface PreprocessStore {
  missingValuesResults: MissingValuesResults | null;
  setMissingValuesResults: (results: MissingValuesResults) => void;
  clearMissingValuesResults: () => void;
}

export const usePreprocessStore = create<PreprocessStore>((set) => ({
  missingValuesResults: null,
  setMissingValuesResults: (results) => set({ missingValuesResults: results }),
  clearMissingValuesResults: () => set({ missingValuesResults: null }),
})); 