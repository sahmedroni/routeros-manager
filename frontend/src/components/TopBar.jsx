import { User, Wifi, Cpu, Layers, LogOut, ChevronDown, Thermometer, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { calculateMemoryUsage } from '../utils/utils';
import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';
import './TopBar.css';

const TopBar = () => {
  const { pingLatency, realtimeStats, isConnected } = useSocket();
  const { logout, user, isReconnecting } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
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
  const userName = realtimeStats?.user || user?.user || 'Admin';

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
            {connectionStatus === 'connected' ? `${user?.host} : ${latencyText}` : 
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
                <p className="menu-subtitle">{user?.host}</p>
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
