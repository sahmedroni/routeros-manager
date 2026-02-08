import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

export const useSharedSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSharedSocket must be used within a SocketProvider');
    }
    return context;
};
