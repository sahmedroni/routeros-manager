import { useState, useEffect, useCallback, useRef } from 'react';
import { useSharedSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const MAX_DATA_POINTS = 8;

export function useSocket() {
    const { user } = useAuth();
    const { socket, isConnected, on, off, emit } = useSharedSocket();
    const [realtimeStats, setRealtimeStats] = useState(null);
    const [interfaceStatus, setInterfaceStatus] = useState([]);
    const [dhcpLeases, setDhcpLeases] = useState([]);
    const [pingLatency, setPingLatency] = useState(null);
    const [systemLogs, setSystemLogs] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [latencyHistory, setLatencyHistory] = useState({});

    useEffect(() => {
        if (!socket || !isConnected || !user) return;

        const handleRealtimeStats = (data) => setRealtimeStats(data);
        const handleInterfaceStatus = (data) => setInterfaceStatus(data);
        const handleDhcpLeases = (data) => setDhcpLeases(data);
        const handlePingLatency = (data) => setPingLatency(data);
        const handleSystemLogs = (data) => setSystemLogs(data);
        const handleNodeStats = (data) => setNodes(data);

        on('realtime-stats', handleRealtimeStats);
        on('interface-status', handleInterfaceStatus);
        on('dhcp-leases', handleDhcpLeases);
        on('ping-latency', handlePingLatency);
        on('system-logs', handleSystemLogs);
        on('node-stats', handleNodeStats);

        return () => {
            off('realtime-stats', handleRealtimeStats);
            off('interface-status', handleInterfaceStatus);
            off('dhcp-leases', handleDhcpLeases);
            off('ping-latency', handlePingLatency);
            off('system-logs', handleSystemLogs);
            off('node-stats', handleNodeStats);
        };
    }, [socket, isConnected, user, on, off]);

    useEffect(() => {
        if (!nodes || nodes.length === 0) return;

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
        emit('change-bandwidth-interface', interfaceName);
    }, [emit]);

    const addNode = useCallback((ip, name) => {
        emit('add-node', { ip, name });
    }, [emit]);

    const removeNode = useCallback((ip) => {
        emit('remove-node', ip);
    }, [emit]);

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
        removeNode
    };
}
