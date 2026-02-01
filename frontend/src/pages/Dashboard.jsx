import React, { useEffect, useState } from 'react';
import { Activity, Server, Wifi } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import InterfaceStatus from '../components/InterfaceStatus';
import { useSocket } from '../hooks/useSocket';
import './Dashboard.css';

const MAX_LATENCY_POINTS = 20;

const Dashboard = () => {
  const { nodes, interfaceStatus, systemLogs } = useSocket();
  const [latencyHistory, setLatencyHistory] = useState({});

  useEffect(() => {
    if (nodes && nodes.length > 0) {
      setLatencyHistory(prev => {
        const updated = { ...prev };
        nodes.forEach(node => {
          if (!updated[node.id]) {
            updated[node.id] = [];
          }
          if (node.latency !== null) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            updated[node.id] = [
              ...updated[node.id],
              { time: timeStr, latency: node.latency }
            ];
            if (updated[node.id].length > MAX_LATENCY_POINTS) {
              updated[node.id] = updated[node.id].slice(-MAX_LATENCY_POINTS);
            }
          }
        });
        return updated;
      });
    }
  }, [nodes]);

  const getAlertType = (topics) => {
    if (!topics) return 'info';
    const t = topics.toLowerCase();
    if (t.includes('critical') || t.includes('error') || t.includes('danger')) return 'critical';
    if (t.includes('warning') || t.includes('alert')) return 'warning';
    return 'info';
  };

  const getLatencyColor = (latency) => {
    if (latency === null) return 'var(--text-muted)';
    if (latency < 50) return 'var(--accent-green)';
    if (latency < 100) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

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

                {node.status === 'online' && latencyHistory[node.id] && latencyHistory[node.id].length > 1 && (
                  <div className="latency-graph-container">
                    <ResponsiveContainer width="100%" height={20}>
                      <LineChart data={latencyHistory[node.id]}>
                        <Line
                          type="monotone"
                          dataKey="latency"
                          stroke={getLatencyColor(node.latency)}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
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
