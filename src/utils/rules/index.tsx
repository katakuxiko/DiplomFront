export const rules = {
	required: { required: true, message: "Это поле обязательно" },
	email: { required: true, message: "Пожалуйста, введите корректный email", type: "email" },
	password: { required: true, message: "Пожалуйста, введите пароль", min: 6 },
};