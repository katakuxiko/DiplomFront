import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Button,
	Form,
	Input,
	Modal,
	Space,
	Table,
	Typography,
	message,
} from "antd";
import { useState } from "react";
import { rolesService } from "../services/roles";
import { useParams } from "react-router";

export const Roles = () => {
	const { id: chatId } = useParams();
	const queryClient = useQueryClient();
	const { data } = useQuery({
		queryKey: ["roles", chatId],
		queryFn: () => rolesService.list(chatId),
	});
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editing, setEditing] = useState<any | null>(null);
	const [form] = Form.useForm();

	const createMut = useMutation({
		mutationFn: (payload: any) =>
			rolesService.create(chatId as string, payload),
		onSuccess: () => {
			message.success("Роль создана");
			queryClient.invalidateQueries({ queryKey: ["roles", chatId] });
			setIsModalOpen(false);
			form.resetFields();
		},
	});

	const updateMut = useMutation({
		mutationFn: ({ id, payload }: any) =>
			rolesService.update(chatId as string, id, payload),
		onSuccess: () => {
			message.success("Роль обновлена");
			queryClient.invalidateQueries({ queryKey: ["roles", chatId] });
			setIsModalOpen(false);
			setEditing(null);
			form.resetFields();
		},
	});

	const deleteMut = useMutation({
		mutationFn: (id: string) => rolesService.remove(chatId as string, id),
		onSuccess: () => {
			message.success("Роль удалена");
			queryClient.invalidateQueries({ queryKey: ["roles", chatId] });
		},
	});

	const rows = (data || []).map((r: any) => ({ key: r.id, ...r }));

	if (!chatId) return <div>Chat ID not provided in URL.</div>;

	return (
		<div>
			<div className="flex items-center justify-between">
				<Typography.Title level={4}>Роли</Typography.Title>
				<Space>
					<Button
						type="primary"
						onClick={() => {
							setEditing(null);
							form.resetFields();
							setIsModalOpen(true);
						}}
					>
						Создать роль
					</Button>
				</Space>
			</div>

			<Table
				dataSource={rows}
				columns={[
					{ title: "Имя", dataIndex: "name", key: "name" },
					{
						title: "Уровень доступа",
						dataIndex: "access_level",
						key: "access_level",
					},
					{
						title: "Действия",
						key: "actions",
						render: (_: any, rec: any) => (
							<Space>
								<Button
									size="small"
									onClick={() => {
										setEditing(rec);
										form.setFieldsValue({
											name: rec.name,
											access_level: rec.access_level,
										});
										setIsModalOpen(true);
									}}
								>
									Редактировать
								</Button>
								<Button
									danger
									size="small"
									onClick={() => deleteMut.mutate(rec.id)}
								>
									Удалить
								</Button>
							</Space>
						),
					},
				]}
			/>

			<Modal
				title={editing ? "Редактировать роль" : "Создать роль"}
				open={isModalOpen}
				onCancel={() => {
					setIsModalOpen(false);
					setEditing(null);
					form.resetFields();
				}}
				onOk={async () => {
					const vals = await form.validateFields();
					if (!editing) {
						createMut.mutate({
							name: vals.name,
							access_level: Number(vals.access_level),
						});
						return;
					}
					updateMut.mutate({
						id: editing.id,
						payload: {
							name: vals.name,
							access_level: Number(vals.access_level),
						},
					});
				}}
				confirmLoading={createMut.isPending || updateMut.isPending}
			>
				<Form form={form} layout="vertical">
					<Form.Item
						label="Имя"
						name="name"
						rules={[{ required: true, message: "Введите имя роли" }]}
					>
						<Input />
					</Form.Item>
					<Form.Item
						label="Уровень доступа"
						name="access_level"
						rules={[{ required: true, message: "Укажите уровень доступа" }]}
					>
						<Input type="number" min={0} />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
};

export default Roles;
