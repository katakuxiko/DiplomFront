import { Card, Col, Row, Skeleton, Statistic, Typography } from "antd";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../axios";
import { useSetHead } from "../hooks";

export const AdminStats: React.FC = () => {
	useSetHead("Статистика");

	const { data, isLoading, error } = useQuery({
		queryKey: ["admin-stats"],
		queryFn: async () => {
			const res = await api.request<any>({
				path: "/admins/stats",
				method: "GET",
				secure: true,
			});
			return res.data;
		},
	});

	if (isLoading) {
		return <Skeleton active paragraph={{ rows: 6 }} />;
	}

	if (error) {
		return <div>Ошибка загрузки статистики</div>;
	}

	const stats = data as any;

	return (
		<div>
			<Typography.Title level={3}>Статистика системы</Typography.Title>

			<Row gutter={16} className="mb-6">
				<Col xs={24} sm={12} md={8} lg={6}>
					<Card>
						<Statistic
							title="Чаты"
							value={
								stats.chats_count ?? stats.chatsCount ?? stats.ChatsCount ?? 0
							}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} lg={6}>
					<Card>
						<Statistic
							title="Пользователи"
							value={
								stats.users_count ?? stats.usersCount ?? stats.UsersCount ?? 0
							}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} lg={6}>
					<Card>
						<Statistic
							title="Документы"
							value={
								stats.documents_count ??
								stats.documentsCount ??
								stats.DocumentsCount ??
								0
							}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} lg={6}>
					<Card>
						<Statistic
							title="Сообщения"
							value={
								stats.messages_count ??
								stats.messagesCount ??
								stats.MessagesCount ??
								0
							}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} lg={6} className="mt-4">
					<Card>
						<Statistic
							title="Чанки"
							value={
								stats.chunks_count ??
								stats.chunksCount ??
								stats.ChunksCount ??
								0
							}
						/>
					</Card>
				</Col>
			</Row>

			<Typography.Title level={4}>По чатам</Typography.Title>
			<Row gutter={[16, 16]}>
				{(stats.chats || []).map((c: any) => (
					<Col key={c.chat_id} xs={24} sm={12} md={8} lg={6}>
						<Card title={c.name || c.name} size="small">
							<Row gutter={8}>
								<Col span={12}>
									<Statistic
										title="Пользователи"
										value={c.users_count ?? c.UsersCount ?? 0}
									/>
								</Col>
								<Col span={12}>
									<Statistic
										title="Документы"
										value={c.documents_count ?? c.DocumentsCount ?? 0}
									/>
								</Col>
								<Col span={12} className="mt-4">
									<Statistic
										title="Сообщения"
										value={c.messages_count ?? c.MessagesCount ?? 0}
									/>
								</Col>
								<Col span={12} className="mt-4">
									<Statistic
										title="Чанки"
										value={c.chunks_count ?? c.ChunksCount ?? 0}
									/>
								</Col>
							</Row>
						</Card>
					</Col>
				))}
			</Row>
		</div>
	);
};

export default AdminStats;
