import { useMutation } from "@tanstack/react-query";
import { Button, Form, Input, Typography } from "antd";
import { api } from "../axios";
import { useAuth } from "../store/authStore";

export const LoginPage = () => {
	const { login } = useAuth();

	const mutation = useMutation({
		mutationFn: async (data: { username: string; password: string }) => {
			return api.auth.loginCreate(data);
		},
		onSuccess: (res) => {
			login(res.data.token);
		},
	});

	return (
		<div className="p-6 w-full max-w-xs bg-white border border-gray-400 rounded-2xl">
			<Typography.Title level={3} className="text-start mb-4">
				Вход
			</Typography.Title>

			<Form onFinish={mutation.mutate} layout="vertical">
				<Form.Item label="Логин" name="username">
					<Input placeholder="Введите логин" />
				</Form.Item>
				<Form.Item label="Пароль" name="password">
					<Input.Password placeholder="Введите пароль" />
				</Form.Item>

				<Form.Item>
					<Button
						loading={mutation.isPending}
						type="primary"
						htmlType="submit"
						block
					>
						Войти
					</Button>
				</Form.Item>
			</Form>
		</div>
	);
};
