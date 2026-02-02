"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = setupWebSocket;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cookie_1 = __importDefault(require("cookie"));
const crypto_1 = require("./utils/crypto");
const SystemHealthService_1 = require("./services/SystemHealthService");
const BandwidthService_1 = require("./services/BandwidthService");
const DhcpService_1 = require("./services/DhcpService");
const PingService_1 = require("./services/PingService");
const LogService_1 = require("./services/LogService");
const NodeMonitorService_1 = require("./services/NodeMonitorService");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Please configure it in your .env file.');
}
if (JWT_SECRET.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters long.');
}
function setupWebSocket(io) {
    io.on('connection', (socket) => {
        // console.log('Client connected:', socket.id);
        let routerConfig;
        try {
            const cookies = cookie_1.default.parse(socket.handshake.headers.cookie || '');
            const token = cookies.token;
            if (token) {
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                routerConfig = {
                    host: decoded.host,
                    user: decoded.user,
                    password: (0, crypto_1.decrypt)(decoded.encryptedPass),
                    port: decoded.port
                };
            }
        }
        catch (error) {
            console.error('Socket auth failed:', error);
        }
        if (!routerConfig) {
            console.log('No valid session found, disconnecting socket:', socket.id);
            socket.disconnect(true);
            return;
        }
        let selectedInterface = 'ether1';
        // Get user preferences from socket auth or use defaults
        const userPreferences = socket.handshake.auth?.preferences || {};
        // Interval settings (defaults if not specified)
        const realtimeIntervalMs = userPreferences.realtimeInterval || 1000;
        const dhcpIntervalMs = userPreferences.dhcpInterval || 5000;
        const pingIntervalMs = userPreferences.pingInterval || 2000;
        const logIntervalMs = userPreferences.logInterval || 5000;
        const interfaceIntervalMs = userPreferences.interfaceInterval || 5000;
        const nodeMonitorIntervalMs = userPreferences.nodeMonitorInterval || 3000;
        // Allow dynamic interval updates via socket event
        let currentRealtimeInterval = realtimeIntervalMs;
        let currentDhcpInterval = dhcpIntervalMs;
        let currentPingInterval = pingIntervalMs;
        let currentLogInterval = logIntervalMs;
        let currentInterfaceInterval = interfaceIntervalMs;
        let currentNodeMonitorInterval = nodeMonitorIntervalMs;
        // 1-second interval for real-time stats
        let realTimeInterval = setInterval(async () => {
            try {
                const [healthData, trafficData] = await Promise.all([
                    SystemHealthService_1.SystemHealthService.getDashboardData(routerConfig),
                    BandwidthService_1.BandwidthService.monitorTraffic(routerConfig, selectedInterface)
                ]);
                socket.emit('realtime-stats', {
                    ...healthData,
                    bandwidth: {
                        rx: trafficData['rx-bits-per-second'],
                        tx: trafficData['tx-bits-per-second'],
                        interface: selectedInterface
                    }
                });
            }
            catch (error) {
                // Silently handle errors to prevent client disconnections
            }
        }, currentRealtimeInterval);
        socket.on('change-bandwidth-interface', (interfaceName) => {
            console.log(`Socket ${socket.id} changed bandwidth interface to: ${interfaceName}`);
            selectedInterface = interfaceName;
        });
        // Dynamic interval update handler
        socket.on('update-intervals', (prefs) => {
            if (prefs.realtimeInterval && prefs.realtimeInterval !== currentRealtimeInterval) {
                clearInterval(realTimeInterval);
                currentRealtimeInterval = prefs.realtimeInterval;
                realTimeInterval = setInterval(async () => {
                    try {
                        const [healthData, trafficData] = await Promise.all([
                            SystemHealthService_1.SystemHealthService.getDashboardData(routerConfig),
                            BandwidthService_1.BandwidthService.monitorTraffic(routerConfig, selectedInterface)
                        ]);
                        socket.emit('realtime-stats', {
                            ...healthData,
                            bandwidth: {
                                rx: trafficData['rx-bits-per-second'],
                                tx: trafficData['tx-bits-per-second'],
                                interface: selectedInterface
                            }
                        });
                    }
                    catch (error) {
                        // Silently handle errors
                    }
                }, currentRealtimeInterval);
            }
            if (prefs.dhcpInterval && prefs.dhcpInterval !== currentDhcpInterval) {
                clearInterval(dhcpInterval);
                currentDhcpInterval = prefs.dhcpInterval;
                dhcpInterval = setInterval(async () => {
                    try {
                        const leases = await DhcpService_1.DhcpService.getLeases(routerConfig);
                        socket.emit('dhcp-leases', leases);
                    }
                    catch (error) {
                        // Silently handle errors
                    }
                }, currentDhcpInterval);
            }
            if (prefs.pingInterval && prefs.pingInterval !== currentPingInterval) {
                clearInterval(pingInterval);
                currentPingInterval = prefs.pingInterval;
                pingInterval = setInterval(async () => {
                    try {
                        const pingStats = await PingService_1.PingService.getPingStats(routerConfig?.host);
                        socket.emit('ping-latency', pingStats);
                    }
                    catch (error) {
                        // Silently handle errors
                    }
                }, currentPingInterval);
            }
            if (prefs.logInterval && prefs.logInterval !== currentLogInterval) {
                clearInterval(logInterval);
                currentLogInterval = prefs.logInterval;
                logInterval = setInterval(async () => {
                    try {
                        const logs = await LogService_1.LogService.getLogs(routerConfig, 20);
                        socket.emit('system-logs', logs);
                    }
                    catch (error) {
                        // Silently handle errors
                    }
                }, currentLogInterval);
            }
            if (prefs.interfaceInterval && prefs.interfaceInterval !== currentInterfaceInterval) {
                clearInterval(interfaceInterval);
                currentInterfaceInterval = prefs.interfaceInterval;
                interfaceInterval = setInterval(async () => {
                    try {
                        const interfaces = await BandwidthService_1.BandwidthService.getInterfaces(routerConfig);
                        socket.emit('interface-status', interfaces);
                    }
                    catch (error) {
                        // Silently handle errors
                    }
                }, currentInterfaceInterval);
            }
            if (prefs.nodeMonitorInterval && prefs.nodeMonitorInterval !== currentNodeMonitorInterval) {
                clearInterval(nodeMonitorInterval);
                currentNodeMonitorInterval = prefs.nodeMonitorInterval;
                nodeMonitorInterval = setInterval(async () => {
                    try {
                        const nodes = await NodeMonitorService_1.NodeMonitorService.monitorNodes();
                        socket.emit('node-stats', nodes);
                    }
                    catch (error) {
                        // Silently handle errors
                    }
                }, currentNodeMonitorInterval);
            }
        });
        // 5-second interval for DHCP leases
        let dhcpInterval = setInterval(async () => {
            try {
                const leases = await DhcpService_1.DhcpService.getLeases(routerConfig);
                socket.emit('dhcp-leases', leases);
            }
            catch (error) {
                // Silently handle errors
            }
        }, currentDhcpInterval);
        // 2-second interval for ping latency
        let pingInterval = setInterval(async () => {
            try {
                const pingStats = await PingService_1.PingService.getPingStats(routerConfig?.host);
                socket.emit('ping-latency', pingStats);
            }
            catch (error) {
                // Silently handle errors
            }
        }, currentPingInterval);
        // 5-second interval for system logs
        let logInterval = setInterval(async () => {
            try {
                const logs = await LogService_1.LogService.getLogs(routerConfig, 20);
                socket.emit('system-logs', logs);
            }
            catch (error) {
                // Silently handle errors
            }
        }, currentLogInterval);
        // 5-second interval for all interface statuses
        let interfaceInterval = setInterval(async () => {
            try {
                const interfaces = await BandwidthService_1.BandwidthService.getInterfaces(routerConfig);
                socket.emit('interface-status', interfaces);
            }
            catch (error) {
                // Silently handle errors
            }
        }, currentInterfaceInterval);
        // 5-second interval for custom node monitoring
        let nodeMonitorInterval = setInterval(async () => {
            try {
                const nodes = await NodeMonitorService_1.NodeMonitorService.monitorNodes();
                socket.emit('node-stats', nodes);
            }
            catch (error) {
                // Silently handle errors
            }
        }, currentNodeMonitorInterval);
        socket.on('add-node', async (data) => {
            try {
                await NodeMonitorService_1.NodeMonitorService.addNode(data.ip, data.name);
                const nodes = await NodeMonitorService_1.NodeMonitorService.getNodes();
                socket.emit('node-stats', nodes);
            }
            catch (error) {
                // Silently handle errors
            }
        });
        socket.on('remove-node', async (ip) => {
            try {
                await NodeMonitorService_1.NodeMonitorService.removeNode(ip);
                const nodes = await NodeMonitorService_1.NodeMonitorService.getNodes();
                socket.emit('node-stats', nodes);
            }
            catch (error) {
                // Silently handle errors
            }
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            clearInterval(realTimeInterval);
            clearInterval(dhcpInterval);
            clearInterval(pingInterval);
            clearInterval(logInterval);
            clearInterval(interfaceInterval);
            clearInterval(nodeMonitorInterval);
        });
        socket.on('ping-check', (ack) => {
            if (typeof ack === 'function') {
                ack(true);
            }
        });
    });
}
