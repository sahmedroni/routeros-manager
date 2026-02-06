import { RouterOSAPI } from 'node-routeros';
import dotenv from 'dotenv';

dotenv.config();

export interface RouterConfig {
    host: string;
    user: string;
    password?: string;
    port: number;
}

export class RouterConnectionService {
    private static connections = new Map<string, RouterOSAPI>();
    private static connectionStates = new Map<string, boolean>();
    private static failedConnections = new Map<string, { timestamp: number, message: string }>();
    private static readonly COOLDOWN_MS = 30000; // 30 seconds cooldown

    private static getConnectionKey(config: RouterConfig): string {
        return `${config.user}@${config.host}:${config.port}`;
    }

    public static async getConnection(config?: RouterConfig): Promise<RouterOSAPI> {
        // Fallback to .env for backwards compatibility or if no config provided
        const finalConfig: RouterConfig = config || {
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

        // Check for cooldown on failed connections
        const failure = this.failedConnections.get(key);
        if (failure && Date.now() - failure.timestamp < this.COOLDOWN_MS) {
            throw new Error(`Connection to ${key} is in cooldown (previous error: ${failure.message})`);
        }

        if (this.connections.has(key)) {
            return this.connections.get(key)!;
        }

        if (this.connectionStates.get(key)) {
            // Wait if already connecting
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.getConnection(finalConfig);
        }

        this.connectionStates.set(key, true);

        try {
            const api = new RouterOSAPI({
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
            this.failedConnections.delete(key); // Clear any previous failure state on success
            return api;
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error';

            // Only log detailed failure if not recently logged for this key
            const lastFailure = this.failedConnections.get(key);
            if (!lastFailure || Date.now() - lastFailure.timestamp > this.COOLDOWN_MS) {
                console.error(`Failed to connect to MikroTik (${key}):`, errorMessage);
                if (error.errno === -4078) {
                    console.warn(`TIP: Connection Refused. Check if API service is enabled on MikroTik and port ${finalConfig.port} is correct.`);
                }
            }

            this.failedConnections.set(key, {
                timestamp: Date.now(),
                message: errorMessage
            });

            this.connectionStates.set(key, false);
            throw error;
        } finally {
            this.connectionStates.set(key, false);
        }
    }

    public static async closeConnection(config: RouterConfig): Promise<void> {
        const key = this.getConnectionKey(config);
        const api = this.connections.get(key);
        if (api) {
            await api.close();
            this.connections.delete(key);
        }
    }
}
