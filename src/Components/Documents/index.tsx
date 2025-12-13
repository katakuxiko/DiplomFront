import { useQuery } from "@tanstack/react-query";
import { api } from "../../axios";
import { Table, TableProps } from "antd";
import dayjs from "dayjs";

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
	const { data } = useQuery({
		queryKey: ["documents", id],
		queryFn: async () => {
			return api.documents.documentsList({
				chat_id: id,
			});
		},
	});

	return <Table columns={columns} dataSource={data?.data.documents ?? []} />;
};
