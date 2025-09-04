// src/contexts/ROSContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import ROSLIB from 'roslib';

const ROSContext = createContext();

export const useROS = () => {
  const context = useContext(ROSContext);
  if (!context) {
    throw new Error('useROS must be used within a ROSProvider');
  }
  return context;
};

export const ROSProvider = ({ children }) => {
  const [ros, setRos] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const rosInstance = new ROSLIB.Ros({
      url: 'ws://192.168.2.7:9090'
    });

    rosInstance.on('connection', () => {
      console.log('ROS Connected');
      setIsConnected(true);
      setError(null);
    });

    rosInstance.on('error', (error) => {
      console.log('ROS Error:', error);
      setError(error);
      setIsConnected(false);
    });

    rosInstance.on('close', () => {
      console.log('ROS Connection Closed');
      setIsConnected(false);
    });

    setRos(rosInstance);

    return () => {
      rosInstance.close();
    };
  }, []);

  return (
    <ROSContext.Provider value={{ ros, isConnected, error }}>
      {children}
    </ROSContext.Provider>
  );
};
