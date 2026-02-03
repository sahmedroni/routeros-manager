import React, { useState, useEffect } from 'react';
import { Activity, ArrowDown, ArrowUp, GitBranch, AlertCircle, Search, Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import './Traffic.css';

const Traffic = () => {
    const { realtimeStats, changeInterface, isConnected } = useSocket();
    const [activeTab, setActiveTab] = useState('traffic');
    
    const [interfaces, setInterfaces] = useState([]);
    const [selectedInterface, setSelectedInterface] = useState('ether1');
    const [isLoading, setIsLoading] = useState(true);

    const [queues, setQueues] = useState([]);
    const [queuesLoading, setQueuesLoading] = useState(true);
    const [queuesError, setQueuesError] = useState(null);
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [editingQueue, setEditingQueue] = useState(null);
    const [queueFormData, setQueueFormData] = useState({
        name: '',
        target: '',
        maxUpload: 10,
        maxDownload: 10,
        priority: '8',
        comment: ''
    });
    const [notification, setNotification] = useState(null);
    const [queueSearch, setQueueSearch] = useState('');

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

    const fetchInterfaces = async () => {
        try {
            const response = await fetch(`${BACKEND_URL.replace('/socket.io', '')}/api/interfaces`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setInterfaces(data);
                const defaultInterface = data.find(i => i.name === 'bridge') || data[0];
                if (defaultInterface) {
                    setSelectedInterface(defaultInterface.name);
                    changeInterface(defaultInterface.name);
                }
            }
        } catch (error) {
            console.error('Failed to fetch interfaces:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchQueues = async () => {
        try {
            setQueuesLoading(true);
            const response = await fetch(`${BACKEND_URL}/api/queues`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setQueues(data);
                setQueuesError(null);
            } else {
                setQueuesError('Failed to fetch queues');
            }
        } catch (err) {
            setQueuesError('Connection failed');
        } finally {
            setQueuesLoading(false);
        }
    };

    useEffect(() => {
        fetchInterfaces();
        if (activeTab === 'queues') {
            fetchQueues();
        }
    }, [activeTab]);

    const handleInterfaceChange = (e) => {
        const newInterface = e.target.value;
        setSelectedInterface(newInterface);
        changeInterface(newInterface);
    };

    const showQueueNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleQueueSubmit = async (e) => {
        e.preventDefault();

        try {
            const url = editingQueue
                ? `${BACKEND_URL}/api/queues/${editingQueue.id}`
                : `${BACKEND_URL}/api/queues`;
            
            const method = editingQueue ? 'PUT' : 'POST';
            
            const payload = {
                name: queueFormData.name,
                target: queueFormData.target,
                maxLimit: `${Math.round(queueFormData.maxUpload * 1000000)}/${Math.round(queueFormData.maxDownload * 1000000)}`,
                priority: queueFormData.priority,
                comment: queueFormData.comment
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success || response.ok) {
                showQueueNotification(editingQueue ? 'Queue updated successfully' : 'Queue created successfully');
                setShowQueueModal(false);
                setEditingQueue(null);
                setQueueFormData({ name: '', target: '', maxUpload: 10, maxDownload: 10, priority: '8', comment: '' });
                fetchQueues();
            } else {
                showQueueNotification(result.error || 'Operation failed', 'error');
            }
        } catch (err) {
            showQueueNotification('Operation failed', 'error');
        }
    };

    const handleQueueDelete = async (id, name) => {
        if (!window.confirm(`Delete queue "${name}"?`)) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/queues/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                showQueueNotification('Queue deleted successfully');
                fetchQueues();
            } else {
                showQueueNotification(result.error || 'Delete failed', 'error');
            }
        } catch (err) {
            showQueueNotification('Delete failed', 'error');
        }
    };

    const handleQueueToggle = async (id, currentState) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/queues/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !currentState }),
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                showQueueNotification(!currentState ? 'Queue enabled' : 'Queue disabled');
                fetchQueues();
            } else {
                showQueueNotification(result.error || 'Toggle failed', 'error');
            }
        } catch (err) {
            showQueueNotification('Toggle failed', 'error');
        }
    };

    const openQueueEdit = (queue) => {
        setEditingQueue(queue);
        
        const parseMbps = (value) => {
            if (!value || value === '0' || value === '0/0') return 10;
            const num = parseFloat(value);
            if (isNaN(num)) return 10;
            return Math.round((num / 1000000) * 10) / 10;
        };
        
        let upload = 10;
        let download = 10;
        
        if (queue.maxLimit && queue.maxLimit !== '0/0') {
            const parts = queue.maxLimit.split('/');
            if (parts.length === 2) {
                upload = parseMbps(parts[0]);
                download = parseMbps(parts[1]);
            }
        }
        
        setQueueFormData({
            name: queue.name,
            target: queue.target,
            maxUpload: upload,
            maxDownload: download,
            priority: queue.priority,
            comment: queue.comment
        });
        setShowQueueModal(true);
    };

    const openQueueAdd = () => {
        setEditingQueue(null);
        setQueueFormData({ name: '', target: '', maxUpload: 10, maxDownload: 10, priority: '8', comment: '' });
        setShowQueueModal(true);
    };

    const formatLimit = (limit) => {
        if (!limit || limit === '0/0') return 'Unlimited';
        
        const formatValue = (value) => {
            if (!value) return '0';
            const num = parseFloat(value);
            if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'G';
            if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
            return num.toString();
        };
        
        const parts = limit.split('/');
        if (parts.length === 2) {
            return `↑ ${formatValue(parts[0])} / ↓ ${formatValue(parts[1])}`;
        }
        return limit.toUpperCase();
    };

    const filteredQueues = queues.filter(queue => {
        if (!queueSearch) return true;
        const query = queueSearch.toLowerCase();
        return (
            queue.name?.toLowerCase().includes(query) ||
            queue.target?.toLowerCase().includes(query) ||
            queue.comment?.toLowerCase().includes(query)
        );
    });

    const currentRx = realtimeStats?.bandwidth?.rx ? (realtimeStats.bandwidth.rx / 1024 / 1024).toFixed(2) : '0';
    const currentTx = realtimeStats?.bandwidth?.tx ? (realtimeStats.bandwidth.tx / 1024 / 1024).toFixed(2) : '0';

    const tabs = [
        { id: 'traffic', label: 'Live Traffic', icon: Activity },
        { id: 'queues', label: 'Simple Queues', icon: GitBranch }
    ];

    return (
        <div className="traffic-page">
            <div className="page-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={18} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {activeTab === 'traffic' && (
                <>
                    <div className="traffic-header">
                        <div className="header-title">
                            <Activity className="pulse-cyan" size={24} />
                            <h2>Live Traffic Monitor</h2>
                        </div>

                        <div className="header-controls">
                            <div className="interface-selector">
                                <label>Interface:</label>
                                <select value={selectedInterface} onChange={handleInterfaceChange} disabled={isLoading}>
                                    {interfaces.map(int => (
                                        <option key={int.name} value={int.name}>{int.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="stats-grid">
                        <div className="traffic-stat-card glass-card rx">
                            <div className="stat-icon down">
                                <ArrowDown size={24} />
                            </div>
                            <div className="stat-info">
                                <label>Incoming (RX)</label>
                                <div className="stat-value">{currentRx} <span className="unit">Mbps</span></div>
                            </div>
                            <div className="stat-line rx-line"></div>
                        </div>

                        <div className="traffic-stat-card glass-card tx">
                            <div className="stat-icon up">
                                <ArrowUp size={24} />
                            </div>
                            <div className="stat-info">
                                <label>Outgoing (TX)</label>
                                <div className="stat-value">{currentTx} <span className="unit">Mbps</span></div>
                            </div>
                            <div className="stat-line tx-line"></div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'queues' && (
                <>
                    {notification && (
                        <div className={`notification ${notification.type}`}>
                            {notification.message}
                        </div>
                    )}

                    <div className="card-header" style={{ marginTop: '24px' }}>
                        <div>
                            <h2 className="display-font">Simple Queues</h2>
                            <p className="subtitle">Manage MikroTik traffic shaping rules</p>
                        </div>
                        <div className="header-actions">
                            <div className="search-bar" style={{ width: '250px', marginRight: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Search queues..."
                                    value={queueSearch}
                                    onChange={(e) => setQueueSearch(e.target.value)}
                                />
                                <Search size={16} className="search-icon" />
                            </div>
                            <button className="login-btn" onClick={openQueueAdd} style={{ height: '40px', padding: '0 20px' }}>
                                <Plus size={18} />
                                Add Queue
                            </button>
                        </div>
                    </div>

                    {queuesError && (
                        <div className="notification error">
                            <AlertCircle size={16} />
                            {queuesError}
                        </div>
                    )}

                    {queuesLoading ? (
                        <div className="glass-card empty-state">
                            <Activity className="spin" size={48} />
                            <p>Loading queues...</p>
                        </div>
                    ) : filteredQueues.length === 0 ? (
                        <div className="glass-card empty-state">
                            <Search size={48} color="var(--text-muted)" />
                            <p>No queues found</p>
                            <p className="small">{queueSearch ? 'Try a different search term' : 'Create a queue to start traffic shaping'}</p>
                        </div>
                    ) : (
                        <div className="queues-card">
                            <div className="queues-table-responsive">
                                <table className="devices-table">
                                    <thead>
                                        <tr>
                                            <th>Status</th>
                                            <th>Name</th>
                                            <th>Target</th>
                                            <th>Max Limit</th>
                                            <th>Priority</th>
                                            <th>Comment</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredQueues.map((queue) => (
                                            <tr key={queue.id}>
                                                <td>
                                                    <button
                                                        className="action-btn"
                                                        onClick={() => handleQueueToggle(queue.id, !queue.disabled)}
                                                        title={queue.disabled ? 'Enable' : 'Disable'}
                                                    >
                                                        {queue.disabled ? <PowerOff size={14} /> : <Power size={14} />}
                                                    </button>
                                                </td>
                                                <td className="device-id">{queue.name}</td>
                                                <td className="device-hostname">{queue.target}</td>
                                                <td className="device-server">{formatLimit(queue.maxLimit)}</td>
                                                <td>{queue.priority}</td>
                                                <td className="device-mac">{queue.comment || '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="action-btn" onClick={() => openQueueEdit(queue)} title="Edit">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button className="action-btn" onClick={() => handleQueueDelete(queue.id, queue.name)} title="Delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {showQueueModal && (
                        <div className="modal-overlay" onClick={() => setShowQueueModal(false)}>
                            <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
                                <h3>{editingQueue ? 'Edit Queue' : 'Add New Queue'}</h3>
                                
                                <form onSubmit={handleQueueSubmit}>
                                    <div className="form-group">
                                        <label>Queue Name</label>
                                        <input
                                            type="text"
                                            value={queueFormData.name}
                                            onChange={(e) => setQueueFormData({ ...queueFormData, name: e.target.value })}
                                            placeholder="e.g., Downloads"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Target (IP/CIDR)</label>
                                        <input
                                            type="text"
                                            value={queueFormData.target}
                                            onChange={(e) => setQueueFormData({ ...queueFormData, target: e.target.value })}
                                            placeholder="e.g., 192.168.1.0/24"
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Upload Limit (Mbps)</label>
                                            <input
                                                type="number"
                                                min="0.1"
                                                step="0.1"
                                                value={queueFormData.maxUpload}
                                                onChange={(e) => setQueueFormData({ ...queueFormData, maxUpload: parseFloat(e.target.value) || 0 })}
                                                placeholder="10"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Download Limit (Mbps)</label>
                                            <input
                                                type="number"
                                                min="0.1"
                                                step="0.1"
                                                value={queueFormData.maxDownload}
                                                onChange={(e) => setQueueFormData({ ...queueFormData, maxDownload: parseFloat(e.target.value) || 0 })}
                                                placeholder="10"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Priority (1-8)</label>
                                        <select
                                            value={queueFormData.priority}
                                            onChange={(e) => setQueueFormData({ ...queueFormData, priority: e.target.value })}
                                        >
                                            <option value="1">1 (Highest)</option>
                                            <option value="2">2</option>
                                            <option value="3">3</option>
                                            <option value="4">4</option>
                                            <option value="5">5</option>
                                            <option value="6">6</option>
                                            <option value="7">7</option>
                                            <option value="8">8 (Lowest)</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Comment (optional)</label>
                                        <input
                                            type="text"
                                            value={queueFormData.comment}
                                            onChange={(e) => setQueueFormData({ ...queueFormData, comment: e.target.value })}
                                            placeholder="Optional description"
                                        />
                                    </div>

                                    <div className="modal-actions">
                                        <button type="button" className="cancel-btn" onClick={() => setShowQueueModal(false)}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="confirm-btn">
                                            {editingQueue ? 'Update' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Traffic;
