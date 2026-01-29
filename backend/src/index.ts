import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { setupWebSocket } from './socket';
import { FirewallService } from './services/FirewallService';
import { BandwidthService } from './services/BandwidthService';
import { RouterConfig, RouterConnectionService } from './services/RouterConnectionService';
import { authMiddleware } from './middleware/auth';
import { encrypt } from './utils/crypto';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Restrict to frontend origin
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';

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
        res.status(500).json({ error: 'Failed to toggle rule' });
    }
});

// Setup WebSocket
setupWebSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
