import React, { useState } from 'react';
import { Shield, Server, User, Lock, Globe, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login = () => {
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        host: localStorage.getItem('last_host') || '192.168.0.1',
        user: localStorage.getItem('last_user') || 'admin',
        password: '',
        port: localStorage.getItem('last_port') || '8728'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.password) return;
        setIsSubmitting(true);
        setError(null);

        try {
            await login({
                host: formData.host,
                user: formData.user,
                password: formData.password,
                port: parseInt(formData.port)
            });

            localStorage.setItem('last_host', formData.host);
            localStorage.setItem('last_user', formData.user);
            localStorage.setItem('last_port', formData.port);
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-background">
                <div className="grid-overlay" />
                <div className="glow-orb orb-1" />
                <div className="glow-orb orb-2" />
            </div>

            <div className="login-container glass">
                <div className="login-header">
                    <div className="logo-icon glass">
                        <Shield size={32} className="shield-icon" />
                    </div>
                    <h1>Antigravity Auth</h1>
                    <p>Secure Interface for MikroTik RouterOS</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label><Globe size={14} /> Router Host IP</label>
                        <div className="input-field">
                            <Server size={18} />
                            <input
                                type="text"
                                name="host"
                                placeholder="192.168.0.1"
                                value={formData.host}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="input-group">
                            <label>API Port</label>
                            <div className="input-field">
                                <input
                                    type="text"
                                    name="port"
                                    placeholder="8728"
                                    value={formData.port}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="input-group flex-2">
                            <label><User size={14} /> Username</label>
                            <div className="input-field">
                                <User size={18} />
                                <input
                                    type="text"
                                    name="user"
                                    placeholder="admin"
                                    value={formData.user}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="input-group">
                        <label><Lock size={14} /> Password</label>
                        <div className="input-field">
                            <Lock size={18} />
                            <input
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="login-error animate-shake">
                            {error}
                        </div>
                    )}

                    <button type="submit" className="login-btn" disabled={isSubmitting || !formData.password}>
                        {isSubmitting ? (
                            <span className="loader" />
                        ) : (
                            <>
                                Establish Connection
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Direct encrypted connection to RouterOS API</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
