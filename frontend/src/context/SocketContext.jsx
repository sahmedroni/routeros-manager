import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const SocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        const socket = io(BACKEND_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 5000,
            reconnectionDelayMax: 30000,
            timeout: 30000
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            setIsConnected(false);
        });
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setIsConnected(false);
    }, []);

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    const on = useCallback((event, callback) => {
        if (!socketRef.current) return;
        socketRef.current.on(event, callback);
    }, []);

    const off = useCallback((event, callback) => {
        if (!socketRef.current) return;
        if (callback) {
            socketRef.current.off(event, callback);
        } else {
            socketRef.current.off(event);
        }
    }, []);

    // emit supports optional acknowledgement callback as third arg
    const emit = useCallback((event, data, ack) => {
        if (socketRef.current?.connected) {
            if (typeof ack === 'function') {
                socketRef.current.emit(event, data, ack);
            } else {
                socketRef.current.emit(event, data);
            }
        }
    }, []);

    const updateIntervals = useCallback((preferences) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('update-intervals', preferences);
        }
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected, on, off, emit, connect, disconnect, updateIntervals }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSharedSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSharedSocket must be used within a SocketProvider');
    }
    return context;
};
