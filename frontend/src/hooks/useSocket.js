import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Custom hook to manage WebSocket connection and real-time data
 */
export function useSocket() {
    const { user } = useAuth();
    const [realtimeStats, setRealtimeStats] = useState(null);
    const [interfaceStatus, setInterfaceStatus] = useState([]);
    const [dhcpLeases, setDhcpLeases] = useState([]);
    const [pingLatency, setPingLatency] = useState(null);
    const [systemLogs, setSystemLogs] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        // Create socket connection with auth data
        socketRef.current = io(BACKEND_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            auth: {
                config: user
            }
        });

        const socket = socketRef.current;

        // ... (remaining event handlers)
        socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            setIsConnected(true);
            setError(null);
        });

        socket.on('disconnect', () => {
            console.log('❌ WebSocket disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('WebSocket connection error:', err);
            setError('Failed to connect to server');
            setIsConnected(false);
        });

        socket.on('realtime-stats', (data) => {
            setRealtimeStats(data);
        });

        socket.on('dhcp-leases', (data) => {
            setDhcpLeases(data);
        });

        socket.on('interface-status', (data) => {
            setInterfaceStatus(data);
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

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [user]);

    const changeInterface = (interfaceName) => {
        if (socketRef.current) {
            socketRef.current.emit('change-bandwidth-interface', interfaceName);
        }
    };

    const addNode = (ip, name) => {
        if (socketRef.current) {
            socketRef.current.emit('add-node', { ip, name });
        }
    };

    const removeNode = (ip) => {
        if (socketRef.current) {
            socketRef.current.emit('remove-node', ip);
        }
    };

    return {
        realtimeStats,
        interfaceStatus,
        dhcpLeases,
        pingLatency,
        systemLogs,
        isConnected,
        changeInterface,
        nodes,
        addNode,
        removeNode,
        error
    };
}
