import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import './Nodes.css';

const Nodes = () => {
    const { nodes, addNode, removeNode, editNode } = useSocket();

    // live latency history/graph removed

    const [newNodeIp, setNewNodeIp] = useState('');
    const [newNodeName, setNewNodeName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState(null);


    const handleAddNode = (e) => {
        e.preventDefault();
        if (!newNodeIp || !newNodeName) return;

        if (editingNodeId) {
            // editing existing node by id (more robust)
            console.log('Submitting edit for node id=', editingNodeId, 'payload=', { ip: newNodeIp, name: newNodeName });
            editNode(editingNodeId, newNodeIp, newNodeName, (response) => {
                console.log('Edit ack received', response);
                if (!response || !response.success) {
                    alert(response?.error || 'Failed to edit node');
                    // keep form open for retry
                } else {
                    // success: clear form
                    alert('Node updated');
                    setNewNodeIp('');
                    setNewNodeName('');
                    setIsAdding(false);
                    setEditingNodeId(null);
                }
            });
        } else {
            console.log('Adding node', { ip: newNodeIp, name: newNodeName });
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

    const handleEditNode = (node) => {
        setEditingNodeId(node.id);
        setNewNodeIp(node.ip);
        setNewNodeName(node.name);
        setIsAdding(true);
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
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn-icon delete-btn"
                                                onClick={() => handleRemoveNode(node.ip)}
                                                title="Remove Node"
                                            >
                                                ×
                                            </button>
                                            <button
                                                className="btn-icon edit-btn"
                                                onClick={() => handleEditNode(node)}
                                                title="Edit Node"
                                            >
                                                ✎
                                            </button>
                                        </div>
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
                            {/* live graph removed */}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Nodes;
