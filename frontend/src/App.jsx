import React from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Nodes from './pages/Nodes';
import Devices from './pages/Devices';
import Traffic from './pages/Traffic';
import Login from './pages/Login';
import Security from './pages/Security';
import { useAuth } from './context/AuthContext';

import './App.css';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = React.useState('dashboard');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-container">
          <div className="loader"></div>
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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="main-content">
        <TopBar />
        <div className="content-area">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
