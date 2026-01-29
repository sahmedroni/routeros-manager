import { RouterConnectionService, RouterConfig } from './RouterConnectionService';

export class BandwidthService {
    public static async getInterfaces(config?: RouterConfig) {
        try {
            const api = await RouterConnectionService.getConnection(config);
            const interfaces = await api.write(['/interface/print']);
            return interfaces.map((i: any) => ({
                name: i.name,
                type: i.type,
                running: i.running === 'true',
                disabled: i.disabled === 'true',
                comment: i.comment || ''
            }));
        } catch (error) {
            // Mock Data for development
            return [
                { name: 'ether1', type: 'ether', running: true, disabled: false, comment: 'WAN' },
                { name: 'ether2', type: 'ether', running: false, disabled: false, comment: 'LAN' },
                { name: 'ether3_aamra', type: 'ether', running: true, disabled: false, comment: 'Fiber' },
                { name: 'wlan1', type: 'wlan', running: true, disabled: false },
                { name: 'bridge', type: 'bridge', running: true, disabled: false }
            ];
        }
    }

    public static async monitorTraffic(config?: RouterConfig, interfaceName: string = 'ether1') {
        try {
            const api = await RouterConnectionService.getConnection(config);

            const traffic = await api.write([
                '/interface/monitor-traffic',
                `=interface=${interfaceName}`,
                '=once='
            ]);

            return traffic[0];
        } catch (error) {
            // Mock Data
            return {
                'rx-bits-per-second': Math.floor(Math.random() * 50000000) + 5000000, // 5-55 Mbps
                'tx-bits-per-second': Math.floor(Math.random() * 10000000) + 1000000  // 1-11 Mbps
            };
        }
    }
}
