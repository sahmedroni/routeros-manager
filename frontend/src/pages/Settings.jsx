import React, { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { useSharedSocket } from '../context/SocketContext';
import { Server, Tag, Globe, User, RefreshCw, Activity, Database, Clock, Wifi } from 'lucide-react';
import './Settings.css';

const INTERVAL_OPTIONS = [
    { value: 500, label: '500 ms' },
    { value: 1000, label: '1 second' },
    { value: 2000, label: '2 seconds' },
    { value: 3000, label: '3 seconds' },
    { value: 5000, label: '5 seconds' },
    { value: 10000, label: '10 seconds' }
];

const TABS = [
    { id: 'router', label: 'Router Information', icon: Server },
    { id: 'refresh', label: 'Refresh Intervals', icon: RefreshCw }
];

const Settings = () => {
    const { realtimeStats } = useSocket();
    const { user, preferences, updatePreferences, resetPreferences } = useAuth();
    const { updateIntervals } = useSharedSocket();
    const [activeTab, setActiveTab] = useState('router');

    const formatUptime = (uptime) => {
        if (!uptime || uptime === 'N/A') return 'N/A';
        return uptime;
    };

    const handleIntervalChange = (key, value) => {
        const newValue = parseInt(value);
        const updatedPrefs = { [key]: newValue };
        updatePreferences(updatedPrefs);
        updateIntervals(updatedPrefs);
    };

    const handleReset = () => {
        resetPreferences();
        updateIntervals({
            realtimeInterval: 1000,
            dhcpInterval: 5000,
            pingInterval: 2000,
            logInterval: 5000,
            interfaceInterval: 5000,
            nodeMonitorInterval: 3000
        });
    };

    const getIntervalLabel = (ms) => {
        const option = INTERVAL_OPTIONS.find(o => o.value === ms);
        return option ? option.label : `${ms}ms`;
    };

    const renderRouterInfo = () => (
        <div className="glass-card router-info-card">
            <div className="card-header">
                <Server size={20} color="var(--accent-cyan)" />
                <h3>Router Information</h3>
            </div>

            <div className="info-list">
                <div className="info-item">
                    <div className="info-label">
                        <Tag size={14} />
                        <span>Identity</span>
                    </div>
                    <div className="info-value">{realtimeStats?.identity || 'N/A'}</div>
                </div>

                <div className="info-item">
                    <div className="info-label">
                        <Globe size={14} />
                        <span>Host</span>
                    </div>
                    <div className="info-value font-mono">{user?.host || 'N/A'}</div>
                </div>

                <div className="info-item">
                    <div className="info-label">
                        <User size={14} />
                        <span>Username</span>
                    </div>
                    <div className="info-value">{user?.user || 'N/A'}</div>
                </div>

                <div className="info-item">
                    <div className="info-label">
                        <Tag size={14} />
                        <span>API Port</span>
                    </div>
                    <div className="info-value font-mono">{user?.port || 'N/A'}</div>
                </div>

                <div className="info-item">
                    <div className="info-label">
                        <Server size={14} />
                        <span>Model</span>
                    </div>
                    <div className="info-value">{realtimeStats?.model || 'Unknown'}</div>
                </div>

                <div className="info-item">
                    <div className="info-label">
                        <Tag size={14} />
                        <span>RouterOS Version</span>
                    </div>
                    <div className="info-value">{realtimeStats?.version || 'Unknown'}</div>
                </div>

                <div className="info-item">
                    <div className="info-label">
                        <Clock size={14} />
                        <span>Uptime</span>
                    </div>
                    <div className="info-value">{formatUptime(realtimeStats?.uptime)}</div>
                </div>
            </div>
        </div>
    );

    const renderRefreshIntervals = () => (
        <div className="glass-card refresh-settings-card">
            <div className="card-header">
                <RefreshCw size={20} color="var(--accent-cyan)" />
                <h3>Refresh Intervals</h3>
            </div>
            <p className="card-description">
                Configure how often each data type is updated. Lower values provide more real-time data but use more resources.
            </p>

            <div className="interval-settings">
                <div className="interval-item">
                    <div className="interval-info">
                        <div className="interval-icon realtime">
                            <Activity size={18} />
                        </div>
                        <div className="interval-details">
                            <span className="interval-label">CPU, RAM & Bandwidth</span>
                            <span className="interval-current">{getIntervalLabel(preferences.realtimeInterval)}</span>
                        </div>
                    </div>
                    <select
                        className="interval-select"
                        value={preferences.realtimeInterval}
                        onChange={(e) => handleIntervalChange('realtimeInterval', e.target.value)}
                    >
                        {INTERVAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="interval-item">
                    <div className="interval-info">
                        <div className="interval-icon ping">
                            <Wifi size={18} />
                        </div>
                        <div className="interval-details">
                            <span className="interval-label">Router Ping</span>
                            <span className="interval-current">{getIntervalLabel(preferences.pingInterval)}</span>
                        </div>
                    </div>
                    <select
                        className="interval-select"
                        value={preferences.pingInterval}
                        onChange={(e) => handleIntervalChange('pingInterval', e.target.value)}
                    >
                        {INTERVAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="interval-item">
                    <div className="interval-info">
                        <div className="interval-icon dhcp">
                            <Database size={18} />
                        </div>
                        <div className="interval-details">
                            <span className="interval-label">DHCP Leases</span>
                            <span className="interval-current">{getIntervalLabel(preferences.dhcpInterval)}</span>
                        </div>
                    </div>
                    <select
                        className="interval-select"
                        value={preferences.dhcpInterval}
                        onChange={(e) => handleIntervalChange('dhcpInterval', e.target.value)}
                    >
                        {INTERVAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="interval-item">
                    <div className="interval-info">
                        <div className="interval-icon logs">
                            <Clock size={18} />
                        </div>
                        <div className="interval-details">
                            <span className="interval-label">System Logs</span>
                            <span className="interval-current">{getIntervalLabel(preferences.logInterval)}</span>
                        </div>
                    </div>
                    <select
                        className="interval-select"
                        value={preferences.logInterval}
                        onChange={(e) => handleIntervalChange('logInterval', e.target.value)}
                    >
                        {INTERVAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="interval-item">
                    <div className="interval-info">
                        <div className="interval-icon interfaces">
                            <Server size={18} />
                        </div>
                        <div className="interval-details">
                            <span className="interval-label">Interface Status</span>
                            <span className="interval-current">{getIntervalLabel(preferences.interfaceInterval)}</span>
                        </div>
                    </div>
                    <select
                        className="interval-select"
                        value={preferences.interfaceInterval}
                        onChange={(e) => handleIntervalChange('interfaceInterval', e.target.value)}
                    >
                        {INTERVAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="interval-item">
                    <div className="interval-info">
                        <div className="interval-icon nodes">
                            <RefreshCw size={18} />
                        </div>
                        <div className="interval-details">
                            <span className="interval-label">Custom Nodes</span>
                            <span className="interval-current">{getIntervalLabel(preferences.nodeMonitorInterval)}</span>
                        </div>
                    </div>
                    <select
                        className="interval-select"
                        value={preferences.nodeMonitorInterval}
                        onChange={(e) => handleIntervalChange('nodeMonitorInterval', e.target.value)}
                    >
                        {INTERVAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="interval-actions">
                <button className="btn btn-secondary" onClick={handleReset}>
                    Reset to Defaults
                </button>
            </div>
        </div>
    );

    return (
        <div className="settings-container">
            <div className="settings-header">
                <div>
                    <h1 className="display-font">Settings</h1>
                    <p className="subtitle">Configure your monitoring preferences</p>
                </div>
            </div>

            <div className="settings-tabs">
                {TABS.map(tab => (
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

            <div className="settings-content">
                {activeTab === 'router' && renderRouterInfo()}
                {activeTab === 'refresh' && renderRefreshIntervals()}
            </div>
        </div>
    );
};

export default Settings;
