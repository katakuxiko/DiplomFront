import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import "katex/dist/katex.min.css";

const queryClient = new QueryClient();

dayjs.locale("ru");

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ConfigProvider locale={ruRU}>
			<QueryClientProvider client={queryClient}>
				<App />
			</QueryClientProvider>
		</ConfigProvider>
	</React.StrictMode>,
);
