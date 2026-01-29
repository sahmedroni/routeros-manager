import React from 'react';
import { LayoutDashboard, Activity, Database, Shield, Server, Settings } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import './Sidebar.css';

const Sidebar = ({ currentPage, onPageChange }) => {
  const { realtimeStats, isConnected } = useSocket();

  const identity = realtimeStats?.identity || (isConnected ? 'MikroTik' : 'Connecting...');

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Overview', id: 'dashboard' },
    { icon: <Activity size={20} />, label: 'Traffic', id: 'traffic' },
    { icon: <Database size={20} />, label: 'Nodes', id: 'nodes' },
    { icon: <Shield size={20} />, label: 'Security', id: 'security' },
    { icon: <Server size={20} />, label: 'Devices', id: 'devices' },
    { icon: <Settings size={20} />, label: 'Settings', id: 'settings' },
  ];

  return (
    <aside className="sidebar glass scanline">
      <div className="sidebar-logo">
        <Activity className="logo-icon pulse-cyan" size={32} color="var(--accent-cyan)" />
        <span className="logo-text">NET<span className="accent">VOX</span></span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, index) => (
          <div
            key={index}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onPageChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {currentPage === item.id && <div className="active-glow" />}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer glass">
        <div className="status-indicator">
          <div className={`status-dot ${isConnected ? 'online' : ''}`} />
          <span className="router-identity">{identity}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
