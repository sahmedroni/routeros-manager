import React, { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import './Nodes.css';

const Nodes = () => {
    // Destructure the values and functions directly from useSocket
    const { nodes, addNode, removeNode } = useSocket();

    // Local UI state
    const [newNodeIp, setNewNodeIp] = useState('');
    const [newNodeName, setNewNodeName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddNode = (e) => {
        e.preventDefault();
        // Check if values exist before calling the function
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
                            {node.status === 'online' && (
                                <div className="node-chart-mini">
                                    {/* Simple visualization bar for latency */}
                                    <div
                                        className="latency-bar"
                                        style={{
                                            width: `${Math.min(100, (node.latency || 0) / 2)}%`,
                                            backgroundColor: (node.latency || 0) > 100 ? '#ef4444' : '#10b981'
                                        }}
                                    />
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
