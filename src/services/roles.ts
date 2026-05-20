// небольшая генерация id без внешних зависимостей

export interface Role {
	id: string;
	name: string;
	access_level: number;
}

const STORAGE_KEY = "app_roles_v1";

const defaultRoles: Role[] = [
	{ id: "1", name: "member", access_level: 0 },
	{ id: "2", name: "moderator", access_level: 50 },
	{ id: "3", name: "admin", access_level: 100 },
];

type StorageShape = Record<string, Role[]>;

function readAll(): StorageShape {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			const init: StorageShape = {};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
			return init;
		}
		return JSON.parse(raw) as StorageShape;
	} catch (e) {
		const init: StorageShape = {};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
		return init;
	}
}

function writeAll(shape: StorageShape) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
}

export const rolesService = {
	list: async (chatId?: string): Promise<Role[]> => {
		if (!chatId) return defaultRoles;
		const all = readAll();
		if (!all[chatId]) {
			// initialize with defaults for new chat
			all[chatId] = defaultRoles.map((r) => ({
				...r,
				id: `${chatId}-${r.id}`,
			}));
			writeAll(all);
		}
		return all[chatId];
	},
	create: async (
		chatId: string,
		payload: { name: string; access_level: number },
	): Promise<Role> => {
		const all = readAll();
		if (!all[chatId])
			all[chatId] = defaultRoles.map((r) => ({
				...r,
				id: `${chatId}-${r.id}`,
			}));
		const newRole: Role = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			name: payload.name,
			access_level: payload.access_level,
		};
		all[chatId].push(newRole);
		writeAll(all);
		return newRole;
	},
	update: async (
		chatId: string,
		id: string,
		payload: { name: string; access_level: number },
	): Promise<Role | null> => {
		const all = readAll();
		const roles = all[chatId] || [];
		const idx = roles.findIndex((r) => r.id === id);
		if (idx === -1) return null;
		roles[idx] = {
			...roles[idx],
			name: payload.name,
			access_level: payload.access_level,
		};
		all[chatId] = roles;
		writeAll(all);
		return roles[idx];
	},
	remove: async (chatId: string, id: string): Promise<void> => {
		const all = readAll();
		all[chatId] = (all[chatId] || []).filter((r) => r.id !== id);
		writeAll(all);
	},
};
