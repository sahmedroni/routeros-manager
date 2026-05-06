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
const PreferencesService_1 = require("./services/PreferencesService");
const UserService_1 = require("./services/UserService");
const SimpleQueueService_1 = require("./services/SimpleQueueService");
const SystemHealthService_1 = require("./services/SystemHealthService");
const LogService_1 = require("./services/LogService");
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
app.post('/api/register', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        const user = await UserService_1.UserService.createUser(username, password);
        res.json({ success: true, message: 'User created successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const user = await UserService_1.UserService.validateCredentials(username, password);
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        res.json({ success: true, message: 'Authenticated successfully' });
    }
    catch (error) {
        res.status(401).json({ error: error.message || 'Authentication failed' });
    }
});
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});
app.get('/api/routers', auth_1.authMiddleware, async (req, res) => {
    try {
        const routers = await UserService_1.UserService.getUserRouters(req.user.userId);
        res.json(routers.map(r => ({ ...r, password: undefined })));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch routers' });
    }
});
app.post('/api/routers', auth_1.authMiddleware, async (req, res) => {
    try {
        const { name, host, port, user, password } = req.body;
        if (!name || !host || !port || !user || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const router = await UserService_1.UserService.addRouter(req.user.userId, { name, host, port: parseInt(port), user, password });
        res.json(router);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.put('/api/routers/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const routerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { name, host, port, user, password } = req.body;
        const updates = {};
        if (name)
            updates.name = name;
        if (host)
            updates.host = host;
        if (port)
            updates.port = parseInt(port);
        if (user)
            updates.user = user;
        if (password)
            updates.password = password;
        const router = await UserService_1.UserService.updateRouter(req.user.userId, routerId, updates);
        res.json(router);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.delete('/api/routers/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const routerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await UserService_1.UserService.deleteRouter(req.user.userId, routerId);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.post('/api/routers/:id/set-active', auth_1.authMiddleware, async (req, res) => {
    try {
        const routerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const router = await UserService_1.UserService.getRouterWithPassword(req.user.userId, routerId);
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }
        await RouterConnectionService_1.RouterConnectionService.getConnection({
            host: router.host,
            user: router.user,
            password: router.password,
            port: router.port
        });
        const token = jsonwebtoken_1.default.sign({ userId: req.user.userId, username: req.user.username, activeRouterId: routerId }, JWT_SECRET, { expiresIn: '1d' });
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
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to connect to router' });
    }
});
app.get('/api/routers/:id/test', auth_1.authMiddleware, async (req, res) => {
    try {
        const routerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const router = await UserService_1.UserService.getRouterWithPassword(req.user.userId, routerId);
        if (!router) {
            return res.status(404).json({ error: 'Router not found' });
        }
        const api = await RouterConnectionService_1.RouterConnectionService.getConnection({
            host: router.host,
            user: router.user,
            password: router.password,
            port: router.port
        });
        const identity = await api.write('/system/identity/get');
        res.json({ success: true, name: identity[0]?.name || 'Unknown', model: identity[0]?.['board-name'] || 'Unknown' });
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to connect to router' });
    }
});
app.get('/api/me', auth_1.authMiddleware, async (req, res) => {
    try {
        const routers = await UserService_1.UserService.getUserRouters(req.user.userId);
        const activeRouter = routers.find(r => r.id === req.user?.activeRouterId);
        res.json({
            username: req.user?.username,
            userId: req.user?.userId,
            activeRouter: activeRouter ? { id: activeRouter.id, name: activeRouter.name, host: activeRouter.host, port: activeRouter.port, user: activeRouter.user } : null,
            routers: routers.map(r => ({ id: r.id, name: r.name, host: r.host, port: r.port, user: r.user }))
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});
// Preferences API
app.get('/api/preferences', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const preferences = await PreferencesService_1.PreferencesService.getPreferences(req.user.userId, req.user.activeRouterId);
        res.json(preferences);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});
app.post('/api/preferences', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const { realtimeInterval, dhcpInterval, pingInterval, logInterval, interfaceInterval, nodeMonitorInterval } = req.body;
        const preferences = await PreferencesService_1.PreferencesService.savePreferencesForUser(req.user.userId, req.user.activeRouterId, {
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
app.delete('/api/preferences', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        await PreferencesService_1.PreferencesService.deletePreferences(req.user.userId, req.user.activeRouterId);
        res.json(PreferencesService_1.PreferencesService.getDefaultPreferences());
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reset preferences' });
    }
});
app.get('/api/logs', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const logs = await LogService_1.LogService.getLogs(req.routerConfig, 0);
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});
app.post('/api/system/reboot', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const result = await SystemHealthService_1.SystemHealthService.rebootRouter(req.routerConfig);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reboot router' });
    }
});
app.get('/api/system/updates', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const updateInfo = await SystemHealthService_1.SystemHealthService.checkForUpdates(req.routerConfig);
        res.json(updateInfo);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to check for updates' });
    }
});
app.post('/api/system/updates/install', auth_1.routerAuthMiddleware, async (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    if (!req.routerConfig || password !== req.routerConfig.password) {
        return res.status(401).json({ error: 'Invalid RouterOS password' });
    }
    try {
        const result = await SystemHealthService_1.SystemHealthService.installUpdates(req.routerConfig);
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(400).json({ error: result.message });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to install updates' });
    }
});
app.get('/api/interfaces', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const interfaces = await BandwidthService_1.BandwidthService.getInterfaces(req.routerConfig);
        res.json(interfaces);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch interfaces' });
    }
});
app.get('/api/firewall/lists', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const lists = await FirewallService_1.FirewallService.getAddressLists(req.routerConfig);
        res.json(lists);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch address lists' });
    }
});
app.post('/api/firewall/add', auth_1.routerAuthMiddleware, async (req, res) => {
    const { address, list, comment } = req.body;
    try {
        const result = await FirewallService_1.FirewallService.addToAddressList(address, list, req.routerConfig, comment);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.get('/api/firewall/addresses', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const entries = await FirewallService_1.FirewallService.getAddressListEntries(req.routerConfig);
        res.json(entries);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch address entries' });
    }
});
app.post('/api/firewall/addresses/toggle', auth_1.routerAuthMiddleware, async (req, res) => {
    const { id, enabled } = req.body;
    try {
        await FirewallService_1.FirewallService.toggleAddressEntry(id, enabled, req.routerConfig);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to toggle address' });
    }
});
app.delete('/api/firewall/addresses/:id', auth_1.routerAuthMiddleware, async (req, res) => {
    const entryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const result = await FirewallService_1.FirewallService.removeAddressEntry(entryId, req.routerConfig);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
app.get('/api/firewall/rules', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const rules = await FirewallService_1.FirewallService.getFilterRules(req.routerConfig);
        res.json(rules);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch rules' });
    }
});
app.post('/api/firewall/toggle', auth_1.routerAuthMiddleware, async (req, res) => {
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
app.get('/api/queues', auth_1.routerAuthMiddleware, async (req, res) => {
    try {
        const queues = await SimpleQueueService_1.SimpleQueueService.getQueues(req.routerConfig);
        res.json(queues);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch queues' });
    }
});
app.post('/api/queues', auth_1.routerAuthMiddleware, async (req, res) => {
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
app.put('/api/queues/:id', auth_1.routerAuthMiddleware, async (req, res) => {
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
app.delete('/api/queues/:id', auth_1.routerAuthMiddleware, async (req, res) => {
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
app.post('/api/queues/:id/toggle', auth_1.routerAuthMiddleware, async (req, res) => {
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
httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
