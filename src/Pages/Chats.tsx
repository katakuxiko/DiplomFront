import { useQuery } from "@tanstack/react-query";
import { Button, Empty } from "antd";
import { api } from "../axios";
import { PlusOutlined } from "@ant-design/icons";

export const Chats = () => {
	const { data } = useQuery({
		queryKey: ["chats"],
		queryFn: async () => {
			return api.chats.chatsList();
		},
	});

	return (
		<div>
			{data?.data.length === 0 && (
				<Empty
					description={
						<div className="flex flex-col gap-2">
							Нет чатов.
							<div>
								<Button
									icon={<PlusOutlined />}
									type="primary"
									size="large"
								>
									Создать
								</Button>
							</div>
						</div>
					}
				/>
			)}
			{data?.data.map((chat) => (
				<div key={chat.id}>{chat.name}</div>
			))}
		</div>
	);
};
