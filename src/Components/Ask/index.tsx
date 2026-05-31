import { Button, Form, Input, Spin, message } from "antd";
import { useState, useRef, useEffect } from "react";
import { rules } from "../../utils/rules";
import { SendOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface AskProps {
	id: string;
}

interface Message {
	id: string;
	type: "me" | "bot";
	text: string;
}

interface StreamRequestArgs {
	chatId: string;
	question: string;
	onDelta: (delta: string) => void;
}

const parseSSEEventBlock = (block: string): { event: string; data: string } => {
	let event = "message";
	const dataLines: string[] = [];

	for (const line of block.split("\n")) {
		if (!line) {
			continue;
		}
		if (line.startsWith("event:")) {
			event = line.slice(6).trim();
			continue;
		}
		if (line.startsWith("data:")) {
			dataLines.push(line.slice(5).trimStart());
		}
	}

	return { event, data: dataLines.join("\n") };
};

const getStoredAccessToken = (): string | null => {
	try {
		const raw = localStorage.getItem("auth-storage");
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as {
			state?: { accessToken?: string | null };
		};
		return parsed.state?.accessToken ?? null;
	} catch {
		return null;
	}
};

const createMessageId = (): string => {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID();
	}
	return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const normalizeMathDelimiters = (text: string): string => {
	return text
		.replace(/\\\[([\s\S]*?)\\\]/g, (_, expression: string) => {
			const trimmed = expression.trim();
			return trimmed ? `\n$$\n${trimmed}\n$$\n` : "";
		})
		.replace(/\\\(([^\n]*?)\\\)/g, (_, expression: string) => {
			const trimmed = expression.trim();
			return trimmed ? `$${trimmed}$` : "";
		});
};

const streamAskQuestion = async ({
	chatId,
	question,
	onDelta,
}: StreamRequestArgs): Promise<string> => {
	const askUrl = api.instance.getUri({ url: "/ask" });
	const token = getStoredAccessToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "text/event-stream",
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(askUrl, {
		method: "POST",
		headers,
		body: JSON.stringify({
			chat_id: chatId,
			query: question,
			stream: true,
		}),
	});

	if (!response.ok) {
		let errorMessage = `Ошибка запроса: ${response.status}`;
		try {
			const data = (await response.json()) as { error?: unknown };
			if (typeof data.error === "string" && data.error.trim() !== "") {
				errorMessage = data.error;
			}
		} catch {
			// ignore json parse errors and keep default message
		}
		throw new Error(errorMessage);
	}

	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("text/event-stream")) {
		const fallback = (await response.json()) as {
			answer?: unknown;
			error?: unknown;
		};
		if (typeof fallback.error === "string" && fallback.error.trim() !== "") {
			throw new Error(fallback.error);
		}
		if (typeof fallback.answer === "string") {
			return fallback.answer;
		}
		throw new Error("Пустой ответ от сервера");
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error("Пустой поток ответа");
	}

	const decoder = new TextDecoder();
	let buffer = "";
	let accumulatedAnswer = "";
	let doneAnswer = "";

	const handleEventBlock = (rawBlock: string) => {
		if (rawBlock.trim() === "") {
			return;
		}

		const { event, data } = parseSSEEventBlock(rawBlock);
		let payload: { [key: string]: unknown } = {};
		if (data) {
			try {
				payload = JSON.parse(data) as { [key: string]: unknown };
			} catch {
				payload = {};
			}
		}

		if (event === "delta") {
			const delta = typeof payload.delta === "string" ? payload.delta : "";
			if (delta !== "") {
				accumulatedAnswer += delta;
				onDelta(delta);
			}
			return;
		}

		if (event === "done") {
			if (typeof payload.answer === "string") {
				doneAnswer = payload.answer;
			}
			return;
		}

		if (event === "error") {
			const errorText =
				typeof payload.error === "string" && payload.error.trim() !== ""
					? payload.error
					: "Ошибка стриминга ответа";
			throw new Error(errorText);
		}
	};

	while (true) {
		const { value, done } = await reader.read();
		if (done) {
			break;
		}
		buffer += decoder.decode(value, { stream: true });
		buffer = buffer.replace(/\r/g, "");

		let separatorIndex = buffer.indexOf("\n\n");
		for (; separatorIndex !== -1; separatorIndex = buffer.indexOf("\n\n")) {
			const block = buffer.slice(0, separatorIndex);
			buffer = buffer.slice(separatorIndex + 2);
			handleEventBlock(block);
		}
	}

	const flushChunk = decoder.decode();
	if (flushChunk) {
		buffer += flushChunk;
		buffer = buffer.replace(/\r/g, "");
	}
	if (buffer.trim() !== "") {
		handleEventBlock(buffer);
	}

	return doneAnswer || accumulatedAnswer;
};

