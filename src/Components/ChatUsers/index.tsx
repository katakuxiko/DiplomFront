import { UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Button,
	Empty,
	Form,
	Input,
	Select,
	Modal,
	Popconfirm,
	Space,
	Table,
	Tag,
	Typography,
	Upload,
	message,
} from "antd";
import type { TableProps, UploadProps } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { rolesService } from "../../services/roles";
import { api } from "../../axios";

interface ChatUsersProps {
	id: string;
}

interface ChatUserRow {
	id: string;
	chat_id?: string;
	username?: string;
	user_role?: string;
	access_level?: number;
	user_info?: string;
	created_date?: string;
}

export const ChatUsers = ({ id }: ChatUsersProps) => {
	const queryClient = useQueryClient();
	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
	const [editingUser, setEditingUser] = useState<ChatUserRow | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [form] = Form.useForm();
	const isEdit = !!editingUser;

	const { data, isLoading } = useQuery({
		queryKey: ["chat-users"],
		queryFn: async () => api.chatusers.chatusersList(),
	});

	const { data: roles } = useQuery({
		queryKey: ["roles", id],
		queryFn: async () => rolesService.list(id),
	});

	const uploadMutation = useMutation({
		mutationFn: async (file: File) => api.chatusers.importCreate({ file }),
		onSuccess: () => {
			message.success("Пользователи импортированы");
			queryClient.invalidateQueries({ queryKey: ["chat-users"] });
		},
		onError: () => message.error("Не удалось импортировать пользователей"),
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
			api.chatusers.chatusersUpdate(id, payload),
		onSuccess: () => {
			message.success("Пользователь обновлён");
			queryClient.invalidateQueries({ queryKey: ["chat-users"] });
			setIsModalOpen(false);
			setEditingUser(null);
			form.resetFields();
		},
		onError: () => message.error("Не удалось обновить пользователя"),
	});

	const createMutation = useMutation({
		mutationFn: async (payload: any) => api.chatusers.chatusersCreate(payload),
		onSuccess: () => {
			message.success("Пользователь создан");
			queryClient.invalidateQueries({ queryKey: ["chat-users"] });
			setIsModalOpen(false);
			setEditingUser(null);
			form.resetFields();
		},
		onError: () => message.error("Не удалось создать пользователя"),
	});

	const deleteMutation = useMutation({
		mutationFn: async (userId: string) => api.chatusers.chatusersDelete(userId),
		onSuccess: (_, userId) => {
			message.success("Пользователь удалён");
			queryClient.invalidateQueries({ queryKey: ["chat-users"] });
			setSelectedRowKeys((prev) => prev.filter((k) => k !== userId));
		},
		onError: () => message.error("Не удалось удалить пользователя"),
	});

	const bulkDeleteMutation = useMutation({
		mutationFn: async (ids: string[]) =>
			Promise.all(ids.map((userId) => api.chatusers.chatusersDelete(userId))),
		onSuccess: () => {
			message.success("Выбранные пользователи удалены");
			queryClient.invalidateQueries({ queryKey: ["chat-users"] });
			setSelectedRowKeys([]);
		},
		onError: () => message.error("Не удалось удалить выбранных пользователей"),
	});

	const normalized: ChatUserRow[] = Array.isArray(data?.data)
		? // API может вернуть двойной массив — разворачиваем
			(data?.data as any[]).flat().map((item: any) => ({
				id: item.id ?? item.ID,
				chat_id: item.chat_id ?? item.ChatID,
				username: item.username ?? item.Username,
				user_role: item.user_role ?? item.User_Role ?? "member",
				access_level: item.access_level ?? item.AccessLevel ?? 0,
				user_info: item.user_info ?? item.User_Info,
				created_date:
					item.created_date ?? item.CreatedDate ?? new Date().toISOString(),
			}))
		: [];

	const filtered = normalized.filter((user) => user.chat_id === id);

	const columns: TableProps<ChatUserRow>["columns"] = useMemo(
		() => [
			{
				key: "username",
				dataIndex: "username",
				title: "Логин",
			},
			{
				key: "user_role",
				dataIndex: "user_role",
				title: "Роль",
				render: (role?: string) =>
					role ? <Tag color="blue">{role}</Tag> : "-",
				width: 140,
			},
			{
				key: "access_level",
				dataIndex: "access_level",
				title: "Уровень доступа",
				width: 140,
			},
			{
				key: "user_info",
				dataIndex: "user_info",
				title: "Доп. информация",
				ellipsis: true,
			},
			{
				key: "chat_id",
				dataIndex: "chat_id",
				title: "Chat ID",
				width: 220,
				render: (chatId?: string) => chatId || "-",
			},
			{
				key: "created_date",
				dataIndex: "created_date",
				title: "Создан",
				width: 180,
				render: (value?: string) =>
					value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-",
			},
			{
				key: "actions",
				title: "Действия",
				width: 210,
				render: (_, record) => (
					<Space size="small">
						<Button
							size="small"
							onClick={() => {
								setEditingUser(record);
								setIsModalOpen(true);
								form.setFieldsValue({
									username: record.username,
									user_role: record.user_role,
									access_level: record.access_level ?? 0,
									user_info: record.user_info,
									password: "",
								});
							}}
						>
							Редактировать
						</Button>
						<Popconfirm
							title="Удалить пользователя?"
							okText="Да"
							cancelText="Нет"
							onConfirm={() => deleteMutation.mutate(record.id)}
							okButtonProps={{ loading: deleteMutation.isPending }}
						>
							<Button danger size="small">
								Удалить
							</Button>
						</Popconfirm>
					</Space>
				),
			},
		],
		[deleteMutation.isPending, form],
	);

	const uploadProps: UploadProps = {
		beforeUpload: (file) => {
			uploadMutation.mutate(file);
			return false;
		},
		showUploadList: false,
		accept: ".csv,.xlsx",
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<Typography.Title level={4}>Пользователи чата</Typography.Title>
					<Typography.Text type="secondary">
						CSV/XLSX колонки: username, password, role, chat_id
					</Typography.Text>
				</div>
				<Space>
					<Popconfirm
						title="Удалить выбранных пользователей?"
						okText="Да"
						cancelText="Нет"
						onConfirm={() =>
							bulkDeleteMutation.mutate(selectedRowKeys as string[])
						}
						disabled={!selectedRowKeys.length}
					>
						<Button
							danger
							disabled={!selectedRowKeys.length}
							loading={bulkDeleteMutation.isPending}
						>
							Удалить выбранных
						</Button>
					</Popconfirm>
					<Button
						type="primary"
						onClick={() => {
							setEditingUser(null);
							setIsModalOpen(true);
							form.resetFields();
							const member = (roles || []).find(
								(r: any) => r.name === "member",
							);
							form.setFieldsValue({
								user_role: member ? member.name : "member",
								access_level: member ? member.access_level : 0,
							});
						}}
					>
						Создать пользователя
					</Button>
					<Upload {...uploadProps}>
						<Button
							icon={<UploadOutlined />}
							loading={uploadMutation.isPending}
						>
							Импорт CSV/XLSX
						</Button>
					</Upload>
				</Space>
			</div>

			<Table
				loading={isLoading}
				columns={columns}
				dataSource={filtered}
				rowKey={(row) => row.id}
				rowSelection={{
					selectedRowKeys,
					onChange: setSelectedRowKeys,
				}}
				locale={{ emptyText: <Empty description="Пользователи не найдены" /> }}
			/>

			<Modal
				title={
					isEdit
						? `Редактирование пользователя ${editingUser?.username ?? ""}`
						: "Создание пользователя"
				}
				open={isModalOpen}
				onCancel={() => {
					setIsModalOpen(false);
					setEditingUser(null);
					form.resetFields();
				}}
				onOk={async () => {
					const values = await form.validateFields();

					if (!isEdit) {
						const found = (roles || []).find(
							(r: any) => r.name === values.user_role,
						);
						createMutation.mutate({
							chat_id: id,
							username: values.username,
							user_role: values.user_role,
							access_level: found
								? found.access_level
								: (values.access_level ?? 0),
							user_info: values.user_info,
							password: values.password,
						});
						return;
					}

					if (!editingUser) return;
					const found = (roles || []).find(
						(r: any) => r.name === values.user_role,
					);
					const payload: any = {
						username: values.username,
						user_role: values.user_role,
						access_level: found
							? found.access_level
							: (values.access_level ?? 0),
						user_info: values.user_info,
						chat_id: editingUser.chat_id,
					};
					if (values.password) {
						payload.password = values.password;
					}
					updateMutation.mutate({ id: editingUser.id, payload });
				}}
				confirmLoading={updateMutation.isPending || createMutation.isPending}
				destroyOnClose
			>
				<Form form={form} layout="vertical">
					<Form.Item
						label="Логин"
						name="username"
						rules={[{ required: true, message: "Введите логин" }]}
					>
						<Input />
					</Form.Item>
					<Form.Item
						label="Роль"
						name="user_role"
						rules={[{ required: true, message: "Выберите роль" }]}
					>
						<Select
							options={(roles || []).map((r: any) => ({
								label: r.name,
								value: r.name,
							}))}
							onChange={(val) => {
								const found = (roles || []).find((r: any) => r.name === val);
								form.setFieldsValue({
									access_level: found ? found.access_level : 0,
								});
							}}
						/>
					</Form.Item>
					<Form.Item label="Уровень доступа" name="access_level">
						<Input disabled />
					</Form.Item>
					<Form.Item label="Доп. информация" name="user_info">
						<Input.TextArea rows={3} />
					</Form.Item>
					<Form.Item
						label={isEdit ? "Новый пароль" : "Пароль"}
						name="password"
						tooltip={isEdit ? "Оставьте пустым, чтобы не менять" : undefined}
						rules={
							isEdit ? [] : [{ required: true, message: "Введите пароль" }]
						}
					>
						<Input.Password allowClear />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
};
