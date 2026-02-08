import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { Server, Tag, Globe, User, Power, AlertCircle, CheckCircle, RefreshCw, Download, Package } from 'lucide-react';
import './Settings.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const Settings = () => {
    const { realtimeStats } = useSocket();
    const { user } = useAuth();
    const [notification, setNotification] = useState(null);
    const [isRebooting, setIsRebooting] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [installingUpdates, setInstallingUpdates] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [verifyPassword, setVerifyPassword] = useState('');

    const formatUptime = (uptime) => {
        if (!uptime || uptime === 'N/A') return 'N/A';
        return uptime;
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const checkForUpdates = async () => {
        try {
            setCheckingUpdates(true);
            const response = await fetch(`${BACKEND_URL}/api/system/updates`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setUpdateInfo(data);
                if (data.hasUpdate) {
                    showNotification(`Update available: ${data.currentVersion} → ${data.latestVersion}`, 'success');
                } else {
                    showNotification('RouterOS is up to date', 'success');
                }
            } else {
                showNotification('Failed to check for updates', 'error');
            }
        } catch (err) {
            showNotification('Failed to check for updates', 'error');
        } finally {
            setCheckingUpdates(false);
        }
    };

    const installUpdates = async () => {
        if (!window.confirm('The router will reboot after installation. Continue?')) {
            return;
        }
        setShowPasswordModal(true);
    };

    const handleConfirmInstall = async () => {
        if (!verifyPassword) {
            showNotification('Password is required to install updates', 'error');
            return;
        }

        try {
            setInstallingUpdates(true);
            const response = await fetch(`${BACKEND_URL}/api/system/updates/install`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: verifyPassword }),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showNotification('Update installed. Router is rebooting...', 'success');
                setShowPasswordModal(false);
                setVerifyPassword('');
            } else {
                showNotification(result.error || 'Failed to install updates', 'error');
            }
        } catch (err) {
            showNotification('Failed to install updates', 'error');
        } finally {
            setInstallingUpdates(false);
        }
    };

    const handleReboot = async () => {
        if (!window.confirm('Are you sure you want to reboot the router? This will disconnect all active connections.')) {
            return;
        }

        try {
            setIsRebooting(true);
            const response = await fetch(`${BACKEND_URL}/api/system/reboot`, {
                method: 'POST',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Router is rebooting. You will be disconnected.', 'success');
            } else {
                showNotification(result.error || 'Reboot failed', 'error');
            }
        } catch (err) {
            showNotification('Failed to reboot router', 'error');
        } finally {
            setIsRebooting(false);
        }
    };

    return (
        <div className="settings-container">
            {notification && (
                <div className={`notification ${notification.type}`}>
                    {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {notification.message}
                </div>
            )}

            <div className="settings-header">
                <div>
                    <h1 className="display-font">Settings</h1>
                    <p className="subtitle">Configure and manage your router</p>
                </div>
                <button
                    className="login-btn reboot-btn"
                    onClick={handleReboot}
                    disabled={isRebooting}
                    style={{ height: '40px', padding: '0 20px' }}
                >
                    <Power size={18} className={isRebooting ? 'spin' : ''} />
                    {isRebooting ? 'Rebooting...' : 'Restart Router'}
                </button>
            </div>

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
                                <Globe size={14} />
                                <span>Uptime</span>
                            </div>
                            <div className="info-value">{formatUptime(realtimeStats?.uptime)}</div>
                        </div>
                    </div>
                </div>

                <div className="glass-card refresh-settings-card">
                    <div className="card-header">
                        <Package size={20} color="var(--accent-cyan)" />
                        <h3>Package Updates</h3>
                    </div>
                    <p className="card-description">
                        Check for RouterOS and package updates.
                    </p>

                    {updateInfo ? (
                        <div className="update-info">
                            <div className="version-comparison">
                                <div className="version-item">
                                    <span className="version-label">Current Version</span>
                                    <span className="version-value">{updateInfo.currentVersion}</span>
                                </div>
                                <div className="version-arrow">
                                    <RefreshCw size={16} />
                                </div>
                                <div className="version-item">
                                    <span className="version-label">Latest Version</span>
                                    <span className={`version-value ${updateInfo.hasUpdate ? 'update-available' : ''}`}>
                                        {updateInfo.latestVersion}
                                    </span>
                                </div>
                            </div>

                            <div className="version-item" style={{ marginTop: '12px' }}>
                                <span className="version-label">Channel</span>
                                <span className="version-value" style={{ textTransform: 'capitalize' }}>{updateInfo.channel}</span>
                            </div>

                            {updateInfo.hasUpdate && updateInfo.packages && updateInfo.packages.length > 0 && (
                                <div className="packages-list">
                                    <div className="packages-header">Packages to update:</div>
                                    {updateInfo.packages.filter(p => p.status === 'pending').map((pkg, idx) => (
                                        <div key={idx} className="package-item">
                                            <span className="package-name">{pkg.name}</span>
                                            <span className="package-version">{pkg.version} → {pkg.latestVersion}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="update-actions">
                                <button
                                    className="login-btn"
                                    onClick={checkForUpdates}
                                    disabled={checkingUpdates}
                                    style={{ height: '40px', padding: '0 20px' }}
                                >
                                    <RefreshCw size={16} className={checkingUpdates ? 'spin' : ''} />
                                    {checkingUpdates ? 'Checking...' : 'Check Again'}
                                </button>

                                {updateInfo.hasUpdate && (
                                    <button
                                        className="login-btn install-btn"
                                        onClick={installUpdates}
                                        disabled={installingUpdates}
                                        style={{ height: '40px', padding: '0 20px' }}
                                    >
                                        <Download size={16} />
                                        {installingUpdates ? 'Installing...' : 'Install Updates'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="update-initial">
                            <p className="text-muted">Click to check for available updates</p>
                            <button
                                className="login-btn"
                                onClick={checkForUpdates}
                                disabled={checkingUpdates}
                                style={{ height: '40px', padding: '0 20px', marginTop: '12px' }}
                            >
                                <RefreshCw size={16} className={checkingUpdates ? 'spin' : ''} />
                                {checkingUpdates ? 'Checking...' : 'Check for Updates'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showPasswordModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Verify Password</h3>
                        <p>Please enter your RouterOS password to confirm and install the update.</p>

                        <div className="password-input-group">
                            <input
                                type="password"
                                className="password-input"
                                placeholder="RouterOS Password"
                                value={verifyPassword}
                                onChange={(e) => setVerifyPassword(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !installingUpdates && verifyPassword) {
                                        handleConfirmInstall();
                                    }
                                }}
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                className="modal-btn cancel"
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setVerifyPassword('');
                                }}
                                disabled={installingUpdates}
                            >
                                Cancel
                            </button>
                            <button
                                className="modal-btn confirm"
                                onClick={handleConfirmInstall}
                                disabled={installingUpdates || !verifyPassword}
                            >
                                {installingUpdates ? 'Installing...' : 'Confirm & Install'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
