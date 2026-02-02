import React, { memo } from 'react';
import { Network, Circle, Activity } from 'lucide-react';
import './InterfaceStatus.css';

const InterfaceStatus = memo(({ interfaces = [] }) => {
    const getStatusColor = (int) => {
        if (int.disabled) return 'var(--text-muted)';
        if (int.running) return 'var(--accent-green)';
        return 'var(--accent-red)';
    };

    const getStatusLabel = (int) => {
        if (int.disabled) return 'Disabled';
        if (int.running) return 'Active';
        return 'Disconnected';
    };

    if (!interfaces || interfaces.length === 0) {
        return (
            <div className="interfaces-empty">
                <Activity className="spin" size={24} />
                <span>Syncing network ports...</span>
            </div>
        );
    }

    return (
        <div className="interfaces-grid">
            {interfaces.map((int) => (
                <div key={int.name} className={`interface-pill ${int.running ? 'running' : ''} ${int.disabled ? 'disabled' : ''}`}>
                    <div className="pill-status">
                        <Circle
                            size={8}
                            fill={getStatusColor(int)}
                            stroke="none"
                            className={int.running ? 'pulse-green' : ''}
                        />
                    </div>
                    <div className="pill-info">
                        <span className="pill-name">{int.name}</span>
                        <span className="pill-type">{int.type}</span>
                    </div>
                    {int.comment && <div className="pill-tooltip">{int.comment}</div>}
                </div>
            ))}
        </div>
    );
});

export default InterfaceStatus;
