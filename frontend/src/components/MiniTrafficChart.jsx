import React, { useState, useEffect, memo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import './MiniTrafficChart.css';

const MAX_DATA_POINTS = 10;

const MiniTrafficChart = memo(({ data }) => {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (data) {
            const newDataPoint = {
                rx: Math.round(data.rx / 1024 / 1024 * 100) / 100,
                tx: Math.round(data.tx / 1024 / 1024 * 100) / 100,
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
});

export default MiniTrafficChart;
