import React, { useState, useEffect, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { Activity, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import './Traffic.css';

const MAX_DATA_POINTS = 30;

const Traffic = () => {
    const { realtimeStats, changeInterface, isConnected } = useSocket();
    const { getAuthHeaders } = useAuth();

    const [interfaces, setInterfaces] = useState([]);
    const [selectedInterface, setSelectedInterface] = useState('ether1');
    const [trafficHistory, setTrafficHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch available interfaces
    useEffect(() => {
        const fetchInterfaces = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL.replace('/socket.io', '')}/api/interfaces`, {
                    credentials: 'include'
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setInterfaces(data);
                    // Default to bridge or ether1 if available
                    const defaultInterface = data.find(i => i.name === 'bridge') || data[0];
                    if (defaultInterface) {
                        setSelectedInterface(defaultInterface.name);
                        changeInterface(defaultInterface.name);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch interfaces:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInterfaces();
    }, []);

    // Update history when new data arrives
    useEffect(() => {
        if (realtimeStats?.bandwidth) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const newDataPoint = {
                time: timeStr,
                rx: Math.round(realtimeStats.bandwidth.rx / 1024 / 1024 * 100) / 100, // Mbps
                tx: Math.round(realtimeStats.bandwidth.tx / 1024 / 1024 * 100) / 100, // Mbps
            };

            setTrafficHistory(prev => {
                const updated = [...prev, newDataPoint];
                if (updated.length > MAX_DATA_POINTS) {
                    return updated.slice(updated.length - MAX_DATA_POINTS);
                }
                return updated;
            });
        }
    }, [realtimeStats]);

    const handleInterfaceChange = (e) => {
        const newInterface = e.target.value;
        setSelectedInterface(newInterface);
        setTrafficHistory([]); // Clear history when switching
        changeInterface(newInterface);
    };

    const formatMbps = (val) => `${val} Mbps`;

    const currentRx = realtimeStats?.bandwidth?.rx ? (realtimeStats.bandwidth.rx / 1024 / 1024).toFixed(2) : '0';
    const currentTx = realtimeStats?.bandwidth?.tx ? (realtimeStats.bandwidth.tx / 1024 / 1024).toFixed(2) : '0';

    return (
        <div className="traffic-page">
            <div className="traffic-header">
                <div className="header-title">
                    <Activity className="pulse-cyan" size={24} />
                    <h2>Live Traffic Monitor</h2>
                </div>

                <div className="header-controls">
                    <div className="interface-selector">
                        <label>Interface:</label>
                        <select value={selectedInterface} onChange={handleInterfaceChange} disabled={isLoading}>
                            {interfaces.map(int => (
                                <option key={int.name} value={int.name}>{int.name}</option>
                            ))}
                        </select>
                    </div>
                    <button className="refresh-btn" onClick={() => window.location.reload()}>
                        <RefreshCw size={16} />
                        Reset
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="traffic-stat-card glass-card rx">
                    <div className="stat-icon down">
                        <ArrowDown size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Incoming (RX)</label>
                        <div className="stat-value">{currentRx} <span className="unit">Mbps</span></div>
                    </div>
                    <div className="stat-line rx-line"></div>
                </div>

                <div className="traffic-stat-card glass-card tx">
                    <div className="stat-icon up">
                        <ArrowUp size={24} />
                    </div>
                    <div className="stat-info">
                        <label>Outgoing (TX)</label>
                        <div className="stat-value">{currentTx} <span className="unit">Mbps</span></div>
                    </div>
                    <div className="stat-line tx-line"></div>
                </div>
            </div>

            <div className="graph-container glass-card">
                <div className="graph-header">
                    <h3>Real-time Bandwidth Usage</h3>
                    <div className="graph-legend">
                        <span className="legend-item rx"><span className="dot"></span> Download</span>
                        <span className="legend-item tx"><span className="dot"></span> Upload</span>
                    </div>
                </div>

                <div className="graph-wrapper">
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={trafficHistory}>
                            <defs>
                                <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-magenta)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--accent-magenta)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="time"
                                stroke="var(--text-muted)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="var(--text-muted)"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}M`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(5, 5, 7, 0.9)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                                }}
                                itemStyle={{ fontSize: '12px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="rx"
                                stroke="var(--accent-cyan)"
                                fillOpacity={1}
                                fill="url(#colorRx)"
                                strokeWidth={2}
                                animationDuration={300}
                            />
                            <Area
                                type="monotone"
                                dataKey="tx"
                                stroke="var(--accent-magenta)"
                                fillOpacity={1}
                                fill="url(#colorTx)"
                                strokeWidth={2}
                                animationDuration={300}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Traffic;
