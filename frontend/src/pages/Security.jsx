import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, RotateCw, List, ArrowRight, Trash2, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Security.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const Security = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('rules');

    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [addressLists, setAddressLists] = useState([]);
    const [selectedList, setSelectedList] = useState('');
    const [addressEntries, setAddressEntries] = useState([]);
    const [addressesLoading, setAddressesLoading] = useState(false);
    const [addressesError, setAddressesError] = useState(null);
    const [notification, setNotification] = useState(null);
    const [moveTarget, setMoveTarget] = useState({});
    const [showMoveDropdown, setShowMoveDropdown] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchRules = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BACKEND_URL}/api/firewall/rules`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch firewall rules');
            }

            const data = await response.json();
            setRules(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching rules:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAddressLists = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/firewall/lists`, {
                credentials: 'include'
            });

            if (response.ok) {
                const lists = await response.json();
                setAddressLists(lists);
                if (lists.length > 0 && !selectedList) {
                    setSelectedList(lists[0]);
                }
            }
        } catch (err) {
            console.error('Error fetching address lists:', err);
        }
    };

    const fetchAddressEntries = async () => {
        if (!selectedList) {
            setAddressEntries([]);
            return;
        }

        try {
            setAddressesLoading(true);
            const response = await fetch(`${BACKEND_URL}/api/firewall/addresses`, {
                credentials: 'include'
            });

            if (response.ok) {
                const entries = await response.json();
                setAddressEntries(entries.filter((e) => e.list === selectedList));
                setAddressesError(null);
            } else {
                setAddressesError('Failed to fetch addresses');
            }
        } catch (err) {
            setAddressesError('Connection failed');
        } finally {
            setAddressesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'rules') {
            fetchRules();
        } else if (activeTab === 'addresses') {
            fetchAddressLists();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'addresses' && selectedList) {
            fetchAddressEntries();
        }
    }, [selectedList, activeTab]);

    const handleToggleRule = async (id, currentStatus) => {
        const newStatus = !currentStatus;
        setRules(rules.map(r => r['.id'] === id ? { ...r, disabled: (!newStatus).toString() } : r));

        try {
            const response = await fetch(`${BACKEND_URL}/api/firewall/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id, enabled: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to toggle rule');
            }
            fetchRules();
        } catch (err) {
            console.error('Error toggling rule:', err);
            setError('Failed to update rule status');
            setRules(rules.map(r => r['.id'] === id ? { ...r, disabled: currentStatus.toString() } : r));
        }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleMoveAddress = async (entryId, newList) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/firewall/addresses/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ entryId, newList })
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Address moved successfully');
                setShowMoveDropdown(null);
                fetchAddressEntries();
                fetchAddressLists();
            } else {
                showNotification(result.error || 'Move failed', 'error');
            }
        } catch (err) {
            showNotification('Move failed', 'error');
        }
    };

    const handleRemoveAddress = async (entryId, address) => {
        if (!window.confirm(`Remove address "${address}"?`)) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/firewall/addresses/${entryId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Address removed');
                fetchAddressEntries();
            } else {
                showNotification(result.error || 'Remove failed', 'error');
            }
        } catch (err) {
            showNotification('Remove failed', 'error');
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'accept': return 'text-success';
            case 'drop': return 'text-danger';
            case 'reject': return 'text-danger';
            case 'log': return 'text-warning';
            default: return 'text-info';
        }
    };

    const filteredAddresses = addressEntries.filter(entry =>
        (entry.address?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.comment?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const tabs = [
        { id: 'rules', label: 'Filter Rules', icon: Shield },
        { id: 'addresses', label: 'Address Lists', icon: List }
    ];

    return (
        <div className="security-container">
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

            {notification && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}

            {activeTab === 'rules' && (
                <>
                    {error && (
                        <div className="glass-card error-alert">
                            <AlertTriangle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="glass-card rules-card">
                        {loading ? (
                            <div className="loading-state">
                                <div className="loader"></div>
                                <p>Loading firewall rules...</p>
                            </div>
                        ) : rules.length === 0 ? (
                            <div className="empty-state">
                                <Shield size={48} className="text-secondary" />
                                <p>No firewall filter rules found.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="rules-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Chain</th>
                                            <th>Action</th>
                                            <th>Protocol</th>
                                            <th>Source</th>
                                            <th>Destination</th>
                                            <th>Port (Dst)</th>
                                            <th>Comment</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rules.map((rule, index) => {
                                            const isDisabled = rule.disabled === 'true' || rule.disabled === true;
                                            return (
                                                <tr key={rule['.id'] || index} className={isDisabled ? 'disabled-rule' : ''}>
                                                    <td className="text-secondary">{index + 1}</td>
                                                    <td>
                                                        <span className={`badge chain-${rule.chain || 'default'}`}>
                                                            {rule.chain}
                                                        </span>
                                                    </td>
                                                    <td className={`font-weight-bold ${getActionColor(rule.action)}`}>
                                                        {rule.action?.toUpperCase()}
                                                    </td>
                                                    <td>{rule.protocol || '-'}</td>
                                                    <td className="font-mono">{rule['src-address'] || 'any'}</td>
                                                    <td className="font-mono">{rule['dst-address'] || 'any'}</td>
                                                    <td className="font-mono">{rule['dst-port'] || '-'}</td>
                                                    <td className="text-muted italic">{rule.comment || '-'}</td>
                                                    <td>
                                                        <div
                                                            className={`toggle-switch ${rule.disabled === 'true' || rule.disabled === true ? 'off' : 'on'}`}
                                                            onClick={() => handleToggleRule(rule['.id'], !(rule.disabled === 'true' || rule.disabled === true))}
                                                        >
                                                            <div className="toggle-slider"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'addresses' && (
                <>
                    <div className="security-header">
                        <div className="list-selector">
                            <label>Select List:</label>
                            <div className="select-wrapper">
                                <select
                                    value={selectedList}
                                    onChange={(e) => setSelectedList(e.target.value)}
                                    disabled={addressLists.length === 0}
                                >
                                    {addressLists.map(list => (
                                        <option key={list} value={list}>{list}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="select-icon" />
                            </div>
                        </div>

                        <div className="search-container">
                            <div className="search-wrapper">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search IP or comment..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                                {searchTerm && (
                                    <button
                                        className="clear-search"
                                        onClick={() => setSearchTerm('')}
                                        title="Clear search"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            className="btn btn-primary refresh-btn"
                            onClick={fetchAddressEntries}
                            disabled={addressesLoading}
                        >
                            <RotateCw size={18} className={addressesLoading ? 'spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {addressesError && (
                        <div className="glass-card error-alert">
                            <AlertTriangle size={20} />
                            <span>{addressesError}</span>
                        </div>
                    )}

                    <div className="glass-card rules-card">
                        {addressesLoading ? (
                            <div className="loading-state">
                                <div className="loader"></div>
                                <p>Loading addresses...</p>
                            </div>
                        ) : addressEntries.length === 0 ? (
                            <div className="empty-state">
                                <List size={48} className="text-secondary" />
                                <p>No addresses in this list</p>
                                <p className="small">Add addresses to the "{selectedList}" list</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="rules-table">
                                    <thead>
                                        <tr>
                                            <th>Address</th>
                                            <th>Comment</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAddresses.map((entry) => (
                                            <tr key={entry.id}>
                                                <td className="font-mono">{entry.address}</td>
                                                <td className="text-muted">{entry.comment || '-'}</td>
                                                <td className="text-muted">{entry.created || '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                                                        <button
                                                            className="action-btn"
                                                            onClick={() => setShowMoveDropdown(showMoveDropdown === entry.id ? null : entry.id)}
                                                            title="Move to list"
                                                        >
                                                            <ArrowRight size={14} />
                                                        </button>
                                                        <button
                                                            className="action-btn"
                                                            onClick={() => handleRemoveAddress(entry.id, entry.address)}
                                                            title="Remove"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>

                                                        {showMoveDropdown === entry.id && (
                                                            <div className="move-dropdown">
                                                                <div className="dropdown-header">Move to list:</div>
                                                                {addressLists
                                                                    .filter(l => l !== selectedList)
                                                                    .map(list => (
                                                                        <button
                                                                            key={list}
                                                                            className="dropdown-item"
                                                                            onClick={() => handleMoveAddress(entry.id, list)}
                                                                        >
                                                                            {list}
                                                                        </button>
                                                                    ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Security;
