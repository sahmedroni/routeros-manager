import React from 'react';
import DevicesTable from '../components/DevicesTable';
import './Devices.css';

const Devices = () => {
    return (
        <div className="devices-page-container">
            <div className="page-header">
                <h1 className="display-font">Network Devices</h1>
                <p className="subtitle">Real-time overview of connected clients and DHCP leases</p>
            </div>

            <DevicesTable />
        </div>
    );
};

export default Devices;
