import { create } from "zustand";

interface HeaderState {
	name: string;
	setName: (name: string) => void;
}

export const useHeaderStore = create<HeaderState>((set) => ({
	name: "",
	setName: (name: string) => set({ name }),
}));
