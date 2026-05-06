import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { setupWebSocket } from './socket';
import { FirewallService } from './services/FirewallService';
import { BandwidthService } from './services/BandwidthService';
import { RouterConfig, RouterConnectionService } from './services/RouterConnectionService';
import { authMiddleware, routerAuthMiddleware } from './middleware/auth';
import { PreferencesService } from './services/PreferencesService';
import { UserService } from './services/UserService';
import { SimpleQueueService } from './services/SimpleQueueService';
import { SystemHealthService } from './services/SystemHealthService';
import { LogService } from './services/LogService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Please configure it in your .env file.');
}

if (JWT_SECRET.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters long.');
}

// Security headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "http://localhost:3001", "ws://localhost:3001"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate Limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per windowMs
    message: { error: 'Too many login attempts, please try again later.' }
});

// Request Logger
app.use((req, res, next) => {
    // console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
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

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/register', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        const user = await UserService.createUser(username, password);
        res.json({ success: true, message: 'User created successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await UserService.validateCredentials(username, password);

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.json({ success: true, message: 'Authenticated successfully' });
    } catch (error: any) {
        res.status(401).json({ error: error.message || 'Authentication failed' });
    }
});

app.post('/api/logout', authMiddleware, async (req, res) => {
    try {
        if (req.user?.activeRouterId) {
            const router = await UserService.getRouterWithPassword(req.user.userId, req.user.activeRouterId);
            if (router) {
                await RouterConnectionService.closeConnection({
                    host: router.host,
                    user: router.user,
                    port: router.port
                });
                console.log(`Disconnected from router on logout: ${router.user}@${router.host}:${router.port}`);
            }
        }
    } catch (error) {
        console.error('Error closing connection on logout:', error);
    }
    res.clearCookie('token');
    res.json({ success: true });
});

app.get('/api/routers', authMiddleware, async (req, res) => {
    try {
        const routers = await UserService.getUserRouters(req.user!.userId);
        res.json(routers.map(r => ({ ...r, password: undefined })));
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch routers' });
    }
});

app.post('/api/routers', authMiddleware, async (req, res) => {
    try {
        const { name, host, port, user, password } = req.body;
        if (!name || !host || !port || !user || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const router = await UserService.addRouter(req.user!.userId, { name, host, port: parseInt(port), user, password });
        res.json(router);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/routers/:id', authMiddleware, async (req, res) => {
    try {
        const routerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { name, host, port, user, password } = req.body;
        const updates: any = {};
        if (name) updates.name = name;
        if (host) updates.host = host;
        if (port) updates.port = parseInt(port);
        if (user) updates.user = user;
        if (password) updates.password = password;

        const router = await UserService.updateRouter(req.user!.userId, routerId, updates);
        res.json(router);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/routers/:id', authMiddleware, async (req, res) => {
    try {
        const routerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await UserService.deleteRouter(req.user!.userId, routerId);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/routers/:id/set-active', authMiddleware, async (req, res) => {
    try {
        const routerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const router = await UserService.getRouterWithPassword(req.user!.userId, routerId);
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Close previous connection if exists
        if (req.user?.activeRouterId) {
            const prevRouter = await UserService.getRouterWithPassword(req.user.userId, req.user.activeRouterId);
            if (prevRouter) {
                await RouterConnectionService.closeConnection({
                    host: prevRouter.host,
                    user: prevRouter.user,
                    port: prevRouter.port
                });
                console.log(`Disconnected from previous router: ${prevRouter.user}@${prevRouter.host}:${prevRouter.port}`);
            }
        }

        await RouterConnectionService.getConnection({
            host: router.host,
            user: router.user,
            password: router.password,
            port: router.port
        });

        const token = jwt.sign(
            { userId: req.user!.userId, username: req.user!.username, activeRouterId: routerId },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.json({
            success: true,
            router: { id: router.id, name: router.name, host: router.host, port: router.port, user: router.user }
        });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to connect to router' });
    }
});

app.get('/api/routers/:id/test', authMiddleware, async (req, res) => {
    try {
        const routerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const router = await UserService.getRouterWithPassword(req.user!.userId, routerId);
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const api = await RouterConnectionService.getConnection({
            host: router.host,
            user: router.user,
            password: router.password,
            port: router.port
        });

        const identity = await api.write('/system/identity/get');
        res.json({ success: true, name: identity[0]?.name || 'Unknown', model: identity[0]?.['board-name'] || 'Unknown' });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to connect to router' });
    }
});

app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        const routers = await UserService.getUserRouters(req.user!.userId);
        const activeRouter = routers.find(r => r.id === req.user?.activeRouterId);
        res.json({
            username: req.user?.username,
            userId: req.user?.userId,
            activeRouter: activeRouter ? { id: activeRouter.id, name: activeRouter.name, host: activeRouter.host, port: activeRouter.port, user: activeRouter.user } : null,
            routers: routers.map(r => ({ id: r.id, name: r.name, host: r.host, port: r.port, user: r.user }))
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

// Preferences API
app.get('/api/preferences', routerAuthMiddleware, async (req, res) => {
    try {
        const preferences = await PreferencesService.getPreferences(req.user!.userId, req.user!.activeRouterId!);
        res.json(preferences);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

app.post('/api/preferences', routerAuthMiddleware, async (req, res) => {
    try {
        const { realtimeInterval, dhcpInterval, pingInterval, logInterval, interfaceInterval, nodeMonitorInterval } = req.body;

        const preferences = await PreferencesService.savePreferencesForUser(req.user!.userId, req.user!.activeRouterId!, {
            realtimeInterval,
            dhcpInterval,
            pingInterval,
            logInterval,
            interfaceInterval,
            nodeMonitorInterval
        });

        res.json(preferences);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

app.delete('/api/preferences', routerAuthMiddleware, async (req, res) => {
    try {
        await PreferencesService.deletePreferences(req.user!.userId, req.user!.activeRouterId!);
        res.json(PreferencesService.getDefaultPreferences());
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to reset preferences' });
    }
});

app.get('/api/logs', routerAuthMiddleware, async (req, res) => {
    try {
        const logs = await LogService.getLogs(req.routerConfig, 0);
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

app.get('/api/system/dashboard', routerAuthMiddleware, async (req, res) => {
    try {
        const dashboardData = await SystemHealthService.getDashboardData(req.routerConfig);
        res.json(dashboardData);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

app.post('/api/system/reboot', routerAuthMiddleware, async (req, res) => {
    try {
        const result = await SystemHealthService.rebootRouter(req.routerConfig);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to reboot router' });
    }
});

app.get('/api/system/updates', routerAuthMiddleware, async (req, res) => {
    try {
        const updateInfo = await SystemHealthService.checkForUpdates(req.routerConfig);
        res.json(updateInfo);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to check for updates' });
    }
});

app.post('/api/system/updates/install', routerAuthMiddleware, async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    if (!req.routerConfig || password !== req.routerConfig.password) {
        return res.status(401).json({ error: 'Invalid RouterOS password' });
    }

    try {
        const result = await SystemHealthService.installUpdates(req.routerConfig);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to install updates' });
    }
});

app.get('/api/interfaces', routerAuthMiddleware, async (req, res) => {
    try {
        const interfaces = await BandwidthService.getInterfaces(req.routerConfig);
        res.json(interfaces);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch interfaces' });
    }
});

app.get('/api/firewall/lists', routerAuthMiddleware, async (req, res) => {
    try {
        const lists = await FirewallService.getAddressLists(req.routerConfig);
        res.json(lists);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch address lists' });
    }
});

app.post('/api/firewall/add', routerAuthMiddleware, async (req, res) => {
    const { address, list, comment } = req.body;
    try {
        const result = await FirewallService.addToAddressList(address, list, req.routerConfig, comment);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/firewall/addresses', routerAuthMiddleware, async (req, res) => {
    try {
        const entries = await FirewallService.getAddressListEntries(req.routerConfig);
        res.json(entries);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch address entries' });
    }
});

app.post('/api/firewall/addresses/toggle', routerAuthMiddleware, async (req, res) => {
    const { id, enabled } = req.body;
    try {
        await FirewallService.toggleAddressEntry(id, enabled, req.routerConfig);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to toggle address' });
    }
});

app.delete('/api/firewall/addresses/:id', routerAuthMiddleware, async (req, res) => {
    const entryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const result = await FirewallService.removeAddressEntry(entryId, req.routerConfig);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/firewall/rules', routerAuthMiddleware, async (req, res) => {
    try {
        const rules = await FirewallService.getFilterRules(req.routerConfig);
        res.json(rules);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch rules' });
    }
});

app.post('/api/firewall/toggle', routerAuthMiddleware, async (req, res) => {
    const { id, enabled } = req.body;
    try {
        await FirewallService.toggleFilterRule(id, enabled, req.routerConfig);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: 'Failed to toggle rule' });
    }
});

// Simple Queues API
app.get('/api/queues', routerAuthMiddleware, async (req, res) => {
    try {
        const queues = await SimpleQueueService.getQueues(req.routerConfig);
        res.json(queues);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch queues' });
    }
});

app.post('/api/queues', routerAuthMiddleware, async (req, res) => {
    const { name, target, maxLimit, priority, comment } = req.body;
    try {
        const result = await SimpleQueueService.addQueue({ name, target, maxLimit, priority, comment }, req.routerConfig);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/queues/:id', routerAuthMiddleware, async (req, res) => {
    const { name, maxLimit, disabled, comment } = req.body;
    const queueId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const result = await SimpleQueueService.updateQueue(queueId, { name, maxLimit, disabled, comment }, req.routerConfig);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/queues/:id', routerAuthMiddleware, async (req, res) => {
    const queueId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const result = await SimpleQueueService.deleteQueue(queueId, req.routerConfig);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/queues/:id/toggle', routerAuthMiddleware, async (req, res) => {
    const { enabled } = req.body;
    const queueId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const result = await SimpleQueueService.toggleQueue(queueId, enabled, req.routerConfig);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({ error: result.message });
        }
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Setup WebSocket
setupWebSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
