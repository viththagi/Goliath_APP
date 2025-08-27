import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ROSLIB from 'roslib';

const { width, height } = Dimensions.get('window');

const NavigationScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [navStatus, setNavStatus] = useState('ready'); // ready, navigating, paused, arrived
  const [robotPose, setRobotPose] = useState({ x: 0, y: 0, theta: 0 });
  const [goalPose, setGoalPose] = useState({ x: 0, y: 0, theta: 0 });
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [customGoal, setCustomGoal] = useState({ x: '', y: '', theta: '' });

  // Hard-coded ROS connection for Nav2
  const ROS_IP = '192.168.2.23'; // Your Nav2 robot's IP
  const ROS_PORT = 9090;
  const ros = useRef(null);
  const poseSubscriber = useRef(null);
  const batterySubscriber = useRef(null);
  const goalPublisher = useRef(null);
  const cancelClient = useRef(null);

  // ROS Topics for Nav2
  const POSE_TOPIC = '/amcl_pose'; // Robot pose estimate
  const BATTERY_TOPIC = '/battery_state'; // Battery status
  const GOAL_TOPIC = '/goal_pose'; // Navigation goal
  const CANCEL_TOPIC = '/cancel_goal'; // Cancel navigation

  // Predefined goals
  const predefinedGoals = [
    { name: 'Home', x: 0, y: 0, theta: 0 },
    { name: 'Kitchen', x: 2.5, y: 1.8, theta: 1.57 },
    { name: 'Living Room', x: 3.2, y: -2.1, theta: 3.14 },
    { name: 'Bedroom', x: -1.8, y: 2.5, theta: 0 },
  ];

  useEffect(() => {
    initializeROS();
    
    return () => {
      // Cleanup on unmount
      if (ros.current) {
        ros.current.close();
      }
    };
  }, []);

  const initializeROS = () => {
    console.log(`Connecting to ROS at ${ROS_IP}:${ROS_PORT} for Navigation...`);
    
    // Create a new ROS connection
    ros.current = new ROSLIB.Ros({
      url: `ws://${ROS_IP}:${ROS_PORT}`
    });

    // Add event listeners
    ros.current.on('connection', () => {
      console.log('Connected to ROS bridge for Navigation');
      setIsConnected(true);
      setupSubscribers();
      setupPublishers();
      setIsLoading(false);
    });

    ros.current.on('error', (error) => {
      console.error('Error connecting to ROS:', error);
      setIsConnected(false);
      setIsLoading(false);
      Alert.alert('Connection Error', `Failed to connect to ${ROS_IP}:${ROS_PORT}`);
    });

    ros.current.on('close', () => {
      console.log('Connection to ROS closed');
      setIsConnected(false);
    });

    // Attempt to connect
    try {
      ros.current.connect(`ws://${ROS_IP}:${ROS_PORT}`);
    } catch (error) {
      console.error('Failed to connect to ROS:', error);
      setIsLoading(false);
      Alert.alert('Connection Error', `Failed to connect to ${ROS_IP}:${ROS_PORT}`);
    }
  };

  const setupSubscribers = () => {
    if (!ros.current) return;

    // Subscribe to robot pose
    poseSubscriber.current = new ROSLIB.Topic({
      ros: ros.current,
      name: POSE_TOPIC,
      messageType: 'geometry_msgs/PoseWithCovarianceStamped'
    });

    poseSubscriber.current.subscribe((message) => {
      const pose = message.pose.pose;
      setRobotPose({
        x: pose.position.x,
        y: pose.position.y,
        theta: getYawFromQuaternion(pose.orientation)
      });
    });

    // Subscribe to battery status (if available)
    batterySubscriber.current = new ROSLIB.Topic({
      ros: ros.current,
      name: BATTERY_TOPIC,
      messageType: 'sensor_msgs/BatteryState'
    });

    batterySubscriber.current.subscribe((message) => {
      setBatteryLevel(Math.round(message.percentage * 100));
    });

    console.log('Navigation subscribers initialized');
  };

  const setupPublishers = () => {
    if (!ros.current) return;

    // Setup goal publisher
    goalPublisher.current = new ROSLIB.Topic({
      ros: ros.current,
      name: GOAL_TOPIC,
      messageType: 'geometry_msgs/PoseStamped'
    });

    // Setup cancel action client
    cancelClient.current = new ROSLIB.Topic({
      ros: ros.current,
      name: CANCEL_TOPIC,
      messageType: 'action_msgs/GoalCancel'
    });

    console.log('Navigation publishers initialized');
  };

  const getYawFromQuaternion = (quat) => {
    // Convert quaternion to Euler angles (yaw)
    const x = quat.x;
    const y = quat.y;
    const z = quat.z;
    const w = quat.w;
    
    // Yaw calculation
    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    return Math.atan2(siny_cosp, cosy_cosp);
  };

  const quaternionFromYaw = (yaw) => {
    return {
      x: 0,
      y: 0,
      z: Math.sin(yaw / 2),
      w: Math.cos(yaw / 2)
    };
  };

  const sendGoal = (x, y, theta) => {
    if (!goalPublisher.current || !isConnected) {
      Alert.alert('Error', 'Not connected to ROS. Cannot send goal.');
      return;
    }

    setGoalPose({ x, y, theta });
    setNavStatus('navigating');

    const goalMessage = new ROSLIB.Message({
      header: {
        stamp: { sec: 0, nanosec: 0 },
        frame_id: 'map'
      },
      pose: {
        position: { x, y, z: 0 },
        orientation: quaternionFromYaw(theta)
      }
    });

    goalPublisher.current.publish(goalMessage);
    console.log(`Navigation goal sent: x=${x}, y=${y}, theta=${theta}`);
    Alert.alert('Goal Sent', `Navigating to x=${x.toFixed(2)}, y=${y.toFixed(2)}`);
  };

  const cancelNavigation = () => {
    if (!cancelClient.current || !isConnected) {
      Alert.alert('Error', 'Not connected to ROS. Cannot cancel navigation.');
      return;
    }

    const cancelMessage = new ROSLIB.Message({
      goal_info: {
        goal_id: {
          stamp: { sec: 0, nanosec: 0 },
          id: ''
        }
      }
    });

    cancelClient.current.publish(cancelMessage);
    setNavStatus('ready');
    console.log('Navigation cancelled');
    Alert.alert('Navigation Cancelled', 'Current goal has been cancelled');
  };

  const sendCustomGoal = () => {
    const x = parseFloat(customGoal.x) || 0;
    const y = parseFloat(customGoal.y) || 0;
    const theta = parseFloat(customGoal.theta) || 0;
    
    sendGoal(x, y, theta);
    setGoalModalVisible(false);
    setCustomGoal({ x: '', y: '', theta: '' });
  };

  const getStatusColor = () => {
    switch(navStatus) {
      case 'ready': return '#4CAF50';
      case 'navigating': return '#2196F3';
      case 'paused': return '#FF9800';
      case 'arrived': return '#9C27B0';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch(navStatus) {
      case 'ready': return 'Ready';
      case 'navigating': return 'Navigating to Goal';
      case 'paused': return 'Navigation Paused';
      case 'arrived': return 'Goal Reached';
      default: return 'Unknown Status';
    }
  };

  const reconnectROS = () => {
    setIsLoading(true);
    initializeROS();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#E0AA3E" />
          <Text style={styles.loadingText}>Connecting to ROS for Navigation...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nav2 Navigation</Text>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isConnected ? 'cloud-done' : 'cloud-offline'} 
            size={20} 
            color={isConnected ? '#4CAF50' : '#F44336'} 
          />
          <Text style={[styles.statusText, {color: isConnected ? '#4CAF50' : '#F44336'}]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          {!isConnected && (
            <TouchableOpacity onPress={reconnectROS} style={styles.reconnectButton}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.reconnectText}>Reconnect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Status Panel */}
        <View style={styles.statusPanel}>
          <View style={styles.statusDisplay}>
            <View style={[styles.statusIndicator, {backgroundColor: getStatusColor()}]} />
            <Text style={styles.statusDisplayText}>{getStatusText()}</Text>
          </View>
          
          <View style={styles.batteryDisplay}>
            <Ionicons name="battery-half" size={20} color="#E0AA3E" />
            <Text style={styles.batteryText}>{batteryLevel}%</Text>
          </View>
        </View>

        {/* Position Info */}
        <View style={styles.positionContainer}>
          <Text style={styles.sectionTitle}>Current Position</Text>
          <View style={styles.positionRow}>
            <Text style={styles.positionLabel}>X:</Text>
            <Text style={styles.positionValue}>{robotPose.x.toFixed(2)}m</Text>
          </View>
          <View style={styles.positionRow}>
            <Text style={styles.positionLabel}>Y:</Text>
            <Text style={styles.positionValue}>{robotPose.y.toFixed(2)}m</Text>
          </View>
          <View style={styles.positionRow}>
            <Text style={styles.positionLabel}>θ:</Text>
            <Text style={styles.positionValue}>{(robotPose.theta * 180/Math.PI).toFixed(0)}°</Text>
          </View>
        </View>

        {/* Current Goal */}
        {navStatus === 'navigating' && (
          <View style={styles.goalContainer}>
            <Text style={styles.sectionTitle}>Current Goal</Text>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Target:</Text>
              <Text style={styles.goalValue}>
                x={goalPose.x.toFixed(2)}m, y={goalPose.y.toFixed(2)}m
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Orientation:</Text>
              <Text style={styles.goalValue}>{(goalPose.theta * 180/Math.PI).toFixed(0)}°</Text>
            </View>
          </View>
        )}

        {/* Predefined Goals */}
        <View style={styles.goalsContainer}>
          <Text style={styles.sectionTitle}>Predefined Goals</Text>
          <View style={styles.goalsGrid}>
            {predefinedGoals.map((goal, index) => (
              <TouchableOpacity
                key={index}
                style={styles.goalButton}
                onPress={() => sendGoal(goal.x, goal.y, goal.theta)}
                disabled={!isConnected}
              >
                <Ionicons name="navigate" size={24} color="#E0AA3E" />
                <Text style={styles.goalButtonText}>{goal.name}</Text>
                <Text style={styles.goalButtonCoords}>
                  ({goal.x}, {goal.y})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Navigation Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Navigation Controls</Text>
          
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setGoalModalVisible(true)}
              disabled={!isConnected}
            >
              <Ionicons name="add-circle" size={20} color="#E0AA3E" />
              <Text style={styles.controlText}>Custom Goal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, navStatus !== 'navigating' && styles.controlButtonDisabled]}
              onPress={cancelNavigation}
              disabled={navStatus !== 'navigating' || !isConnected}
            >
              <Ionicons name="stop-circle" size={20} color="#F44336" />
              <Text style={styles.controlText}>Cancel Nav</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setSettingsModalVisible(true)}
            >
              <Ionicons name="settings" size={20} color="#E0AA3E" />
              <Text style={styles.controlText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connection Info */}
        <View style={styles.infoPanel}>
          <Text style={styles.sectionTitle}>Connection Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ROS IP:</Text>
            <Text style={styles.infoValue}>{ROS_IP}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Port:</Text>
            <Text style={styles.infoValue}>{ROS_PORT}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pose Topic:</Text>
            <Text style={styles.infoValue}>{POSE_TOPIC}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Goal Topic:</Text>
            <Text style={styles.infoValue}>{GOAL_TOPIC}</Text>
          </View>
          
          {!isConnected && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Not connected to ROS. Navigation commands will not work.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Custom Goal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={goalModalVisible}
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Custom Goal</Text>
              <TouchableOpacity onPress={() => setGoalModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>X Position (meters):</Text>
                <TextInput
                  style={styles.input}
                  value={customGoal.x}
                  onChangeText={(text) => setCustomGoal({...customGoal, x: text})}
                  placeholder="0.0"
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Y Position (meters):</Text>
                <TextInput
                  style={styles.input}
                  value={customGoal.y}
                  onChangeText={(text) => setCustomGoal({...customGoal, y: text})}
                  placeholder="0.0"
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Orientation (degrees):</Text>
                <TextInput
                  style={styles.input}
                  value={customGoal.theta}
                  onChangeText={(text) => setCustomGoal({...customGoal, theta: text})}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#666"
                />
              </View>
              
              <TouchableOpacity 
                style={styles.sendGoalButton}
                onPress={sendCustomGoal}
                disabled={!isConnected}
              >
                <Text style={styles.sendGoalButtonText}>Send Navigation Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Navigation Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Current Position</Text>
                <View style={styles.positionInfo}>
                  <Text style={styles.positionInfoText}>
                    X: {robotPose.x.toFixed(2)}m
                  </Text>
                  <Text style={styles.positionInfoText}>
                    Y: {robotPose.y.toFixed(2)}m
                  </Text>
                  <Text style={styles.positionInfoText}>
                    θ: {(robotPose.theta * 180/Math.PI).toFixed(0)}°
                  </Text>
                </View>
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>ROS Connection</Text>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionText}>IP: {ROS_IP}</Text>
                  <Text style={styles.connectionText}>Port: {ROS_PORT}</Text>
                  <Text style={styles.connectionText}>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
                </View>
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Battery Level</Text>
                <View style={styles.batteryInfo}>
                  <Ionicons 
                    name={batteryLevel > 70 ? "battery-full" : batteryLevel > 30 ? "battery-half" : "battery-dead"} 
                    size={24} 
                    color={batteryLevel > 30 ? "#4CAF50" : "#F44336"} 
                  />
                  <Text style={styles.batteryInfoText}>{batteryLevel}%</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    padding: 20,
  },
  loadingText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
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
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0AA3E',
    padding: 5,
    borderRadius: 5,
    marginLeft: 10,
  },
  reconnectText: {
    color: '#000',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },
  statusPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#262626',
    margin: 15,
    borderRadius: 15,
  },
  statusDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusDisplayText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  batteryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 8,
  },
  batteryText: {
    color: '#E0AA3E',
    marginLeft: 5,
    fontWeight: '600',
  },
  positionContainer: {
    padding: 15,
    backgroundColor: '#262626',
    margin: 15,
    borderRadius: 15,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  positionLabel: {
    color: '#CCC',
    fontSize: 16,
  },
  positionValue: {
    color: '#E0AA3E',
    fontSize: 16,
    fontWeight: '500',
  },
  goalContainer: {
    padding: 15,
    backgroundColor: '#1E3A5F',
    margin: 15,
    borderRadius: 15,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  goalLabel: {
    color: '#90CAF9',
    fontSize: 16,
  },
  goalValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  goalsContainer: {
    padding: 15,
    backgroundColor: '#262626',
    margin: 15,
    borderRadius: 15,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  goalButton: {
    width: '48%',
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  goalButtonText: {
    color: '#E0AA3E',
    fontWeight: '600',
    marginTop: 5,
    fontSize: 14,
  },
  goalButtonCoords: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  controlsSection: {
    padding: 15,
    backgroundColor: '#262626',
    margin: 15,
    borderRadius: 15,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  controlText: {
    color: '#E0AA3E',
    marginLeft: 8,
    fontWeight: '600',
  },
  infoPanel: {
    padding: 15,
    backgroundColor: '#262626',
    margin: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    color: '#CCC',
    fontSize: 14,
  },
  infoValue: {
    color: '#E0AA3E',
    fontSize: 14,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#332900',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  warningText: {
    color: '#FF9800',
    marginLeft: 10,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#262626',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    maxHeight: height * 0.5,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#FFF',
    marginBottom: 5,
    fontSize: 16,
  },
  input: {
    backgroundColor: '#333',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  sendGoalButton: {
    backgroundColor: '#E0AA3E',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  sendGoalButtonText: {
    color: '#1A1A1A',
    fontWeight: '600',
    fontSize: 16,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '500',
  },
  positionInfo: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
  },
  positionInfoText: {
    color: '#E0AA3E',
    fontSize: 14,
    marginBottom: 5,
  },
  connectionInfo: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
  },
  connectionText: {
    color: '#E0AA3E',
    fontSize: 14,
    marginBottom: 5,
  },
  batteryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
  },
  batteryInfoText: {
    color: '#E0AA3E',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '600',
  },
});

export default NavigationScreen;
