import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../axios";
import {
	Button,
	Drawer,
	message,
	notification,
	Table,
	TableProps,
	Upload,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import PdfViewer from "../PdfView";

interface DocumentsProps {
	id: string;
}

const columns: TableProps["columns"] = [
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

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-semibold">Загруженные документы</h2>
				<Upload
					beforeUpload={(file) => {
						mutation.mutate(file);
					}}
					showUploadList={false}
				>
					<Button size="large" type="primary">
						Загрузить документ
					</Button>
				</Upload>
			</div>
			<Table
				onRow={(record) => ({
					onClick: () => {
						setRowUrl(`documents/${record.id}/download`);
					},
				})}
				columns={columns}
				dataSource={data?.data.documents ?? []}
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
				onClose={() => setRowUrl(undefined)}
				open={!!rowUrl}
				title="Просмотр документа"
			>
				<PdfViewer url={rowUrl ?? ""} />
			</Drawer>
		</div>
	);
};
