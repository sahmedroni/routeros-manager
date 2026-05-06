import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login = () => {
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        username: localStorage.getItem('last_username') || '',
        password: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.username || !formData.password) return;
        setIsSubmitting(true);
        setError(null);

        try {
            await login({
                username: formData.username,
                password: formData.password
            });

            localStorage.setItem('last_username', formData.username);
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
                    <h1>Router Manager</h1>
                    <p>Sign in to manage your MikroTik routers</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label><User size={14} /> Username</label>
                        <div className="input-field">
                            <User size={18} />
                            <input
                                type="text"
                                name="username"
                                placeholder="Enter username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label><Lock size={14} /> Password</label>
                        <div className="input-field">
                            <Lock size={18} />
                            <input
                                type="password"
                                name="password"
                                placeholder="Enter password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="login-error animate-shake">
                            {error}
                        </div>
                    )}

                    <button type="submit" className="login-btn" disabled={isSubmitting || !formData.username || !formData.password}>
                        {isSubmitting ? (
                            <span className="loader" />
                        ) : (
                            <>
                                Sign In
                                <LogIn size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Enter your credentials to access the dashboard</p>
                </div>
            </div>
        </div>
    );
};

export default Login;