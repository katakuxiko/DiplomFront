import { useEffect } from "react";
import { useHeaderStore } from "../store/headerStore";

export const useSetHead = (name: string) => {
	const setName = useHeaderStore((state) => state.setName);
	useEffect(() => {
		setName(name);
	}, [name, setName]);
};
