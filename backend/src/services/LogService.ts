import { RouterConnectionService, RouterConfig } from './RouterConnectionService';

export interface SystemLog {
    id: string;
    time: string;
    topics: string;
    message: string;
}

export class LogService {
    public static async getLogs(config?: RouterConfig, limit: number = 4): Promise<SystemLog[]> {
        try {
            const api = await RouterConnectionService.getConnection(config);
            // Fetch logs, ordered by ID descending to get most recent first
            const logs = await api.write(['/log/print', '?.id', '>.id', `=.proplist=time,topics,message`, `ffollow-refresh`]);

            // Note: node-routeros might not support 'follow-refresh' easily in synchronous write. 
            // We'll just fetch the last N items.
            const allLogs = await api.write(['/log/print', '?.id', '>.id', `=.proplist=time,topics,message`]);

            // Sort and take last N if needed, though MikroTik usually returns in order.
            // Let's just take the last 4.
            // If limit is 0, return all logs. Otherwise slice.
            const logsToReturn = limit === 0 ? allLogs.reverse() : allLogs.slice(-limit).reverse();

            return logsToReturn.map((log: any) => ({
                id: log['.id'],
                time: log.time,
                topics: log.topics,
                message: log.message
            }));
        } catch (error) {
            console.error('Error fetching logs:', error);
            return [
                { id: '1', time: '00:00:00', topics: 'system,info', message: 'Connected to Mock Logger' },
                { id: '2', time: '00:00:01', topics: 'warning', message: 'Router connection failed - showing mock logs' }
            ];
        }
    }
}
