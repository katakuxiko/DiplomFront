import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Drawer, Empty, Form, Input } from "antd";
import { api } from "../axios";
import { useEffect, useState } from "react";
import { rules } from "../utils/rules";
import { useNavigate } from "react-router";
import { useSetHead } from "../hooks";

export const Chats = () => {
	const [isOpen, setIsOpen] = useState(false);
	useSetHead("Чаты");

	const [initItem, setInitItem] = useState<{
		id?: string;
		name?: string;
		descr?: string;
	}>();

	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const navigate = useNavigate();
	const { data } = useQuery({
		queryKey: ["chats"],
		queryFn: async () => {
			return api.chats.chatsList();
		},
	});

	const mutation = useMutation({
		mutationFn: async (data: { name: string; description: string }) => {
			if (initItem?.id) {
				return api.chats.chatsUpdate(initItem.id, data);
			}
			return api.chats.chatsCreate(data);
		},
		onSuccess: () => {
			form.resetFields();
			setIsOpen(false);
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});

	useEffect(() => {
		if (initItem) {
			form.setFieldsValue({
				name: initItem.name,
				descr: initItem.descr,
			});
		}
	}, [initItem, form]);

	if (!data || data.data.length === 0) {
		return (
			<Empty
				description={
					<div className="flex flex-col gap-2">
						Нет чатов.
						<div>
							<Button
								icon={<PlusOutlined />}
								type="primary"
								size="large"
								onClick={() => setIsOpen(true)}
							>
								Создать
							</Button>
						</div>
					</div>
				}
			/>
		);
	}

	return (
		<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 flex-wrap items-center">
			{data?.data.map((chat) => (
				<div
					className="flex flex-col gap-2 p-4 bg-white rounded-xl shadow-xl min-h-full hover:scale-[1.03] transition-transform cursor-pointer"
					key={chat.id}
					tabIndex={1}
					onClick={() => {
						navigate(`/chat/${chat.id}`);
					}}
				>
					<div className="flex justify-between">
						<div className="font-semibold">{chat.name}</div>
						<EditOutlined
							onClick={(e) => {
								e.stopPropagation();
								setInitItem(chat);
								setIsOpen(true);
							}}
							className="hover:bg-gray-400/30 p-1 rounded-md transition-colors"
							style={{ fontSize: 20 }}
						/>
					</div>
					<div>{chat.descr}</div>
				</div>
			))}
			<Button
				icon={<PlusOutlined />}
				type="primary"
				size="large"
				onClick={() => setIsOpen(true)}
				className="min-h-full"
			>
				Создать
			</Button>

			<Drawer
				title={initItem ? "Редактировать чат" : "Создать чат"}
				open={isOpen}
				onClose={() => {
					setIsOpen(false);
					setInitItem(undefined);
				}}
				size="default"
				extra={
					initItem?.id && (
						<Button
							icon={<DeleteOutlined />}
							danger
							onClick={async () => {
								if (initItem?.id) {
									await api.chats.chatsDelete(initItem.id);
									form.resetFields();
									setIsOpen(false);
									setInitItem(undefined);

									queryClient.invalidateQueries({
										queryKey: ["chats"],
									});
								}
							}}
						>
							Удалить
						</Button>
					)
				}
			>
				<Form
					onFinish={mutation.mutate}
					id="createChatForm"
					layout="vertical"
					form={form}
				>
					<Form.Item
						rules={[rules.required]}
						required
						label="Название"
						name="name"
					>
						<Input placeholder="Название чата" />
					</Form.Item>
					<Form.Item
						rules={[rules.required]}
						required
						label="Описание"
						name="descr"
					>
						<Input.TextArea
							placeholder="Описание чата"
							className="mt-4"
						/>
					</Form.Item>
					<Form.Item>
						<Button
							type="primary"
							htmlType="submit"
							form="createChatForm"
						>
							Сохранить
						</Button>
					</Form.Item>
				</Form>
			</Drawer>
		</div>
	);
};
