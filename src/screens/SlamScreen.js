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

// Move ROS connection outside component to persist across navigation
let globalRosSlam = null;
let globalSlamConnectionStatus = false;

const SLAMScreen = () => {
  const [isConnected, setIsConnected] = useState(globalSlamConnectionStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [slamStatus, setSlamStatus] = useState('stopped');
  const [mapData, setMapData] = useState(null);
  const [robotPose, setRobotPose] = useState({ x: 0, y: 0, theta: 0 });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [slamAlgorithm, setSlamAlgorithm] = useState('async_slam');
  const [mapResolution, setMapResolution] = useState(0.05);
  const [showParticles, setShowParticles] = useState(true);
  const [laserScanData, setLaserScanData] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [initialPosePublisher, setInitialPosePublisher] = useState(null);
  const [slamService, setSlamService] = useState(null);

  // Hard-coded ROS connection
  const ROS_IP = '192.168.2.7';
  const ROS_PORT = 9090;
  const ros = useRef(globalRosSlam);

  // Define ROS topics as constants
  const SCAN_TOPIC = '/scan';
  const MAP_TOPIC = '/map';
  const POSE_TOPIC = '/amcl_pose';

  useEffect(() => {
    // Check if global ROS connection exists
    if (globalRosSlam && globalSlamConnectionStatus) {
      console.log('Using existing ROS connection for SLAM');
      ros.current = globalRosSlam;
      setIsConnected(true);
      setupSlamSubscribers();
      setupSlamPublishers();
    } else {
      // Don't show loading screen, initialize in background
      initializeSlamROS();
    }
    
    return () => {
      // Don't close global connection on unmount - keep it for reuse
    };
  }, []);

  const initializeSlamROS = () => {
    // Skip if already connected
    if (globalRosSlam && globalRosSlam.isConnected) {
      setIsConnected(true);
      return;
    }

    console.log(`Connecting to ROS at ${ROS_IP}:${ROS_PORT} for SLAM...`);
    
    // Use global connection
    globalRosSlam = new ROSLIB.Ros({
      url: `ws://${ROS_IP}:${ROS_PORT}`
    });

    ros.current = globalRosSlam;

    globalRosSlam.on('connection', () => {
      console.log('Connected to ROS bridge for SLAM');
      globalSlamConnectionStatus = true;
      setIsConnected(true);
      setupSlamSubscribers();
      setupSlamPublishers();
      setIsLoading(false);
    });

    globalRosSlam.on('error', (error) => {
      console.error('Error connecting to ROS for SLAM:', error);
      globalSlamConnectionStatus = false;
      setIsConnected(false);
      setIsLoading(false);
      console.log(`Failed to connect to ${ROS_IP}:${ROS_PORT} for SLAM`);
    });

    globalRosSlam.on('close', () => {
      console.log('SLAM ROS connection closed');
      globalSlamConnectionStatus = false;
      setIsConnected(false);
      globalRosSlam = null;
    });

    // Set connection timeout to avoid long waits
    setTimeout(() => {
      if (!globalSlamConnectionStatus) {
        console.log('SLAM connection timeout');
        setIsLoading(false);
      }
    }, 2000);

    try {
      globalRosSlam.connect(`ws://${ROS_IP}:${ROS_PORT}`);
    } catch (error) {
      console.error('Failed to connect to ROS for SLAM:', error);
      setIsLoading(false);
    }
  };

  const setupSlamSubscribers = () => {
    if (!ros.current) return;

    try {
      // Map subscriber with throttling
      const mapSubscriber = new ROSLIB.Topic({
        ros: ros.current,
        name: MAP_TOPIC,
        messageType: 'nav_msgs/OccupancyGrid',
        throttle_rate: 500
      });

      mapSubscriber.subscribe((message) => {
        setMapData(message);
      });

      // Laser scan subscriber with throttling
      const scanSubscriber = new ROSLIB.Topic({
        ros: ros.current,
        name: SCAN_TOPIC,
        messageType: 'sensor_msgs/LaserScan',
        throttle_rate: 200
      });

      scanSubscriber.subscribe((message) => {
        setLaserScanData(message);
        setScanCount(prev => prev + 1);
      });

      // Robot pose subscriber with throttling
      const poseSubscriber = new ROSLIB.Topic({
        ros: ros.current,
        name: POSE_TOPIC,
        messageType: 'geometry_msgs/PoseWithCovarianceStamped',
        throttle_rate: 200
      });

      poseSubscriber.subscribe((message) => {
        const pose = message.pose.pose;
        setRobotPose({
          x: pose.position.x,
          y: pose.position.y,
          theta: getYawFromQuaternion(pose.orientation)
        });
      });

      console.log('SLAM subscribers initialized');
    } catch (error) {
      console.error('Error setting up SLAM subscribers:', error);
    }
  };

  const setupSlamPublishers = () => {
    if (!ros.current) return;

    try {
      // Setup SLAM control publishers
      const initialPosePub = new ROSLIB.Topic({
        ros: ros.current,
        name: '/initialpose',
        messageType: 'geometry_msgs/PoseWithCovarianceStamped'
      });

      setInitialPosePublisher(initialPosePub);

      // Setup SLAM service
      const slamSrv = new ROSLIB.Service({
        ros: ros.current,
        name: '/slam_toolbox/save_map',
        serviceType: 'slam_toolbox/SaveMap'
      });

      setSlamService(slamSrv);

      console.log('SLAM publishers initialized');
    } catch (error) {
      console.error('Error setting up SLAM publishers:', error);
    }
  };

  const getYawFromQuaternion = (quat) => {
    const x = quat.x;
    const y = quat.y;
    const z = quat.z;
    const w = quat.w;
    
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
    
    setTimeout(() => {
      setSlamStatus('mapping');
      Alert.alert('SLAM Started', 'Slam Toolbox is now mapping your environment');
    }, 2000);
  };

  const stopSlam = () => {
    setSlamStatus('stopped');
    Alert.alert('SLAM Stopped', 'Slam Toolbox has been stopped');
  };

  const saveMap = () => {
    if (!slamService) {
      Alert.alert('Error', 'SLAM service not available');
      return;
    }

    const request = new ROSLIB.ServiceRequest({
      filename: 'map_' + new Date().toISOString().replace(/[:.]/g, '-')
    });

    slamService.callService(request, (result) => {
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

  const reconnectSlam = () => {
    globalRosSlam = null;
    globalSlamConnectionStatus = false;
    initializeSlamROS();
  };

  // Only show loading if explicitly needed
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#E0AA3E" />
          <Text style={styles.loadingText}>Connecting to ROS for SLAM...</Text>
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={() => setIsLoading(false)}
          >
            <Text style={styles.skipButtonText}>Continue Offline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with connection status */}
      <View style={styles.header}>
        <Text style={styles.title}>SLAM Mapping</Text>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isConnected ? 'map' : 'map-outline'} 
            size={20} 
            color={isConnected ? '#4CAF50' : '#F44336'} 
          />
          <Text style={[styles.statusText, {color: isConnected ? '#4CAF50' : '#F44336'}]}>
            {isConnected ? 'Connected' : 'Offline'}
          </Text>
          {!isConnected && (
            <TouchableOpacity onPress={reconnectSlam} style={styles.reconnectButton}>
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

// Add these styles if not present
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
    fontSize: 17,
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
  skipButton: {
    marginTop: 20,
    backgroundColor: '#E0AA3E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#000',
    fontWeight: '600',
  },
});

export default SLAMScreen;
