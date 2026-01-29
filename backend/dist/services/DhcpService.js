"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DhcpService = void 0;
const RouterConnectionService_1 = require("./RouterConnectionService");
class DhcpService {
    static async getLeases(config) {
        try {
            const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
            const leases = await api.write(['/ip/dhcp-server/lease/print']);
            return leases.map((lease) => ({
                id: lease['.id'],
                address: lease['address'],
                mac: lease['mac-address'],
                hostname: lease['host-name'] || 'Unknown',
                status: lease['status'],
                lastSeen: lease['last-seen'],
                server: lease['server']
            }));
        }
        catch (error) {
            console.warn('Using Mock Data for DHCP Leases due to error:', error.message);
            // Mock Data
            return [
                { id: '1', address: '192.168.0.10', mac: 'AA:BB:CC:DD:EE:01', hostname: 'Admin-PC', status: 'bound', lastSeen: '00:05:22', server: 'defconf' },
                { id: '2', address: '192.168.0.15', mac: 'AA:BB:CC:DD:EE:02', hostname: 'iPhone-12', status: 'bound', lastSeen: '00:12:45', server: 'defconf' },
                { id: '3', address: '192.168.0.20', mac: 'AA:BB:CC:DD:EE:03', hostname: 'Smart-TV', status: 'bound', lastSeen: '01:30:10', server: 'defconf' },
                { id: '4', address: '192.168.0.25', mac: 'AA:BB:CC:DD:EE:04', hostname: 'Unknown', status: 'waiting', lastSeen: '00:00:00', server: 'defconf' }
            ];
        }
    }
}
exports.DhcpService = DhcpService;
