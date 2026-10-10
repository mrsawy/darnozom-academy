import { create } from 'zustand';

interface GeneralState {
  generalIsLoading: boolean;
  setGeneralIsLoading: (isLoading: boolean) => void;
}

const useGeneralStore = create<GeneralState>((set) => ({
  generalIsLoading: false,
  setGeneralIsLoading: (isLoading: boolean) => set({ generalIsLoading: isLoading }),
}));

export default useGeneralStore;
