import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const savedConfig = localStorage.getItem('router_config');
        if (savedConfig) {
            try {
                setUser(JSON.parse(savedConfig));
            } catch (e) {
                console.error('Failed to parse saved config');
                localStorage.removeItem('router_config');
            }
        }
        setLoading(false);
    }, []);

    const login = (config) => {
        setUser(config);
        localStorage.setItem('router_config', JSON.stringify(config));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('router_config');
    };

    const getAuthHeaders = () => {
        if (!user) return {};
        return {
            'x-router-host': user.host,
            'x-router-user': user.user,
            'x-router-password': user.password,
            'x-router-port': user.port.toString(),
        };
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
