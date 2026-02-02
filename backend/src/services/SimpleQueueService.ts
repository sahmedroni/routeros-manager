import { RouterConnectionService, RouterConfig } from './RouterConnectionService';

export interface SimpleQueue {
    id: string;
    name: string;
    target: string;
    maxLimit: string;
    burstLimit: string;
    burstThreshold: string;
    burstTime: string;
    priority: string;
    disabled: boolean;
    comment: string;
}

export class SimpleQueueService {
    public static async getQueues(config?: RouterConfig): Promise<SimpleQueue[]> {
        try {
            const api = await RouterConnectionService.getConnection(config);
            const queues = await api.write([
                '/queue/simple/print',
                '=.proplist=.id,name,target,max-limit,burst-limit,burst-threshold,burst-time,priority,disabled,comment'
            ]);
            return queues.map((q: any) => ({
                id: q['.id'],
                name: q.name || '',
                target: q.target || '',
                maxLimit: q['max-limit'] || '0/0',
                burstLimit: q['burst-limit'] || '0/0',
                burstThreshold: q['burst-threshold'] || '0/0',
                burstTime: q['burst-time'] || '0s/0s',
                priority: q.priority || '8',
                disabled: q.disabled === 'true',
                comment: q.comment || ''
            }));
        } catch (error) {
            console.error('Error fetching queues:', error);
            return [];
        }
    }

    public static async addQueue(data: {
        name: string;
        target: string;
        maxLimit: string;
        priority?: string;
        comment?: string;
    }, config?: RouterConfig): Promise<{ success: boolean; message: string }> {
        try {
            const api = await RouterConnectionService.getConnection(config);
            
            const safeName = data.name.replace(/[^a-zA-Z0-9\s_\-.]/g, '');
            const safeTarget = data.target.replace(/[^0-9./:]/g, '');
            const safeComment = (data.comment || '').replace(/[^a-zA-Z0-9\s_\-.,!]/g, '');

            await api.write([
                '/queue/simple/add',
                `=name=${safeName}`,
                `=target=${safeTarget}`,
                `=max-limit=${data.maxLimit}`,
                `=priority=${data.priority || '8'}`,
                `=comment=${safeComment}`
            ]);

            return { success: true, message: `Queue "${safeName}" created successfully` };
        } catch (error: any) {
            console.error('Error adding queue:', error);
            const message = error.message || '';
            if (message.includes('not enough permissions')) {
                return { success: false, message: 'Permission denied: Ensure user has "write" and "policy" permissions' };
            }
            return { success: false, message: message || 'Failed to create queue' };
        }
    }

    public static async updateQueue(id: string, data: {
        name?: string;
        maxLimit?: string;
        disabled?: boolean;
        comment?: string;
    }, config?: RouterConfig): Promise<{ success: boolean; message: string }> {
        try {
            const api = await RouterConnectionService.getConnection(config);

            const commands = ['/queue/simple/set', `=.id=${id}`];
            
            if (data.name) {
                commands.push(`=name=${data.name.replace(/[^a-zA-Z0-9\s_\-.]/g, '')}`);
            }
            if (data.maxLimit) {
                commands.push(`=max-limit=${data.maxLimit}`);
            }
            if (data.disabled !== undefined) {
                commands.push(`=disabled=${data.disabled}`);
            }
            if (data.comment !== undefined) {
                commands.push(`=comment=${data.comment.replace(/[^a-zA-Z0-9\s_\-.,!]/g, '')}`);
            }

            await api.write(commands);

            return { success: true, message: 'Queue updated successfully' };
        } catch (error: any) {
            console.error('Error updating queue:', error);
            return { success: false, message: error.message || 'Failed to update queue' };
        }
    }

    public static async deleteQueue(id: string, config?: RouterConfig): Promise<{ success: boolean; message: string }> {
        try {
            const api = await RouterConnectionService.getConnection(config);
            await api.write([
                '/queue/simple/remove',
                `=.id=${id}`
            ]);
            return { success: true, message: 'Queue deleted successfully' };
        } catch (error: any) {
            console.error('Error deleting queue:', error);
            return { success: false, message: error.message || 'Failed to delete queue' };
        }
    }

    public static async toggleQueue(id: string, enable: boolean, config?: RouterConfig): Promise<{ success: boolean; message: string }> {
        try {
            const api = await RouterConnectionService.getConnection(config);
            const command = enable ? '/queue/simple/enable' : '/queue/simple/disable';
            await api.write([command, `=.id=${id}`]);
            return { success: true, message: enable ? 'Queue enabled' : 'Queue disabled' };
        } catch (error: any) {
            console.error('Error toggling queue:', error);
            return { success: false, message: error.message || 'Failed to toggle queue' };
        }
    }
}
