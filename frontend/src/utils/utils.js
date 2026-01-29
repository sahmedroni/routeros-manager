/**
 * Utility functions for data formatting
 */

/**
 * Format bytes to human-readable format (KB, MB, GB)
 */
export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format bandwidth (bits per second) to human-readable format
 */
export function formatBandwidth(bps) {
    if (!bps || bps === 0) return '0 bps';

    const k = 1000;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bps) / Math.log(k));

    return {
        value: (bps / Math.pow(k, i)).toFixed(2),
        unit: sizes[i]
    };
}

/**
 * Calculate memory usage percentage
 */
export function calculateMemoryUsage(totalMemory, freeMemory) {
    if (!totalMemory || totalMemory === 0) return 0;

    const usedMemory = totalMemory - freeMemory;
    return Math.round((usedMemory / totalMemory) * 100);
}

/**
 * Format uptime string
 */
export function formatUptime(uptime) {
    if (!uptime) return 'N/A';
    return uptime;
}

/**
 * Get trend value (mock for now, can be calculated from historical data)
 */
export function getTrend() {
    return (Math.random() * 20 - 10).toFixed(1); // Random trend between -10 and +10
}
