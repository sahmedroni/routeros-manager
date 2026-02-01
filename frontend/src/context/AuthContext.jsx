import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const logoutPromiseRef = useRef(null);

    const checkSession = useCallback(async () => {
        if (isLoggingOut) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/me`, {
                credentials: 'include'
            });

            if (isLoggingOut) {
                setLoading(false);
                return;
            }

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error) {
            if (isLoggingOut) {
                setLoading(false);
                return;
            }
            console.error('Session check failed', error);
            setUser(null);
        } finally {
            if (!isLoggingOut) {
                setLoading(false);
            }
        }
    }, [isLoggingOut]);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    useEffect(() => {
        if (!user || isLoggingOut) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const newSocket = io(BACKEND_URL, {
            transports: ['websocket', 'polling'],
            reconnection: false,
            auth: {
                config: user
            }
        });

        newSocket.on('connect', () => {
            if (!isLoggingOut) {
                setSocket(newSocket);
            }
        });

        newSocket.on('disconnect', () => {
            if (!isLoggingOut) {
                setSocket(null);
            }
        });

        newSocket.on('connect_error', (err) => {
            if (!isLoggingOut) {
                console.error('WebSocket connection error:', err);
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user, isLoggingOut]);

    const login = async (config) => {
        if (isLoggingOut) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Login failed');
            }

            await checkSession();
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const logout = useCallback(async () => {
        if (logoutPromiseRef.current) {
            return logoutPromiseRef.current;
        }

        const logoutPromise = (async () => {
            setIsLoggingOut(true);

            if (socket) {
                socket.disconnect();
                setSocket(null);
            }

            try {
                await fetch(`${BACKEND_URL}/api/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (e) {
                console.error('Logout failed', e);
            }

            setUser(null);
            setLoading(false);
            setIsLoggingOut(false);
            logoutPromiseRef.current = null;
        })();

        logoutPromiseRef.current = logoutPromise;
        return logoutPromise;
    }, [socket]);

    const getAuthHeaders = () => {
        return {};
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, getAuthHeaders, loading, socket }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
