import { api } from "../axios";
import { ContentType } from "../axios/Api";

export interface TestQuestionCreateRequest {
	text: string;
	category?: string;
	expected_answer?: string;
	expected_no_answer?: boolean;
	source_hint?: string;
	order_num?: number;
}

export interface TestQuestionResponse {
	id: string;
	chat_id: string;
	text: string;
	category?: string;
	expected_answer?: string;
	expected_no_answer?: boolean;
	source_hint?: string;
	order_num?: number;
	created_at?: string;
}

export interface PaginatedTestQuestions {
	data: TestQuestionResponse[];
	page: number;
	limit: number;
	total: number;
}

export interface EvaluationResult {
	id: string;
	run_id: string;
	question: TestQuestionResponse;
	retrieved_fragment?: string;
	model_answer?: string;
	response_time_ms?: number;
	fallback_used?: boolean;
	error_message?: string;
	expert_score?: number;
	expert_feedback?: string;
	is_correct?: boolean;
	evaluator_admin_id?: string;
	evaluated_at?: string;
}

export interface EvaluationRun {
	id: string;
	chat_id: string;
	status: string;
	model?: string;
	top_k?: number;
	total_questions?: number;
	evaluated_count?: number;
	correct_count?: number;
	avg_score?: number;
	started_at?: string;
	completed_at?: string;
	results: EvaluationResult[];
}

export interface EvaluationRunListItem {
	id: string;
	chat_id: string;
	status: string;
	model?: string;
	top_k?: number;
	total_questions?: number;
	evaluated_count?: number;
	correct_count?: number;
	avg_score?: number;
	started_at?: string;
	completed_at?: string;
}

export interface PaginatedEvaluationRuns {
	data: EvaluationRunListItem[];
	page: number;
	limit: number;
	total: number;
}

export interface EvaluationMetrics {
	run_id: string;
	total_questions: number;
	evaluated_count: number;
	correct_answer_rate: number;
	correct_refusal_rate: number;
	hallucination_rate: number;
	fallback_rate: number;
	error_rate: number;
	avg_latency_ms: number;
	p95_latency_ms: number;
}

export interface EvaluationBaseline {
	run_id: string;
	questions_total: number;
	rag_context_hit_rate: number;
	baseline_context_hit_rate: number;
	baseline_avg_search_ms: number;
	baseline_p95_search_ms: number;
}

export interface EvaluationAskSettings {
	provider?: "local" | "external";
	externalApiKey?: string;
	externalBaseUrl?: string;
	embedProvider?: "local" | "external";
	embedExternalApiKey?: string;
	embedExternalBaseUrl?: string;
	model?: string;
	embedModel?: string;
	temperature?: number;
	maxTokens?: number;
	systemPrompt?: string;
	enableHistory?: boolean;
}

export const evaluationApi = {
	getQuestions: async (chatId: string, page = 1, limit = 50) => {
		const res = await api.request<PaginatedTestQuestions>({
			path: `/chats/${chatId}/test-questions`,
			method: "GET",
			query: { page, limit },
			secure: true,
			format: "json",
		});
		return res.data;
	},

	deleteQuestion: async (chatId: string, questionId: string) => {
		await api.request<void>({
			path: `/chats/${chatId}/test-questions/${questionId}`,
			method: "DELETE",
			secure: true,
		});
	},

	createQuestion: async (chatId: string, body: TestQuestionCreateRequest) => {
		const res = await api.request<TestQuestionResponse>({
			path: `/chats/${chatId}/test-questions`,
			method: "POST",
			body,
			type: ContentType.Json,
			secure: true,
			format: "json",
		});
		return res.data;
	},

	batchCreateQuestions: async (
		chatId: string,
		body: TestQuestionCreateRequest[],
	) => {
		const res = await api.request<{
			data: TestQuestionResponse[];
			count: number;
		}>({
			path: `/chats/${chatId}/test-questions/batch`,
			method: "POST",
			body,
			type: ContentType.Json,
			secure: true,
			format: "json",
		});
		return res.data;
	},

	startRun: async (
		chatId: string,
		topK: number,
		model: string,
		settings?: EvaluationAskSettings,
	) => {
		const res = await api.request<EvaluationRun>({
			path: "/evaluations/runs",
			method: "POST",
			body: {
				chat_id: chatId,
				top_k: topK,
				model,
				settings,
			},
			type: ContentType.Json,
			secure: true,
			format: "json",
		});
		return res.data;
	},

	getRun: async (runId: string) => {
		const res = await api.request<EvaluationRun>({
			path: `/evaluations/runs/${runId}`,
			method: "GET",
			secure: true,
			format: "json",
		});
		return res.data;
	},

	listRunsByChat: async (chatId: string, page = 1, limit = 30) => {
		const res = await api.request<PaginatedEvaluationRuns>({
			path: `/chats/${chatId}/evaluations/runs`,
			method: "GET",
			query: { page, limit },
			secure: true,
			format: "json",
		});
		return res.data;
	},

	getMetrics: async (runId: string) => {
		const res = await api.request<EvaluationMetrics>({
			path: `/evaluations/runs/${runId}/metrics`,
			method: "GET",
			secure: true,
			format: "json",
		});
		return res.data;
	},

	getBaseline: async (runId: string, limit = 1) => {
		const res = await api.request<EvaluationBaseline>({
			path: `/evaluations/runs/${runId}/baseline`,
			method: "GET",
			query: { limit },
			secure: true,
			format: "json",
		});
		return res.data;
	},

	scoreResult: async (
		resultId: string,
		body: {
			expert_score: number;
			expert_feedback?: string;
			is_correct?: boolean;
		},
	) => {
		const res = await api.request<EvaluationResult>({
			path: `/evaluations/results/${resultId}/score`,
			method: "PUT",
			body,
			type: ContentType.Json,
			secure: true,
			format: "json",
		});
		return res.data;
	},
};
