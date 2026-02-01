import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useSocket } from '../hooks/useSocket';
import './Nodes.css';

const MAX_LATENCY_POINTS = 15;

const Nodes = () => {
    const { nodes, addNode, removeNode } = useSocket();
    const [latencyHistory, setLatencyHistory] = useState({});

    useEffect(() => {
        if (!nodes || nodes.length === 0) {
            setLatencyHistory({});
            return;
        }

        setLatencyHistory(prev => {
            const updated = { ...prev };
            nodes.forEach(node => {
                if (!updated[node.id]) {
                    updated[node.id] = [];
                }
                if (node.latency !== null) {
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    updated[node.id] = [
                        ...updated[node.id].slice(-MAX_LATENCY_POINTS),
                        { time: timeStr, latency: node.latency }
                    ];
                }
            });
            return updated;
        });
    }, [nodes]);

    const [newNodeIp, setNewNodeIp] = useState('');
    const [newNodeName, setNewNodeName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddNode = (e) => {
        e.preventDefault();
        if (newNodeIp && newNodeName) {
            addNode(newNodeIp, newNodeName);
            setNewNodeIp('');
            setNewNodeName('');
            setIsAdding(false);
        }
    };

    const handleRemoveNode = (ip) => {
        if (window.confirm(`Are you sure you want to remove node ${ip}?`)) {
            removeNode(ip);
        }
    };

    return (
        <div className="nodes-container">
            <div className="nodes-header">
                <div>
                    <h1 className="display-font">Network Nodes</h1>
                    <p className="subtitle">Real-time monitoring of critical network endpoints</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsAdding(!isAdding)}
                >
                    {isAdding ? 'Cancel' : 'Add Node'}
                </button>
            </div>

            {isAdding && (
                <div className="glass-card add-node-form">
                    <form onSubmit={handleAddNode}>
                        <div className="form-group">
                            <label>Node Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Google DNS"
                                value={newNodeName}
                                onChange={(e) => setNewNodeName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>IP Address</label>
                            <input
                                type="text"
                                placeholder="e.g. 8.8.8.8"
                                value={newNodeIp}
                                onChange={(e) => setNewNodeIp(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-success">Monitor Node</button>
                    </form>
                </div>
            )}

            <div className="nodes-grid">
                {(!nodes || nodes.length === 0) ? (
                    <div className="glass-card empty-state">
                        <p>No custom nodes added yet.</p>
                        <p className="small">Add an IP address to start monitoring its latency and status.</p>
                    </div>
                ) : (
                    nodes.map((node) => (
                        <div key={node.id} className={`glass-card node-card ${node.status}`}>
                            <div className="node-header">
                                <span className={`status-indicator ${node.status}`}></span>
                                <h3 className="node-name">{node.name}</h3>
                                <button
                                    className="btn-icon delete-btn"
                                    onClick={() => handleRemoveNode(node.ip)}
                                    title="Remove Node"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="node-details">
                                <div className="detail-item">
                                    <span className="label">IP Address</span>
                                    <span className="value font-mono">{node.ip}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Status</span>
                                    <span className={`value status-text ${node.status}`}>
                                        {node.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Latency</span>
                                    <span className="value">
                                        {node.latency !== null ? `${node.latency} ms` : '-'}
                                    </span>
                                </div>
                            </div>
                            {node.status === 'online' && latencyHistory[node.id] && latencyHistory[node.id].length > 1 && (
                                <div className="node-chart-mini">
                                    <ResponsiveContainer width="100%" height={60}>
                                        <LineChart data={latencyHistory[node.id]}>
                                            <Line
                                                type="monotone"
                                                dataKey="latency"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Nodes;
