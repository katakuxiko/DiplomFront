import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	Button,
	Divider,
	Form,
	Input,
	InputNumber,
	Select,
	Spin,
	Typography,
	message,
} from "antd";
import { FC, useEffect } from "react";
import { api } from "../../axios";
import type { DtoChatSettingCreateRequest } from "../../axios/Api";

interface SettingsProps {
	id: string;
}

export const Settings: FC<SettingsProps> = ({ id }) => {
	const [form] = Form.useForm();
	const queryClient = useQueryClient();
	const chatBase = (
		import.meta.env.VITE_BASE_CHAT_URL ?? window.location.origin + "/"
	).replace(/\/$/, "");
	const chatUrl = `${chatBase}/${id}`;

	const { data, isLoading, error } = useQuery({
		queryFn: () => {
			return api.chatSettings.chatDetail(id).then((data) => data.data);
		},
		queryKey: ["chat-settings", id],
	});

	// Загрузка списка моделей из бэкенда (LM Studio)
	type LMModel = { id?: string; name?: string; model?: string };
	const { data: modelsData } = useQuery<LMModel[]>({
		queryFn: async () => {
			try {
				const res = await api.request<{ data: LMModel[] }>({
					path: "/models",
					method: "GET",
				});
				return Array.isArray(res.data) ? res.data : [];
			} catch (e) {
				return [];
			}
		},
		queryKey: ["lm-models"],
		staleTime: 1000 * 60 * 5,
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
				externalApiKey: data.settings?.externalApiKey || undefined,
				embedExternalApiKey: data.settings?.embedExternalApiKey || undefined,
				temperature: data.settings?.temperature || 0.7,
				maxTokens: data.settings?.maxTokens || 2000,
				model: data.settings?.model || undefined,
				systemPrompt: data.settings?.systemPrompt || "",
				enableHistory: data.settings?.enableHistory !== false,
				provider: data.settings?.provider || "local",
				externalBaseUrl: data.settings?.externalBaseUrl || undefined,
				embedProvider: data.settings?.embedProvider || "local",
				embedExternalBaseUrl: data.settings?.embedExternalBaseUrl || undefined,
				requestsLimit: data.settings?.requestsLimit || 100,
				requestsWindow: data.settings?.requestsWindow || 3600,
				embedModel: data.settings?.embedModel || undefined,
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
				provider: values.provider as string,
				externalApiKey: values.externalApiKey as string | undefined,
				externalBaseUrl: values.externalBaseUrl as string | undefined,
				embedProvider: values.embedProvider as string,
				embedExternalApiKey: values.embedExternalApiKey as string | undefined,
				embedExternalBaseUrl: values.embedExternalBaseUrl as string | undefined,
				requestsLimit: values.requestsLimit as number,
				requestsWindow: values.requestsWindow as number,
				embedModel: values.embedModel as string | undefined,
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
						<Input value={chatUrl} disabled placeholder="https://example.com" />
						<a
							href={chatUrl}
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
						shouldUpdate={(prev, cur) => prev.provider !== cur.provider}
					>
						{() =>
							form.getFieldValue("provider") === "external" ? (
								<Form.Item
									name="model"
									rules={[
										{
											required: true,
											message: "Пожалуйста, введите имя модели",
										},
									]}
								>
									<Input placeholder="Введите имя модели (например: deepseek-ai/DeepSeek-V4-Pro:novita)" />
								</Form.Item>
							) : (
								<Form.Item
									name="model"
									rules={[
										{ required: true, message: "Пожалуйста, выберите модель" },
									]}
								>
									<Select
										placeholder="Выберите модель"
										options={(Array.isArray(modelsData) ? modelsData : []).map(
											(m: LMModel) => ({
												label: m.id || m.name || m.model,
												value: m.id || m.name || m.model,
											}),
										)}
										notFoundContent={
											isLoading ? "Загрузка..." : "Модели не найдены"
										}
									/>
								</Form.Item>
							)
						}
					</Form.Item>

					<Form.Item
						label="Модель для эмбеддингов"
						shouldUpdate={(prev, cur) =>
							prev.embedProvider !== cur.embedProvider
						}
					>
						{() =>
							form.getFieldValue("embedProvider") === "external" ? (
								<Form.Item
									name="embedModel"
									rules={[
										{
											required: true,
											message: "Пожалуйста, введите имя модели для эмбеддингов",
										},
									]}
								>
									<Input placeholder="Введите модель для эмбеддингов (например: sentence-transformers/all-MiniLM-L6-v2)" />
								</Form.Item>
							) : (
								<Form.Item name="embedModel">
									<Select
										placeholder="Выберите модель для эмбеддингов"
										options={(Array.isArray(modelsData) ? modelsData : []).map(
											(m: LMModel) => ({
												label: m.id || m.name || m.model,
												value: m.id || m.name || m.model,
											}),
										)}
										notFoundContent={
											isLoading ? "Загрузка..." : "Модели не найдены"
										}
									/>
								</Form.Item>
							)
						}
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

				{/* Провайдер */}
				<Typography.Title level={4}>Провайдер</Typography.Title>
				<div className="grid grid-cols-2 gap-x-4 mb-6">
					<Form.Item
						label="Провайдер"
						name="provider"
						rules={[{ required: true }]}
					>
						<Select
							options={[
								{ label: "Локальный (LM Studio)", value: "local" },
								{ label: "Внешний (API key)", value: "external" },
							]}
						/>
					</Form.Item>

					{/* Показывать поля только если выбран внешний провайдер */}
					<Form.Item
						shouldUpdate={(prev, cur) => prev.provider !== cur.provider}
						noStyle
					>
						{() =>
							form.getFieldValue("provider") === "external" ? (
								<>
									<Form.Item
										label="External API Base URL"
										name="externalBaseUrl"
									>
										<Input placeholder="https://api.openai.com/v1" />
									</Form.Item>
									<Form.Item label="External API Key" name="externalApiKey">
										<Input.Password placeholder="sk-..." />
										{data?.settings?.externalApiKeySet &&
											!data?.settings?.externalApiKey && (
												<div className="text-sm text-gray-500 mt-1">
													Ключ установлен (не отображается)
												</div>
											)}
									</Form.Item>
								</>
							) : null
						}
					</Form.Item>

					{/* Провайдер для эмбеддингов */}
					<Form.Item
						label="Провайдер эмбеддингов"
						name="embedProvider"
						rules={[{ required: true }]}
					>
						<Select
							options={[
								{ label: "Локальный (LM Studio)", value: "local" },
								{ label: "Внешний (API key)", value: "external" },
							]}
						/>
					</Form.Item>

					<Form.Item
						shouldUpdate={(prev, cur) =>
							prev.embedProvider !== cur.embedProvider
						}
						noStyle
					>
						{() =>
							form.getFieldValue("embedProvider") === "external" ? (
								<>
									<Form.Item
										label="Embed External Base URL"
										name="embedExternalBaseUrl"
									>
										<Input placeholder="https://api.openai.com/v1" />
									</Form.Item>
									<Form.Item
										label="Embed External API Key"
										name="embedExternalApiKey"
									>
										<Input.Password placeholder="sk-..." />
										{data?.settings?.embedExternalApiKeySet &&
											!data?.settings?.embedExternalApiKey && (
												<div className="text-sm text-gray-500 mt-1">
													Ключ установлен (не отображается)
												</div>
											)}
									</Form.Item>
								</>
							) : null
						}
					</Form.Item>
				</div>

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
