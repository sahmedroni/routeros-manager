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
const socket_1 = require("./socket");
const FirewallService_1 = require("./services/FirewallService");
const BandwidthService_1 = require("./services/BandwidthService");
const RouterConnectionService_1 = require("./services/RouterConnectionService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Auth Middleware: Extracts router credentials from headers
const authMiddleware = (req, res, next) => {
    const host = req.headers['x-router-host'];
    const user = req.headers['x-router-user'];
    const password = req.headers['x-router-password'];
    const port = parseInt(req.headers['x-router-port']);
    if (host && user) {
        req.routerConfig = { host, user, password, port: port || 8728 };
    }
    else if (process.env.NODE_ENV !== 'production') {
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
    const config = req.body;
    try {
        const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
        // If connection successful, we're good
        res.json({ success: true, message: 'Authenticated successfully' });
    }
    catch (error) {
        res.status(401).json({ error: 'Authentication failed: ' + error.message });
    }
});
app.get('/api/interfaces', authMiddleware, async (req, res) => {
    try {
        const interfaces = await BandwidthService_1.BandwidthService.getInterfaces(req.routerConfig);
        res.json(interfaces);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/firewall/lists', authMiddleware, async (req, res) => {
    try {
        const lists = await FirewallService_1.FirewallService.getAddressLists(req.routerConfig);
        res.json(lists);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/firewall/add', authMiddleware, async (req, res) => {
    const { address, list, comment } = req.body;
    try {
        const result = await FirewallService_1.FirewallService.addToAddressList(address, list, req.routerConfig, comment);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/firewall/rules', authMiddleware, async (req, res) => {
    try {
        const rules = await FirewallService_1.FirewallService.getFilterRules(req.routerConfig);
        res.json(rules);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/firewall/toggle', authMiddleware, async (req, res) => {
    const { id, enabled } = req.body;
    try {
        await FirewallService_1.FirewallService.toggleFilterRule(id, enabled, req.routerConfig);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Setup WebSocket
(0, socket_1.setupWebSocket)(io);
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
