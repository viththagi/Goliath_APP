// src/components/RosConnector.js
import React, { useEffect } from 'react';
import ROSLIB from 'roslib';

// Export the ROS instance so other components can use it
export let rosInstance = null;

const RosConnector = ({ setRos, setConnected, ipAddress }) => {
  useEffect(() => {
    if (!ipAddress) return;

    // Create ROS connection
    const ros = new ROSLIB.Ros({
      url: `ws://${ipAddress}:9090`
    });

    rosInstance = ros; // Set the global instance

    ros.on('connection', () => {
      console.log('Connected to ROS bridge');
      setConnected(true);
      setRos(ros);
    });

    ros.on('error', (error) => {
      console.error('Error connecting to ROS:', error);
      setConnected(false);
    });

    ros.on('close', () => {
      console.log('Connection to ROS closed');
      setConnected(false);
    });

    return () => {
      if (ros) {
        ros.close();
      }
    };
  }, [ipAddress, setRos, setConnected]);

  return null; // This component doesn't render anything
};

export default RosConnector;
