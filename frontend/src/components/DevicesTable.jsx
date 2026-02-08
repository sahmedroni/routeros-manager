import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import './DevicesTable.css';

const ITEMS_PER_PAGE = 15;

const DevicesTable = () => {
  const { dhcpLeases } = useSocket();
  const [notification, setNotification] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addressLists, setAddressLists] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedList, setSelectedList] = useState('');
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'address', direction: 'asc' });

  // Use DHCP leases if available, otherwise show empty state
  const devices = dhcpLeases && dhcpLeases.length > 0 ? dhcpLeases : [];

  // Filter devices based on search term
  const filteredDevices = devices.filter(device => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (device.address && device.address.toLowerCase().includes(searchLower)) ||
      (device.mac && device.mac.toLowerCase().includes(searchLower)) ||
      (device.hostname && device.hostname.toLowerCase().includes(searchLower)) ||
      (device.server && device.server.toLowerCase().includes(searchLower))
    );
  });

  // Sorting Logic
  const sortedDevices = React.useMemo(() => {
    let sortableItems = [...filteredDevices];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';

        // Special handling for IP addresses to sort numerically
        if (sortConfig.key === 'address') {
          const ipToNum = (ip) => ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
          try {
            aValue = ipToNum(aValue);
            bValue = ipToNum(bValue);
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          } catch (e) {
            // Fallback to string sort if parsing fails
          }
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredDevices, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedDevices.length / ITEMS_PER_PAGE);
  const paginatedDevices = sortedDevices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (name) => {
    if (sortConfig.key !== name) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchAddressLists = async () => {
    setIsLoadingLists(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL.replace('/socket.io', '')}/api/firewall/lists`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setAddressLists(data);
        if (data.length > 0) setSelectedList(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch address lists:', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleOpenModal = (device) => {
    setSelectedDevice(device);
    setIsModalOpen(true);
    fetchAddressLists();
  };

  const addToFirewall = async () => {
    if (!selectedDevice || !selectedList) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL.replace('/socket.io', '')}/api/firewall/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          address: selectedDevice.address,
          list: selectedList,
          comment: selectedDevice.mac
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({ type: 'success', message: `Device ${selectedDevice.hostname || selectedDevice.address} added to ${selectedList}!` });
        setIsModalOpen(false);
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to add device to firewall' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Network error while contacting firewall service' });
    }

    // Clear notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Optimal': return 'var(--accent-green)';
      case 'Warning': return 'var(--accent-orange)';
      case 'Critical': return 'var(--accent-red)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <>
      <div className="glass-card devices-container">
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
        <div className="card-header">
          <div className="header-left">
            <h3>DHCP Clients</h3>
            <span className="device-count">{filteredDevices.length} Total</span>
          </div>
          <div className="header-actions">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by IP, MAC, or Hostname..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="search-icon">🔍</span>
            </div>
            <button className="refresh-btn">Refresh</button>
          </div>
        </div>

        <div className="table-wrapper">
          {paginatedDevices.length === 0 ? (
            <div className="empty-state">
              <p>{searchTerm ? 'No matching devices found.' : 'No DHCP leases found. Waiting for data...'}</p>
            </div>
          ) : (
            <table className="devices-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('address')}>IP ADDRESS {getSortIndicator('address')}</th>
                  <th onClick={() => requestSort('mac')}>MAC ADDRESS {getSortIndicator('mac')}</th>
                  <th onClick={() => requestSort('hostname')}>HOSTNAME {getSortIndicator('hostname')}</th>
                  <th onClick={() => requestSort('status')}>STATUS {getSortIndicator('status')}</th>
                  <th onClick={() => requestSort('server')}>SERVER {getSortIndicator('server')}</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDevices.map((device, index) => (
                  <tr key={index}>
                    <td className="device-ip">{device.address || 'N/A'}</td>
                    <td className="device-mac">{device.mac || 'N/A'}</td>
                    <td className="device-hostname">{device.hostname || 'Unknown'}</td>
                    <td>
                      <div className="status-cell">
                        <span className="dot" style={{ backgroundColor: getStatusColor(device.status) }} />
                        <span style={{ color: getStatusColor(device.status) }}>{device.status || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="device-server">{device.server || 'N/A'}</td>
                    <td>
                      <button
                        className="action-btn"
                        onClick={() => handleOpenModal(device)}
                      >
                        Add to Firewall
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <div className="page-info">
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content glass-card">
            <h3>Add to Firewall</h3>
            <p>Select address list for <strong>{selectedDevice?.address}</strong></p>

            <div className="form-group">
              <label>Address List</label>
              <select
                value={selectedList}
                onChange={(e) => setSelectedList(e.target.value)}
                disabled={isLoadingLists}
              >
                {addressLists.length === 0 ? (
                  <option disabled>No lists found</option>
                ) : (
                  addressLists.map(list => (
                    <option key={list} value={list}>{list}</option>
                  ))
                )}
              </select>
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button
                className="confirm-btn"
                onClick={addToFirewall}
                disabled={!selectedList || isLoadingLists}
              >
                {isLoadingLists ? 'Loading...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DevicesTable;
