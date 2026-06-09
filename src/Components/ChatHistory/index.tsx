import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Alert,
	Button,
	Empty,
	Modal,
	Select,
	Skeleton,
	Table,
	Tag,
	Typography,
} from "antd";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { api } from "../../axios";

interface ChatHistoryProps {
	id: string;
}

interface MessageRow {
	ID?: string;
	ChatHistoryID?: string;
	Text?: string;
	Role?: string;
	CreatedDate?: string;
}

interface HistoryBlock {
	id?: string;
	user_id?: string;
	username?: string;
	messages?: MessageRow[];
}

const columns: TableProps<MessageRow>["columns"] = [
	{
		key: "CreatedDate",
		dataIndex: "CreatedDate",
		title: "Дата",
		width: 180,
		render: (value?: string) =>
			value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-",
	},
	{
		key: "Role",
		dataIndex: "Role",
		title: "Роль",
		width: 120,
		render: (value?: string) => <Tag>{value ?? "user"}</Tag>,
	},
	{
		key: "Text",
		dataIndex: "Text",
		title: "Сообщение",
		ellipsis: true,
	},
	{
		key: "ChatHistoryID",
		dataIndex: "ChatHistoryID",
		title: "History ID",
		width: 240,
	},
];

export const ChatHistory = ({ id }: ChatHistoryProps) => {
	const [selectedUser, setSelectedUser] = useState<string | null>(null);
	const [selectedHistory, setSelectedHistory] = useState<string | null>(null);
	const [openedMessage, setOpenedMessage] = useState<MessageRow | null>(null);
	const { data, isLoading, error } = useQuery({
		queryKey: ["chat-history", id],
		queryFn: async () => {
			const res = await api.instance.get(`/chats/${id}/history`);
			return res.data as HistoryBlock[];
		},
	});

	const normalized = useMemo(() => {
		return (data ?? []).map((h) => {
			const rawName = (h.username ?? "") as string;
			const displayName = rawName.trim() !== "" ? rawName : "Неизвестный";
			const idKey = h.user_id ?? displayName;
			return {
				id: h.id,
				user_id: idKey,
				username: displayName,
				messages: (h.messages ?? []).map((m) => ({
					ID: m.ID ?? (m as any).id,
					ChatHistoryID: m.ChatHistoryID ?? (m as any).chat_history_id,
					Text: m.Text ?? (m as any).text,
					Role: m.Role ?? (m as any).role,
					CreatedDate: m.CreatedDate ?? (m as any).created_date,
				})),
			};
		});
	}, [data]);

	const users = useMemo(() => {
		// показываем только пользователей, у которых есть сообщения
		const unique = new Map<string, string>();
		(normalized ?? [])
			.filter((h) => (h.messages ?? []).length > 0)
			.forEach((h) => {
				const id = h.user_id ?? h.username ?? "Неизвестный";
				const name = h.username ?? "Неизвестный";
				unique.set(id, name);
			});
		return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
	}, [normalized]);

	// если фильтр скрывает выбранного пользователя — сбросить выбор
	if (selectedUser && !users.some((u) => u.id === selectedUser)) {
		setSelectedUser(null);
		setSelectedHistory(null);
	}

	const filteredHistories = useMemo(() => {
		if (!normalized) return [] as HistoryBlock[];
		if (!selectedUser) return [] as HistoryBlock[];
		return normalized.filter(
			(h) => h.user_id === selectedUser || h.username === selectedUser,
		);
	}, [normalized, selectedUser]);

	// Показываем только history id, у которых есть сообщения
	const nonEmptyHistories = filteredHistories.filter(
		(h) => (h.messages ?? []).length > 0,
	);
	const historyIds = nonEmptyHistories.map((h) => h.id || "unknown");
	const currentHistoryId = selectedHistory ?? historyIds[0];
	const currentHistory = nonEmptyHistories.find(
		(h) => (h.id || "unknown") === currentHistoryId,
	);
	const filteredRows = currentHistory?.messages ?? [];

	if (isLoading) {
		return <Skeleton active paragraph={{ rows: 8 }} />;
	}

	if (error) {
		return (
			<Alert
				type="error"
				message="Не удалось загрузить историю сообщений"
				description="Проверьте токен администратора и повторите попытку"
			/>
		);
	}

	// показать подсказку выбора пользователя только если есть пользователи
	const needSelectUser = users.length > 0 && !selectedUser;

	return (
		<div className="flex flex-col gap-3">
			<Typography.Title level={4}>История переписки</Typography.Title>
			{users.length > 0 && (
				<div className="flex flex-wrap gap-2 mb-2 items-center">
					<Select
						showSearch
						allowClear
						placeholder="Выберите пользователя"
						options={users.map((u) => ({ value: u.id, label: u.name }))}
						value={selectedUser ?? undefined}
						style={{ minWidth: 240, maxWidth: 320 }}
						filterOption={(input, option) =>
							(option?.label as string)
								.toLowerCase()
								.includes(input.toLowerCase())
						}
						onChange={(val) => {
							setSelectedUser(val || null);
							setSelectedHistory(null);
						}}
					/>
					{selectedUser && (
						<Button
							size="small"
							onClick={() => {
								setSelectedUser(null);
								setSelectedHistory(null);
							}}
						>
							Сбросить
						</Button>
					)}
				</div>
			)}

			{historyIds.length > 1 && !needSelectUser && (
				<div className="flex flex-wrap gap-2 mb-2">
					{historyIds.map((hid) => (
						<Button
							key={hid}
							type={hid === currentHistoryId ? "primary" : "default"}
							size="small"
							onClick={() => setSelectedHistory(hid)}
						>
							{hid}
						</Button>
					))}
				</div>
			)}

			<Table
				dataSource={filteredRows}
				columns={columns}
				rowKey={(row) => row.ID ?? `${row.ChatHistoryID}-${row.CreatedDate}`}
				pagination={{ pageSize: 20 }}
				onRow={(record) => ({
					onClick: () => setOpenedMessage(record),
				})}
				locale={{
					emptyText: needSelectUser ? (
						<div>
							<div>Выберите пользователя, чтобы просмотреть историю</div>
						</div>
					) : (
						<Empty description="История пуста" />
					),
				}}
			/>

			<Modal
				open={!!openedMessage}
				title="Сообщение"
				onCancel={() => setOpenedMessage(null)}
				footer={null}
				width={700}
			>
				{openedMessage && (
					<div className="flex flex-col gap-2">
						<div>
							<b>Role:</b> {openedMessage.Role ?? "user"}
						</div>
						<div>
							<b>History ID:</b> {openedMessage.ChatHistoryID}
						</div>
						<div>
							<b>Дата:</b>{" "}
							{openedMessage.CreatedDate
								? dayjs(openedMessage.CreatedDate).format("DD.MM.YYYY HH:mm:ss")
								: "-"}
						</div>
						<div className="whitespace-pre-wrap break-words">
							{openedMessage.Text}
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
};
