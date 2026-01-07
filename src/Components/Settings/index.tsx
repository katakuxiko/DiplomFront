import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { FC, useEffect } from "react";
import { api } from "../../axios";
import type { DtoChatSettingCreateRequest } from "../../axios/Api";
import {
	Form,
	Input,
	Typography,
	Button,
	Spin,
	Alert,
	Divider,
	InputNumber,
	Select,
	message,
} from "antd";

interface SettingsProps {
	id: string;
}

export const Settings: FC<SettingsProps> = ({ id }) => {
	const [form] = Form.useForm();
	const queryClient = useQueryClient();

	const { data, isLoading, error } = useQuery({
		queryFn: () => {
			return api.chatSettings.chatDetail(id).then((data) => data.data);
		},
		queryKey: ["chat-settings", id],
	});

	const { mutate: updateSettings, isPending } = useMutation({
		mutationFn: (values: DtoChatSettingCreateRequest) => {
			return api.chatSettings
				.chatSettingsCreate(values)
				.then((data) => data.data);
		},
		onSuccess: () => {
			message.success("Настройки успешно сохранены");
			queryClient.invalidateQueries({ queryKey: ["chat-settings", id] });
		},
		onError: () => {
			message.error("Ошибка при сохранении настроек");
		},
	});

	useEffect(() => {
		if (data) {
			form.setFieldsValue({
				name: data.name,
				descr: data.descr,
				helloText: data.helloText,
				url: data.url,
				temperature: data.settings?.temperature || 0.7,
				maxTokens: data.settings?.maxTokens || 2000,
				model: data.settings?.model || "gpt-4",
				systemPrompt: data.settings?.systemPrompt || "",
				enableHistory: data.settings?.enableHistory !== false,
				requestsLimit: data.settings?.requestsLimit || 100,
				requestsWindow: data.settings?.requestsWindow || 3600,
			});
		}
	}, [data, form]);

	const handleSubmit = (values: Record<string, unknown>) => {
		const updateData: DtoChatSettingCreateRequest = {
			chatID: id,
			name: values.name as string | undefined,
			descr: values.descr as string | undefined,
			helloText: values.helloText as string | undefined,
			url: values.url as string | undefined,
			settings: {
				temperature: values.temperature as number,
				maxTokens: values.maxTokens as number,
				model: values.model as string,
				systemPrompt: values.systemPrompt as string | undefined,
				enableHistory: values.enableHistory as boolean,
				requestsLimit: values.requestsLimit as number,
				requestsWindow: values.requestsWindow as number,
			},
		};
		updateSettings(updateData);
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center min-h-96">
				<Spin size="large" />
			</div>
		);
	}

	return (
		<div>
			<Typography.Title>Настройки</Typography.Title>

			{error && (
				<Alert
					message="Ошибка загрузки настроек"
					description="Не удалось загрузить настройки чата. Пожалуйста, попробуйте позже."
					type="error"
					showIcon
					closable
					className="mb-4"
				/>
			)}

			<Form
				form={form}
				layout="vertical"
				size="large"
				onFinish={handleSubmit}
				autoComplete="off"
			>
				{/* Основная информация */}
				<Typography.Title level={4}>Основная информация</Typography.Title>
				<div className="grid grid-cols-2 gap-x-4 mb-6">
					<Form.Item
						label="Название чата"
						name="name"
						rules={[
							{
								required: true,
								message: "Пожалуйста, введите название чата",
							},
						]}
					>
						<Input placeholder="Название чата" />
					</Form.Item>

					<Form.Item label="URL">
						<Input
							value={import.meta.env.VITE_BASE_CHAT_URL + id}
							disabled
							placeholder="https://example.com"
						/>
						<a
							href={import.meta.env.VITE_BASE_CHAT_URL + id}
							target="_blank"
							rel="noreferrer"
							className="text-sm text-blue-600 hover:underline"
						>
							Перейти к чату
						</a>
					</Form.Item>

					<Form.Item label="Описание" name="descr">
						<Input.TextArea
							placeholder="Описание чата"
							rows={3}
							className="col-span-2"
						/>
					</Form.Item>

					<Form.Item label="Приветственное сообщение" name="helloText">
						<Input.TextArea
							placeholder="Приветственное сообщение для пользователей"
							rows={3}
							className="col-span-2"
						/>
					</Form.Item>
				</div>

				<Divider />

				{/* Параметры модели */}
				<Typography.Title level={4}>Параметры модели</Typography.Title>
				<div className="grid grid-cols-3 gap-x-4 mb-6">
					<Form.Item
						label="Модель AI"
						name="model"
						rules={[
							{
								required: true,
								message: "Пожалуйста, выберите модель",
							},
						]}
					>
						<Select
							placeholder="Выберите модель"
							options={[
								{ label: "EssentialAI RNJ-1", value: "essentialai/rnj-1" },
								{ label: "Google Gemma 3N E4B", value: "google/gemma-3n-e4b" },
							]}
						/>
					</Form.Item>

					<Form.Item
						label="Температура (0-2)"
						name="temperature"
						rules={[
							{
								required: true,
								message: "Пожалуйста, введите значение температуры",
							},
						]}
					>
						<InputNumber min={0} max={2} step={0.1} placeholder="0.7" />
					</Form.Item>

					<Form.Item
						label="Макс. токенов"
						name="maxTokens"
						rules={[
							{
								required: true,
								message: "Пожалуйста, введите макс. токены",
							},
						]}
					>
						<InputNumber min={100} max={128000} step={100} />
					</Form.Item>
				</div>

				<Divider />

				{/* Системные настройки */}
				<Typography.Title level={4}>Системные настройки</Typography.Title>
				<div className="grid grid-cols-1 gap-x-4 mb-6">
					<Form.Item label="Системный промпт" name="systemPrompt">
						<Input.TextArea placeholder="Инструкции для AI модели" rows={4} />
					</Form.Item>
				</div>

				<Divider />

				{/* Ограничения и история */}
				{/* <Typography.Title level={4}>Ограничения и история</Typography.Title>
				<div className="grid grid-cols-3 gap-x-4 mb-6">
					<Form.Item
						label="Включить историю сообщений"
						name="enableHistory"
						valuePropName="checked"
					>
						<Switch />
					</Form.Item>

					<Form.Item
						label="Лимит запросов"
						name="requestsLimit"
						rules={[
							{
								required: true,
								message: "Пожалуйста, введите лимит запросов",
							},
						]}
					>
						<InputNumber min={1} max={10000} step={10} />
					</Form.Item>

					<Form.Item
						label="Временное окно (сек.)"
						name="requestsWindow"
						rules={[
							{
								required: true,
								message: "Пожалуйста, введите временное окно",
							},
						]}
					>
						<InputNumber min={60} max={86400} step={60} />
					</Form.Item>
				</div> */}

				{/* Кнопки действия */}
				<div className="flex gap-2">
					<Button
						type="primary"
						htmlType="submit"
						size="large"
						loading={isPending}
					>
						Сохранить
					</Button>
					<Button onClick={() => form.resetFields()} size="large">
						Отменить
					</Button>
				</div>
			</Form>
		</div>
	);
};
