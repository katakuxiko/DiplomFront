import { Outlet } from "react-router";

export const AuthLayout = () => {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-300">
			<Outlet />
		</div>
	);
};
