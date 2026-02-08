# NETVOX - MikroTik Router Monitoring System

A modern real-time dashboard for monitoring MikroTik routers running RouterOS 7. Built with React, Node.js, and WebSocket for live data streaming.

## Features

- **Dashboard** - Real-time CPU, RAM, Temperature, Voltage monitoring with live updates
- **Traffic** - Live RX/TX bandwidth monitoring with interface selection
- **Nodes** - Monitor custom network endpoints with ping latency graphs
- **Security** - Manage firewall address lists (add/remove/toggle) and filter rules with numeric IP sorting
- **Devices** - View connected DHCP clients and device information
- **Settings** - View connected router information
- **Collapsible Sidebar** - Maximize screen space when needed
- **Responsive Design** - Modern dark-mode UI with glassmorphism effects

## Tech Stack

### Backend
- Node.js with TypeScript
- Express.js for REST API
- Socket.IO for real-time WebSocket communication
- node-routeros for MikroTik RouterOS API

### Frontend
- React 19 with Vite
- Recharts for latency graphs
- Lucide React for icons
- Socket.IO Client for real-time data

## Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Overview with system health, node monitoring, alerts, and interface status |
| **Traffic** | Live RX/TX bandwidth meters with interface selector |
| **Nodes** | Add/remove custom endpoints with real-time ping latency graphs |
| **Security** | Firewall address lists and filter rules management |
| **Devices** | DHCP client list and device information |
| **Settings** | Connected router information (identity, model, version, uptime) |

## Components

- **Sidebar** - Navigation with router identity and collapse/expand toggle
- **TopBar** - Page title and user profile menu
- **InterfaceStatus** - Network interface up/down status indicators
- **DevicesTable** - Connected DHCP clients table
- **MiniTrafficChart** - Compact traffic visualization

## Project Structure

```
mikrotik/
├── backend/
│   ├── src/
│   │   ├── services/         # MikroTik API services
│   │   │   ├── BandwidthService.ts
│   │   │   ├── DhcpService.ts
│   │   │   ├── FirewallService.ts
│   │   │   ├── LogService.ts
│   │   │   ├── NodeMonitorService.ts
│   │   │   ├── PingService.ts
│   │   │   ├── RouterConnectionService.ts
│   │   │   └── SystemHealthService.ts
│   │   ├── middleware/
│   │   │   └── auth.ts       # JWT authentication middleware
│   │   ├── socket.ts         # WebSocket server with real-time intervals
│   │   ├── utils/
│   │  .ts     # Encryption utilities (PBKDF2)
│   │ │   └── crypto   └── index.ts          # Express entry point & API routes
│   ├── .env.example          # Environment template
│   ├── package.json
│   └── SECURITY.md           # Security documentation
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── hooks/
│   │   │   └── useSocket.ts  # WebSocket hook for real-time data
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication context
│   │   ├── App.jsx           # Main app with routing
│   │   └── main.jsx          # Entry point
│   ├── .env
│   ├── package.json
│   └── vite.config.js
│
├── SECURITY.md               # Security documentation
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- MikroTik router running RouterOS 7.x
- API service enabled on router

### Enable MikroTik API

```bash
# Enable standard API (port 8728)
/ip service enable api

# Or enable SSL API (port 8729) - recommended
/ip service enable api-ssl
```

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate secure secrets:
   ```bash
   npm run generate-secrets
   ```

   Or manually create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your generated secrets and router info:
   ```env
   PORT=3001
   JWT_SECRET=your-generated-jwt-secret-here
   ENCRYPTION_KEY=your-generated-encryption-key-here
   ```

   **Important**: Secrets must be at least 32 characters. The app will fail to start without valid secrets.

5. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Environment Variables

### Backend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Backend port (default: 3001) |
| `JWT_SECRET` | **Yes** | Secret for JWT signing (min 32 chars) |
| `ENCRYPTION_KEY` | **Yes** | Secret for password encryption (min 32 chars) |
| `NODE_ENV` | No | Set to `production` for secure cookies |

### Frontend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | http://localhost:3001 | Backend WebSocket URL |

## Security Features

### Implemented Security Measures

| Feature | Description |
|---------|-------------|
| **Helmet.js** | Content-Security-Policy, X-Frame-Options, X-Content-Type-Options |
| **HTTP-only Cookies** | JWT tokens stored in HttpOnly cookies |
| **PBKDF2 Encryption** | 100,000 iteration key derivation for password encryption |
| **Rate Limiting** | 10 login attempts per 15 minutes |
| **CORS Restriction** | Only localhost:5173 allowed |
| **Secure Cookies** | `secure: true` in production mode |
| **Secrets Validation** | App fails at startup if secrets not configured |

### Security Documentation

See [SECURITY.md](./SECURITY.md) for detailed security information.

## Real-Time Data Intervals

| Data | Interval |
|------|----------|
| CPU, RAM, Bandwidth | 1 second |
| Router Ping | 2 seconds |
| Interface Status | 5 seconds |
| DHCP Leases | 5 seconds |
| System Logs | 5 seconds |
| Custom Nodes | 3 seconds |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate with router credentials |
| POST | `/api/logout` | Clear session cookie |
| GET | `/api/me` | Get current user info (requires auth) |

### Router Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interfaces` | Get network interfaces (requires auth) |
| GET | `/api/firewall/lists` | Get address lists (requires auth) |
| GET | `/api/firewall/rules` | Get filter rules (requires auth) |
| POST | `/api/firewall/add` | Add IP to address list (requires auth) |
| POST | `/api/firewall/addresses/toggle` | Enable/disable address entry (requires auth) |
| POST | `/api/firewall/toggle` | Enable/disable filter rule (requires auth) |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check (no auth) |
| POST | `/api/system/updates/install` | Install updates (requires auth & password) |

## WebSocket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `change-bandwidth-interface` | `string` | Change monitored interface |
| `add-node` | `{ ip, name }` | Add monitoring node |
| `remove-node` | `string` | Remove monitoring node |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `realtime-stats` | Object | CPU, RAM, bandwidth, identity |
| `interface-status` | Array | Interface up/down status |
| `dhcp-leases` | Array | Connected DHCP clients |
| `ping-latency` | Number | Router ping in ms |
| `system-logs` | Array | Recent router logs |
| `node-stats` | Array | Custom node status and latency |

## Security Rating

**Current Score: 8.5/10**

Critical vulnerabilities resolved:
- ✅ Hardcoded fallback secrets removed
- ✅ Helmet security headers implemented
- ✅ PBKDF2 key derivation (100K iterations)

Remaining improvements:
- Password in memory (architectural limitation)
- SameSite cookie upgrade
- Input validation with Zod
- Error message sanitization

## License

MIT License

## Contributing

1. Generate strong secrets for development
2. Never commit `.env` files
3. Run TypeScript checks: `cd backend && npx tsc --noEmit`
4. Test all security features after changes
