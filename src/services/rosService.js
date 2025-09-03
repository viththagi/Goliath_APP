// src/services/rosService.js
import ROSLIB from 'roslib';
import { rosInstance } from '../components/RosConnector';

// Get current ROS instance
export const getROS = () => rosInstance;

// Check if connected
export const isConnected = () => rosInstance && rosInstance.isConnected;

// Get topic list service call
export const getTopicList = async () => {
  if (!isConnected()) {
    throw new Error('Not connected to ROS');
  }

  return new Promise((resolve, reject) => {
    const topicListService = new ROSLIB.Service({
      ros: rosInstance,
      name: '/rosapi/topics',
      serviceType: 'rosapi/GetTopics'
    });

    const request = new ROSLIB.ServiceRequest({});

    topicListService.callService(request, (result) => {
      if (result && result.topics) {
        resolve(result.topics);
      } else {
        reject(new Error('Failed to get topics'));
      }
    });
  });
};

// Alternative fallback
export const getTopicListFallback = async () => {
  console.warn('rosapi not available - using fallback');
  return ['/cmd_vel', '/joint_states', '/odom', '/scan', '/tf', '/tf_static'];
};
