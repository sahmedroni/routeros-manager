import fs from 'fs/promises';
import path from 'path';
import { PingService } from './PingService';

interface Node {
    id: string;
    ip: string;
    name: string;
    status: 'online' | 'offline' | 'pending';
    latency: number | null;
    lastChecked: number;
}

const NODES_FILE = path.join(process.cwd(), 'nodes.json');

export class NodeMonitorService {
    private static nodes: Node[] = [];
    private static isInitialized = false;
    private static previousStatus: Record<string, 'online' | 'offline' | 'pending'> = {};

    private static async loadNodes() {
        try {
            const data = await fs.readFile(NODES_FILE, 'utf-8');
            this.nodes = JSON.parse(data);
            // Initialize previous status
            this.nodes.forEach(node => {
                this.previousStatus[node.id] = node.status;
            });
        } catch (error) {
            // If file doesn't exist, start with empty list
            this.nodes = [];
            await this.saveNodes();
        }
    }

    private static async saveNodes() {
        await fs.writeFile(NODES_FILE, JSON.stringify(this.nodes, null, 2));
    }

    public static async init() {
        if (!this.isInitialized) {
            await this.loadNodes();
            this.isInitialized = true;
        }
    }

    public static async getNodes(): Promise<Node[]> {
        await this.init();
        return this.nodes;
    }

    public static async addNode(ip: string, name: string): Promise<Node> {
        await this.init();

        // Check if node already exists
        if (this.nodes.find(n => n.ip === ip)) {
            throw new Error('Node with this IP already exists');
        }

        const newNode: Node = {
            id: Date.now().toString(),
            ip,
            name,
            status: 'pending',
            latency: null,
            lastChecked: Date.now()
        };

        this.nodes.push(newNode);
        this.previousStatus[newNode.id] = 'pending';
        await this.saveNodes();
        return newNode;
    }

    public static async removeNode(ip: string): Promise<void> {
        await this.init();
        const nodeToRemove = this.nodes.find(n => n.ip === ip);
        if (nodeToRemove) {
            delete this.previousStatus[nodeToRemove.id];
        }
        this.nodes = this.nodes.filter(n => n.ip !== ip);
        await this.saveNodes();
    }

    public static async monitorNodes(): Promise<Node[]> {
        await this.init();

        const updates = this.nodes.map(async (node) => {
            const latency = await PingService.pingDNS(node.ip);

            const newStatus = latency !== null ? 'online' : 'offline';

            this.previousStatus[node.id] = newStatus;
            node.latency = latency;
            node.status = newStatus;
            node.lastChecked = Date.now();

            return node;
        });

        await Promise.all(updates);
        return this.nodes;
    }
}
