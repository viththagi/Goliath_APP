// components/RosConnector.js

import { useEffect } from 'react';
import ROSLIB from 'roslib';

const RosConnector = ({ setRos, setConnected, ipAddress }) => {
  useEffect(() => {
    if (!ipAddress) return; // Don't connect if IP is not provided

    const rosConnection = new ROSLIB.Ros({
      url: `ws://${ipAddress}:9090`
    });

    rosConnection.on('connection', () => {
      console.log('Connected to ROS bridge at:', ipAddress);
      setConnected(true);
    });

    rosConnection.on('error', (error) => {
      console.log('Error connecting to ROS:', error);
    });

    rosConnection.on('close', () => {
      console.log('Connection to ROS closed');
      setConnected(false);
    });

    setRos(rosConnection);

    return () => {
      rosConnection.close();
    };
  }, [ipAddress]); // Add ipAddress as dependency

  return null; // This component only handles logic, not UI
};

export default RosConnector;
