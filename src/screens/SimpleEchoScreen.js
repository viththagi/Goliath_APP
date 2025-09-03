// src/screens/SimpleEchoScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ROSLIB from 'roslib';

const SimpleEchoScreen = () => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ros, setRos] = useState(null);

  useEffect(() => {
    // Create a new ROS connection specifically for this screen
    const rosInstance = new ROSLIB.Ros({
      url: 'ws://192.168.2.23:9090' // Hardcode your robot's IP
    });

    setRos(rosInstance);

    rosInstance.on('connection', () => {
      console.log('Connected to ROS in Echo Screen');
      setIsConnected(true);
      
      // Subscribe to the point cloud topic
      const topic = new ROSLIB.Topic({
        ros: rosInstance,
        name: '/unilidar/cloud',
        messageType: 'sensor_msgs/PointCloud2'
      });

      topic.subscribe((message) => {
        console.log('Received message in echo screen');
        setMessages(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          data: `Points: ${message.width * message.height}, Step: ${message.point_step} bytes`
        }].slice(-10)); // Keep only last 10 messages
      });
    });

    rosInstance.on('error', (error) => {
      console.log('ROS connection error in echo:', error);
      setIsConnected(false);
    });

    rosInstance.on('close', () => {
      console.log('ROS connection closed in echo');
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      if (rosInstance) {
        rosInstance.close();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simple Topic Echo</Text>
        <View style={[styles.status, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]}>
          <Ionicons name={isConnected ? 'radio' : 'radio-outline'} size={16} color="#FFF" />
          <Text style={styles.statusText}>{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</Text>
        </View>
      </View>

      <ScrollView style={styles.messages}>
        <Text style={styles.sectionTitle}>Topic: /unilidar/cloud</Text>
        <Text style={styles.sectionTitle}>Message Type: sensor_msgs/PointCloud2</Text>
        
        {messages.length === 0 ? (
          <Text style={styles.noMessages}>No messages received yet...</Text>
        ) : (
          messages.map((msg, index) => (
            <View key={index} style={styles.messageItem}>
              <Text style={styles.timestamp}>[{msg.timestamp}]</Text>
              <Text style={styles.message}>{msg.data}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setMessages([])}
        >
          <Ionicons name="trash" size={16} color="#FFF" />
          <Text style={styles.buttonText}>Clear Messages</Text>
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
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#262626',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 10,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 15,
    gap: 5,
  },
  statusText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  messages: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    color: '#E0AA3E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  noMessages: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  messageItem: {
    backgroundColor: '#2A2A2A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  timestamp: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  message: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  controls: {
    padding: 15,
    backgroundColor: '#262626',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0AA3E',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  buttonText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
});

export default SimpleEchoScreen;
