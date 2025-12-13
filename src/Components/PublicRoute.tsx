import { Navigate } from "react-router";
import { useAuth } from "../store/authStore";

export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
	const { isAuthenticated } = useAuth();

	if (isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	return <>{children}</>;
};
