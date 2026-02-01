import React from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { Server, Tag, Globe, User } from 'lucide-react';
import './Settings.css';

const Settings = () => {
    const { realtimeStats } = useSocket();
    const { user } = useAuth();

    const formatUptime = (uptime) => {
        if (!uptime || uptime === 'N/A') return 'N/A';
        return uptime;
    };

    return (
        <div className="settings-container">
            <h1 className="display-font">Router Settings</h1>
            <p className="subtitle">Connected router information and system details</p>

            <div className="settings-grid">
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
                                <Tag size={14} />
                                <span>Uptime</span>
                            </div>
                            <div className="info-value">{formatUptime(realtimeStats?.uptime)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
