import {
  LogoutOutlined,
  MessageOutlined,
  SettingOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { Menu, MenuProps, Typography } from "antd";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../store/authStore";

export const NabBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items: MenuProps["items"] = [
    {
      key: "/",
      label: "Чаты",
      icon: <MessageOutlined />,
    },
    {
      key: "/admins",
      label: "Админы",
      icon: <SettingOutlined />,
    },
  ];

  // Показать страницу статистики только для админов (не для chat_user)
  if (user && user.role && user.role !== "chat_user") {
    items.push({
      key: "/admin/stats",
      label: "Статистика",
      icon: <BarChartOutlined />,
    });
  }

  items.push({ key: "logout", label: "Выйти", icon: <LogoutOutlined /> });

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
