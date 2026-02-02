"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const socket_1 = require("./socket");
const FirewallService_1 = require("./services/FirewallService");
const BandwidthService_1 = require("./services/BandwidthService");
const RouterConnectionService_1 = require("./services/RouterConnectionService");
const auth_1 = require("./middleware/auth");
const crypto_1 = require("./utils/crypto");
const PreferencesService_1 = require("./services/PreferencesService");
const SimpleQueueService_1 = require("./services/SimpleQueueService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Please configure it in your .env file.');
}
if (JWT_SECRET.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters long.');
}
// Security headers with Helmet
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Rate Limiter
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login requests per windowMs
    message: { error: 'Too many login attempts, please try again later.' }
});
// Request Logger
app.use((req, res, next) => {
    // console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.post('/api/login', loginLimiter, async (req, res) => {
    const config = req.body;
    try {
        // Verify connection first
        const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
        // Encrypt password and sign token
        const encryptedPass = (0, crypto_1.encrypt)(config.password || '');
        const token = jsonwebtoken_1.default.sign({ host: config.host, user: config.user, encryptedPass, port: config.port }, JWT_SECRET, { expiresIn: '1d' });
        // Set HttpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true in production
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            sameSite: 'lax' // CSRF protection
        });
        res.json({ success: true, message: 'Authenticated successfully' });
    }
    catch (error) {
        res.status(401).json({ error: 'Authentication failed: ' + error.message });
    }
});
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});
app.get('/api/me', auth_1.authMiddleware, (req, res) => {
    // Return sanitized user info (no password)
    res.json({
        host: req.routerConfig?.host,
        user: req.routerConfig?.user,
        port: req.routerConfig?.port
    });
});
// Preferences API
app.get('/api/preferences', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = `${req.routerConfig?.host}:${req.routerConfig?.user}`;
        const preferences = await PreferencesService_1.PreferencesService.getPreferences(userId);
        res.json(preferences);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});
app.post('/api/preferences', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = `${req.routerConfig?.host}:${req.routerConfig?.user}`;
        const { realtimeInterval, dhcpInterval, pingInterval, logInterval, interfaceInterval, nodeMonitorInterval } = req.body;
        const preferences = await PreferencesService_1.PreferencesService.savePreferencesForUser(userId, {
            realtimeInterval,
            dhcpInterval,
            pingInterval,
            logInterval,
            interfaceInterval,
            nodeMonitorInterval
        });
        res.json(preferences);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});
app.delete('/api/preferences', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = `${req.routerConfig?.host}:${req.routerConfig?.user}`;
        await PreferencesService_1.PreferencesService.deletePreferences(userId);
        res.json(PreferencesService_1.PreferencesService.getDefaultPreferences());
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reset preferences' });
    }
});
app.get('/api/interfaces', auth_1.authMiddleware, async (req, res) => {
    try {
        const interfaces = await BandwidthService_1.BandwidthService.getInterfaces(req.routerConfig);
        res.json(interfaces);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch interfaces' });
    }
});
app.get('/api/firewall/lists', auth_1.authMiddleware, async (req, res) => {
    try {
        const lists = await FirewallService_1.FirewallService.getAddressLists(req.routerConfig);
        res.json(lists);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch address lists' });
    }
});
app.post('/api/firewall/add', auth_1.authMiddleware, async (req, res) => {
    const { address, list, comment } = req.body;
    try {
        const result = await FirewallService_1.FirewallService.addToAddressList(address, list, req.routerConfig, comment);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.get('/api/firewall/rules', auth_1.authMiddleware, async (req, res) => {
    try {
        const rules = await FirewallService_1.FirewallService.getFilterRules(req.routerConfig);
        res.json(rules);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch rules' });
    }
});
app.post('/api/firewall/toggle', auth_1.authMiddleware, async (req, res) => {
    const { id, enabled } = req.body;
    try {
        await FirewallService_1.FirewallService.toggleFilterRule(id, enabled, req.routerConfig);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to toggle rule' });
    }
});
// Simple Queues API
app.get('/api/queues', auth_1.authMiddleware, async (req, res) => {
    try {
        const queues = await SimpleQueueService_1.SimpleQueueService.getQueues(req.routerConfig);
        res.json(queues);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch queues' });
    }
});
app.post('/api/queues', auth_1.authMiddleware, async (req, res) => {
    const { name, target, maxLimit, priority, comment } = req.body;
    try {
        const result = await SimpleQueueService_1.SimpleQueueService.addQueue({ name, target, maxLimit, priority, comment }, req.routerConfig);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.put('/api/queues/:id', auth_1.authMiddleware, async (req, res) => {
    const { name, maxLimit, disabled, comment } = req.body;
    const queueId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const result = await SimpleQueueService_1.SimpleQueueService.updateQueue(queueId, { name, maxLimit, disabled, comment }, req.routerConfig);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.delete('/api/queues/:id', auth_1.authMiddleware, async (req, res) => {
    const queueId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const result = await SimpleQueueService_1.SimpleQueueService.deleteQueue(queueId, req.routerConfig);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.post('/api/queues/:id/toggle', auth_1.authMiddleware, async (req, res) => {
    const { enabled } = req.body;
    const queueId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const result = await SimpleQueueService_1.SimpleQueueService.toggleQueue(queueId, enabled, req.routerConfig);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Setup WebSocket
(0, socket_1.setupWebSocket)(io);
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
