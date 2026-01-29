"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemHealthService = void 0;
const RouterConnectionService_1 = require("./RouterConnectionService");
class SystemHealthService {
    static async getSystemIdentity(config) {
        try {
            const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
            const identity = await api.write(['/system/identity/print']);
            // Log for debugging
            // console.log('System Identity Response:', JSON.stringify(identity));
            if (Array.isArray(identity) && identity.length > 0) {
                // Return 'name' property, or fallback to first available property that isn't '.id'
                const rawIdentity = identity[0];
                const name = (rawIdentity.name || Object.keys(rawIdentity).find(k => k !== '.id') || 'MikroTik').toString().trim();
                return name || 'MikroTik';
            }
            return 'MikroTik';
        }
        catch (error) {
            console.error('Error fetching system identity:', error);
            return 'MikroTik';
        }
    }
    static async getSystemResources(config) {
        try {
            const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
            const resources = await api.write(['/system/resource/print']);
            return resources[0]; // Returns cpu-load, free-memory, total-memory, uptime, etc.
        }
        catch (error) {
            console.error('Error fetching system resources:', error);
            return null;
        }
    }
    static async getSystemHealth(config) {
        try {
            const api = await RouterConnectionService_1.RouterConnectionService.getConnection(config);
            const health = await api.write(['/system/health/print']);
            const healthData = {};
            if (Array.isArray(health)) {
                health.forEach((item) => {
                    // Style 1: [{ name: "temperature", value: "42" }, ...]
                    if (item.name && item.value !== undefined) {
                        healthData[item.name] = item.value;
                    }
                    // Style 2: [{ temperature: 42, voltage: 24.1 }]
                    else {
                        Object.keys(item).forEach(key => {
                            if (key !== '.id') {
                                healthData[key] = item[key];
                            }
                        });
                    }
                });
            }
            return healthData;
        }
        catch (error) {
            console.error('Error fetching system health:', error);
            return {};
        }
    }
    static async getDashboardData(config) {
        try {
            // Attempt to fetch real data
            const [resources, identity, health] = await Promise.all([
                this.getSystemResources(config),
                this.getSystemIdentity(config),
                this.getSystemHealth(config)
            ]);
            // Normalize CPU usage
            const cpuUsage = resources ? parseInt(String(resources['cpu-load'])) || 0 : 0;
            // Extract best available health metrics
            const temperature = health['temperature'] || health['cpu-temperature'] || health['cpu-temp'] || health['temp'] || health['board-temperature'] || null;
            const voltage = health['voltage'] || health['active-voltage'] || null;
            return {
                cpuUsage,
                totalMemory: resources ? resources['total-memory'] : 0,
                freeMemory: resources ? resources['free-memory'] : 0,
                uptime: resources ? resources['uptime'] : 'N/A',
                model: resources ? resources['board-name'] : 'Unknown',
                identity: identity,
                version: resources ? resources['version'] : 'Unknown',
                user: config?.user || process.env.ROUTER_USER || 'admin',
                health: {
                    temperature,
                    voltage,
                    cpuTemperature: health['cpu-temperature'] || null,
                    boardTemperature: health['board-temperature'] || null,
                    fan1Speed: health['fan1-speed'] || null,
                    fan2Speed: health['fan2-speed'] || null,
                    powerConsumption: health['power-consumption'] || null,
                    psuState: health['psu-state'] || null,
                    psu1State: health['psu1-state'] || null,
                    psu2State: health['psu2-state'] || null,
                    raw: health // Include everything just in case
                }
            };
        }
        catch (error) {
            console.warn('Using Mock Data for System Health due to connection error.');
            // Mock Data
            return {
                cpuUsage: Math.floor(Math.random() * 20) + 5,
                totalMemory: 1073741824, // 1GB
                freeMemory: 536870912, // 512MB
                uptime: '2d 14h 32m',
                model: 'RB5009 (Simulated)',
                identity: 'MikroTik-Simulated',
                version: '7.12',
                user: config?.user || 'admin-mock',
                health: {
                    temperature: 42,
                    voltage: 24.1,
                    cpuTemperature: 45,
                    boardTemperature: 40,
                    fan1Speed: null,
                    fan2Speed: null,
                    powerConsumption: 12.5,
                    psuState: 'ok',
                    psu1State: null,
                    psu2State: null,
                    raw: {}
                }
            };
        }
    }
}
exports.SystemHealthService = SystemHealthService;
