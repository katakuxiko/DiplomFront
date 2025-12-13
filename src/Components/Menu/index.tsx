import {
	LogoutOutlined,
	MessageOutlined,
	SettingOutlined,
} from "@ant-design/icons";
import { Menu, MenuProps, Typography } from "antd";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../store/authStore";

const items: MenuProps["items"] = [
	{
		key: "/",
		label: "Чаты",
		icon: <MessageOutlined />,
	},
	{
		key: "/settings",
		label: "Настройки",
		icon: <SettingOutlined />,
	},
	{
		key: "logout",
		label: "Выйти",
		icon: <LogoutOutlined />,
	},
];

export const NabBar = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	return (
		<div className="fixed">
			<Typography.Title className="text-gray-400! pl-4" level={3}>
				{user?.username}
			</Typography.Title>
			<Menu
				selectedKeys={[location.pathname]}
				mode="vertical"
				theme="dark"
				className="w-48"
				items={items}
				onClick={(i) => {
					if (i.key === "logout") {
						logout();
						return;
					}
					navigate(`${i.key}`);
				}}
			/>
		</div>
	);
};
