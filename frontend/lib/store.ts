import { create } from 'zustand';

interface FileData {
  path?: string;
  trainPath?: string;
  testPath?: string;
  preprocessingComplete?: boolean;
}

interface PreprocessState {
  currentStep: 'missing-values' | 'encoding' | 'feature-selection' | 'data-split';
  missingValuesCompleted: boolean;
  encodingCompleted: boolean;
  featureSelectionCompleted: boolean;
  dataSplitCompleted: boolean;
}

interface DataStore {
  fileData: FileData | null;
  preprocessState: PreprocessState;
  updateFileData: (data: Partial<FileData>) => void;
  updatePreprocessState: (state: Partial<PreprocessState>) => void;
}

export const useDataStore = create<DataStore>((set) => ({
  fileData: null,
  preprocessState: {
    currentStep: 'missing-values',
    missingValuesCompleted: false,
    encodingCompleted: false,
    featureSelectionCompleted: false,
    dataSplitCompleted: false,
  },
  updateFileData: (data) => 
    set((state) => ({
      fileData: state.fileData ? { ...state.fileData, ...data } : data
    })),
  updatePreprocessState: (newState) =>
    set((state) => ({
      preprocessState: { ...state.preprocessState, ...newState }
    })),
}));
