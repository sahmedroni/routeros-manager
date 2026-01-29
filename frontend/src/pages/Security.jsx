import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, RotateCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Security.css';

const Security = () => {
    const { user } = useAuth();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/firewall/rules`, {
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

    useEffect(() => {
        fetchRules();
    }, []);

    const handleToggleRule = async (id, currentStatus) => {
        // Optimistic update
        const newStatus = !currentStatus;
        setRules(rules.map(r => r['.id'] === id ? { ...r, disabled: (!newStatus).toString() } : r));

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/firewall/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id, enabled: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to toggle rule');
            }
            // Ideally, we fetch fresh rules to be sure
            fetchRules();
        } catch (err) {
            console.error('Error toggling rule:', err);
            setError('Failed to update rule status');
            // Revert on error
            setRules(rules.map(r => r['.id'] === id ? { ...r, disabled: currentStatus.toString() } : r));
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

    return (
        <div className="security-container">
            <div className="security-header">

                <button
                    className="btn btn-primary refresh-btn"
                    onClick={fetchRules}
                    disabled={loading}
                >
                    <RotateCw size={18} className={loading ? 'spin' : ''} />
                    Refresh Rules
                </button>
            </div>

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
        </div>
    );
};

export default Security;
