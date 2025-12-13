import { useQuery } from "@tanstack/react-query";
import { Tabs } from "antd";
import { useParams } from "react-router";
import { api } from "../axios";
import { useSetHead } from "../hooks";
import { Documents } from "../Components/Documents";

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
			key: "1",
			label: `Документы`,
			children: <Documents id={id!} />,
		},
	];

	return (
		<div>
			<Tabs items={items} />
		</div>
	);
};
