import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, RotateCw, List, ArrowRight, Trash2, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
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

    const handleToggleAddress = async (id, currentStatus) => {
        const newStatus = !currentStatus;
        // Optimistic update
        setAddressEntries(addressEntries.map(e => e.id === id ? { ...e, disabled: (!newStatus).toString() } : e));

        try {
            const response = await fetch(`${BACKEND_URL}/api/firewall/addresses/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id, enabled: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to toggle address');
            }
            fetchAddressEntries();
        } catch (err) {
            console.error('Error toggling address:', err);
            showNotification('Failed to update address status', 'error');
            // Revert optimistic update
            setAddressEntries(addressEntries.map(e => e.id === id ? { ...e, disabled: currentStatus.toString() } : e));
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

    const compareIPs = (a, b) => {
        // Helper to check if string is a valid IPv4 or CIDR
        const isIP = (ip) => /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/[0-9]{1,2})?$/.test(ip);

        const addrA = a.address || '';
        const addrB = b.address || '';

        if (isIP(addrA) && isIP(addrB)) {
            const parseIP = (ip) => ip.split('/')[0].split('.').map(octet => parseInt(octet, 10));
            const partsA = parseIP(addrA);
            const partsB = parseIP(addrB);

            for (let i = 0; i < 4; i++) {
                const valA = partsA[i] || 0;
                const valB = partsB[i] || 0;
                if (valA !== valB) return valA - valB;
            }
            // If IPs are same, compare masks
            const maskA = parseInt(addrA.split('/')[1] || '32', 10);
            const maskB = parseInt(addrB.split('/')[1] || '32', 10);
            return maskA - maskB;
        }

        // Fallback to alphabetical for hostnames or mixed types
        return addrA.localeCompare(addrB);
    };

    const filteredAddresses = addressEntries
        .filter(entry =>
            (entry.address?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (entry.comment?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort(compareIPs);

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
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAddresses.map((entry) => {
                                            const isDisabled = entry.disabled === 'true' || entry.disabled === true;
                                            return (
                                                <tr key={entry.id} className={isDisabled ? 'disabled-rule' : ''}>
                                                    <td className="font-mono">{entry.address}</td>
                                                    <td className="text-muted">{entry.comment || '-'}</td>
                                                    <td className="text-muted">{entry.created || '-'}</td>
                                                    <td>
                                                        <div
                                                            className={`toggle-switch ${isDisabled ? 'off' : 'on'}`}
                                                            onClick={() => handleToggleAddress(entry.id, !isDisabled)}
                                                        >
                                                            <div className="toggle-slider"></div>
                                                        </div>
                                                    </td>
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
                                            );
                                        })}
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
