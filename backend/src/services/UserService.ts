import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const USERS_FILE = path.join(process.cwd(), 'users.json');

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    salt: string;
    createdAt: number;
    updatedAt: number;
}

export interface UserWithRouters extends User {
    routers: SavedRouter[];
}

export interface SavedRouter {
    id: string;
    name: string;
    host: string;
    user: string;
    encryptedPassword: string;
    port: number;
    createdAt: number;
    updatedAt: number;
}

export class UserService {
    private static generateSalt(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private static hashPassword(password: string, salt: string): string {
        return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    }

    private static async loadUsers(): Promise<UserWithRouters[]> {
        try {
            const data = await fs.readFile(USERS_FILE, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    private static async saveUsers(users: UserWithRouters[]): Promise<void> {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    }

    public static async createUser(username: string, password: string): Promise<User> {
        const users = await this.loadUsers();

        if (users.find(u => u.username === username)) {
            throw new Error('Username already exists');
        }

        const salt = this.generateSalt();
        const passwordHash = this.hashPassword(password, salt);

        const newUser: UserWithRouters = {
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            username,
            passwordHash,
            salt,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            routers: []
        };

        users.push(newUser);
        await this.saveUsers(users);

        return {
            id: newUser.id,
            username: newUser.username,
            passwordHash: '',
            salt: '',
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt
        };
    }

    public static async validateCredentials(username: string, password: string): Promise<User> {
        const users = await this.loadUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            throw new Error('Invalid username or password');
        }

        const passwordHash = this.hashPassword(password, user.salt);
        if (passwordHash !== user.passwordHash) {
            throw new Error('Invalid username or password');
        }

        return {
            id: user.id,
            username: user.username,
            passwordHash: '',
            salt: '',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }

    public static async getUserRouters(userId: string): Promise<SavedRouter[]> {
        const users = await this.loadUsers();
        const user = users.find(u => u.id === userId);
        return user?.routers || [];
    }

    public static async addRouter(userId: string, router: Omit<SavedRouter, 'id' | 'encryptedPassword' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<SavedRouter> {
        const users = await this.loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            throw new Error('User not found');
        }

        const { encrypt } = await import('../utils/crypto');
        const encryptedPassword = encrypt(router.password);

        const newRouter: SavedRouter = {
            id: `router-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: router.name,
            host: router.host,
            user: router.user,
            port: router.port,
            encryptedPassword,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        users[userIndex].routers.push(newRouter);
        users[userIndex].updatedAt = Date.now();
        await this.saveUsers(users);

        return { ...newRouter, encryptedPassword: '' };
    }

    public static async updateRouter(userId: string, routerId: string, updates: Partial<Omit<SavedRouter, 'id' | 'encryptedPassword' | 'createdAt'>> & { password?: string }): Promise<SavedRouter> {
        const users = await this.loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            throw new Error('User not found');
        }

        const routerIndex = users[userIndex].routers.findIndex(r => r.id === routerId);
        if (routerIndex === -1) {
            throw new Error('Router not found');
        }

        const { encrypt } = await import('../utils/crypto');
        const router = users[userIndex].routers[routerIndex];

        users[userIndex].routers[routerIndex] = {
            ...router,
            ...updates,
            encryptedPassword: updates.password ? encrypt(updates.password) : router.encryptedPassword,
            updatedAt: Date.now()
        };

        users[userIndex].updatedAt = Date.now();
        await this.saveUsers(users);

        return { ...users[userIndex].routers[routerIndex], encryptedPassword: '' };
    }

    public static async deleteRouter(userId: string, routerId: string): Promise<void> {
        const users = await this.loadUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            throw new Error('User not found');
        }

        const routerIndex = users[userIndex].routers.findIndex(r => r.id === routerId);
        if (routerIndex === -1) {
            throw new Error('Router not found');
        }

        users[userIndex].routers.splice(routerIndex, 1);
        users[userIndex].updatedAt = Date.now();
        await this.saveUsers(users);
    }

    public static async getRouterWithPassword(userId: string, routerId: string): Promise<(SavedRouter & { password: string }) | null> {
        const users = await this.loadUsers();
        const user = users.find(u => u.id === userId);
        const router = user?.routers.find(r => r.id === routerId);

        if (!router) {
            return null;
        }

        const { decrypt } = await import('../utils/crypto');
        return { ...router, password: decrypt(router.encryptedPassword) };
    }

    public static async getUserByUsername(username: string): Promise<User | null> {
        const users = await this.loadUsers();
        const user = users.find(u => u.username === username);

        if (!user) return null;

        return {
            id: user.id,
            username: user.username,
            passwordHash: '',
            salt: '',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }
}