import { useAuth } from "../store/authStore";
import { Api } from "./Api";

export const api = new Api({
	baseURL: import.meta.env.VITE_BASE_URL,
});

export const setupAxios = (token?: string) => {
	const accessToken =
		token ??
		JSON.parse(localStorage.getItem("auth-storage")!)?.state?.accessToken;

	if (accessToken) {
		api.instance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
	}

	api.instance.interceptors.response.use(
		(response) => response,
		(error) => {
			if (error.response?.status === 401) {
				// Handle unauthorized access, e.g., redirect to login
				console.log("Unauthorized! Redirecting to login...");
				window.location.href = "/auth/login";
				useAuth.getState().logout();
			}
			return Promise.reject(error);
		}
	);
};
