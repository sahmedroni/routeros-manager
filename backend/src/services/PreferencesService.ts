import fs from 'fs/promises';
import path from 'path';

const PREFERENCES_FILE = path.join(process.cwd(), 'preferences.json');

const DEFAULT_PREFERENCES = {
    realtimeInterval: 1000,
    dhcpInterval: 5000,
    pingInterval: 2000,
    logInterval: 5000,
    interfaceInterval: 5000,
    nodeMonitorInterval: 3000
};

interface UserPreferences {
    realtimeInterval: number;
    dhcpInterval: number;
    pingInterval: number;
    logInterval: number;
    interfaceInterval: number;
    nodeMonitorInterval: number;
}

export class PreferencesService {
    private static preferences: Map<string, UserPreferences> = new Map();

    private static async loadPreferences() {
        try {
            const data = await fs.readFile(PREFERENCES_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            this.preferences = new Map(Object.entries(parsed));
        } catch {
            this.preferences = new Map();
        }
    }

    private static async savePreferences() {
        const obj = Object.fromEntries(this.preferences);
        await fs.writeFile(PREFERENCES_FILE, JSON.stringify(obj, null, 2));
    }

    public static async init() {
        await this.loadPreferences();
    }

    public static async getPreferences(userId: string): Promise<UserPreferences> {
        await this.init();
        const prefs = this.preferences.get(userId);
        return prefs ? { ...DEFAULT_PREFERENCES, ...prefs } : { ...DEFAULT_PREFERENCES };
    }

    public static async savePreferencesForUser(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
        await this.init();
        const current = this.preferences.get(userId) || {};
        const updated = { ...current, ...prefs };
        this.preferences.set(userId, updated as UserPreferences);
        await this.savePreferences();
        return { ...DEFAULT_PREFERENCES, ...updated };
    }

    public static async deletePreferences(userId: string): Promise<void> {
        await this.init();
        this.preferences.delete(userId);
        await this.savePreferences();
    }

    public static getDefaultPreferences(): UserPreferences {
        return { ...DEFAULT_PREFERENCES };
    }
}
