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
  Switch,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ROSLIB from 'roslib';

const { width, height } = Dimensions.get('window');

const SlamScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [slamStatus, setSlamStatus] = useState('stopped'); // stopped, initializing, mapping
  const [mapData, setMapData] = useState(null);
  const [robotPose, setRobotPose] = useState({ x: 0, y: 0, theta: 0 });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [slamAlgorithm, setSlamAlgorithm] = useState('async_slam');
  const [mapResolution, setMapResolution] = useState(0.05);
  const [showParticles, setShowParticles] = useState(true);
  const [laserScanData, setLaserScanData] = useState(null);
  const [scanCount, setScanCount] = useState(0);

  // Hard-coded ROS connection for Slam Toolbox
  const ROS_IP = '192.168.2.23'; // Replace with your robot's IP
  const ROS_PORT = 9090;
  const ros = useRef(null);
  const scanSubscriber = useRef(null);
  const mapSubscriber = useRef(null);
  const poseSubscriber = useRef(null);
  const slamService = useRef(null);

  // ROS Topics for Slam Toolbox and Nav2
  const SCAN_TOPIC = '/scan'; // RPLIDAR A1 scan topic
  const MAP_TOPIC = '/map'; // Occupancy grid map
  const POSE_TOPIC = '/amcl_pose'; // Robot pose estimate
  const SLAM_SERVICE = '/slam_toolbox/serialize_map'; // Service to save map

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
    console.log(`Connecting to ROS at ${ROS_IP}:${ROS_PORT} for SLAM...`);
    
    // Create a new ROS connection
    ros.current = new ROSLIB.Ros({
      url: `ws://${ROS_IP}:${ROS_PORT}`
    });

    // Add event listeners
    ros.current.on('connection', () => {
      console.log('Connected to ROS bridge for SLAM');
      setIsConnected(true);
      setupSubscribers();
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

    // Subscribe to laser scan data from RPLIDAR A1
    scanSubscriber.current = new ROSLIB.Topic({
      ros: ros.current,
      name: SCAN_TOPIC,
      messageType: 'sensor_msgs/LaserScan'
    });

    scanSubscriber.current.subscribe((message) => {
      setLaserScanData(message);
      setScanCount(prev => prev + 1);
    });

    // Subscribe to map data
    mapSubscriber.current = new ROSLIB.Topic({
      ros: ros.current,
      name: MAP_TOPIC,
      messageType: 'nav_msgs/OccupancyGrid'
    });

    mapSubscriber.current.subscribe((message) => {
      setMapData(message);
    });

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

    // Setup SLAM service for saving maps
    slamService.current = new ROSLIB.Service({
      ros: ros.current,
      name: SLAM_SERVICE,
      serviceType: 'slam_toolbox/srv/SerializePoseGraph'
    });

    console.log('SLAM subscribers initialized');
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

  const startSlam = () => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to ROS. Cannot start SLAM.');
      return;
    }
    
    setSlamStatus('initializing');
    // In a real implementation, you would start slam_toolbox here
    // This might involve calling a service or launching nodes
    
    setTimeout(() => {
      setSlamStatus('mapping');
      Alert.alert('SLAM Started', 'Slam Toolbox is now mapping your environment');
    }, 2000);
  };

  const stopSlam = () => {
    setSlamStatus('stopped');
    Alert.alert('SLAM Stopped', 'Slam Toolbox has been stopped');
    // In a real implementation, you would stop slam_toolbox here
  };

  const saveMap = () => {
    if (!slamService.current) {
      Alert.alert('Error', 'SLAM service not available');
      return;
    }

    // Create a request to save the map
    const request = new ROSLIB.ServiceRequest({
      filename: 'map_' + new Date().toISOString().replace(/[:.]/g, '-')
    });

    slamService.current.callService(request, (result) => {
      if (result.success) {
        Alert.alert('Success', 'Map saved successfully!');
      } else {
        Alert.alert('Error', 'Failed to save map');
      }
    });
  };

  const resetMap = () => {
    Alert.alert('Map Reset', 'Map data has been cleared');
    setMapData(null);
    // In a real implementation, you would call a service to clear the pose graph
  };

  const getStatusColor = () => {
    switch(slamStatus) {
      case 'stopped': return '#F44336';
      case 'initializing': return '#FF9800';
      case 'mapping': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch(slamStatus) {
      case 'stopped': return 'SLAM Stopped';
      case 'initializing': return 'Initializing Slam Toolbox...';
      case 'mapping': return 'Mapping in Progress';
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
          <Text style={styles.loadingText}>Connecting to ROS for SLAM...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SLAM Navigation</Text>
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
        {/* Map Visualization */}
        <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>Live Map</Text>
          <View style={styles.mapPlaceholder}>
            {mapData ? (
              <View style={styles.mapContent}>
                <Text style={styles.mapText}>Map resolution: {mapData.info.resolution}m/pixel</Text>
                <Text style={styles.mapText}>Map size: {mapData.info.width}x{mapData.info.height}</Text>
              </View>
            ) : (
              <View style={styles.emptyMap}>
                <Ionicons name="map" size={64} color="#666" />
                <Text style={styles.emptyMapText}>
                  {slamStatus === 'stopped' ? 'Start SLAM to begin mapping' : 'Building map...'}
                </Text>
              </View>
            )}
            
            {/* Robot Position Indicator */}
            <View 
              style={[
                styles.robotIndicator,
                { 
                  left: '50%', 
                  top: '50%',
                  transform: [{ rotate: `${robotPose.theta}rad` }]
                }
              ]}
            >
              <Ionicons name="navigate" size={24} color="#E0AA3E" />
            </View>
          </View>
          
          {/* SLAM Status */}
          <View style={styles.statusDisplay}>
            <View style={[styles.statusIndicator, {backgroundColor: getStatusColor()}]} />
            <Text style={styles.statusDisplayText}>{getStatusText()}</Text>
          </View>
        </View>

        {/* Laser Scan Info */}
        <View style={styles.scanInfo}>
          <Text style={styles.sectionTitle}>RPLIDAR A1 Scan Data</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scan Topic:</Text>
            <Text style={styles.infoValue}>{SCAN_TOPIC}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scan Count:</Text>
            <Text style={styles.infoValue}>{scanCount}</Text>
          </View>
          {laserScanData && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Range Min/Max:</Text>
                <Text style={styles.infoValue}>
                  {laserScanData.range_min.toFixed(2)}m / {laserScanData.range_max.toFixed(2)}m
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Angle Min/Max:</Text>
                <Text style={styles.infoValue}>
                  {(laserScanData.angle_min * 180/Math.PI).toFixed(0)}° / {(laserScanData.angle_max * 180/Math.PI).toFixed(0)}°
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>SLAM Controls</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={[styles.controlButton, slamStatus !== 'stopped' && styles.controlButtonDisabled]}
              onPress={startSlam}
              disabled={slamStatus !== 'stopped' || !isConnected}
            >
              <Ionicons name="play" size={20} color="#E0AA3E" />
              <Text style={styles.controlText}>Start SLAM</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, slamStatus === 'stopped' && styles.controlButtonDisabled]}
              onPress={stopSlam}
              disabled={slamStatus === 'stopped' || !isConnected}
            >
              <Ionicons name="stop" size={20} color="#F44336" />
              <Text style={styles.controlText}>Stop SLAM</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setSettingsModalVisible(true)}
            >
              <Ionicons name="settings" size={20} color="#E0AA3E" />
              <Text style={styles.controlText}>Settings</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={[styles.controlButtonSecondary, (!mapData || !isConnected) && styles.controlButtonDisabled]}
              onPress={saveMap}
              disabled={!mapData || !isConnected}
            >
              <Ionicons name="save" size={20} color="#2196F3" />
              <Text style={styles.controlTextSecondary}>Save Map</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButtonSecondary, (!mapData || !isConnected) && styles.controlButtonDisabled]}
              onPress={resetMap}
              disabled={!mapData || !isConnected}
            >
              <Ionicons name="trash" size={20} color="#F44336" />
              <Text style={styles.controlTextSecondary}>Reset Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Information Panel */}
        <View style={styles.infoPanel}>
          <Text style={styles.sectionTitle}>SLAM Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Algorithm:</Text>
            <Text style={styles.infoValue}>Slam Toolbox ({slamAlgorithm})</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Map Resolution:</Text>
            <Text style={styles.infoValue}>{mapResolution} m/pixel</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Map Topic:</Text>
            <Text style={styles.infoValue}>{MAP_TOPIC}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pose Topic:</Text>
            <Text style={styles.infoValue}>{POSE_TOPIC}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Robot Position:</Text>
            <Text style={styles.infoValue}>
              x: {robotPose.x.toFixed(2)}m, y: {robotPose.y.toFixed(2)}m, θ: {(robotPose.theta * 180/Math.PI).toFixed(0)}°
            </Text>
          </View>
          
          {!isConnected && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Not connected to ROS. SLAM functionality will not work.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
              <Text style={styles.modalTitle}>SLAM Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>SLAM Mode</Text>
                <View style={styles.algorithmButtons}>
                  <TouchableOpacity 
                    style={[styles.algorithmButton, slamAlgorithm === 'async_slam' && styles.activeAlgorithmButton]}
                    onPress={() => setSlamAlgorithm('async_slam')}
                  >
                    <Text style={styles.algorithmButtonText}>Async SLAM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.algorithmButton, slamAlgorithm === 'localization' && styles.activeAlgorithmButton]}
                    onPress={() => setSlamAlgorithm('localization')}
                  >
                    <Text style={styles.algorithmButtonText}>Localization</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Map Resolution: {mapResolution}m</Text>
                <View style={styles.resolutionButtons}>
                  <TouchableOpacity 
                    style={[styles.resolutionButton, mapResolution === 0.05 && styles.activeResolutionButton]}
                    onPress={() => setMapResolution(0.05)}
                  >
                    <Text style={styles.resolutionButtonText}>High (0.05m)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.resolutionButton, mapResolution === 0.1 && styles.activeResolutionButton]}
                    onPress={() => setMapResolution(0.1)}
                  >
                    <Text style={styles.resolutionButtonText}>Medium (0.1m)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.resolutionButton, mapResolution === 0.2 && styles.activeResolutionButton]}
                    onPress={() => setMapResolution(0.2)}
                  >
                    <Text style={styles.resolutionButtonText}>Low (0.2m)</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.toggleContainer}>
                  <Text style={styles.settingLabel}>Show Particles</Text>
                  <Switch
                    value={showParticles}
                    onValueChange={setShowParticles}
                    trackColor={{ false: '#767577', true: '#E0AA3E' }}
                    thumbColor={showParticles ? '#FFF' : '#f4f3f4'}
                  />
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Reuse the styles from the previous implementation
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
  mapContainer: {
    margin: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#333',
    position: 'relative',
  },
  mapContent: {
    alignItems: 'center',
  },
  mapText: {
    color: '#E0AA3E',
    fontSize: 14,
    marginBottom: 5,
  },
  emptyMap: {
    alignItems: 'center',
  },
  emptyMapText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  robotIndicator: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 170, 62, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#262626',
    padding: 10,
    borderRadius: 8,
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
  },
  scanInfo: {
    backgroundColor: '#262626',
    padding: 15,
    margin: 15,
    borderRadius: 15,
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
    marginBottom: 10,
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
  controlButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  controlText: {
    color: '#E0AA3E',
    marginLeft: 8,
    fontWeight: '600',
  },
  controlTextSecondary: {
    color: '#2196F3',
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
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '500',
  },
  algorithmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  algorithmButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeAlgorithmButton: {
    backgroundColor: '#4A3F2D',
    borderColor: '#E0AA3E',
    borderWidth: 1,
  },
  algorithmButtonText: {
    color: '#E0AA3E',
    fontSize: 12,
    fontWeight: '600',
  },
  resolutionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resolutionButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeResolutionButton: {
    backgroundColor: '#4A3F2D',
    borderColor: '#E0AA3E',
    borderWidth: 1,
  },
  resolutionButtonText: {
    color: '#E0AA3E',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
});

export default SlamScreen;
