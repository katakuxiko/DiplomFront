import { Button, Form, Input, Spin } from "antd";
import { useState } from "react";
import { rules } from "../../utils/rules";
import { SendOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../axios";
import ReactMarkdown from "react-markdown";

interface AskProps {
	id: string;
}

interface message {
	type: "me" | "bot";
	text: string;
}

export const Ask = ({ id }: AskProps) => {
	const [messages, setMessages] = useState<message[]>([]);

	const [form] = Form.useForm();

	const mutation = useMutation({
		mutationFn: async ({ question }: { question: string }) => {
			setMessages((prev) => [...prev, { type: "me", text: question }]);
			form.resetFields();
			return api.ask.postAsk({
				chat_id: id,
				query: question,
			});
		},
		onSuccess: (res) => {
			setMessages((prev) => [
				...prev,
				{ type: "bot", text: res.data.answer },
			]);
		},
	});

	return (
		<div className="flex flex-col h-full relative">
			<div className="flex flex-col gap-4 mb-12 p-4">
				{messages.map((message, index) => (
					<div
						key={index}
						className={`${
							message.type === "me"
								? "text-right self-end"
								: "text-left self-start"
						} p-3 rounded-2xl bg-white border border-gray-400 max-w-[80%] shadow-md`}
					>
						<div className="self-start text-right font-semibold">
							{message.type === "me" ? undefined : "Бот"}
						</div>

						{message.type === "bot" ? (
							<ReactMarkdown>{message.text}</ReactMarkdown>
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
			</div>
			<div className="fixed bottom-0 right-4 w-full max-w-md">
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
						/>
					</Form.Item>
				</Form>
			</div>
		</div>
	);
};
