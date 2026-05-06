import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const DEFAULT_PREFERENCES = {
    realtimeInterval: 2000,
    dhcpInterval: 10000,
    pingInterval: 5000,
    logInterval: 10000,
    interfaceInterval: 10000,
    nodeMonitorInterval: 5000
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [savedRouters, setSavedRouters] = useState([]);
    const [activeRouter, setActiveRouter] = useState(null);
    const [socketReconnectTrigger, setSocketReconnectTrigger] = useState(0);

    const fetchRouters = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetch(`${BACKEND_URL}/api/routers`, {
                credentials: 'include',
                cache: 'no-store'
            });
            if (response.ok) {
                const routers = await response.json();
                setSavedRouters(routers);
            }
        } catch (error) {
            console.error('Failed to fetch routers:', error);
        }
    }, [user]);

    const addRouter = useCallback(async (routerData) => {
        if (!user) return;
        try {
            const response = await fetch(`${BACKEND_URL}/api/routers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(routerData),
                credentials: 'include',
                cache: 'no-store'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save router');
            }
            await fetchRouters();
        } catch (error) {
            throw error;
        }
    }, [user, fetchRouters]);

    const deleteRouter = useCallback(async (routerId) => {
        if (!user) return;
        try {
            const response = await fetch(`${BACKEND_URL}/api/routers/${routerId}`, {
                method: 'DELETE',
                credentials: 'include',
                cache: 'no-store'
            });
            if (response.ok) {
                await fetchRouters();
            }
        } catch (error) {
            console.error('Failed to delete router:', error);
        }
    }, [user, fetchRouters]);

    const switchRouter = useCallback(async (router) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/routers/${router.id}/set-active`, {
                method: 'POST',
                credentials: 'include',
                cache: 'no-store'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to switch router');
            }
            const result = await response.json();
            setActiveRouter(result.router);
            setTimeout(() => {
                setSocketReconnectTrigger(prev => prev + 1);
            }, 500);
        } catch (error) {
            console.error('Failed to switch router:', error);
            throw error;
        }
    }, []);

    const triggerSocketReconnect = useCallback(() => {
        setSocketReconnectTrigger(prev => prev + 1);
    }, []);

    const checkSession = useCallback(async () => {
        const minDelay = new Promise(resolve => setTimeout(resolve, 1500));
        try {
            const [response] = await Promise.all([
                fetch(`${BACKEND_URL}/api/me`, { credentials: 'include', cache: 'no-store' }),
                minDelay
            ]);

            if (response.ok) {
                const userData = await response.json();
                setUser({ username: userData.username, userId: userData.userId });
                setActiveRouter(userData.activeRouter);
                setSavedRouters(userData.routers || []);
            } else {
                setUser(null);
                setActiveRouter(null);
                setSavedRouters([]);
            }
        } catch (error) {
            console.error('Session check failed', error);
            setUser(null);
            setActiveRouter(null);
            setSavedRouters([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const loadPreferences = useCallback(async () => {
        if (!activeRouter) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/preferences`, {
                credentials: 'include',
                cache: 'no-store'
            });

            if (response.ok) {
                const backendPrefs = await response.json();
                setPreferences({ ...DEFAULT_PREFERENCES, ...backendPrefs });
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        }
    }, [activeRouter]);

    useEffect(() => {
        if (activeRouter) {
            loadPreferences();
        }
    }, [activeRouter, loadPreferences]);

    const savePreferences = useCallback(async (newPreferences) => {
        if (!activeRouter) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPreferences),
                credentials: 'include',
                cache: 'no-store'
            });

            if (response.ok) {
                const savedPrefs = await response.json();
                setPreferences(savedPrefs);
            }
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }, [activeRouter]);

    const updatePreferences = useCallback((newPreferences) => {
        const updated = { ...preferences, ...newPreferences };
        setPreferences(updated);
        savePreferences(updated);
    }, [preferences, savePreferences]);

    const resetPreferences = useCallback(async () => {
        if (!activeRouter) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/preferences`, {
                method: 'DELETE',
                credentials: 'include',
                cache: 'no-store'
            });

            if (response.ok) {
                const defaultPrefs = await response.json();
                setPreferences(defaultPrefs);
            }
        } catch (error) {
            console.error('Failed to reset preferences:', error);
            setPreferences(DEFAULT_PREFERENCES);
        }
    }, [activeRouter]);

    const login = async (credentials) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
                credentials: 'include',
                cache: 'no-store'
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
        try {
            await fetch(`${BACKEND_URL}/api/logout`, {
                method: 'POST',
                credentials: 'include',
                cache: 'no-store'
            });
        } catch (e) {
            console.error('Logout failed', e);
        }

        setUser(null);
        setLoading(false);
        setPreferences(DEFAULT_PREFERENCES);
        setSavedRouters([]);
        setActiveRouter(null);
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            loading,
            preferences,
            updatePreferences,
            resetPreferences,
            savedRouters,
            activeRouter,
            fetchRouters,
            addRouter,
            deleteRouter,
            switchRouter,
            triggerSocketReconnect
        }}>
            {children}
        </AuthContext.Provider>
    );
};