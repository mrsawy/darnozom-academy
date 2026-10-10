import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IUser } from '../types/user/user.interface';

export interface userStoreState {
  user?: IUser;
  setUser: (user: IUser) => void;
  clearUser: () => void;
}

const useUserStore = create<userStoreState>()(
  persist(
    (set) => ({
      user: undefined,
      setUser: (user: IUser) => set({ user }),
      clearUser: () => set({ user: undefined }),
    }),
    {
      name: 'user-storage', // unique name for localStorage key
    }
  )
);

export default useUserStore;
