import React from 'react';
import { Activity, Server, Wifi } from 'lucide-react';
import InterfaceStatus from '../components/InterfaceStatus';
import { useSocket } from '../hooks/useSocket';
import './Dashboard.css';

const Dashboard = () => {
  const { nodes, interfaceStatus, systemLogs } = useSocket();

  // Helper to determine alert style based on log topics
  const getAlertType = (topics) => {
    if (!topics) return 'info';
    const t = topics.toLowerCase();
    if (t.includes('critical') || t.includes('error') || t.includes('danger')) return 'critical';
    if (t.includes('warning') || t.includes('alert')) return 'warning';
    return 'info';
  };

  // Helper to get latency color
  const getLatencyColor = (latency) => {
    if (latency === null) return 'var(--text-muted)';
    if (latency < 50) return 'var(--accent-green)';
    if (latency < 100) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  // Format bandwidth data
  return (
    <div className="dashboard-container">


      <div className="nodes-dashboard-grid">
        {(!nodes || nodes.length === 0) ? (
          <div className="glass-card empty-state">
            <Server size={48} color="var(--text-muted)" />
            <p>No network nodes configured</p>
            <p className="small">Navigate to the Nodes page to add monitoring endpoints</p>
          </div>
        ) : (
          nodes.map((node) => (
            <div key={node.id} className={`glass-card node-dashboard-card ${node.status}`}>
              <div className="node-card-header">
                <div className="node-title-section">
                  <span className={`status-indicator ${node.status}`}></span>
                  <h3 className="node-name">{node.name}</h3>
                </div>
                <div className={`status-badge ${node.status}`}>
                  {node.status.toUpperCase()}
                </div>
              </div>

              <div className="node-card-body">
                <div className="node-info-row">
                  <span className="info-label">IP Address</span>
                  <span className="info-value font-mono">{node.ip}</span>
                </div>

                <div className="node-info-row">
                  <span className="info-label">Latency</span>
                  <span
                    className="info-value latency-value"
                    style={{ color: getLatencyColor(node.latency) }}
                  >
                    {node.latency !== null ? `${node.latency} ms` : 'N/A'}
                  </span>
                </div>

                {node.status === 'online' && node.latency !== null && (
                  <div className="latency-bar-container">
                    <div
                      className="latency-bar"
                      style={{
                        width: `${Math.min(100, (node.latency / 200) * 100)}%`,
                        backgroundColor: getLatencyColor(node.latency)
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="node-card-footer">
                <Wifi size={14} color={node.status === 'online' ? 'var(--accent-green)' : 'var(--accent-red)'} />
                <span className="footer-text">
                  {node.status === 'online' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="dashboard-grid">
        <div className="glass-card alerts-container">
          <div className="card-header">
            <h3>System Alerts</h3>
            <span className="view-all">View All</span>
          </div>
          <div className="alerts-list">
            {systemLogs && systemLogs.length > 0 ? (
              systemLogs.map((log) => (
                <div key={log.id} className={`alert-item ${getAlertType(log.topics)}`}>
                  <div className="alert-dot" />
                  <div className="alert-info">
                    <span className="alert-msg">{log.message}</span>
                    <span className="alert-time">{log.time} • {log.topics}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="alert-item info">
                <div className="alert-dot" />
                <div className="alert-info">
                  <span className="alert-msg">No recent system alerts</span>
                  <span className="alert-time">Everything is running smoothly</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card traffic-mini-container">
          <div className="card-header">
            <div className="header-left">
              <Activity size={20} color="var(--accent-cyan)" />
              <h3>Link Status</h3>
            </div>
          </div>
          <InterfaceStatus interfaces={interfaceStatus} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
