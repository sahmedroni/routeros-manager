import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupWebSocket } from './socket';
import { FirewallService } from './services/FirewallService';
import { BandwidthService } from './services/BandwidthService';
import { RouterConfig, RouterConnectionService } from './services/RouterConnectionService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Extend Express Request type to include routerConfig
declare global {
    namespace Express {
        interface Request {
            routerConfig?: RouterConfig;
        }
    }
}

// Auth Middleware: Extracts router credentials from headers
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const host = req.headers['x-router-host'] as string;
    const user = req.headers['x-router-user'] as string;
    const password = req.headers['x-router-password'] as string;
    const port = parseInt(req.headers['x-router-port'] as string);

    if (host && user) {
        req.routerConfig = { host, user, password, port: port || 8728 };
    } else if (process.env.NODE_ENV !== 'production') {
        // Fallback to .env in dev mode if no headers provided
        req.routerConfig = {
            host: process.env.ROUTER_HOST || '',
            user: process.env.ROUTER_USER || '',
            password: process.env.ROUTER_PASSWORD || '',
            port: parseInt(process.env.ROUTER_PORT || '8728')
        };
    }

    next();
};

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/login', async (req, res) => {
    const config: RouterConfig = req.body;
    try {
        const api = await RouterConnectionService.getConnection(config);
        // If connection successful, we're good
        res.json({ success: true, message: 'Authenticated successfully' });
    } catch (error: any) {
        res.status(401).json({ error: 'Authentication failed: ' + error.message });
    }
});

app.get('/api/interfaces', authMiddleware, async (req, res) => {
    try {
        const interfaces = await BandwidthService.getInterfaces(req.routerConfig);
        res.json(interfaces);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/firewall/lists', authMiddleware, async (req, res) => {
    try {
        const lists = await FirewallService.getAddressLists(req.routerConfig);
        res.json(lists);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/firewall/add', authMiddleware, async (req, res) => {
    const { address, list, comment } = req.body;
    try {
        const result = await FirewallService.addToAddressList(address, list, req.routerConfig, comment);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/firewall/rules', authMiddleware, async (req, res) => {
    try {
        const rules = await FirewallService.getFilterRules(req.routerConfig);
        res.json(rules);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/firewall/toggle', authMiddleware, async (req, res) => {
    const { id, enabled } = req.body;
    try {
        await FirewallService.toggleFilterRule(id, enabled, req.routerConfig);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Setup WebSocket
setupWebSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
