import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

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

    const checkSession = useCallback(async () => {
        const minDelay = new Promise(resolve => setTimeout(resolve, 1500));
        try {
            const [response] = await Promise.all([
                fetch(`${BACKEND_URL}/api/me`, { credentials: 'include', cache: 'no-store' }),
                minDelay
            ]);

            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const userData = JSON.parse(text);
                    setUser(userData);
                } else {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Session check failed', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const loadPreferences = useCallback(async () => {
        if (!user) return;

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
    }, [user]);

    useEffect(() => {
        if (user) {
            loadPreferences();
        }
    }, [user, loadPreferences]);

    const savePreferences = useCallback(async (newPreferences) => {
        if (!user) return;

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
    }, [user]);

    const updatePreferences = useCallback((newPreferences) => {
        const updated = { ...preferences, ...newPreferences };
        setPreferences(updated);
        savePreferences(updated);
    }, [preferences, savePreferences]);

    const resetPreferences = useCallback(async () => {
        if (!user) return;

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
    }, [user]);

    const login = async (config) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                const text = await response.text();
                let errorMessage = 'Login failed';
                try {
                    const data = JSON.parse(text);
                    errorMessage = data.error || errorMessage;
                } catch (e) {
                    errorMessage = `Server error: ${response.status}`;
                }
                throw new Error(errorMessage);
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
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            loading,
            preferences,
            updatePreferences,
            resetPreferences
        }}>
            {children}
        </AuthContext.Provider>
    );
};


