import { Layout, Typography } from "antd";
import { Content, Footer, Header } from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import { Outlet } from "react-router";
import { ProtectedRoute } from "../ProtectedRoute";

export const BaseLayout = () => {
	return (
		<ProtectedRoute>
			<Layout className="h-screen">
				<Sider className="hidden md:block" style={{}}></Sider>
				<Layout>
					<Header className="bg-white! py-2!">
						<Typography.Title>Чаты</Typography.Title>
					</Header>
					<Content className="h-full">
						<Outlet />
					</Content>
					<Footer>ads</Footer>
				</Layout>
			</Layout>
		</ProtectedRoute>
	);
};
