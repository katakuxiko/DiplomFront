import {
	BarChartOutlined,
	CloudUploadOutlined,
	DeleteOutlined,
	EyeOutlined,
	PlayCircleOutlined,
	ReloadOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Button,
	Card,
	Col,
	Input,
	InputNumber,
	message,
	Row,
	Select,
	Space,
	Statistic,
	Switch,
	Table,
	Tag,
	Typography,
	Popconfirm,
	Divider,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../axios";
import { useSetHead } from "../hooks";
import {
	evaluationApi,
	type EvaluationRunListItem,
	type EvaluationResult,
	type TestQuestionCreateRequest,
	type TestQuestionResponse,
	type EvaluationAskSettings,
} from "../services/evaluation";

type ScoreDraft = {
	expert_score?: number;
	expert_feedback?: string;
	is_correct?: boolean;
};

export const TestingEvaluator = () => {
	useSetHead("Оценка качества");
	const queryClient = useQueryClient();
	const [selectedChatId, setSelectedChatId] = useState<string>();
	const [runId, setRunId] = useState<string>();
	const [topK, setTopK] = useState<number>(5);
	const [model, setModel] = useState<string>("");
	const [useRunSettings, setUseRunSettings] = useState(false);
	const [provider, setProvider] = useState<"local" | "external">("local");
	const [externalBaseUrl, setExternalBaseUrl] = useState("");
	const [externalApiKey, setExternalApiKey] = useState("");
	const [embedProvider, setEmbedProvider] = useState<"local" | "external">(
		"local",
	);
	const [embedExternalBaseUrl, setEmbedExternalBaseUrl] = useState("");
	const [embedExternalApiKey, setEmbedExternalApiKey] = useState("");
	const [embedModel, setEmbedModel] = useState("");
	const [scoreDrafts, setScoreDrafts] = useState<Record<string, ScoreDraft>>(
		{},
	);
	const importInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		const savedChat = localStorage.getItem("testing:selectedChatId");
		const savedRun = localStorage.getItem("testing:lastRunId");
		if (savedChat) {
			setSelectedChatId(savedChat);
		}
		if (savedRun) {
			setRunId(savedRun);
		}
	}, []);

	useEffect(() => {
		if (selectedChatId) {
			localStorage.setItem("testing:selectedChatId", selectedChatId);
		}
	}, [selectedChatId]);

	useEffect(() => {
		if (runId) {
			localStorage.setItem("testing:lastRunId", runId);
		}
	}, [runId]);

	const chatsQuery = useQuery({
		queryKey: ["chats"],
		queryFn: async () => {
			return api.chats.chatsList();
		},
	});

	const chats = useMemo(() => {
		const payload = chatsQuery.data?.data;
		if (Array.isArray(payload)) {
			return payload;
		}
		if (
			payload &&
			typeof payload === "object" &&
			Array.isArray((payload as { data?: unknown }).data)
		) {
			return (payload as { data: Array<{ id?: string; name?: string }> }).data;
		}
		return [] as Array<{ id?: string; name?: string }>;
	}, [chatsQuery.data]);

	const questionsQuery = useQuery({
		queryKey: ["test-questions", selectedChatId],
		queryFn: async () => evaluationApi.getQuestions(selectedChatId!, 1, 200),
		enabled: Boolean(selectedChatId),
	});

	const runQuery = useQuery({
		queryKey: ["evaluation-run", runId],
		queryFn: async () => evaluationApi.getRun(runId!),
		enabled: Boolean(runId),
	});

	const runsHistoryQuery = useQuery({
		queryKey: ["evaluation-runs-history", selectedChatId],
		queryFn: async () => evaluationApi.listRunsByChat(selectedChatId!, 1, 50),
		enabled: Boolean(selectedChatId),
	});

	const metricsQuery = useQuery({
		queryKey: ["evaluation-metrics", runId],
		queryFn: async () => evaluationApi.getMetrics(runId!),
		enabled: Boolean(runId),
	});

	const baselineQuery = useQuery({
		queryKey: ["evaluation-baseline", runId],
		queryFn: async () => evaluationApi.getBaseline(runId!, 1),
		enabled: Boolean(runId),
	});

	const batchImportMutation = useMutation({
		mutationFn: async (payload: TestQuestionCreateRequest[]) => {
			return evaluationApi.batchCreateQuestions(selectedChatId!, payload);
		},
		onSuccess: () => {
			message.success("Контрольные вопросы загружены");
			queryClient.invalidateQueries({
				queryKey: ["test-questions", selectedChatId],
			});
		},
		onError: () => {
			message.error("Не удалось загрузить вопросы");
		},
	});

	const startRunMutation = useMutation({
		mutationFn: async () => {
			let runSettings: EvaluationAskSettings | undefined;
			if (useRunSettings) {
				runSettings = {
					provider,
					externalBaseUrl: externalBaseUrl || undefined,
					externalApiKey: externalApiKey || undefined,
					embedProvider,
					embedExternalBaseUrl: embedExternalBaseUrl || undefined,
					embedExternalApiKey: embedExternalApiKey || undefined,
					embedModel: embedModel || undefined,
					model: model || undefined,
				};
			}

			return evaluationApi.startRun(selectedChatId!, topK, model, runSettings);
		},
		onSuccess: (data) => {
			setRunId(data.id);
			message.success("Прогон завершен");
			queryClient.invalidateQueries({
				queryKey: ["evaluation-runs-history", selectedChatId],
			});
			queryClient.invalidateQueries({ queryKey: ["evaluation-run", data.id] });
			queryClient.invalidateQueries({
				queryKey: ["evaluation-metrics", data.id],
			});
			queryClient.invalidateQueries({
				queryKey: ["evaluation-baseline", data.id],
			});
		},
		onError: () => {
			message.error("Не удалось запустить прогон");
		},
	});

	const scoreMutation = useMutation({
		mutationFn: async (args: {
			resultId: string;
			body: {
				expert_score: number;
				expert_feedback?: string;
				is_correct?: boolean;
			};
		}) => evaluationApi.scoreResult(args.resultId, args.body),
		onSuccess: () => {
			message.success("Оценка сохранена");
			if (runId) {
				queryClient.invalidateQueries({ queryKey: ["evaluation-run", runId] });
				queryClient.invalidateQueries({
					queryKey: ["evaluation-metrics", runId],
				});
			}
		},
		onError: () => {
			message.error("Не удалось сохранить оценку");
		},
	});

	const deleteQuestionMutation = useMutation({
		mutationFn: async (questionId: string) =>
			evaluationApi.deleteQuestion(selectedChatId!, questionId),
		onSuccess: () => {
			message.success("Вопрос удален");
			queryClient.invalidateQueries({
				queryKey: ["test-questions", selectedChatId],
			});
		},
		onError: () => {
			message.error("Не удалось удалить вопрос");
		},
	});

	const onBatchFileSelected = async (file?: File) => {
		if (!selectedChatId) {
			message.warning("Сначала выберите чат");
			return;
		}
		if (!file) {
			return;
		}
		try {
			const raw = await file.text();
			const parsed = JSON.parse(raw) as TestQuestionCreateRequest[];
			if (!Array.isArray(parsed) || parsed.length === 0) {
				message.error("Файл должен содержать непустой JSON-массив вопросов");
				return;
			}
			batchImportMutation.mutate(parsed);
		} catch {
			message.error("Некорректный JSON-файл");
		}
	};

	const openImportDialog = () => {
		if (!selectedChatId) {
			message.warning("Сначала выберите чат");
			return;
		}
		importInputRef.current?.click();
	};

	const results = runQuery.data?.results ?? [];

	const tableData = useMemo(() => {
		return results.map((r) => ({ ...r, key: r.id }));
	}, [results]);

	const questionsTableData = useMemo(() => {
		return (questionsQuery.data?.data ?? []).map((q) => ({ ...q, key: q.id }));
	}, [questionsQuery.data]);

	const runsTableData = useMemo(() => {
		return (runsHistoryQuery.data?.data ?? []).map((run) => ({
			...run,
			key: run.id,
		}));
	}, [runsHistoryQuery.data]);

	const chatOptions = useMemo(() => {
		return chats
			.filter((chat) => Boolean(chat?.id))
			.map((chat) => ({
				label: chat.name || chat.id,
				value: chat.id as string,
			}));
	}, [chats]);

	const columns: ColumnsType<EvaluationResult & { key: string }> = [
		{
			title: "Вопрос",
			dataIndex: ["question", "text"],
			key: "question",
			width: 320,
			render: (_, record) => (
				<div>
					<div className="font-semibold">{record.question?.text}</div>
					<div className="text-xs text-gray-500">
						{record.question?.category || "без категории"}
					</div>
				</div>
			),
		},
		{
			title: "Найденный фрагмент",
			dataIndex: "retrieved_fragment",
			key: "fragment",
			width: 280,
			render: (v: string) => (
				<Typography.Paragraph ellipsis={{ rows: 4 }}>
					{v || "-"}
				</Typography.Paragraph>
			),
		},
		{
			title: "Ответ модели",
			dataIndex: "model_answer",
			key: "answer",
			width: 320,
			render: (v: string) => (
				<Typography.Paragraph ellipsis={{ rows: 4 }}>
					{v || "-"}
				</Typography.Paragraph>
			),
		},
		{
			title: "Статус",
			key: "status",
			width: 130,
			render: (_, record) => {
				if (record.error_message) {
					return <Tag color="red">Ошибка</Tag>;
				}
				if (record.fallback_used) {
					return <Tag color="orange">Отказ</Tag>;
				}
				return <Tag color="green">Ответ</Tag>;
			},
		},
		{
			title: "Оценка",
			key: "score",
			width: 320,
			render: (_, record) => {
				const draft = scoreDrafts[record.id] || {};
				const currentScore = draft.expert_score ?? record.expert_score;
				const currentFeedback =
					draft.expert_feedback ?? record.expert_feedback ?? "";
				const currentCorrect = draft.is_correct ?? record.is_correct ?? false;

				return (
					<Space direction="vertical" style={{ width: "100%" }}>
						<Select
							value={
								typeof currentScore === "number" ? currentScore : undefined
							}
							placeholder="0/1/2"
							onChange={(value) =>
								setScoreDrafts((prev) => ({
									...prev,
									[record.id]: { ...prev[record.id], expert_score: value },
								}))
							}
							options={[
								{ value: 0, label: "0 - некорректно" },
								{ value: 1, label: "1 - частично" },
								{ value: 2, label: "2 - корректно" },
							]}
						/>
						<Space>
							<span>Корректно</span>
							<Switch
								checked={Boolean(currentCorrect)}
								onChange={(checked) =>
									setScoreDrafts((prev) => ({
										...prev,
										[record.id]: { ...prev[record.id], is_correct: checked },
									}))
								}
							/>
						</Space>
						<Input.TextArea
							value={currentFeedback}
							onChange={(e) =>
								setScoreDrafts((prev) => ({
									...prev,
									[record.id]: {
										...prev[record.id],
										expert_feedback: e.target.value,
									},
								}))
							}
							rows={2}
							placeholder="Комментарий эксперта"
						/>
						<Button
							icon={<SaveOutlined />}
							type="primary"
							disabled={typeof currentScore !== "number"}
							loading={scoreMutation.isPending}
							onClick={() => {
								if (typeof currentScore !== "number") {
									message.warning("Выберите экспертную оценку");
									return;
								}
								scoreMutation.mutate({
									resultId: record.id,
									body: {
										expert_score: currentScore,
										expert_feedback: currentFeedback,
										is_correct: Boolean(currentCorrect),
									},
								});
							}}
						>
							Сохранить
						</Button>
					</Space>
				);
			},
		},
	];

	const questionColumns: ColumnsType<TestQuestionResponse & { key: string }> = [
		{
			title: "Вопрос",
			dataIndex: "text",
			key: "text",
			width: 420,
		},
		{
			title: "Категория",
			dataIndex: "category",
			key: "category",
			width: 180,
			render: (v: string) => v || "-",
		},
		{
			title: "Нет ответа ожидается",
			dataIndex: "expected_no_answer",
			key: "expected_no_answer",
			width: 180,
			render: (v: boolean) =>
				v ? <Tag color="orange">Да</Tag> : <Tag color="green">Нет</Tag>,
		},
		{
			title: "Действия",
			key: "actions",
			width: 140,
			render: (_, record) => (
				<Popconfirm
					title="Удалить вопрос?"
					description="Это действие нельзя отменить"
					onConfirm={() => deleteQuestionMutation.mutate(record.id)}
					okText="Удалить"
					cancelText="Отмена"
				>
					<Button
						danger
						size="small"
						icon={<DeleteOutlined />}
						loading={deleteQuestionMutation.isPending}
					>
						Удалить
					</Button>
				</Popconfirm>
			),
		},
	];

	const runsColumns: ColumnsType<EvaluationRunListItem & { key: string }> = [
		{
			title: "Дата запуска",
			dataIndex: "started_at",
			key: "started_at",
			width: 220,
			render: (v: string) => (v ? new Date(v).toLocaleString("ru-RU") : "-"),
		},
		{
			title: "Статус",
			dataIndex: "status",
			key: "status",
			width: 140,
			render: (v: string) => {
				if (v === "completed") return <Tag color="green">completed</Tag>;
				if (v === "failed") return <Tag color="red">failed</Tag>;
				return <Tag color="blue">{v || "-"}</Tag>;
			},
		},
		{
			title: "Модель",
			dataIndex: "model",
			key: "model",
			width: 220,
			render: (v: string) => v || "-",
		},
		{
			title: "Вопросов",
			dataIndex: "total_questions",
			key: "total_questions",
			width: 120,
		},
		{
			title: "Оценено",
			dataIndex: "evaluated_count",
			key: "evaluated_count",
			width: 120,
		},
		{
			title: "Avg score",
			dataIndex: "avg_score",
			key: "avg_score",
			width: 120,
			render: (v: number) => (typeof v === "number" ? v.toFixed(2) : "0.00"),
		},
		{
			title: "Действия",
			key: "actions",
			width: 160,
			render: (_, record) => (
				<Button
					type="default"
					size="small"
					icon={<EyeOutlined />}
					onClick={() => setRunId(record.id)}
				>
					Открыть
				</Button>
			),
		},
	];

	return (
		<Space direction="vertical" size={16} style={{ width: "100%" }}>
			<Card>
				<Space direction="vertical" size={16} style={{ width: "100%" }}>
					<Typography.Title level={3} style={{ marginBottom: 0 }}>
						Контрольное тестирование RAG
					</Typography.Title>
					<Row gutter={[12, 12]}>
						<Col xs={24} md={10}>
							<Select
								style={{ width: "100%" }}
								placeholder="Выберите чат"
								loading={chatsQuery.isLoading}
								value={selectedChatId}
								onChange={(value) => {
									setSelectedChatId(value);
									setRunId(undefined);
								}}
								options={chatOptions}
							/>
						</Col>
						<Col xs={24} md={4}>
							<InputNumber
								style={{ width: "100%" }}
								min={1}
								max={20}
								value={topK}
								onChange={(value) => setTopK(Number(value || 5))}
								addonBefore="TopK"
							/>
						</Col>
						<Col xs={24} md={6}>
							<Input
								placeholder="Модель (опционально)"
								value={model}
								onChange={(e) => setModel(e.target.value)}
							/>
						</Col>
						<Col xs={24} md={4}>
							<Button
								type="primary"
								icon={<PlayCircleOutlined />}
								disabled={!selectedChatId}
								loading={startRunMutation.isPending}
								onClick={() => startRunMutation.mutate()}
								block
							>
								Запустить
							</Button>
						</Col>
					</Row>
					<Row gutter={[12, 12]}>
						<Col>
							<Button
								icon={<CloudUploadOutlined />}
								disabled={!selectedChatId}
								onClick={openImportDialog}
							>
								Импорт JSON вопросов
							</Button>
							<input
								ref={importInputRef}
								type="file"
								accept="application/json"
								style={{ display: "none" }}
								onChange={(e) => {
									onBatchFileSelected(e.target.files?.[0]);
									e.currentTarget.value = "";
								}}
							/>
						</Col>
						<Col>
							<Button
								icon={<ReloadOutlined />}
								onClick={() => {
									if (!selectedChatId) return;
									queryClient.invalidateQueries({
										queryKey: ["test-questions", selectedChatId],
									});
									queryClient.invalidateQueries({
										queryKey: ["evaluation-runs-history", selectedChatId],
									});
									if (runId) {
										queryClient.invalidateQueries({
											queryKey: ["evaluation-run", runId],
										});
										queryClient.invalidateQueries({
											queryKey: ["evaluation-metrics", runId],
										});
										queryClient.invalidateQueries({
											queryKey: ["evaluation-baseline", runId],
										});
									}
								}}
							>
								Обновить
							</Button>
						</Col>
					</Row>
				</Space>
			</Card>

			<Divider style={{ margin: "8px 0" }} />

			<Row gutter={[12, 12]} align="middle">
				<Col xs={24} md={8}>
					<Space>
						<span>Использовать настройки запуска</span>
						<Switch checked={useRunSettings} onChange={setUseRunSettings} />
					</Space>
				</Col>
				<Col xs={24} md={16}>
					<Typography.Text type="secondary">
						Если выключено, прогон использует настройки чата из БД. Если
						включено, используются поля ниже (включая API key).
					</Typography.Text>
				</Col>
			</Row>

			{useRunSettings && (
				<Row gutter={[12, 12]}>
					<Col xs={24} md={6}>
						<Select
							style={{ width: "100%" }}
							value={provider}
							onChange={(v) => setProvider(v)}
							options={[
								{ label: "Chat provider: local", value: "local" },
								{ label: "Chat provider: external", value: "external" },
							]}
						/>
					</Col>
					<Col xs={24} md={9}>
						<Input
							placeholder="Chat external base URL (http://.../v1)"
							value={externalBaseUrl}
							onChange={(e) => setExternalBaseUrl(e.target.value)}
						/>
					</Col>
					<Col xs={24} md={9}>
						<Input.Password
							placeholder="Chat API key (опционально)"
							value={externalApiKey}
							onChange={(e) => setExternalApiKey(e.target.value)}
						/>
					</Col>

					<Col xs={24} md={6}>
						<Select
							style={{ width: "100%" }}
							value={embedProvider}
							onChange={(v) => setEmbedProvider(v)}
							options={[
								{ label: "Embed provider: local", value: "local" },
								{ label: "Embed provider: external", value: "external" },
							]}
						/>
					</Col>
					<Col xs={24} md={6}>
						<Input
							placeholder="Embed model (опционально)"
							value={embedModel}
							onChange={(e) => setEmbedModel(e.target.value)}
						/>
					</Col>
					<Col xs={24} md={6}>
						<Input
							placeholder="Embed external base URL"
							value={embedExternalBaseUrl}
							onChange={(e) => setEmbedExternalBaseUrl(e.target.value)}
						/>
					</Col>
					<Col xs={24} md={6}>
						<Input.Password
							placeholder="Embed API key (опционально)"
							value={embedExternalApiKey}
							onChange={(e) => setEmbedExternalApiKey(e.target.value)}
						/>
					</Col>
				</Row>
			)}

			<Row gutter={[12, 12]}>
				<Col xs={24} sm={12} md={8} lg={4}>
					<Card>
						<Statistic
							title="Вопросов"
							value={questionsQuery.data?.total || 0}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} lg={4}>
					<Card>
						<Statistic
							title="Оценено"
							value={metricsQuery.data?.evaluated_count || 0}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} lg={4}>
					<Card>
						<Statistic
							title="Correct Answer"
							value={(metricsQuery.data?.correct_answer_rate || 0) * 100}
							precision={1}
							suffix="%"
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} lg={4}>
					<Card>
						<Statistic
							title="Correct Refusal"
							value={(metricsQuery.data?.correct_refusal_rate || 0) * 100}
							precision={1}
							suffix="%"
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} lg={4}>
					<Card>
						<Statistic
							title="Hallucination"
							value={(metricsQuery.data?.hallucination_rate || 0) * 100}
							precision={1}
							suffix="%"
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} md={8} lg={4}>
					<Card>
						<Statistic
							title="Avg latency"
							value={metricsQuery.data?.avg_latency_ms || 0}
							precision={0}
							suffix="ms"
						/>
					</Card>
				</Col>
			</Row>

			<Card
				title={
					<Space>
						<BarChartOutlined />
						Baseline comparison
					</Space>
				}
			>
				<Row gutter={[16, 16]}>
					<Col xs={24} md={8}>
						<Statistic
							title="RAG context hit"
							value={(baselineQuery.data?.rag_context_hit_rate || 0) * 100}
							precision={1}
							suffix="%"
						/>
					</Col>
					<Col xs={24} md={8}>
						<Statistic
							title="Baseline context hit"
							value={(baselineQuery.data?.baseline_context_hit_rate || 0) * 100}
							precision={1}
							suffix="%"
						/>
					</Col>
					<Col xs={24} md={8}>
						<Statistic
							title="Baseline avg search"
							value={baselineQuery.data?.baseline_avg_search_ms || 0}
							precision={0}
							suffix="ms"
						/>
					</Col>
				</Row>
			</Card>

			<Card title="Загруженные контрольные вопросы">
				<Table
					columns={questionColumns}
					dataSource={questionsTableData}
					loading={questionsQuery.isLoading}
					scroll={{ x: 980 }}
					pagination={{ pageSize: 10 }}
				/>
			</Card>

			<Card title="История тестирования">
				<Table
					columns={runsColumns}
					dataSource={runsTableData}
					loading={runsHistoryQuery.isLoading}
					scroll={{ x: 980 }}
					pagination={{ pageSize: 8 }}
				/>
			</Card>

			<Card title="Результаты контрольных вопросов">
				<Table
					columns={columns}
					dataSource={tableData}
					loading={runQuery.isLoading || questionsQuery.isLoading}
					scroll={{ x: 1500 }}
					pagination={{ pageSize: 10 }}
				/>
			</Card>
		</Space>
	);
};
