"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PingService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class PingService {
    /**
     * Ping a DNS server and return latency in milliseconds
     * @param host - DNS server to ping (default: 8.8.8.8 - Google DNS)
     * @returns Latency in milliseconds or null if ping fails
     */
    static async pingDNS(host = '8.8.8.8') {
        try {
            // Windows ping command: ping -n 1 host
            // Linux/Mac ping command: ping -c 1 host
            const isWindows = process.platform === 'win32';
            const pingCommand = isWindows
                ? `ping -n 1 ${host}`
                : `ping -c 1 ${host}`;
            const { stdout } = await execAsync(pingCommand);
            // Parse latency from ping output
            let latency = null;
            if (isWindows) {
                // Windows format: "Average = 12ms" or "time=12ms"
                const match = stdout.match(/time[=<](\d+)ms/i) || stdout.match(/Average = (\d+)ms/i);
                if (match) {
                    latency = parseInt(match[1], 10);
                }
            }
            else {
                // Linux/Mac format: "time=12.3 ms"
                const match = stdout.match(/time=(\d+\.?\d*)\s*ms/i);
                if (match) {
                    latency = Math.round(parseFloat(match[1]));
                }
            }
            return latency;
        }
        catch (error) {
            // Silently return null for ping failures to avoid log flooding
            return null;
        }
    }
    /**
     * Get ping statistics for multiple DNS servers
     */
    static async getPingStats(host) {
        const primaryHost = host || process.env.ROUTER_HOST || '192.168.0.1';
        const latency = await this.pingDNS(primaryHost);
        return {
            primary: latency,
            primaryHost,
            timestamp: Date.now()
        };
    }
}
exports.PingService = PingService;
