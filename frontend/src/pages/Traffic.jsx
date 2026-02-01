import React, { useState, useEffect } from 'react';
import { Activity, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import './Traffic.css';

const Traffic = () => {
    const { realtimeStats, changeInterface, isConnected } = useSocket();

    const [interfaces, setInterfaces] = useState([]);
    const [selectedInterface, setSelectedInterface] = useState('ether1');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInterfaces = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL.replace('/socket.io', '')}/api/interfaces`, {
                    credentials: 'include'
                });
                const data = await response.json();
                if (Array.isArray(data)) {
                    setInterfaces(data);
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

    const handleInterfaceChange = (e) => {
        const newInterface = e.target.value;
        setSelectedInterface(newInterface);
        changeInterface(newInterface);
    };

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
        </div>
    );
};

export default Traffic;
