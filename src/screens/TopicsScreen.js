import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ROSLIB from 'roslib';

export default function TopicsScreen() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [ros, setRos] = useState(null);

  // Create a separate ROS connection for this screen
  useEffect(() => {
    console.log('Creating ROS connection for TopicsScreen...');
    
    const rosInstance = new ROSLIB.Ros({
      url: 'ws://192.168.2.23:9090' // Hardcode your robot's IP
    });

    setRos(rosInstance);

    rosInstance.on('connection', () => {
      console.log('TopicsScreen: ROS connected successfully');
      setIsConnected(true);
    });

    rosInstance.on('error', (error) => {
      console.log('TopicsScreen: ROS connection error', error);
      setIsConnected(false);
      Alert.alert('Connection Error', `Failed to connect: ${error.message}`);
    });

    rosInstance.on('close', () => {
      console.log('TopicsScreen: ROS connection closed');
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      if (rosInstance) {
        rosInstance.close();
        console.log('TopicsScreen: Cleaned up ROS connection');
      }
    };
  }, []);

  const fetchTopicsWithROSAPI = () => {
    return new Promise((resolve, reject) => {
      if (!ros || !isConnected) {
        reject(new Error('Not connected to ROS'));
        return;
      }

      console.log('Calling rosapi service...');
      
      const topicListService = new ROSLIB.Service({
        ros: ros,
        name: '/rosapi/topics',
        serviceType: 'rosapi/GetTopics'
      });

      const request = new ROSLIB.ServiceRequest({});

      // Set timeout for the service call
      const timeout = setTimeout(() => {
        reject(new Error('rosapi service timeout'));
      }, 5000);

      topicListService.callService(request, (result) => {
        clearTimeout(timeout);
        
        if (result && result.topics) {
          console.log('Received topics from rosapi:', result.topics.length);
          resolve(result.topics);
        } else {
          reject(new Error('rosapi returned empty result'));
        }
      });
    });
  };

  const fetchTopics = async () => {
    if (!ros || !isConnected) {
      Alert.alert('Error', 'Not connected to ROS. Please wait for connection.');
      return;
    }

    setLoading(true);
    setTopics([]);
    
    try {
      console.log('Fetching topics...');
      const topicList = await fetchTopicsWithROSAPI();
      setTopics(topicList);
      
      if (topicList.length > 0) {
        Alert.alert('Success', `Found ${topicList.length} topics using rosapi`);
      }
      
    } catch (error) {
      console.log('rosapi failed, using fallback topics:', error.message);
      
      // Fallback to manual topic discovery or common topics
      const fallbackTopics = [
        '/unilidar/cloud',
        '/joint_state/commands',
        '/cmd_vel',
        '/odom',
        '/scan',
        '/tf',
        '/tf_static',
        '/rosout',
        '/parameter_events',
        '/rosapi/topics'
      ];
      
      setTopics(fallbackTopics);
      Alert.alert(
        'Info', 
        `Using fallback topics. rosapi service might not be available.\n\nError: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testConnection = () => {
    if (!ros) {
      Alert.alert('Error', 'ROS instance not created yet');
      return;
    }
    
    const status = ros.isConnected ? 'Connected' : 'Disconnected';
    Alert.alert(
      'Connection Test',
      `Status: ${status}\n` +
      `URL: ${ros.url || 'Not set'}\n` +
      `Connection State: ${ros.connectionState || 'unknown'}`
    );
  };

  const reconnect = () => {
    if (ros) {
      ros.close();
      // The useEffect will recreate the connection
      Alert.alert('Info', 'Reconnecting to ROS...');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ROS Topics</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Connection Info */}
      <View style={styles.connectionInfo}>
        <Text style={styles.connectionText}>ws://192.168.2.23:9090</Text>
        <Text style={styles.connectionSubtext}>Direct connection</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.button, (!isConnected || loading) && styles.buttonDisabled]}
          onPress={fetchTopics}
          disabled={!isConnected || loading}
        >
          <Ionicons name="refresh" size={20} color="#FFF" />
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Get Topics'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.buttonSecondary}
          onPress={testConnection}
        >
          <Ionicons name="wifi" size={20} color="#E0AA3E" />
          <Text style={styles.buttonTextSecondary}>Test</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.buttonSecondary}
          onPress={reconnect}
        >
          <Ionicons name="reload" size={20} color="#E0AA3E" />
          <Text style={styles.buttonTextSecondary}>Reconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.statText}>
          Topics: {topics.length} | Status: {isConnected ? 'Online' : 'Offline'}
        </Text>
      </View>

      {/* Topics List */}
      <ScrollView style={styles.topicsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E0AA3E" />
            <Text style={styles.loadingText}>Fetching topics from ROS...</Text>
            <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
          </View>
        ) : topics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list" size={48} color="#666" />
            <Text style={styles.emptyText}>No topics loaded</Text>
            <Text style={styles.emptySubtext}>
              {isConnected 
                ? 'Press "Get Topics" to discover available topics'
                : 'Waiting for ROS connection...'
              }
            </Text>
          </View>
        ) : (
          topics.map((topic, index) => (
            <View key={index} style={styles.topicItem}>
              <Ionicons 
                name="radio" 
                size={16} 
                color={topic === '/unilidar/cloud' ? '#E0AA3E' : '#888'} 
              />
              <Text style={[
                styles.topicName,
                topic === '/unilidar/cloud' && styles.highlightedTopic
              ]} numberOfLines={1}>
                {topic}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isConnected 
            ? 'Connected to robot at 192.168.2.23' 
            : 'Connecting to 192.168.2.23...'
          }
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#262626',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 15,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  connectionInfo: {
    padding: 15,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
  },
  connectionText: {
    color: '#E0AA3E',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  connectionSubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#262626',
  },
  button: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0AA3E',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#E0AA3E',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  buttonText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#E0AA3E',
    fontWeight: '600',
    fontSize: 12,
  },
  stats: {
    padding: 10,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
  },
  statText: {
    color: '#E0AA3E',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  topicsContainer: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#E0AA3E',
    marginTop: 16,
    fontSize: 16,
  },
  loadingSubtext: {
    color: '#888',
    marginTop: 8,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  topicName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'monospace',
    flex: 1,
  },
  highlightedTopic: {
    color: '#E0AA3E',
    fontWeight: '600',
  },
  footer: {
    padding: 15,
    backgroundColor: '#262626',
    alignItems: 'center',
  },
  footerText: {
    color: '#888',
    fontSize: 12,
  },
});
