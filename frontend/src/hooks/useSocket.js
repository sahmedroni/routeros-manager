import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const MAX_DATA_POINTS = 15;

/**
 * Custom hook to manage real-time data from WebSocket
 */
export function useSocket() {
    const { user, socket } = useAuth();
    const [realtimeStats, setRealtimeStats] = useState(null);
    const [interfaceStatus, setInterfaceStatus] = useState([]);
    const [dhcpLeases, setDhcpLeases] = useState([]);
    const [pingLatency, setPingLatency] = useState(null);
    const [systemLogs, setSystemLogs] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [latencyHistory, setLatencyHistory] = useState({});

    useEffect(() => {
        if (!socket || !user) {
            setIsConnected(false);
            setRealtimeStats(null);
            setInterfaceStatus([]);
            setDhcpLeases([]);
            setPingLatency(null);
            setSystemLogs([]);
            setNodes([]);
            return;
        }

        setIsConnected(true);

        socket.on('realtime-stats', (data) => {
            setRealtimeStats(data);
        });

        socket.on('interface-status', (data) => {
            setInterfaceStatus(data);
        });

        socket.on('dhcp-leases', (data) => {
            setDhcpLeases(data);
        });

        socket.on('ping-latency', (data) => {
            setPingLatency(data);
        });

        socket.on('system-logs', (data) => {
            setSystemLogs(data);
        });

        socket.on('node-stats', (data) => {
            setNodes(data);
        });

        socket.on('error', (errorMsg) => {
            console.error('Server error:', errorMsg);
            setError(errorMsg);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('connect', () => {
            setIsConnected(true);
        });

        return () => {
            socket.off('realtime-stats');
            socket.off('interface-status');
            socket.off('dhcp-leases');
            socket.off('ping-latency');
            socket.off('system-logs');
            socket.off('node-stats');
            socket.off('error');
            socket.off('disconnect');
            socket.off('connect');
        };
    }, [socket, user]);

    useEffect(() => {
        if (!nodes || nodes.length === 0) {
            return;
        }

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
                        ...updated[node.id].slice(-MAX_DATA_POINTS),
                        { time: timeStr, latency: node.latency }
                    ];
                }
            });
            return updated;
        });
    }, [nodes]);

    const changeInterface = useCallback((interfaceName) => {
        if (socket) {
            socket.emit('change-bandwidth-interface', interfaceName);
        }
    }, [socket]);

    const addNode = useCallback((ip, name) => {
        if (socket) {
            socket.emit('add-node', { ip, name });
        }
    }, [socket]);

    const removeNode = useCallback((ip) => {
        if (socket) {
            socket.emit('remove-node', ip);
        }
    }, [socket]);

    return {
        realtimeStats,
        interfaceStatus,
        dhcpLeases,
        pingLatency,
        systemLogs,
        isConnected,
        latencyHistory,
        changeInterface,
        nodes,
        addNode,
        removeNode,
        error
    };
}
