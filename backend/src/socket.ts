import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { decrypt } from './utils/crypto';
import { SystemHealthService } from './services/SystemHealthService';
import { BandwidthService } from './services/BandwidthService';
import { DhcpService } from './services/DhcpService';
import { PingService } from './services/PingService';
import { LogService } from './services/LogService';
import { NodeMonitorService } from './services/NodeMonitorService';
import { RouterConfig } from './services/RouterConnectionService';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';

interface JwtPayload {
    host: string;
    user: string;
    encryptedPass: string;
    port: number;
}

export function setupWebSocket(io: Server) {
    io.on('connection', (socket) => {
        // console.log('Client connected:', socket.id);

        let routerConfig: RouterConfig | undefined;

        try {
            const cookies = cookie.parse(socket.handshake.headers.cookie || '');
            const token = cookies.token;

            if (token) {
                const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
                routerConfig = {
                    host: decoded.host,
                    user: decoded.user,
                    password: decrypt(decoded.encryptedPass),
                    port: decoded.port
                };
            }
        } catch (error) {
            console.error('Socket auth failed:', error);
        }

        if (!routerConfig) {
            console.log('No valid session found, disconnecting socket:', socket.id);
            socket.disconnect(true);
            return;
        }

        let selectedInterface = 'ether1';

        // 1-second interval for real-time stats
        const realTimeInterval = setInterval(async () => {
            try {
                const [healthData, trafficData] = await Promise.all([
                    SystemHealthService.getDashboardData(routerConfig),
                    BandwidthService.monitorTraffic(routerConfig, selectedInterface)
                ]);

                // console.log('Emitting realtime-stats with identity:', healthData.identity);

                socket.emit('realtime-stats', {
                    ...healthData,
                    bandwidth: {
                        rx: trafficData['rx-bits-per-second'],
                        tx: trafficData['tx-bits-per-second'],
                        interface: selectedInterface
                    }
                });
            } catch (error) {
                socket.emit('error', 'Failed to fetch real-time stats');
            }
        }, 1000);

        socket.on('change-bandwidth-interface', (interfaceName: string) => {
            console.log(`Socket ${socket.id} changed bandwidth interface to: ${interfaceName}`);
            selectedInterface = interfaceName;
        });

        // 5-second interval for DHCP leases
        const dhcpInterval = setInterval(async () => {
            try {
                const leases = await DhcpService.getLeases(routerConfig);
                socket.emit('dhcp-leases', leases);
            } catch (error) {
                socket.emit('error', 'Failed to fetch DHCP leases');
            }
        }, 5000);

        // 2-second interval for ping latency
        const pingInterval = setInterval(async () => {
            try {
                const pingStats = await PingService.getPingStats(routerConfig?.host);
                socket.emit('ping-latency', pingStats);
            } catch (error) {
                socket.emit('error', 'Failed to fetch ping latency');
            }
        }, 2000);

        // 5-second interval for system logs
        const logInterval = setInterval(async () => {
            try {
                const logs = await LogService.getLogs(routerConfig, 20);
                socket.emit('system-logs', logs);
            } catch (error) {
                socket.emit('error', 'Failed to fetch system logs');
            }
        }, 5000);

        // 5-second interval for all interface statuses
        const interfaceInterval = setInterval(async () => {
            try {
                const interfaces = await BandwidthService.getInterfaces(routerConfig);
                socket.emit('interface-status', interfaces);
            } catch (error) {
                socket.emit('error', 'Failed to fetch interface statuses');
            }
        }, 5000);

        // 5-second interval for custom node monitoring
        const nodeMonitorInterval = setInterval(async () => {
            try {
                const nodes = await NodeMonitorService.monitorNodes();
                socket.emit('node-stats', nodes);
            } catch (error) {
                console.error('Error monitoring nodes:', error);
            }
        }, 3000);

        socket.on('add-node', async (data: { ip: string, name: string }) => {
            try {
                await NodeMonitorService.addNode(data.ip, data.name);
                // Immediately emit updated list
                const nodes = await NodeMonitorService.getNodes();
                socket.emit('node-stats', nodes);
            } catch (error) {
                socket.emit('error', 'Failed to add node');
            }
        });

        socket.on('remove-node', async (ip: string) => {
            try {
                await NodeMonitorService.removeNode(ip);
                const nodes = await NodeMonitorService.getNodes();
                socket.emit('node-stats', nodes);
            } catch (error) {
                socket.emit('error', 'Failed to remove node');
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
    });
}
