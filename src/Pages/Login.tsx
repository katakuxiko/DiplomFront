import { Form, Input, Typography } from "antd";

export const LoginPage = () => {
	return (
		<div className="p-6 bg-white border border-gray-400 rounded-2xl">
			<Typography.Title level={3} className="text-center mb-4">
				Login Page
			</Typography.Title>

			<Form layout="vertical">
				<Form.Item label="Username" name="username">
					<Input />
				</Form.Item>
				<Form.Item label="Password" name="password">
					<Input.Password />
				</Form.Item>

				
			</Form>
		</div>
	);
};
