import fs from 'fs/promises';
import path from 'path';
import { encrypt, decrypt } from '../utils/crypto';

const ROUTERS_FILE = path.join(process.cwd(), 'routers.json');

export interface SavedRouter {
    id: string;
    name: string;
    host: string;
    port: number;
    user: string;
    encryptedPassword: string;
    createdAt: number;
    updatedAt: number;
    password?: string;
}

export class RouterStoreService {
    private static routers: Map<string, SavedRouter[]> = new Map();

    private static async loadRouters(userId: string): Promise<SavedRouter[]> {
        try {
            const data = await fs.readFile(ROUTERS_FILE, 'utf-8');
            const allRouters: Record<string, SavedRouter[]> = JSON.parse(data);
            return allRouters[userId] || [];
        } catch {
            return [];
        }
    }

    private static async saveRouters(userId: string, routers: SavedRouter[]): Promise<void> {
        let allRouters: Record<string, SavedRouter[]> = {};
        try {
            const data = await fs.readFile(ROUTERS_FILE, 'utf-8');
            allRouters = JSON.parse(data);
        } catch { }
        allRouters[userId] = routers;
        await fs.writeFile(ROUTERS_FILE, JSON.stringify(allRouters, null, 2));
    }

    public static async getRouters(userId: string): Promise<SavedRouter[]> {
        const routers = await this.loadRouters(userId);
        return routers.map(r => ({
            ...r,
            password: undefined
        }));
    }

    public static async addRouter(userId: string, router: Omit<SavedRouter, 'id' | 'encryptedPassword' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<SavedRouter> {
        const routers = await this.loadRouters(userId);
        const existing = routers.find(r => r.host === router.host && r.user === router.user);
        if (existing) {
            throw new Error('Router with same host and user already exists');
        }

        const newRouter: SavedRouter = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: router.name,
            host: router.host,
            port: router.port,
            user: router.user,
            encryptedPassword: encrypt(router.password),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        routers.push(newRouter);
        await this.saveRouters(userId, routers);
        this.routers.set(userId, routers);

        return { ...newRouter, password: undefined };
    }

    public static async updateRouter(userId: string, routerId: string, updates: Partial<Omit<SavedRouter, 'id' | 'encryptedPassword' | 'createdAt'>> & { password?: string }): Promise<SavedRouter> {
        const routers = await this.loadRouters(userId);
        const index = routers.findIndex(r => r.id === routerId);
        if (index === -1) {
            throw new Error('Router not found');
        }

        const router = routers[index];
        const updated: SavedRouter = {
            ...router,
            ...updates,
            encryptedPassword: updates.password ? encrypt(updates.password) : router.encryptedPassword,
            updatedAt: Date.now()
        };

        routers[index] = updated;
        await this.saveRouters(userId, routers);
        this.routers.set(userId, routers);

        return { ...updated, password: undefined };
    }

    public static async deleteRouter(userId: string, routerId: string): Promise<void> {
        const routers = await this.loadRouters(userId);
        const filtered = routers.filter(r => r.id !== routerId);
        if (filtered.length === routers.length) {
            throw new Error('Router not found');
        }
        await this.saveRouters(userId, filtered);
        this.routers.set(userId, filtered);
    }

    public static async getRouterWithPassword(userId: string, routerId: string): Promise<SavedRouter | null> {
        const routers = await this.loadRouters(userId);
        const router = routers.find(r => r.id === routerId);
        if (!router) return null;
        return { ...router, password: decrypt(router.encryptedPassword) };
    }
}