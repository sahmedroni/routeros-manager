"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeMonitorService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const PingService_1 = require("./PingService");
const NODES_FILE = path_1.default.join(process.cwd(), 'nodes.json');
class NodeMonitorService {
    static async loadNodes() {
        try {
            const data = await promises_1.default.readFile(NODES_FILE, 'utf-8');
            this.nodes = JSON.parse(data);
            // Initialize previous status
            this.nodes.forEach(node => {
                this.previousStatus[node.id] = node.status;
            });
        }
        catch (error) {
            // If file doesn't exist, start with empty list
            this.nodes = [];
            await this.saveNodes();
        }
    }
    static async saveNodes() {
        await promises_1.default.writeFile(NODES_FILE, JSON.stringify(this.nodes, null, 2));
    }
    static async init() {
        if (!this.isInitialized) {
            await this.loadNodes();
            this.isInitialized = true;
        }
    }
    static async getNodes() {
        await this.init();
        return this.nodes;
    }
    static async addNode(ip, name) {
        await this.init();
        // Check if node already exists
        if (this.nodes.find(n => n.ip === ip)) {
            throw new Error('Node with this IP already exists');
        }
        const newNode = {
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
    static async removeNode(ip) {
        await this.init();
        const nodeToRemove = this.nodes.find(n => n.ip === ip);
        if (nodeToRemove) {
            delete this.previousStatus[nodeToRemove.id];
        }
        this.nodes = this.nodes.filter(n => n.ip !== ip);
        await this.saveNodes();
    }
    static async editNode(id, ip, name) {
        await this.init();
        const node = this.nodes.find(n => n.id === id);
        if (!node) {
            throw new Error('Node not found');
        }
        // If IP is changing, ensure new IP does not collide with another node
        if (node.ip !== ip) {
            const existing = this.nodes.find(n => n.ip === ip && n.id !== id);
            if (existing) {
                throw new Error('Another node with the provided IP already exists');
            }
        }
        node.ip = ip;
        node.name = name;
        node.lastChecked = Date.now();
        await this.saveNodes();
        return node;
    }
    static async monitorNodes() {
        await this.init();
        const updates = this.nodes.map(async (node) => {
            const latency = await PingService_1.PingService.pingDNS(node.ip);
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
exports.NodeMonitorService = NodeMonitorService;
NodeMonitorService.nodes = [];
NodeMonitorService.isInitialized = false;
NodeMonitorService.previousStatus = {};
