import React, { useState } from 'react';
import { LayoutDashboard, Activity, Database, Shield, Server, Settings, ChevronLeft, ChevronRight, Menu, X, User, LogOut } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import './Sidebar.css';

const Sidebar = ({ currentPage, onPageChange, isCollapsed, onToggleCollapse }) => {
  const { realtimeStats, isConnected } = useSocket();
  const { logout, user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const identity = realtimeStats?.identity || (isConnected ? 'MikroTik' : 'Connecting...');
  const userName = realtimeStats?.user || user?.user || 'Admin';

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Overview', id: 'dashboard' },
    { icon: <Activity size={20} />, label: 'Traffic', id: 'traffic' },
    { icon: <Database size={20} />, label: 'Nodes', id: 'nodes' },
    { icon: <Shield size={20} />, label: 'Security', id: 'security' },
    { icon: <Server size={20} />, label: 'Devices', id: 'devices' },
    { icon: <Settings size={20} />, label: 'Settings', id: 'settings' },
  ];

  const handleNavClick = (pageId) => {
    onPageChange(pageId);
    setIsMobileOpen(false);
  };

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(true)} aria-label="Open menu">
        <Menu size={24} />
      </button>

      <aside className={`sidebar glass scanline ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Activity className="logo-icon pulse-cyan" size={28} color="var(--accent-cyan)" />
            {!isCollapsed && !isMobileOpen && <span className="logo-text">NET<span className="accent">VOX</span></span>}
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileOpen(false)} aria-label="Close menu">
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, index) => (
            <div
              key={index}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed && !isMobileOpen ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && !isMobileOpen && <span className="nav-label">{item.label}</span>}
              {currentPage === item.id && !isCollapsed && !isMobileOpen && <div className="active-glow" />}
            </div>
          ))}
        </nav>

        {!isMobileOpen && (
          <div className="sidebar-collapse-btn" onClick={onToggleCollapse}>
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </div>
        )}

        <div className="sidebar-footer glass">
          {isCollapsed && !isMobileOpen ? (
            <div className={`router-status-dot ${isConnected ? 'online' : 'offline'}`} />
          ) : (
            <span className={`router-identity ${isConnected ? 'online' : 'offline'}`}>{identity}</span>
          )}
        </div>

        {isMobileOpen && (
          <div className="sidebar-user-section">
            <div
              className={`sidebar-user-profile ${showUserMenu ? 'active' : ''}`}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar glass">
                <User size={20} />
              </div>
              <div className="user-info">
                <span className="user-name">{userName}</span>
                <span className="user-role">Network Architect</span>
              </div>
            </div>

            {showUserMenu && (
              <div className="sidebar-user-menu glass">
                <button className="menu-item logout" onClick={logout}>
                  <LogOut size={16} />
                  <span>Disconnect & Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {isMobileOpen && <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />}
    </>
  );
};

export default Sidebar;
