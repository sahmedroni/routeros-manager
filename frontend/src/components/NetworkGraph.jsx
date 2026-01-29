import React, { useMemo } from 'react';
import './NetworkGraph.css';

const NetworkGraph = () => {
    // Generate some random points for the futuristic grid
    const points = useMemo(() => {
        return Array.from({ length: 40 }).map((_, i) => ({
            x: Math.random() * 800,
            y: Math.random() * 300,
            r: Math.random() * 2 + 1,
            connections: Array.from({ length: 2 }).map(() => Math.floor(Math.random() * 40))
        }));
    }, []);

    return (
        <div className="network-graph">
            <svg width="100%" height="300" viewBox="0 0 800 300">
                <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.2" />
                        <stop offset="50%" stopColor="var(--accent-cyan)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.2" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Grid Background */}
                <g className="grid">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <line key={`v-${i}`} x1={i * 40} y1="0" x2={i * 40} y2="300" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    ))}
                    {Array.from({ length: 10 }).map((_, i) => (
                        <line key={`h-${i}`} x1="0" y1={i * 40} x2="800" y2={i * 40} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    ))}
                </g>

                {/* Connections */}
                {points.map((p, i) =>
                    p.connections.map((cIdx, j) => (
                        <line
                            key={`c-${i}-${j}`}
                            x1={p.x} y1={p.y}
                            x2={points[cIdx].x} y2={points[cIdx].y}
                            stroke="url(#lineGrad)"
                            strokeWidth="0.5"
                            className="conn-line"
                        />
                    ))
                )}

                {/* Nodes */}
                {points.map((p, i) => (
                    <g key={`node-${i}`} className="node-group">
                        <circle
                            cx={p.x} cy={p.y} r={p.r}
                            fill="var(--accent-cyan)"
                            filter="url(#glow)"
                            className="node-dot"
                        />
                        {i % 8 === 0 && (
                            <circle
                                cx={p.x} cy={p.y} r={p.r + 4}
                                fill="none"
                                stroke="var(--accent-cyan)"
                                strokeWidth="0.5"
                                className="node-pulse"
                            />
                        )}
                    </g>
                ))}

                {/* Data Stream Path */}
                <path
                    d="M 50,250 Q 200,50 400,150 T 750,100"
                    fill="none"
                    stroke="var(--accent-cyan)"
                    strokeWidth="2"
                    strokeDasharray="10,20"
                    className="data-stream"
                />
            </svg>
        </div>
    );
};

export default NetworkGraph;
