// src/contexts/ROSContext.js
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import ROSLIB from 'roslib';

const RosContext = createContext();

export const useROS = () => {
  const context = useContext(RosContext);
  if (!context) {
    throw new Error('useROS must be used within a RosProvider');
  }
  return context;
};

export const RosProvider = ({ children }) => {
  const [ros, setRos] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const connectionRef = useRef(null);

  const ROS_IP = '192.168.2.7';
  const ROS_PORT = 9090;

  const connectToRos = () => {
    if (connecting || connected) return;
    
    setConnecting(true);
    console.log('Creating shared ROS connection for entire app...');
    
    const rosInstance = new ROSLIB.Ros({
      url: `ws://${ROS_IP}:${ROS_PORT}`
    });

    connectionRef.current = rosInstance;

    rosInstance.on('connection', () => {
      console.log('Shared ROS connection established');
      setConnected(true);
      setConnecting(false);
      setRos(rosInstance);
    });

    rosInstance.on('error', (error) => {
      console.log('ROS connection error, continuing offline:', error);
      setConnecting(false);
      setConnected(false);
    });

    rosInstance.on('close', () => {
      console.log('ROS connection closed');
      setConnected(false);
      setConnecting(false);
      setRos(null);
    });

    // Connection timeout
    setTimeout(() => {
      if (connecting && !connected) {
        console.log('ROS connection timeout');
        setConnecting(false);
      }
    }, 3000);
  };

  const disconnect = () => {
    if (connectionRef.current) {
      connectionRef.current.close();
    }
  };

  const reconnect = () => {
    disconnect();
    setTimeout(() => {
      connectToRos();
    }, 1000);
  };

  // Auto-connect on app start
  useEffect(() => {
    connectToRos();
    return () => {
      if (connectionRef.current) {
        connectionRef.current.close();
      }
    };
  }, []);

  return (
    <RosContext.Provider value={{
      ros,
      connected,
      connecting,
      connectToRos,
      disconnect,
      reconnect
    }}>
      {children}
    </RosContext.Provider>
  );
};
