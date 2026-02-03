import { RouterConnectionService, RouterConfig } from './RouterConnectionService';

interface CacheEntry {
    data: string[];
}

export class FirewallService {
    private static addressListCache: CacheEntry | null = null;

    public static async addToAddressList(address: string, listName: string, config?: RouterConfig, comment?: string) {
        const api = await RouterConnectionService.getConnection(config);

        if (!address || !listName) {
            throw new Error('Address and List Name are required');
        }

        const ipRegex = /^[0-9a-fA-F:./]+$/;
        const safeStringRegex = /^[a-zA-Z0-9_\-.\s]+$/;

        if (!ipRegex.test(address)) {
            throw new Error('Invalid IP Address format');
        }

        if (!safeStringRegex.test(listName)) {
            throw new Error('List Name contains invalid characters');
        }

        const safeComment = (comment || 'Added from web dashboard').replace(/[^a-zA-Z0-9\s_\-.,!]/g, '');

        try {
            await api.write([
                '/ip/firewall/address-list/add',
                `=address=${address}`,
                `=list=${listName}`,
                `=comment=${safeComment}`
            ]);

            this.invalidateCache();

            return { success: true, message: `Added ${address} to ${listName}` };
        } catch (error: any) {
            console.error('Firewall API Error:', error);
            const message = error.message || error.toString() || '';
            const lowerMessage = message.toLowerCase();
            
            if (lowerMessage.includes('not enough permissions') || lowerMessage.includes('no such command')) {
                throw new Error('Permission Denied: Ensure MikroTik user has "write" and "policy" permissions.');
            }
            if (lowerMessage.includes('already') && (lowerMessage.includes('entry') || lowerMessage.includes('list'))) {
                throw new Error(`Address "${address}" already exists in list "${listName}"`);
            }
            if (lowerMessage.includes('failure')) {
                const match = message.match(/failure:\s*(.+)/i);
                throw new Error(match ? match[1].trim() : 'Operation failed');
            }
            throw new Error(message || 'Failed to add to firewall address list');
        }
    }

    public static async getAddressLists(config?: RouterConfig) {
        if (this.addressListCache) {
            return this.addressListCache.data;
        }

        const api = await RouterConnectionService.getConnection(config);

        const lists = await api.write([
            '/ip/firewall/address-list/print',
            '=.proplist=list'
        ]);

        const uniqueNames = Array.from(new Set(lists.map((l: any) => l.list)));

        this.addressListCache = {
            data: uniqueNames
        };

        return uniqueNames;
    }

    public static async getAddressListEntries(config?: RouterConfig) {
        const api = await RouterConnectionService.getConnection(config);

        const entries = await api.write([
            '/ip/firewall/address-list/print',
            '=.proplist=.id,address,list,comment,created'
        ]);

        return entries.map((e: any) => ({
            id: e['.id'],
            address: e.address,
            list: e.list,
            comment: e.comment || '',
            created: e.created
        }));
    }

    public static async moveAddressToList(entryId: string, newListName: string, config?: RouterConfig) {
        const api = await RouterConnectionService.getConnection(config);

        const safeListName = newListName.replace(/[^a-zA-Z0-9_\-.\s]+$/, '');

        try {
            await api.write([
                '/ip/firewall/address-list/set',
                `=.id=${entryId}`,
                `=list=${safeListName}`
            ]);

            this.invalidateCache();

            return { success: true, message: `Moved to list "${safeListName}"` };
        } catch (error: any) {
            console.error('Move address error:', error);
            const message = error.message || '';
            if (message.includes('not enough permissions')) {
                throw new Error('Permission Denied: Ensure user has "write" permissions.');
            }
            throw new Error(message || 'Failed to move address');
        }
    }

    public static async removeAddressEntry(entryId: string, config?: RouterConfig) {
        const api = await RouterConnectionService.getConnection(config);

        try {
            await api.write([
                '/ip/firewall/address-list/remove',
                `=.id=${entryId}`
            ]);

            this.invalidateCache();

            return { success: true, message: 'Address removed' };
        } catch (error: any) {
            console.error('Remove address error:', error);
            const message = error.message || '';
            if (message.includes('not enough permissions')) {
                throw new Error('Permission Denied: Ensure user has "write" permissions.');
            }
            throw new Error(message || 'Failed to remove address');
        }
    }

    private static invalidateCache(): void {
        this.addressListCache = null;
    }

    public static async getFilterRules(config?: RouterConfig) {
        const api = await RouterConnectionService.getConnection(config);
        const rules = await api.write(['/ip/firewall/filter/print']);
        return rules;
    }
    
    public static async toggleFilterRule(id: string, enable: boolean, config?: RouterConfig) {
        const api = await RouterConnectionService.getConnection(config);
        const command = enable ? '/ip/firewall/filter/enable' : '/ip/firewall/filter/disable';

        await api.write([
            command,
            `=.id=${id}`
        ]);

        return { success: true };
    }
}
