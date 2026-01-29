"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirewallService = void 0;
const RouterConnectionService_1 = require("./RouterConnectionService");
class FirewallService {
    static async addToAddressList(address, listName, config, comment) {
        const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
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
        }
        catch (error) {
            console.error('Firewall API Error:', error);
            const message = error.message || '';
            if (message.includes('not enough permissions')) {
                throw new Error('Permission Denied: Ensure MikroTik user has "write" and "policy" permissions.');
            }
            throw new Error(message || 'Failed to add to firewall address list');
        }
    }
    static async getAddressLists(config) {
        // Check if cache exists (session-based, no expiration)
        if (this.addressListCache) {
            console.log('Returning cached address lists (session cache)');
            return this.addressListCache.data;
        }
        console.log('Fetching fresh address lists from MikroTik');
        const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
        // Only fetch the 'list' field to reduce data transfer
        const lists = await api.write([
            '/ip/firewall/address-list/print',
            '?#', // Query all entries
            '=.proplist=list' // Only return the 'list' property
        ]);
        // Get unique list names
        const uniqueNames = Array.from(new Set(lists.map((l) => l.list)));
        // Update cache (persists for entire session)
        this.addressListCache = {
            data: uniqueNames
        };
        return uniqueNames;
    }
    static invalidateCache() {
        console.log('Address list cache invalidated');
        this.addressListCache = null;
    }
    static async getFilterRules(config) {
        const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
        const rules = await api.write(['/ip/firewall/filter/print']);
        return rules;
    }
    static async toggleFilterRule(id, enable, config) {
        const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
        const command = enable ? '/ip/firewall/filter/enable' : '/ip/firewall/filter/disable';
        await api.write([
            command,
            `=.id=${id}`
        ]);
        return { success: true };
    }
}
exports.FirewallService = FirewallService;
FirewallService.addressListCache = null;
