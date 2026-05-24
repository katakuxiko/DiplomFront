import { DeleteOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Drawer,
    message,
    notification,
    Popconfirm,
    Select,
    Table,
    TableProps,
    Upload,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { api } from "../../axios";
import type { ModelsDocument } from "../../axios/Api";
import { rolesService } from "../../services/roles";
import PdfViewer from "../PdfView";

interface DocumentsProps {
	id: string;
}

const columns: TableProps<ModelsDocument>["columns"] = [
	{
		key: "name",
		dataIndex: "name",
		title: "Название",
	},
	{
		key: "created_date",
		dataIndex: "created_date",
		title: "Дата создания",
		render: (date: string) => dayjs(date).format("DD.MM.YYYY HH:mm"),
	},
	{
		key: "access_level",
		dataIndex: "access_level",
		title: "Уровень доступа",
	},
];

export const Documents = ({ id }: DocumentsProps) => {
	const queryClient = useQueryClient();
	const [rowUrl, setRowUrl] = useState<string | undefined>();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	const { data: roles } = useQuery({
		queryKey: ["roles", id],
		queryFn: async () => rolesService.list(id),
	});

	const accessLevels = (roles || []).map((r: any) => ({
		value: r.access_level,
		label: r.name,
	}));

	const { data } = useQuery({
		queryKey: ["documents", id, page, pageSize],
		queryFn: async () => {
			return api.documents.documentsList({
				chat_id: id,
				page,
				limit: pageSize,
			});
		},
	});

	const mutation = useMutation({
		mutationFn: async (file: File) => {
			message.loading({
				content: "Загрузка документа...",
				key: "uploadDoc",
				duration: 0,
			});
			return api.documents.uploadCreate({ chat_id: id, file });
		},
		onSuccess: () => {
			notification.success({
				message: "Документ успешно загружен",
				duration: 2,
			});
			message.destroy("uploadDoc");
			queryClient.invalidateQueries({ queryKey: ["documents", id] });
		},
	});

	const accessMutation = useMutation({
		mutationFn: async ({ docId, level }: { docId: string; level: number }) =>
			api.documents.documentsUpdateAccess(docId, { access_level: level }),
		onSuccess: () => {
			message.success("Уровень доступа обновлён");
			queryClient.invalidateQueries({
				queryKey: ["documents", id, page, pageSize],
			});
		},
		onError: () => message.error("Не удалось обновить уровень доступа"),
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold">Загруженные документы</h2>
				<Upload
					beforeUpload={(file) => {
						mutation.mutate(file);
					}}
					showUploadList={false}
					accept=".pdf"
				>
					<Button size="large" type="primary">
						Загрузить документ
					</Button>
				</Upload>
			</div>
			<Table
				onRow={(record) => ({
					onClick: (e) => {
						const target = e?.target as HTMLElement | null;
						if (
							target?.closest(".ant-select") ||
							target?.closest(".ant-select-dropdown")
						)
							return;
						if (!record.id) return;
						setRowUrl(`documents/${record.id}/download`);
					},
				})}
				columns={[
					...columns,
					{
						title: "Настройки",
						key: "actions",
						render: (record: ModelsDocument) => (
							<Select
								style={{ width: 200 }}
								size="small"
								options={accessLevels}
								value={record.access_level ?? 0}
								onClick={(e) => e.stopPropagation()}
								onMouseDown={(e) => e.stopPropagation()}
								onChange={(val) => {
									if (!record.id) return;
									accessMutation.mutate({ docId: record.id, level: val });
								}}
								loading={accessMutation.isPending}
							/>
						),
					},
				]}
				dataSource={(data?.data.documents as ModelsDocument[]) ?? []}
				pagination={{
					pageSize: pageSize,
					showSizeChanger: true,
					onChange: (page, pageSize) => {
						setPage(page);
						setPageSize(pageSize);
					},
					total: data?.data.total,
				}}
			/>

			<Drawer
				size={1000}
				destroyOnClose
				onClose={() => setRowUrl(undefined)}
				open={!!rowUrl}
				title="Просмотр документа"
				extra={
					<Popconfirm
						title="Вы уверены, что хотите удалить этот документ?"
						okText="Да"
						cancelText="Нет"
						onConfirm={() => {
							api.documents.documentsDelete(rowUrl!.split("/")[1]).then(() => {
								notification.success({
									message: "Документ успешно удален",
									duration: 2,
								});
								setRowUrl(undefined);
								queryClient.invalidateQueries({ queryKey: ["documents", id] });
							});
						}}
					>
						<Button icon={<DeleteOutlined />} danger type="primary">
							Удалить
						</Button>
					</Popconfirm>
				}
			>
				{rowUrl ? <PdfViewer key={rowUrl} url={rowUrl} /> : null}
			</Drawer>
		</div>
	);
};
