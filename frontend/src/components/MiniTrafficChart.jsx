import React, { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import './MiniTrafficChart.css';

const MAX_DATA_POINTS = 20;

const MiniTrafficChart = ({ data }) => {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (data) {
            const newDataPoint = {
                rx: Math.round(data.rx / 1024 / 1024 * 100) / 100, // Mbps
                tx: Math.round(data.tx / 1024 / 1024 * 100) / 100, // Mbps
            };

            setHistory(prev => {
                const updated = [...prev, newDataPoint];
                if (updated.length > MAX_DATA_POINTS) {
                    return updated.slice(updated.length - MAX_DATA_POINTS);
                }
                return updated;
            });
        }
    }, [data]);

    return (
        <div className="mini-chart-wrapper">
            <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={history}>
                    <defs>
                        <linearGradient id="miniColorRx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="miniColorTx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent-magenta)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--accent-magenta)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(5, 5, 7, 0.9)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            fontSize: '10px'
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="rx"
                        stroke="var(--accent-cyan)"
                        fillOpacity={1}
                        fill="url(#miniColorRx)"
                        strokeWidth={2}
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="tx"
                        stroke="var(--accent-magenta)"
                        fillOpacity={1}
                        fill="url(#miniColorTx)"
                        strokeWidth={2}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MiniTrafficChart;