export const Ask = ({ id }: AskProps) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const [form] = Form.useForm();

	useEffect(() => {
		void messages.length;
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	const appendToLastBotMessage = (delta: string) => {
		setMessages((prev) => {
			if (prev.length === 0) {
				return prev;
			}
			const next = [...prev];
			const lastIndex = next.length - 1;
			const lastMessage = next[lastIndex];
			if (!lastMessage || lastMessage.type !== "bot") {
				return prev;
			}
			next[lastIndex] = {
				...lastMessage,
				text: `${lastMessage.text}${delta}`,
			};
			return next;
		});
	};

	const replaceLastBotMessage = (text: string) => {
		setMessages((prev) => {
			if (prev.length === 0) {
				return prev;
			}
			const next = [...prev];
			const lastIndex = next.length - 1;
			const lastMessage = next[lastIndex];
			if (!lastMessage || lastMessage.type !== "bot") {
				return prev;
			}
			next[lastIndex] = {
				...lastMessage,
				text,
			};
			return next;
		});
	};

	const mutation = useMutation({
		mutationFn: async ({ question }: { question: string }) => {
			setMessages((prev) => [
				...prev,
				{ id: createMessageId(), type: "me", text: question },
				{ id: createMessageId(), type: "bot", text: "" },
			]);
			form.resetFields();

			const finalAnswer = await streamAskQuestion({
				chatId: id,
				question,
				onDelta: appendToLastBotMessage,
			});
			if (finalAnswer !== "") {
				replaceLastBotMessage(finalAnswer);
			}
			return finalAnswer;
		},
		onError: (error) => {
			const detail =
				error instanceof Error && error.message.trim() !== ""
					? error.message
					: "Не удалось получить ответ";
			message.error(detail);
			setMessages((prev) => {
				if (prev.length === 0) {
					return prev;
				}
				const next = [...prev];
				const lastMessage = next[next.length - 1];
				if (lastMessage?.type === "bot" && lastMessage.text.trim() === "") {
					next.pop();
				}
				return next;
			});
		},
	});

	return (
		<div className="flex flex-col h-full relative">
			<div className="flex flex-col gap-4 mb-12 p-4 overflow-y-auto">
				{messages.map((message) => (
					<div
						key={message.id}
						className={`${
							message.type === "me"
								? "text-right self-end"
								: "text-left self-start"
						} ask-message-enter p-3 rounded-2xl bg-white border border-gray-400/30 max-w-[80%] shadow-md overflow-y-auto`}
					>
						<div className="self-start text-right font-semibold">
							{message.type === "me" ? undefined : "Бот"}
						</div>

						{message.type === "bot" ? (
							<div className="ask-markdown">
								<ReactMarkdown
									remarkPlugins={[remarkGfm, remarkMath]}
									rehypePlugins={[rehypeKatex]}
								>
									{normalizeMathDelimiters(message.text)}
								</ReactMarkdown>
							</div>
						) : (
							message.text
						)}
					</div>
				))}
				{mutation.isPending && (
					<div>
						<Spin />
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>
			<div className="fixed bottom-0 right-4 w-full max-w-md ">
				<Form form={form} onFinish={mutation.mutate}>
					<Form.Item name="question" rules={[rules.required]}>
						<Input
							suffix={
								<Button
									type="primary"
									className="rounded-full!"
									icon={<SendOutlined />}
									loading={mutation.isPending}
									onClick={form.submit}
								/>
							}
							placeholder="Задайте вопрос"
							className="shadow-2xl"
						/>
					</Form.Item>
				</Form>
			</div>
		</div>
	);
};
