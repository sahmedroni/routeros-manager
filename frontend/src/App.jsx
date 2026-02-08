import React from 'react';
import './index.css';
import { Activity } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Nodes from './pages/Nodes';
import Devices from './pages/Devices';
import Traffic from './pages/Traffic';
import Login from './pages/Login';
import Security from './pages/Security';
import Settings from './pages/Settings';
import { useAuth } from './hooks/useAuth';

import './App.css';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = React.useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-container">
          <div className="preloader-logo">
            <Activity className="logo-icon-loader" size={64} />
            <span className="logo-text">NET<span className="accent">VOX</span></span>
          </div>
          <div className="loader-bar">
            <div className="loader-progress"></div>
          </div>
          <div className="loader-status">Initializing Secure Link...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'nodes':
        return <Nodes />;
      case 'devices':
        return <Devices />;
      case 'traffic':
        return <Traffic />;
      case 'security':
        return <Security />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        <TopBar />
        <div className="content-area">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
