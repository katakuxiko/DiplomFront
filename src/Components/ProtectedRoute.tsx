import { Navigate } from "react-router";
import { useAuth } from "../store/authStore";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
	const { isAuthenticated } = useAuth();

	if (!isAuthenticated) {
		return <Navigate to="/auth/login" replace />;
	}

	return <>{children}</>;
};
