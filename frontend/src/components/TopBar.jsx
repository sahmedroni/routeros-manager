import { User, Wifi, Cpu, Layers, LogOut, ChevronDown, Thermometer, Zap, RefreshCw, AlertCircle, Router, Trash2, Plus } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { calculateMemoryUsage } from '../utils/utils';
import { useAuth } from '../hooks/useAuth';
import React, { useState, useEffect, useRef } from 'react';
import './TopBar.css';

const TopBar = () => {
  const { pingLatency, realtimeStats, isConnected } = useSocket();
  const { logout, user, isReconnecting, savedRouters, activeRouter, switchRouter, deleteRouter, addRouter, triggerSocketReconnect, preferences } = useAuth();
  const [timeLeft, setTimeLeft] = useState(0);
  const lastUpdateRef = useRef(Date.now());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRouterMenu, setShowRouterMenu] = useState(false);
  const [showAddRouter, setShowAddRouter] = useState(false);
  const [newRouter, setNewRouter] = useState({ name: '', host: '', user: 'admin', password: '', port: '8728' });
  const [addingRouter, setAddingRouter] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');

  useEffect(() => {
    if (!isConnected && !isReconnecting) {
      setConnectionStatus('disconnected');
    } else if (isReconnecting) {
      setConnectionStatus('reconnecting');
    } else {
      setConnectionStatus('connected');
    }
  }, [isConnected, isReconnecting]);

  useEffect(() => {
    lastUpdateRef.current = Date.now();
  }, [realtimeStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;
      const remaining = Math.max(0, (preferences?.realtimeInterval || 2000) - elapsed);
      setTimeLeft(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [preferences?.realtimeInterval]);

  const getLatencyColor = (latency) => {
    if (!latency) return 'var(--text-muted)';
    if (latency < 50) return 'var(--accent-green)';
    if (latency < 100) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  const getMetricColor = (value) => {
    if (value === '--' || value === null) return 'var(--text-muted)';
    const val = parseInt(value);
    if (val < 50) return 'var(--accent-green)';
    if (val < 85) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  const getTemperatureColor = (temp) => {
    if (temp === '--' || temp === null) return 'var(--text-muted)';
    const val = parseFloat(temp);
    if (val < 60) return 'var(--accent-green)';
    if (val < 75) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  const getVoltageColor = (voltage) => {
    if (voltage === '--' || voltage === null) return 'var(--text-muted)';
    const val = parseFloat(voltage);
    if (val >= 11 && val <= 26) return 'var(--accent-green)';
    if (val >= 10 && val <= 28) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  const latencyValue = pingLatency?.primary ?? null;
  const latencyText = latencyValue !== null ? `${latencyValue}ms` : 'Checking...';

  const cpuUsage = realtimeStats?.cpuUsage ?? '--';
  const ramUsage = calculateMemoryUsage(realtimeStats?.totalMemory, realtimeStats?.freeMemory) || '--';
  const temperature = realtimeStats?.health?.temperature ?? '--';
  const voltage = realtimeStats?.health?.voltage ?? '--';
  const userName = user?.username || 'Admin';

  const handleRefresh = () => {
    window.location.reload();
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'var(--accent-green)';
      case 'reconnecting': return 'var(--accent-orange)';
      case 'disconnected': return 'var(--accent-red)';
      default: return 'var(--text-muted)';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi size={16} />;
      case 'reconnecting': return <RefreshCw size={16} className="spin" />;
      case 'disconnected': return <AlertCircle size={16} />;
      default: return <Wifi size={16} />;
    }
  };

  return (
    <header className="topbar glass">
      <div className="topbar-logo-area">
        <h2 className="topbar-title">Dashboard</h2>
      </div>

      <div className="topbar-actions">
        <div className="topbar-timer-v2" title={`Next update in ${(timeLeft / 1000).toFixed(1)}s`}>
          <div className="progress-circle-container">
            <svg className="progress-circle" viewBox="0 0 36 36">
              <circle
                className="progress-circle-bg"
                cx="18"
                cy="18"
                r="16"
                fill="none"
                strokeWidth="2"
              />
              <circle
                className="progress-circle-bar"
                cx="18"
                cy="18"
                r="16"
                fill="none"
                strokeWidth="2"
                strokeDasharray="100, 100"
                strokeDashoffset={100 - (timeLeft / (preferences?.realtimeInterval || 2000)) * 100}
                strokeLinecap="round"
              />
            </svg>
            <RefreshCw size={12} className={`timer-icon ${timeLeft < 200 ? 'spin' : ''}`} />
          </div>
        </div>

        <div className="system-metrics">
          <div className="metric-item">
            <Cpu size={14} color={getMetricColor(cpuUsage)} />
            <span className="metric-label">CPU:</span>
            <span className="metric-value" style={{ color: getMetricColor(cpuUsage) }}>
              {cpuUsage}%
            </span>
          </div>
          <div className="metric-item">
            <Layers size={14} color={getMetricColor(ramUsage)} />
            <span className="metric-label">RAM:</span>
            <span className="metric-value" style={{ color: getMetricColor(ramUsage) }}>
              {ramUsage}%
            </span>
          </div>
          <div className="metric-item">
            <Thermometer size={14} color={getTemperatureColor(temperature)} />
            <span className="metric-label">TEMP:</span>
            <span className="metric-value" style={{ color: getTemperatureColor(temperature) }}>
              {temperature !== '--' ? `${temperature}°C` : '--'}
            </span>
          </div>
          <div className="metric-item">
            <Zap size={14} color={getVoltageColor(voltage)} />
            <span className="metric-label">VOLT:</span>
            <span className="metric-value" style={{ color: getVoltageColor(voltage) }}>
              {voltage !== '--' ? `${voltage}V` : '--'}
            </span>
          </div>
        </div>

        {user && (
          <div className="router-selector-container">
            <div
              className={`router-selector ${showRouterMenu ? 'active' : ''}`}
              onClick={() => setShowRouterMenu(!showRouterMenu)}
            >
              <Router size={16} />
              <span className="router-name">
                {activeRouter?.name || activeRouter?.host || 'Select Router'}
              </span>
              <ChevronDown size={14} className={`menu-arrow ${showRouterMenu ? 'rotate' : ''}`} />
            </div>
            {showRouterMenu && (
              <div className="router-menu glass animate-slide-in">
                {!showAddRouter ? (
                  <>
                    <div className="router-menu-header">
                      <p className="router-menu-title">Routers</p>
                    </div>
                    <div className="router-menu-divider" />
                    <div
                      className="router-menu-item add-router-btn"
                      onClick={() => setShowAddRouter(true)}
                    >
                      <div className="router-item-info">
                        <Plus size={14} />
                        <div className="router-item-details">
                          <span className="router-item-name">Add New Router</span>
                        </div>
                      </div>
                    </div>
                    {savedRouters.map(router => {
                      const isActive = router.id === activeRouter?.id;
                      return (
                        <div key={router.id} className={`router-menu-item ${isActive ? 'active' : ''}`}>
                          <div
                            className="router-item-info"
                            onClick={() => {
                              if (!isActive) {
                                switchRouter(router);
                              }
                              setShowRouterMenu(false);
                            }}
                            style={{ cursor: isActive ? 'default' : 'pointer' }}
                          >
                            <Router size={14} />
                            <div className="router-item-details">
                              <span className="router-item-name">{router.name}</span>
                              <span className="router-item-host">{router.host}</span>
                            </div>
                            {isActive && <span className="active-indicator">Connected</span>}
                          </div>
                          {!isActive && (
                            <button
                              className="router-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete router "${router.name}"?`)) {
                                  deleteRouter(router.id);
                                }
                              }}
                              title="Delete router"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="add-router-form">
                    <div className="router-menu-header">
                      <p className="router-menu-title">Add Router</p>
                    </div>
                    <div className="router-menu-divider" />
                    <div className="add-router-fields">
                      <input
                        type="text"
                        placeholder="Name (e.g., Home)"
                        value={newRouter.name}
                        onChange={(e) => setNewRouter({ ...newRouter, name: e.target.value })}
                        className="add-router-input"
                      />
                      <input
                        type="text"
                        placeholder="Host IP"
                        value={newRouter.host}
                        onChange={(e) => setNewRouter({ ...newRouter, host: e.target.value })}
                        className="add-router-input"
                      />
                      <input
                        type="text"
                        placeholder="Username"
                        value={newRouter.user}
                        onChange={(e) => setNewRouter({ ...newRouter, user: e.target.value })}
                        className="add-router-input"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={newRouter.password}
                        onChange={(e) => setNewRouter({ ...newRouter, password: e.target.value })}
                        className="add-router-input"
                      />
                      <input
                        type="text"
                        placeholder="Port"
                        value={newRouter.port}
                        onChange={(e) => setNewRouter({ ...newRouter, port: e.target.value })}
                        className="add-router-input"
                      />
                    </div>
                    <div className="add-router-actions">
                      <button
                        className="add-router-cancel"
                        onClick={() => {
                          setShowAddRouter(false);
                          setNewRouter({ name: '', host: '', user: 'admin', password: '', port: '8728' });
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="add-router-submit"
                        onClick={async () => {
                          if (!newRouter.host || !newRouter.user || !newRouter.password) return;
                          setAddingRouter(true);
                          try {
                            await addRouter({
                              name: newRouter.name || newRouter.host,
                              host: newRouter.host,
                              user: newRouter.user,
                              password: newRouter.password,
                              port: parseInt(newRouter.port) || 8728
                            });
                            setShowAddRouter(false);
                            setNewRouter({ name: '', host: '', user: 'admin', password: '', port: '8728' });
                          } catch (err) {
                            alert(err.message || 'Failed to add router');
                          } finally {
                            setAddingRouter(false);
                          }
                        }}
                        disabled={addingRouter || !newRouter.host || !newRouter.user || !newRouter.password}
                      >
                        {addingRouter ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div
          className="connection-status"
          style={{ cursor: connectionStatus === 'disconnected' ? 'pointer' : 'default' }}
          onClick={connectionStatus === 'disconnected' ? handleRefresh : undefined}
          title={connectionStatus === 'disconnected' ? 'Click to refresh' : ''}
        >
          <div className="connection-icon" style={{ color: getConnectionStatusColor() }}>
            {getConnectionStatusIcon()}
          </div>
          <span className="connection-text" style={{ color: getConnectionStatusColor() }}>
            {connectionStatus === 'connected' ? `${activeRouter?.host || 'No router selected'} : ${latencyText}` :
              connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected (click to refresh)'}
          </span>
        </div>

        <div className="user-profile-container">
          <div
            className={`user-profile ${showUserMenu ? 'active' : ''}`}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-info">
              <span className="user-name text-primary">{userName}</span>
              <span className="user-role text-secondary">Network Architect</span>
            </div>
            <div className="user-avatar glass">
              <User size={20} />
            </div>
            <ChevronDown size={14} className={`menu-arrow ${showUserMenu ? 'rotate' : ''}`} />
          </div>

          {showUserMenu && (
            <div className="user-menu glass animate-slide-in">
              <div className="menu-header">
                <p className="menu-title">Account Settings</p>
                <p className="menu-subtitle">{activeRouter?.host || 'No router selected'}</p>
              </div>
              <div className="menu-divider" />
              <button className="menu-item logout" onClick={logout}>
                <LogOut size={16} />
                <span>Disconnect & Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header >
  );
};

export default TopBar;
