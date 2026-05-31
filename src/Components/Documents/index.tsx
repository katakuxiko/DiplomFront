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
	Tag,
	Upload,
} from "antd";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { api } from "../../axios";
import type { ModelsDocument } from "../../axios/Api";
import { rolesService } from "../../services/roles";
import type { Role } from "../../services/roles";
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
	const [filterTags, setFilterTags] = useState<string[]>([]);
	const [uploadTags, setUploadTags] = useState<string[]>([]);

	const { data: roles = [] } = useQuery<Role[]>({
		queryKey: ["roles", id],
		queryFn: async () => rolesService.list(id),
	});

	const accessLevels = roles.map((r) => ({
		value: r.access_level,
		label: r.name,
	}));

	const { data } = useQuery({
		queryKey: ["documents", id, page, pageSize, filterTags.join("|")],
		queryFn: async () => {
			return api.documents.documentsList({
				chat_id: id,
				page,
				limit: pageSize,
				tags: filterTags.length > 0 ? JSON.stringify(filterTags) : undefined,
			});
		},
	});

	const { data: tagsData } = useQuery({
		queryKey: ["document-tags", id],
		queryFn: async () => api.documents.documentsTagsList({ chat_id: id }),
	});

	const documents = useMemo(
		() => (data?.data.documents as ModelsDocument[]) ?? [],
		[data?.data.documents],
	);

	const tagOptions = useMemo(() => {
		const unique = new Set<string>();
		for (const tag of tagsData?.data.tags ?? []) {
			if (tag) unique.add(tag);
		}
		for (const doc of documents) {
			for (const tag of doc.tags ?? []) {
				if (tag) unique.add(tag);
			}
		}
		for (const tag of filterTags) {
			if (tag) unique.add(tag);
		}
		for (const tag of uploadTags) {
			if (tag) unique.add(tag);
		}

		return Array.from(unique)
			.sort((a, b) => a.localeCompare(b, "ru"))
			.map((tag) => ({ label: tag, value: tag }));
	}, [tagsData?.data.tags, documents, filterTags, uploadTags]);

	const normalizeTags = (tags: string[]) => {
		const unique = new Set<string>();
		for (const rawTag of tags) {
			const tag = rawTag.trim().toLowerCase();
			if (tag.length > 0) unique.add(tag);
		}
		return Array.from(unique).sort((a, b) => a.localeCompare(b, "ru"));
	};

	const mutation = useMutation({
		mutationFn: async ({
			file,
			tags,
		}: {
			file: File;
			tags: string[];
		}) => {
			message.loading({
				content: "Загрузка документа...",
				key: "uploadDoc",
				duration: 0,
			});
			return api.documents.uploadCreate({
				chat_id: id,
				file,
				tags: JSON.stringify(tags),
			});
		},
		onSuccess: () => {
			notification.success({
				message: "Документ успешно загружен",
				duration: 2,
			});
			message.destroy("uploadDoc");
			setUploadTags([]);
			queryClient.invalidateQueries({ queryKey: ["documents", id] });
			queryClient.invalidateQueries({ queryKey: ["document-tags", id] });
		},
		onError: () => {
			message.destroy("uploadDoc");
			notification.error({
				message: "Не удалось загрузить документ",
				duration: 2,
			});
		},
	});

	const accessMutation = useMutation({
		mutationFn: async ({ docId, level }: { docId: string; level: number }) =>
			api.documents.documentsUpdateAccess(docId, { access_level: level }),
		onSuccess: () => {
			message.success("Уровень доступа обновлён");
			queryClient.invalidateQueries({ queryKey: ["documents", id] });
		},
		onError: () => message.error("Не удалось обновить уровень доступа"),
	});

	const tagsMutation = useMutation({
		mutationFn: async ({ docId, tags }: { docId: string; tags: string[] }) =>
			api.documents.documentsUpdateTags(docId, { tags }),
		onSuccess: () => {
			message.success("Тэги обновлены");
			queryClient.invalidateQueries({ queryKey: ["documents", id] });
			queryClient.invalidateQueries({ queryKey: ["document-tags", id] });
		},
		onError: () => message.error("Не удалось обновить тэги"),
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap justify-between items-center gap-3">
				<h2 className="text-xl font-semibold">Загруженные документы</h2>
				<div className="flex flex-wrap items-center gap-2">
					<Select
						mode="tags"
						allowClear
						style={{ width: 280 }}
						value={uploadTags}
						options={tagOptions}
						placeholder="Тэги для загружаемого документа"
						onChange={(values) => setUploadTags(normalizeTags(values))}
					/>
					<Upload
						beforeUpload={(file) => {
							mutation.mutate({ file, tags: uploadTags });
							return false;
						}}
						showUploadList={false}
						accept=".pdf"
					>
						<Button size="large" type="primary" loading={mutation.isPending}>
							Загрузить документ
						</Button>
					</Upload>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-sm text-slate-600">Фильтр по тэгам:</span>
				<Select
					mode="tags"
					allowClear
					style={{ width: 340 }}
					value={filterTags}
					options={tagOptions}
					placeholder="Выберите или введите тэги"
					onChange={(values) => {
						setFilterTags(normalizeTags(values));
						setPage(1);
					}}
				/>
				{filterTags.length > 0 ? (
					<div className="flex flex-wrap gap-1">
						{filterTags.map((tag) => (
							<Tag color="blue" key={tag}>
								{tag}
							</Tag>
						))}
					</div>
				) : null}
			</div>

			<Table
				rowKey={(record) => record.id ?? `${record.name}-${record.created_date}`}
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
						title: "Тэги",
						key: "tags",
						render: (record: ModelsDocument) => (
							<Select
								mode="tags"
								style={{ width: 260 }}
								size="small"
								options={tagOptions}
								value={record.tags ?? []}
								placeholder="Добавьте тэги"
								onClick={(e) => e.stopPropagation()}
								onMouseDown={(e) => e.stopPropagation()}
								onChange={(values) => {
									if (!record.id) return;
									tagsMutation.mutate({
										docId: record.id,
										tags: normalizeTags(values),
									});
								}}
								loading={tagsMutation.isPending}
							/>
						),
					},
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
				dataSource={documents}
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
							const documentId = rowUrl?.split("/")[1];
							if (!documentId) return;

							api.documents.documentsDelete(documentId).then(() => {
								notification.success({
									message: "Документ успешно удален",
									duration: 2,
								});
								setRowUrl(undefined);
								queryClient.invalidateQueries({ queryKey: ["documents", id] });
								queryClient.invalidateQueries({ queryKey: ["document-tags", id] });
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
