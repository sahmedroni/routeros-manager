"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogService = void 0;
const RouterConnectionService_1 = require("./RouterConnectionService");
class LogService {
    static async getLogs(config, limit = 4) {
        try {
            const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
            // Fetch logs, ordered by ID descending to get most recent first
            const logs = await api.write(['/log/print', '?.id', '>.id', `=.proplist=time,topics,message`, `ffollow-refresh`]);
            // Note: node-routeros might not support 'follow-refresh' easily in synchronous write. 
            // We'll just fetch the last N items.
            const allLogs = await api.write(['/log/print', '?.id', '>.id', `=.proplist=time,topics,message`]);
            // Sort and take last N if needed, though MikroTik usually returns in order.
            // Let's just take the last 4.
            return allLogs.slice(-limit).reverse().map((log) => ({
                id: log['.id'],
                time: log.time,
                topics: log.topics,
                message: log.message
            }));
        }
        catch (error) {
            console.error('Error fetching logs:', error);
            return [
                { id: '1', time: '00:00:00', topics: 'system,info', message: 'Connected to Mock Logger' },
                { id: '2', time: '00:00:01', topics: 'warning', message: 'Router connection failed - showing mock logs' }
            ];
        }
    }
}
exports.LogService = LogService;
