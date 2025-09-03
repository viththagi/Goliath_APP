// src/screens/LidarScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useROS } from '../contexts/ROSContext';
import LidarViewer from '../components/LidarViewer';

const LidarScreen = () => {
  const { ros, isConnected } = useROS();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lidar Point Cloud Viewer</Text>
      
      <LidarViewer
        ros={ros}
        topic="/scan"
        messageType="sensor_msgs/LaserScan"
        pointSize={0.05}
        autoRotate={false}
        showGrid={true}
        showAxis={true}
        style={styles.viewer}
        onPointsUpdate={(points) => {
          console.log(`Received ${points.length} points`);
        }}
      />
      
      <View style={styles.infoPanel}>
        <Text style={styles.infoText}>● ROS: {isConnected ? 'Connected' : 'Disconnected'}</Text>
        <Text style={styles.infoText}>● Topic: /unilidar/cloud</Text>
        <Text style={styles.infoText}>● Type: PointCloud2</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 10,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  viewer: {
    flex: 3,
    marginBottom: 10,
  },
  infoPanel: {
    backgroundColor: '#262626',
    padding: 15,
    borderRadius: 10,
  },
  infoText: {
    color: '#E0AA3E',
    fontSize: 12,
    marginBottom: 3,
  },
});

export default LidarScreen;
