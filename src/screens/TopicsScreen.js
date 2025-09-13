// src/screens/TopicEchoScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ROSLIB from 'roslib';

const TopicEchoScreen = () => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ros, setRos] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('/unilidar/cloud');
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  
  // Use refs for cleanup and screen state tracking
  const currentSubscriptionRef = useRef(null);
  const rosInstanceRef = useRef(null);
  const isScreenActiveRef = useRef(true);

  // Track screen focus/unfocus
  useEffect(() => {
    isScreenActiveRef.current = true;
    
    return () => {
      isScreenActiveRef.current = false;
      cleanupSubscriptions();
      cleanupROS();
    };
  }, []);

  const cleanupSubscriptions = () => {
    if (currentSubscriptionRef.current) {
      currentSubscriptionRef.current.unsubscribe();
      currentSubscriptionRef.current = null;
      console.log('Unsubscribed from topic');
    }
  };

  const cleanupROS = () => {
    if (rosInstanceRef.current) {
      rosInstanceRef.current.close();
      rosInstanceRef.current = null;
      console.log('Closed ROS connection');
    }
  };

  // Create ROS connection
  useEffect(() => {
    if (!isScreenActiveRef.current) return;

    console.log('Creating ROS connection for TopicEchoScreen...');
    
    const rosInstance = new ROSLIB.Ros({
      url: 'ws://192.168.2.7:9090'
    });

    rosInstanceRef.current = rosInstance;
    setRos(rosInstance);

    rosInstance.on('connection', () => {
      if (!isScreenActiveRef.current) return;
      console.log('TopicEchoScreen: ROS connected successfully');
      setIsConnected(true);
      fetchTopics();
    });

    rosInstance.on('error', (error) => {
      if (!isScreenActiveRef.current) return;
      console.log('TopicEchoScreen: ROS connection error', error);
      setIsConnected(false);
    });

    rosInstance.on('close', () => {
      if (!isScreenActiveRef.current) return;
      console.log('TopicEchoScreen: ROS connection closed');
      setIsConnected(false);
    });

    return () => {
      cleanupSubscriptions();
      cleanupROS();
    };
  }, []);

  // Subscribe to topic when selection changes
  useEffect(() => {
    if (!isScreenActiveRef.current) return;

    cleanupSubscriptions();

    if (ros && isConnected && selectedTopic) {
      subscribeToTopic(selectedTopic);
    }
  }, [selectedTopic, ros, isConnected]);

  // Immediately fetch topics when connected
  useEffect(() => {
    if (ros && isConnected && topics.length === 0) {
      fetchTopics();
    }
  }, [ros, isConnected]);

  // Fetch topics from ROS API or use fallback list
  const fetchTopics = async () => {
    if (!isScreenActiveRef.current) {
      return;
    }

    console.log('fetchTopics called, current isConnected:', isConnected);
    setLoading(true);
    
    // Always set fallback topics immediately
    const fallbackTopics = [
      '/clicked_point',
      '/client_count',
      '/connected_clients',
      '/goal_pose',
      '/initialpose',
      '/parameter_events',
      '/point_cloud',
      '/position_controller/commands',
      '/rosout',
      '/tf',
      '/tf_static',
      '/unilidar/cloud',
      '/unilidar/imu',
      '/cmd_vel',
      '/odom',
      '/scan',
      '/joint_states'
    ];

    console.log('Setting fallback topics immediately:', fallbackTopics);
    setTopics(fallbackTopics);
    setLoading(false);
    
    // Try to get real topics in background if connected
    if (ros && isConnected) {
      try {
        console.log('Attempting to fetch real topics via ROS API...');
        const topicList = await fetchTopicsWithROSAPI();
        console.log('ROS API returned topics:', topicList);
        
        if (isScreenActiveRef.current && topicList && topicList.length > 0) {
          console.log('Updating with real topics from ROS API');
          setTopics(topicList);
        }
      } catch (error) {
        console.log('ROS API failed, keeping fallback topics:', error.message);
      }
    }
  };

  const fetchTopicsWithROSAPI = () => {
    return new Promise((resolve, reject) => {
      if (!ros || !isConnected || !isScreenActiveRef.current) {
        reject(new Error('Not connected to ROS'));
        return;
      }

      const topicListService = new ROSLIB.Service({
        ros: ros,
        name: '/rosapi/topics',
        serviceType: 'rosapi/GetTopics'
      });

      const request = new ROSLIB.ServiceRequest({});

      const timeout = setTimeout(() => {
        reject(new Error('rosapi service timeout'));
      }, 5000);

      topicListService.callService(request, (result) => {
        clearTimeout(timeout);
        
        if (result && result.topics && isScreenActiveRef.current) {
          resolve(result.topics);
        } else {
          reject(new Error('rosapi returned empty result'));
        }
      });
    });
  };

  const subscribeToTopic = (topicName) => {
    if (!ros || !isConnected || !isScreenActiveRef.current) return;

    try {
      let messageType = 'std_msgs/String';
      
      if (topicName.includes('cloud') || topicName.includes('point')) {
        messageType = 'sensor_msgs/PointCloud2';
      } else if (topicName.includes('cmd_vel')) {
        messageType = 'geometry_msgs/Twist';
      } else if (topicName.includes('odom')) {
        messageType = 'nav_msgs/Odometry';
      } else if (topicName.includes('scan')) {
        messageType = 'sensor_msgs/LaserScan';
      } else if (topicName.includes('joint')) {
        messageType = 'sensor_msgs/JointState';
      }

      const topic = new ROSLIB.Topic({
        ros: ros,
        name: topicName,
        messageType: messageType
      });

      topic.subscribe((message) => {
        if (!isScreenActiveRef.current) return;

        const timestamp = new Date().toLocaleTimeString();
        let displayData = '';

        if (messageType === 'sensor_msgs/PointCloud2') {
          displayData = `Points: ${message.width * message.height}, Step: ${message.point_step} bytes`;
        } else if (messageType === 'geometry_msgs/Twist') {
          displayData = `Linear: [${message.linear.x?.toFixed(2) || 0}, ${message.linear.y?.toFixed(2) || 0}, ${message.linear.z?.toFixed(2) || 0}], Angular: [${message.angular.x?.toFixed(2) || 0}, ${message.angular.y?.toFixed(2) || 0}, ${message.angular.z?.toFixed(2) || 0}]`;
        } else if (messageType === 'std_msgs/String') {
          displayData = `Data: ${message.data}`;
        } else {
          displayData = JSON.stringify(message).substring(0, 100) + '...';
        }

        setMessages(prev => [...prev, {
          timestamp: timestamp,
          data: displayData,
          topic: topicName,
          messageType: messageType
        }].slice(-50));
      });

      currentSubscriptionRef.current = topic;
      setMessages([]);

    } catch (error) {
      console.error('Error subscribing to topic:', error);
      if (isScreenActiveRef.current) {
        Alert.alert('Error', `Failed to subscribe to ${topicName}: ${error.message}`);
      }
    }
  };

  const handleTopicSelect = (topic) => {
    if (!isScreenActiveRef.current) return;
    setSelectedTopic(topic);
    setTopicModalVisible(false);
  };

  const clearMessages = () => {
    if (!isScreenActiveRef.current) return;
    setMessages([]);
  };

  const reconnect = () => {
    if (!isScreenActiveRef.current) return;
    
    cleanupSubscriptions();
    cleanupROS();
    
    // Recreate connection
    const newRosInstance = new ROSLIB.Ros({
      url: 'ws://192.168.2.7:9090'
    });

    rosInstanceRef.current = newRosInstance;
    setRos(newRosInstance);

    Alert.alert('Info', 'Reconnecting to ROS...');
  };

  // Add this useEffect to monitor topics state changes:
  useEffect(() => {
    console.log('Topics state changed:', topics);
    console.log('Topics length:', topics.length);
  }, [topics]);

  // Add this useEffect to monitor modal visibility:
  useEffect(() => {
    console.log('Modal visibility changed:', topicModalVisible);
    if (topicModalVisible) {
      console.log('Modal opened, current topics:', topics);
    }
  }, [topicModalVisible]);

  return (
    <View style={styles.container}>
      {/* Header - Modified to match other pages */}
      <View style={styles.header}>
        <Text style={styles.title}>Topic Echo</Text>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isConnected ? 'cloud-done' : 'cloud-offline'} 
            size={20} 
            color={isConnected ? '#4CAF50' : '#F44336'} 
          />
          <Text style={[styles.statusText, {color: isConnected ? '#4CAF50' : '#F44336'}]}>
            {isConnected ? 'Connected' : 'Offline'}
          </Text>
          {!isConnected && (
            <TouchableOpacity onPress={reconnect} style={styles.reconnectButton}>
              <Ionicons name="refresh" size={16} color="#1A1A1A" />
              <Text style={styles.reconnectText}>Reconnect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Topic Selection - Remove the separate reconnect button */}
      <View style={styles.topicSelector}>
        <TouchableOpacity 
          style={styles.topicButton}
          onPress={() => {
            console.log('Dropdown clicked, isConnected:', isConnected);
            
            // Always allow topic selection, even when disconnected
            fetchTopics().then(() => {
              setTopicModalVisible(true);
            });
          }}
        >
          <Ionicons name="list" size={20} color={!isConnected ? '#666' : '#E0AA3E'} />
          <Text style={[styles.topicButtonText, {color: !isConnected ? '#666' : '#E0AA3E'}]} numberOfLines={1}>
            {selectedTopic || 'Select Topic'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={!isConnected ? '#666' : '#E0AA3E'} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchTopics}
          disabled={!isConnected || loading}
        >
          <Ionicons name="refresh" size={20} color={loading ? '#666' : '#E0AA3E'} />
        </TouchableOpacity>

        {//Add this temporary debug button after the refresh button:
        <TouchableOpacity 
          style={[styles.refreshButton, {backgroundColor: '#F44336'}]}
          onPress={() => {
            console.log('Debug: Manually setting topics');
            const debugTopics = [
              '/clicked_point',
              '/client_count', 
              '/connected_clients',
              '/goal_pose',
              '/initialpose',
              '/parameter_events',
              '/point_cloud',
              '/position_controller/commands',
              '/rosout',
              '/tf',
              '/tf_static',
              '/unilidar/cloud',
              '/unilidar/imu'
            ];
            setTopics(debugTopics);
            console.log('Debug: Topics set to:', debugTopics);
          }}
        >
          <Ionicons name="bug" size={20} color="#FFF" />
        </TouchableOpacity> }
      </View>

      {/* Connection Info */}
      <View style={styles.connectionInfo}>
        <Text style={styles.connectionText}>ws://192.168.2.7:9090</Text>
        {selectedTopic && (
          <Text style={styles.connectionSubtext}>Listening to: {selectedTopic}</Text>
        )}
      </View>

      {/* Modified Controls - Only keep Clear Messages button */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.button}
          onPress={clearMessages}
        >
          <Ionicons name="trash" size={16} color="#FFF" />
          <Text style={styles.buttonText}>Clear Messages</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.statText}>
          Messages: {messages.length} | Topic: {selectedTopic || 'None'}
        </Text>
      </View>

      {/* Messages List */}
      <ScrollView style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="radio" size={48} color="#666" />
            <Text style={styles.emptyText}>No messages received</Text>
            <Text style={styles.emptySubtext}>
              {isConnected 
                ? 'Select a topic and wait for messages...'
                : 'Waiting for ROS connection...'
              }
            </Text>
          </View>
        ) : (
          messages.map((msg, index) => (
            <View key={index} style={styles.messageItem}>
              <Text style={styles.timestamp}>[{msg.timestamp}] {msg.topic}</Text>
              <Text style={styles.message}>{msg.data}</Text>
            </View>
          )).reverse() // Show newest first
        )}
      </ScrollView>

      {/* Topic Selection Modal */}
      <Modal
        visible={topicModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTopicModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Topic</Text>
              <TouchableOpacity onPress={() => setTopicModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#E0AA3E" />
                <Text style={styles.loadingText}>Loading topics...</Text>
              </View>
            ) : (
              <FlatList
                data={topics}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.topicItem,
                      item === selectedTopic && styles.selectedTopicItem
                    ]}
                    onPress={() => handleTopicSelect(item)}
                  >
                    <Ionicons 
                      name="radio" 
                      size={16} 
                      color={item === selectedTopic ? '#E0AA3E' : '#888'} 
                    />
                    <Text style={[
                      styles.topicName,
                      item === selectedTopic && styles.selectedTopicName
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyTopics}>
                    <Text style={styles.noTopicsText}>
                      No topics available (Connected: {isConnected ? 'Yes' : 'No'})
                    </Text>
                    <Text style={styles.noTopicsText}>
                      Topics length: {topics.length}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      console.log('Retry button pressed');
                      fetchTopics();
                    }} style={styles.retryButton}>
                      <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262626',
    minHeight: 80,
  },
  title: {
    fontSize: 24, // Change this from whatever it currently is
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1, // Add this line
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 10,
    minWidth: 120,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0AA3E',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 5,
    marginLeft: 8,
  },
  reconnectText: {
    color: '#1A1A1A',
    fontSize: 11,
    marginLeft: 3,
    fontWeight: '600',
  },
  topicSelector: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#262626',
  },
  topicButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  topicButtonText: {
    color: '#E0AA3E',
    fontWeight: '600',
    flex: 1,
  },
  refreshButton: {
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0AA3E',
    padding: 12,
    borderRadius: 10,
    gap: 8,
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
  messagesContainer: {
    flex: 1,
    padding: 15,
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
  messageItem: {
    backgroundColor: '#2A2A2A',
    padding: 12,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#262626',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 10,
  },
  selectedTopicItem: {
    backgroundColor: '#333',
  },
  topicName: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  selectedTopicName: {
    color: '#E0AA3E',
    fontWeight: '600',
  },
  noTopicsText: {
    color: '#666',
    textAlign: 'center',
    padding: 40,
  },
  emptyTopics: {
    padding: 40,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#E0AA3E',
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
  },
  retryText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
  },
});

export default TopicEchoScreen;
