import { useState, useEffect, useCallback, useRef } from 'react';
import { useSharedSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const MAX_DATA_POINTS = 8;

export function useSocket() {
    const { user } = useAuth();
    const { socket, isConnected, on, off, emit } = useSharedSocket();
    // reference to socket for ack-based emits
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);
    const [realtimeStats, setRealtimeStats] = useState(null);
    const [interfaceStatus, setInterfaceStatus] = useState([]);
    const [dhcpLeases, setDhcpLeases] = useState([]);
    const [pingLatency, setPingLatency] = useState(null);
    const [systemLogs, setSystemLogs] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [latencyHistory, setLatencyHistory] = useState({});

    useEffect(() => {
        // rely on isConnected and user; `on`/`off` use the internal socket ref
        if (!isConnected || !user) return;

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
    }, [isConnected, user, on, off]);

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

    const editNode = useCallback((idOrOldIp, ip, name, cb) => {
        // Optimistically update local nodes state when an id is provided
        if (typeof idOrOldIp === 'string' && /^[0-9]+$/.test(idOrOldIp)) {
            setNodes(prev => prev.map(n => n.id === idOrOldIp ? { ...n, ip, name } : n));
        }

        // If first arg looks like an id (numeric timestamp string), send id; otherwise send oldIp for legacy
        const payload = {};
        if (typeof idOrOldIp === 'string' && /^[0-9]+$/.test(idOrOldIp)) {
            payload.id = idOrOldIp;
            payload.ip = ip;
            payload.name = name;
        } else {
            payload.oldIp = idOrOldIp;
            payload.ip = ip;
            payload.name = name;
        }

        // emit with acknowledgement
        emit('edit-node', payload, (response) => {
            if (!response || !response.success) {
                // revert optimistic update if possible
                if (typeof idOrOldIp === 'string' && /^[0-9]+$/.test(idOrOldIp)) {
                    // refresh nodes from server by requesting nothing — rely on server push; fallback: no-op
                }
                console.error('Edit node failed:', response?.error);
                if (typeof cb === 'function') cb(response);
            } else {
                if (typeof cb === 'function') cb(response);
            }
        });
    }, [emit, setNodes]);

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
        , editNode
    };
}
