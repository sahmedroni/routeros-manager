import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

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

    const checkSession = useCallback(async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
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
                credentials: 'include'
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
                credentials: 'include'
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
                credentials: 'include'
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

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
