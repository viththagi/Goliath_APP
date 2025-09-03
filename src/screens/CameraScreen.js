// CameraScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ROSLIB from 'roslib';
import Camera from '../components/Camera';

const CameraScreen = () => {
  const [ros, setRos] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [topic, setTopic] = useState('/camera/image_raw');

  useEffect(() => {
    const rosConnection = new ROSLIB.Ros({
      url: 'ws://192.168.2.7:9090', // your rosbridge URL
    });

    rosConnection.on('connection', () => {
      console.log('Connected to ROS bridge (Camera)');
      setIsConnected(true);
      setIsLoading(false);
    });

    rosConnection.on('error', (error) => {
      console.error('ROS error (Camera):', error);
      setIsConnected(false);
      setIsLoading(false);
    });

    rosConnection.on('close', () => {
      console.log('ROS connection closed (Camera)');
      setIsConnected(false);
    });

    setRos(rosConnection);

    return () => {
      rosConnection.close();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#E0AA3E" />
          <Text style={styles.loadingText}>Connecting to ROS...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Camera Viewer</Text>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isConnected ? 'videocam' : 'alert-circle'} 
            size={20} 
            color={isConnected ? '#4CAF50' : '#E0AA3E'} 
          />
          <Text style={[styles.statusText, {color: isConnected ? '#4CAF50' : '#E0AA3E'}]}>
            {isConnected ? 'ROS Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Camera Feed */}
      <View style={styles.cameraContainer}>
        {ros && <Camera ros={ros} topic={topic} />}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="refresh" size={20} color="#E0AA3E" />
          <Text style={styles.controlText}>Reconnect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262626',
  },
  title: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#333',
  },
  controls: {
    padding: 20,
    backgroundColor: '#262626',
    margin: 10,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  controlButton: {
    alignItems: 'center',
    padding: 80,
    backgroundColor: '#333',
    borderRadius: 10,
    minWidth: 90,
    justifyContent: 'center',
  },
  controlText: {
    color: '#E0AA3E',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },
});

export default CameraScreen;

