import { RouterConnectionService, RouterConfig } from './RouterConnectionService';

interface CacheEntry {
    data: string[];
}

export class FirewallService {
    private static addressListCache: CacheEntry | null = null;

    public static async addToAddressList(address: string, listName: string, config?: RouterConfig, comment?: string) {
        const api = await RouterConnectionService.getConnection(config);

        // Basic validation
        if (!address || !listName) {
            throw new Error('Address and List Name are required');
        }

        try {
            await api.write([
                '/ip/firewall/address-list/add',
                `=address=${address}`,
                `=list=${listName}`,
                `=comment=${comment || 'Added from web dashboard'}`
            ]);

            // Invalidate cache when a new entry is added
            this.invalidateCache();

            return { success: true, message: `Added ${address} to ${listName}` };
        } catch (error: any) {
            console.error('Firewall API Error:', error);
            const message = error.message || '';
            if (message.includes('not enough permissions')) {
                throw new Error('Permission Denied: Ensure MikroTik user has "write" and "policy" permissions.');
            }
            throw new Error(message || 'Failed to add to firewall address list');
        }
    }

    public static async getAddressLists(config?: RouterConfig) {
        // Check if cache exists (session-based, no expiration)
        if (this.addressListCache) {
            console.log('Returning cached address lists (session cache)');
            return this.addressListCache.data;
        }

        console.log('Fetching fresh address lists from MikroTik');
        const api = await RouterConnectionService.getConnection(config);

        // Only fetch the 'list' field to reduce data transfer
        const lists = await api.write([
            '/ip/firewall/address-list/print',
            '?#',  // Query all entries
            '=.proplist=list'  // Only return the 'list' property
        ]);

        // Get unique list names
        const uniqueNames = Array.from(new Set(lists.map((l: any) => l.list)));

        // Update cache (persists for entire session)
        this.addressListCache = {
            data: uniqueNames
        };

        return uniqueNames;
    }



    private static invalidateCache(): void {
        console.log('Address list cache invalidated');
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
