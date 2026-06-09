import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Button,
	Drawer,
	Empty,
	Form,
	Input,
	Select,
	Skeleton,
	Tag,
	Typography,
	message,
} from "antd";
import { api } from "../axios";
import { useEffect, useState } from "react";
import { rules } from "../utils/rules";
import { useNavigate } from "react-router";
import { useSetHead } from "../hooks";
import { useAuth } from "../store/authStore";

type ChatItem = {
	id?: string;
	name?: string;
	descr?: string;
	admin_id?: string;
};

type AdminItem = {
	id?: string;
	username?: string;
	is_super_user?: boolean;
};

export const Chats = () => {
	const [isOpen, setIsOpen] = useState(false);
	useSetHead("Чаты");
	const currentUserId = useAuth((state) => state.user?.id);

	const [initItem, setInitItem] = useState<ChatItem>();

	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const [inviteForm] = Form.useForm();
	const navigate = useNavigate();
	const { data, isLoading } = useQuery({
		queryKey: ["chats"],
		queryFn: async () => {
			return api.chats.chatsList();
		},
	});

	const { data: allAdmins = [] } = useQuery({
		queryKey: ["admins", "for-invite"],
		queryFn: async () => {
			const res = await api.admins.adminsList();
			return (res.data ?? []).flat() as AdminItem[];
		},
		enabled: isOpen && Boolean(initItem?.id),
	});

	const { data: chatAdmins = [], isLoading: isChatAdminsLoading } = useQuery({
		queryKey: ["chat-admins", initItem?.id],
		queryFn: async () => {
			if (!initItem?.id) {
				return [] as AdminItem[];
			}
			const res = await api.instance.get(`/chats/${initItem.id}/admins`);
			return (Array.isArray(res.data) ? res.data : []) as AdminItem[];
		},
		enabled: isOpen && Boolean(initItem?.id),
	});

	const canInvite =
		Boolean(initItem?.id) &&
		Boolean(initItem?.admin_id) &&
		Boolean(currentUserId) &&
		initItem?.admin_id === currentUserId;

	const availableAdmins = allAdmins.filter(
		(admin) =>
			admin.id && !chatAdmins.some((chatAdmin) => chatAdmin.id === admin.id),
	);

	const mutation = useMutation({
		mutationFn: async (data: { name: string; descr: string }) => {
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

	const inviteMutation = useMutation({
		mutationFn: async (values: { admin_id: string }) => {
			if (!initItem?.id) {
				throw new Error("chat is not selected");
			}
			return api.instance.post(`/chats/${initItem.id}/invite-admin`, values);
		},
		onSuccess: () => {
			inviteForm.resetFields();
			message.success("Админ приглашен");
			queryClient.invalidateQueries({
				queryKey: ["chat-admins", initItem?.id],
			});
			queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
		onError: (error: unknown) => {
			const responseError =
				typeof error === "object" && error !== null && "response" in error
					? (error as { response?: { data?: { error?: string } } }).response
							?.data?.error
					: undefined;

			message.error(responseError ?? "Не удалось пригласить админа");
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

	useEffect(() => {
		if (initItem?.id) {
			inviteForm.resetFields();
		}
	}, [initItem?.id, inviteForm]);

	if (isLoading) {
		return <Skeleton active paragraph={{ rows: 10 }} />;
	}

	return (
		<>
			{!data ||
				(data?.data?.length === 0 && (
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
				))}
			{data && data.data.length > 0 && (
				<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 flex-wrap items-center">
					{data?.data?.map((chat) => (
						<button
							type="button"
							className="flex text-start flex-col gap-2 p-4 bg-white rounded-xl shadow-xl min-h-full hover:scale-[1.03] transition-transform cursor-pointer"
							key={chat.id}
							onClick={() => {
								navigate(`/chat/${chat.id}`);
							}}
						>
							<div className="flex justify-between">
								<div className="font-semibold">{chat.name}</div>
								<EditOutlined
									onClick={(e) => {
										e.stopPropagation();
										setInitItem(chat as ChatItem);
										setIsOpen(true);
									}}
									className="hover:bg-gray-400/30 p-1 rounded-md transition-colors"
									style={{ fontSize: 20 }}
								/>
							</div>
							<div>{chat.descr}</div>
						</button>
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
				</div>
			)}

			<Drawer
				title={initItem ? "Редактировать чат" : "Создать чат"}
				open={isOpen}
				onClose={() => {
					setIsOpen(false);
					setInitItem(undefined);
					inviteForm.resetFields();
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
						<Input.TextArea placeholder="Описание чата" className="mt-4" />
					</Form.Item>
					<Form.Item>
						<Button type="primary" htmlType="submit" form="createChatForm">
							Сохранить
						</Button>
					</Form.Item>
				</Form>

				{initItem?.id && (
					<div className="mt-6 border-t border-gray-200 pt-4">
						<div className="font-semibold mb-2">Админы чата</div>

						{isChatAdminsLoading ? (
							<Skeleton active paragraph={{ rows: 2 }} title={false} />
						) : chatAdmins.length === 0 ? (
							<Typography.Text type="secondary">
								Для этого чата пока нет админов.
							</Typography.Text>
						) : (
							<div className="flex flex-wrap gap-2 mb-4">
								{chatAdmins.map((admin) => (
									<Tag
										key={admin.id}
										color={admin.id === initItem.admin_id ? "blue" : "default"}
									>
										{admin.username}
										{admin.id === initItem.admin_id ? " (создатель)" : ""}
									</Tag>
								))}
							</div>
						)}

						{canInvite ? (
							<Form
								layout="vertical"
								form={inviteForm}
								onFinish={inviteMutation.mutate}
							>
								<Form.Item
									name="admin_id"
									label="Пригласить админа"
									rules={[rules.required]}
								>
									<Select
										showSearch
										placeholder={
											availableAdmins.length > 0
												? "Выберите админа"
												: "Нет доступных админов"
										}
										disabled={availableAdmins.length === 0}
										options={availableAdmins.map((admin) => ({
											value: admin.id,
											label: admin.is_super_user
												? `${admin.username} (superadmin)`
												: admin.username,
										}))}
										filterOption={(input, option) =>
											String(option?.label ?? "")
												.toLowerCase()
												.includes(input.toLowerCase())
										}
									/>
								</Form.Item>
								<Form.Item>
									<Button
										htmlType="submit"
										loading={inviteMutation.isPending}
										disabled={availableAdmins.length === 0}
									>
										Пригласить
									</Button>
								</Form.Item>
							</Form>
						) : (
							<Typography.Text type="secondary">
								Приглашать админов может только создатель чата.
							</Typography.Text>
						)}
					</div>
				)}
			</Drawer>
		</>
	);
};
