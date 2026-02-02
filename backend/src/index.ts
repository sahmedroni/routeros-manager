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
import { authMiddleware } from './middleware/auth';
import { encrypt } from './utils/crypto';
import { PreferencesService } from './services/PreferencesService';
import { SimpleQueueService } from './services/SimpleQueueService';

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

app.post('/api/login', loginLimiter, async (req, res) => {
    const config: RouterConfig = req.body;
    try {
        // Verify connection first
        const api = await RouterConnectionService.getConnection(config);

        // Encrypt password and sign token
        const encryptedPass = encrypt(config.password || '');
        const token = jwt.sign(
            { host: config.host, user: config.user, encryptedPass, port: config.port },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true in production
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            sameSite: 'lax' // CSRF protection
        });

        res.json({ success: true, message: 'Authenticated successfully' });
    } catch (error: any) {
        res.status(401).json({ error: 'Authentication failed: ' + error.message });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
    // Return sanitized user info (no password)
    res.json({
        host: req.routerConfig?.host,
        user: req.routerConfig?.user,
        port: req.routerConfig?.port
    });
});

// Preferences API
app.get('/api/preferences', authMiddleware, async (req, res) => {
    try {
        const userId = `${req.routerConfig?.host}:${req.routerConfig?.user}`;
        const preferences = await PreferencesService.getPreferences(userId);
        res.json(preferences);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

app.post('/api/preferences', authMiddleware, async (req, res) => {
    try {
        const userId = `${req.routerConfig?.host}:${req.routerConfig?.user}`;
        const { realtimeInterval, dhcpInterval, pingInterval, logInterval, interfaceInterval, nodeMonitorInterval } = req.body;
        
        const preferences = await PreferencesService.savePreferencesForUser(userId, {
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

app.delete('/api/preferences', authMiddleware, async (req, res) => {
    try {
        const userId = `${req.routerConfig?.host}:${req.routerConfig?.user}`;
        await PreferencesService.deletePreferences(userId);
        res.json(PreferencesService.getDefaultPreferences());
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to reset preferences' });
    }
});

app.get('/api/interfaces', authMiddleware, async (req, res) => {
    try {
        const interfaces = await BandwidthService.getInterfaces(req.routerConfig);
        res.json(interfaces);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch interfaces' });
    }
});

app.get('/api/firewall/lists', authMiddleware, async (req, res) => {
    try {
        const lists = await FirewallService.getAddressLists(req.routerConfig);
        res.json(lists);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch address lists' });
    }
});

app.post('/api/firewall/add', authMiddleware, async (req, res) => {
    const { address, list, comment } = req.body;
    try {
        const result = await FirewallService.addToAddressList(address, list, req.routerConfig, comment);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/firewall/rules', authMiddleware, async (req, res) => {
    try {
        const rules = await FirewallService.getFilterRules(req.routerConfig);
        res.json(rules);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch rules' });
    }
});

app.post('/api/firewall/toggle', authMiddleware, async (req, res) => {
    const { id, enabled } = req.body;
    try {
        await FirewallService.toggleFilterRule(id, enabled, req.routerConfig);
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: 'Failed to toggle rule' });
    }
});

// Simple Queues API
app.get('/api/queues', authMiddleware, async (req, res) => {
    try {
        const queues = await SimpleQueueService.getQueues(req.routerConfig);
        res.json(queues);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch queues' });
    }
});

app.post('/api/queues', authMiddleware, async (req, res) => {
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

app.put('/api/queues/:id', authMiddleware, async (req, res) => {
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

app.delete('/api/queues/:id', authMiddleware, async (req, res) => {
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

app.post('/api/queues/:id/toggle', authMiddleware, async (req, res) => {
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

httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
