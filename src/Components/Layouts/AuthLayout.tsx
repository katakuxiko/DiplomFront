import { Outlet } from "react-router";
import { PublicRoute } from "../PublicRoute";

export const AuthLayout = () => {
	return (
		<PublicRoute>
			<div className="flex min-h-screen items-center justify-center bg-gray-300">
				<Outlet />
			</div>
		</PublicRoute>
	);
};
