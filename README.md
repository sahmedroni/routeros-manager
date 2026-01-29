# MikroTik Monitoring System

A modern real-time dashboard for monitoring MikroTik routers running RouterOS 7.

## Features
- **Real-time Dashboard**: Live CPU, RAM, Temperature, and Voltage monitoring (1s updates).
- **Bandwidth Monitor**: Live RX/TX graph with 60-second history.
- **DHCP Management**: View connected clients and their lease status.
- **Firewall Integration**: Quickly add connected IP addresses to router address lists.
- **Responsive Design**: Modern, dark-mode friendly UI built with Tailwind CSS.

## Tech Stack
- **Backend**: Node.js (TypeScript), Express, Socket.io, `routeros-client`.
- **Frontend**: Next.js 15, React 19, Recharts, Tailwind CSS.

## Folder Structure
```text
mikrotik/
├── backend/
│   ├── src/
│   │   ├── services/       # MikroTik API logic
│   │   ├── socket.ts       # WebSocket streaming
│   │   └── index.ts        # Entry point & API routes
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router & Layout
│   │   ├── components/     # UI Components
│   │   └── hooks/          # Custom Hooks (WebSocket)
│   └── package.json
└── PRD.txt                 # Project Requirements
```

## Setup Instructions

### 1. Router Setup
Ensure your MikroTik router has the API service enabled:
```bash
/ip service enable api
# Or for SSL (recommended):
/ip service enable api-ssl
```

### 2. Backend Setup
1. Navigate to the `backend` folder:
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`:
   ```env
   PORT=3001
   ROUTER_HOST=192.168.88.1
   ROUTER_USER=admin
   ROUTER_PASSWORD=your_password
   ROUTER_PORT=8728
   ```
4. Start the server: `npm run dev`

### 3. Frontend Setup
1. Navigate to the `frontend` folder:
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Security Notes
- Router credentials are kept strictly on the backend.
- Use a dedicated MikroTik user with `read` or `api` permissions for monitoring.
- The application uses WebSocket for efficient real-time updates without polling from the browser.
