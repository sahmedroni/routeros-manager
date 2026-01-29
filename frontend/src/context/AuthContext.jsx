import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkSession = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/me`, {
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
    };

    useEffect(() => {
        checkSession();
    }, []);

    const login = async (config) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Login failed');
            }

            // Fetch user details after successful login
            await checkSession();
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.error('Logout failed', e);
        }
        setUser(null);
    };

    const getAuthHeaders = () => {
        return {}; // No headers needed, cookies are handled automatically
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, getAuthHeaders, loading }}>
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
