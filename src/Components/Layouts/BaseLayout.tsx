import { Layout, Typography } from "antd";
import { Content, Header } from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import { Outlet } from "react-router";
import { useHeaderStore } from "../../store/headerStore";
import { NabBar } from "../Menu";
import { ProtectedRoute } from "../ProtectedRoute";

export const BaseLayout = () => {
	const { name } = useHeaderStore();

	return (
		<ProtectedRoute>
			<Layout className="min-h-screen! h-full">
				<Sider className="hidden md:block " style={{}}>
					<NabBar />
				</Sider>
				<Layout>
					<Header className="bg-white! py-2! shadow-md">
						<Typography.Title>{name}</Typography.Title>
					</Header>
					<Content className="h-full p-4">
						<Outlet />
					</Content>
					{/* <Footer>{dayjs().format("YYYY")}</Footer> */}
				</Layout>
			</Layout>
		</ProtectedRoute>
	);
};
