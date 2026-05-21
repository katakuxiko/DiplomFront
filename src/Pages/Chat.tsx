import { useQuery } from "@tanstack/react-query";
import { Tabs } from "antd";
import { useParams } from "react-router";
import { api } from "../axios";
import { useSetHead } from "../hooks";
import { Documents } from "../Components/Documents";
import { Ask } from "../Components/Ask";
import { Settings } from "../Components/Settings";
import { ChatUsers } from "../Components/ChatUsers";
import { ChatHistory } from "../Components/ChatHistory";
import { Roles } from "./Roles";


export const Chat = () => {
	const { id } = useParams();

	const { data: chat } = useQuery({
		queryKey: ["chat", id],
		queryFn: async () => {
			return api.chats.chatsDetail(id!);
		},
	});

	useSetHead(chat ? `Чат ${chat.data.name}` : "Чат");

	const items = [
		{
			key: "docs",
			label: "Документы",
			children: <Documents id={id!} />,
		},
		{
			key: "settings",
			label: "Настройки",
			children: <Settings id={id!} />,
		},
		{
			key: "roles",
			label: "Роли",
			children: <Roles />,
		},
		{
			key: "users",
			label: "Пользователи",
			children: <ChatUsers id={id!} />,
		},
		{
			key: "history",
			label: "История",
			children: <ChatHistory id={id!} />,
		},
		{
			key: "ask",
			label: "Задать вопрос",
			children: <Ask id={id!} />,
		},
	];

	return <Tabs items={items} />;
};
