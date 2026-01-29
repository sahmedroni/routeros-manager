"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterConnectionService = void 0;
const node_routeros_1 = require("node-routeros");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class RouterConnectionService {
    static getConnectionKey(config) {
        return `${config.user}@${config.host}:${config.port}`;
    }
    static async getConnection(config) {
        // Fallback to .env for backwards compatibility or if no config provided
        const finalConfig = config || {
            host: (process.env.ROUTER_HOST || '').trim(),
            user: (process.env.ROUTER_USER || '').trim(),
            password: process.env.ROUTER_PASSWORD || '',
            port: parseInt(process.env.ROUTER_PORT || '8728')
        };
        if (!finalConfig.host || !finalConfig.user) {
            console.warn('Blocking connection attempt: Missing host or user.', {
                host: finalConfig.host,
                user: finalConfig.user,
                hasConfigParam: !!config
            });
            throw new Error('Missing Router credentials (host or user). Please log in.');
        }
        const key = this.getConnectionKey(finalConfig);
        if (this.connections.has(key)) {
            return this.connections.get(key);
        }
        if (this.connectionStates.get(key)) {
            // Wait if already connecting
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.getConnection(finalConfig);
        }
        this.connectionStates.set(key, true);
        try {
            const api = new node_routeros_1.RouterOSAPI({
                host: finalConfig.host,
                user: finalConfig.user,
                password: finalConfig.password,
                port: finalConfig.port,
                timeout: 5
            });
            await api.connect();
            console.log(`Connected to MikroTik Router: ${key}`);
            api.on('error', (err) => {
                console.error(`MikroTik Connection Error (${key}):`, err);
                this.connections.delete(key);
            });
            api.on('timeout', () => {
                console.error(`MikroTik Connection Timeout (${key})`);
                this.connections.delete(key);
            });
            this.connections.set(key, api);
            return api;
        }
        catch (error) {
            console.error(`Failed to connect to MikroTik (${key}):`, error);
            this.connectionStates.set(key, false);
            throw error;
        }
        finally {
            this.connectionStates.set(key, false);
        }
    }
    static async closeConnection(config) {
        const key = this.getConnectionKey(config);
        const api = this.connections.get(key);
        if (api) {
            await api.close();
            this.connections.delete(key);
        }
    }
}
exports.RouterConnectionService = RouterConnectionService;
RouterConnectionService.connections = new Map();
RouterConnectionService.connectionStates = new Map();
