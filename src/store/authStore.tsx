import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setupAxios } from "../axios";
import { jwtDecode } from "jwt-decode";

interface User {
	id: string;
	username: string;
	role: string;
}

interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	accessToken: string | null;
	setUser: (user: User | null) => void;
	setTokens: (accessToken: string) => void;
	login: (accessToken: string) => void;
	logout: () => void;
}

export const useAuth = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			isAuthenticated: false,
			accessToken: null,
			setUser: (user: User | null) =>
				set((state) => ({
					...state,
					user,
					isAuthenticated: user !== null,
				})),
			setTokens: (accessToken: string) =>
				set({
					accessToken,
				}),
			login: (accessToken: string) => {
				console.log("Logging in with token:", accessToken);
				setupAxios(accessToken);
				const user = jwtDecode(accessToken) as User;
				set({
					user,
					isAuthenticated: true,
					accessToken,
				});
			},

			logout: () =>
				set({
					user: null,
					isAuthenticated: false,
					accessToken: null,
				}),
		}),
		{
			name: "auth-storage",
		}
	)
);
