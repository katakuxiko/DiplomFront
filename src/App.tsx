import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { setupAxios } from "./axios";
import { AuthLayout } from "./Components/Layouts/AuthLayout";
import { BaseLayout } from "./Components/Layouts/BaseLayout";
import { LoginPage } from "./Pages/Login";
import { Chats } from "./Pages/Chats";
import { Chat } from "./Pages/Chat";

const router = createBrowserRouter([
	{
		path: "/auth/",
		element: <AuthLayout />,
		children: [
			{
				path: "login",
				element: <LoginPage />,
			},
		],
	},
	{
		path: "/",
		element: <BaseLayout />,
		children: [
			{
				path: "",
				element: <Chats />,
			},
			{
				path: "chat/:id",
				element: <Chat />,
			},
			{
				path: "/settings",
				element: <div>Settings Page</div>,
			},
		],
	},
]);

export const App = () => {
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		setupAxios();
		setLoading(false);
	}, []);

	if(loading) {
		return <div className=''></div>;
	}

	return <RouterProvider router={router} />;
};
