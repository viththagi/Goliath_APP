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
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ROSLIB from 'roslib';

const { width, height } = Dimensions.get('window');

// Custom Progress Bar Component
const CustomProgressBar = ({ progress, color, style }) => {
  return (
    <View style={[styles.progressBarContainer, style]}>
      <View 
        style={[
          styles.progressBarFill,
          { 
            width: `${progress * 100}%`,
            backgroundColor: color
          }
        ]} 
      />
    </View>
  );
};

const SensorsScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sensorData, setSensorData] = useState({
    lidar: { connected: false, scanCount: 0, range: 0 },
    imu: { connected: false, orientation: { x: 0, y: 0, z: 0, w: 1 }, angularVelocity: { x: 0, y: 0, z: 0 } },
    battery: { level: 85, voltage: 12.6, charging: false },
    temperature: { value: 27.5, unit: '°C' },
    ultrasonic: { distances: [1.2, 0.8, 1.5, 0.9] }, // Front, Back, Left, Right
    camera: { connected: true, fps: 20 }
  });
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [refreshRate, setRefreshRate] = useState(1000); // ms
  const [showRawData, setShowRawData] = useState(false);

  // Hard-coded ROS connection
  const ROS_IP = '192.168.2.7'; // Your robot's IP
  const ROS_PORT = 9090;
  const ros = useRef(null);

  // ROS Topics for sensors
  const SENSOR_TOPICS = {
    SCAN: '/scan', // LiDAR
    IMU: '/imu/data', // IMU
    BATTERY: '/battery_state', // Battery
    TEMPERATURE: '/temperature', // Temperature
    ULTRASONIC: '/ultrasonic', // Ultrasonic sensors
    CAMERA_INFO: '/camera_info' // Camera
  };

  useEffect(() => {
    initializeROS();
    
    return () => {
      if (ros.current) {
        ros.current.close();
      }
    };
  }, []);

  const initializeROS = () => {
    console.log(`Connecting to ROS at ${ROS_IP}:${ROS_PORT} for Sensors...`);
    
    ros.current = new ROSLIB.Ros({
      url: `ws://${ROS_IP}:${ROS_PORT}`
    });

    ros.current.on('connection', () => {
      console.log('Connected to ROS bridge for Sensors');
      setIsConnected(true);
      setupSubscribers();
      setIsLoading(false);
    });

    ros.current.on('error', (error) => {
      console.error('Error connecting to ROS:', error);
      setIsConnected(false);
      setIsLoading(false);
    });

    ros.current.on('close', () => {
      console.log('Connection to ROS closed');
      setIsConnected(false);
    });

    try {
      ros.current.connect(`ws://${ROS_IP}:${ROS_PORT}`);
    } catch (error) {
      console.error('Failed to connect to ROS:', error);
      setIsLoading(false);
    }
  };

  const setupSubscribers = () => {
    if (!ros.current) return;

    // LiDAR subscriber
    new ROSLIB.Topic({
      ros: ros.current,
      name: SENSOR_TOPICS.SCAN,
      messageType: 'sensor_msgs/LaserScan'
    }).subscribe((message) => {
      setSensorData(prev => ({
        ...prev,
        lidar: {
          connected: true,
          scanCount: prev.lidar.scanCount + 1,
          range: message.range_max,
          ranges: message.ranges
        }
      }));
    });

    // IMU subscriber
    new ROSLIB.Topic({
      ros: ros.current,
      name: SENSOR_TOPICS.IMU,
      messageType: 'sensor_msgs/Imu'
    }).subscribe((message) => {
      setSensorData(prev => ({
        ...prev,
        imu: {
          connected: true,
          orientation: message.orientation,
          angularVelocity: message.angular_velocity,
          linearAcceleration: message.linear_acceleration
        }
      }));
    });

    // Battery subscriber
    new ROSLIB.Topic({
      ros: ros.current,
      name: SENSOR_TOPICS.BATTERY,
      messageType: 'sensor_msgs/BatteryState'
    }).subscribe((message) => {
      setSensorData(prev => ({
        ...prev,
        battery: {
          level: Math.round(message.percentage * 100),
          voltage: message.voltage,
          charging: message.power_supply_status === 1
        }
      }));
    });

    // Simulate other sensors (replace with actual topics)
    simulateSensors();
  };

  const simulateSensors = () => {
    // Simulate temperature sensor
    setInterval(() => {
      setSensorData(prev => ({
        ...prev,
        temperature: {
          value: 25 + Math.random() * 5, // Random between 25-30°C
          unit: '°C'
        }
      }));
    }, 5000);

    // Simulate ultrasonic sensors
    setInterval(() => {
      setSensorData(prev => ({
        ...prev,
        ultrasonic: {
          distances: [
            0.5 + Math.random() * 1.5, // Front
            0.5 + Math.random() * 1.5, // Back
            0.5 + Math.random() * 1.5, // Left
            0.5 + Math.random() * 1.5  // Right
          ]
        }
      }));
    }, 2000);

    // Simulate camera
    setInterval(() => {
      setSensorData(prev => ({
        ...prev,
        camera: {
          connected: true,
          fps: 15 + Math.random() * 10 // Random between 15-25 FPS
        }
      }));
    }, 3000);
  };

  const getBatteryColor = (level) => {
    if (level > 70) return '#4CAF50';
    if (level > 30) return '#FF9800';
    return '#F44336';
  };

  const getBatteryIcon = (level) => {
    if (level > 80) return 'battery-full';
    if (level > 60) return 'battery-three-quarters';
    if (level > 40) return 'battery-half';
    if (level > 20) return 'battery-quarter';
    return 'battery-dead';
  };

  const getTemperatureColor = (temp) => {
    if (temp > 35) return '#F44336';
    if (temp > 30) return '#FF9800';
    return '#4CAF50';
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
          <Text style={styles.loadingText}>Connecting to Sensors...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sensor Dashboard</Text>
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
        {/* Battery Status */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Ionicons name={getBatteryIcon(sensorData.battery.level)} size={24} color={getBatteryColor(sensorData.battery.level)} />
            <Text style={styles.sensorTitle}>Battery</Text>
            <Text style={[styles.sensorStatus, {color: getBatteryColor(sensorData.battery.level)}]}>
              {sensorData.battery.level}%
            </Text>
          </View>
          <CustomProgressBar 
            progress={sensorData.battery.level / 100} 
            color={getBatteryColor(sensorData.battery.level)}
            style={styles.progressBar}
          />
          <View style={styles.sensorDetails}>
            <Text style={styles.sensorDetailText}>
              Voltage: {sensorData.battery.voltage.toFixed(2)}V
            </Text>
            <Text style={styles.sensorDetailText}>
              Status: {sensorData.battery.charging ? 'Charging' : 'Discharging'}
            </Text>
          </View>
        </View>

        {/* LiDAR Status */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Ionicons name="scan" size={24} color={sensorData.lidar.connected ? '#4CAF50' : '#F44336'} />
            <Text style={styles.sensorTitle}>LiDAR</Text>
            <Text style={[styles.sensorStatus, {color: sensorData.lidar.connected ? '#4CAF50' : '#F44336'}]}>
              {sensorData.lidar.connected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          <View style={styles.sensorDetails}>
            <Text style={styles.sensorDetailText}>
              Scans: {sensorData.lidar.scanCount}
            </Text>
            <Text style={styles.sensorDetailText}>
              Range: {sensorData.lidar.range ? sensorData.lidar.range.toFixed(2) + 'm' : 'N/A'}
            </Text>
            {sensorData.lidar.ranges && (
              <Text style={styles.sensorDetailText}>
                Points: {sensorData.lidar.ranges.length}
              </Text>
            )}
          </View>
        </View>

        {/* IMU Status */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Ionicons name="compass" size={24} color={sensorData.imu.connected ? '#4CAF50' : '#F44336'} />
            <Text style={styles.sensorTitle}>IMU</Text>
            <Text style={[styles.sensorStatus, {color: sensorData.imu.connected ? '#4CAF50' : '#F44336'}]}>
              {sensorData.imu.connected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          <View style={styles.sensorDetails}>
            <Text style={styles.sensorDetailText}>
              Orientation: X:{sensorData.imu.orientation.x.toFixed(2)} Y:{sensorData.imu.orientation.y.toFixed(2)} Z:{sensorData.imu.orientation.z.toFixed(2)}
            </Text>
            <Text style={styles.sensorDetailText}>
              Angular Velocity: X:{sensorData.imu.angularVelocity.x.toFixed(2)} Y:{sensorData.imu.angularVelocity.y.toFixed(2)} Z:{sensorData.imu.angularVelocity.z.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Temperature Sensor */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Ionicons name="thermometer" size={24} color={getTemperatureColor(sensorData.temperature.value)} />
            <Text style={styles.sensorTitle}>Temperature</Text>
            <Text style={[styles.sensorStatus, {color: getTemperatureColor(sensorData.temperature.value)}]}>
              {sensorData.temperature.value.toFixed(1)}{sensorData.temperature.unit}
            </Text>
          </View>
          <View style={styles.temperatureBar}>
            <View style={[styles.temperatureFill, { 
              width: `${((sensorData.temperature.value - 20) / 20) * 100}%`,
              backgroundColor: getTemperatureColor(sensorData.temperature.value)
            }]} />
          </View>
        </View>

        {/* Ultrasonic Sensors */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Ionicons name="resize" size={24} color="#2196F3" />
            <Text style={styles.sensorTitle}>Ultrasonic Sensors</Text>
          </View>
          <View style={styles.ultrasonicGrid}>
            <View style={styles.ultrasonicSensor}>
              <Text style={styles.ultrasonicLabel}>Front</Text>
              <Text style={styles.ultrasonicValue}>
                {sensorData.ultrasonic.distances[0].toFixed(2)}m
              </Text>
            </View>
            <View style={styles.ultrasonicSensor}>
              <Text style={styles.ultrasonicLabel}>Back</Text>
              <Text style={styles.ultrasonicValue}>
                {sensorData.ultrasonic.distances[1].toFixed(2)}m
              </Text>
            </View>
            <View style={styles.ultrasonicSensor}>
              <Text style={styles.ultrasonicLabel}>Left</Text>
              <Text style={styles.ultrasonicValue}>
                {sensorData.ultrasonic.distances[2].toFixed(2)}m
              </Text>
            </View>
            <View style={styles.ultrasonicSensor}>
              <Text style={styles.ultrasonicLabel}>Right</Text>
              <Text style={styles.ultrasonicValue}>
                {sensorData.ultrasonic.distances[3].toFixed(2)}m
              </Text>
            </View>
          </View>
        </View>

        {/* Camera Status */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Ionicons name="camera" size={24} color={sensorData.camera.connected ? '#4CAF50' : '#F44336'} />
            <Text style={styles.sensorTitle}>Camera</Text>
            <Text style={[styles.sensorStatus, {color: sensorData.camera.connected ? '#4CAF50' : '#F44336'}]}>
              {sensorData.camera.connected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          <View style={styles.sensorDetails}>
            <Text style={styles.sensorDetailText}>
              FPS: {sensorData.camera.fps.toFixed(1)}
            </Text>
            <Text style={styles.sensorDetailText}>
              Status: {sensorData.camera.connected ? 'Streaming' : 'Offline'}
            </Text>
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
          {!isConnected && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                Not connected to ROS. Sensor data may be simulated.
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
              <Text style={styles.modalTitle}>Sensor Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Refresh Rate: {refreshRate}ms</Text>
                <View style={styles.refreshButtons}>
                  <TouchableOpacity 
                    style={[styles.refreshButton, refreshRate === 500 && styles.activeRefreshButton]}
                    onPress={() => setRefreshRate(500)}
                  >
                    <Text style={styles.refreshButtonText}>Fast (500ms)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.refreshButton, refreshRate === 1000 && styles.activeRefreshButton]}
                    onPress={() => setRefreshRate(1000)}
                  >
                    <Text style={styles.refreshButtonText}>Normal (1s)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.refreshButton, refreshRate === 2000 && styles.activeRefreshButton]}
                    onPress={() => setRefreshRate(2000)}
                  >
                    <Text style={styles.refreshButtonText}>Slow (2s)</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.toggleContainer}>
                  <Text style={styles.settingLabel}>Show Raw Data</Text>
                  <Switch
                    value={showRawData}
                    onValueChange={setShowRawData}
                    trackColor={{ false: '#767577', true: '#E0AA3E' }}
                    thumbColor={showRawData ? '#FFF' : '#f4f3f4'}
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

      {/* Settings Button */}
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => setSettingsModalVisible(true)}
      >
        <Ionicons name="settings" size={24} color="#FFF" />
      </TouchableOpacity>
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
    padding: 10,
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
  sensorCard: {
    backgroundColor: '#262626',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sensorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  sensorStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sensorDetails: {
    marginTop: 5,
  },
  sensorDetailText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 3,
  },
  temperatureBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },
  temperatureFill: {
    height: '100%',
    borderRadius: 4,
  },
  ultrasonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  ultrasonicSensor: {
    width: '48%',
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  ultrasonicLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    marginBottom: 5,
  },
  ultrasonicValue: {
    color: '#E0AA3E',
    fontSize: 16,
    fontWeight: '600',
  },
  infoPanel: {
    backgroundColor: '#262626',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
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
    maxHeight: height * 0.6,
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
    maxHeight: height * 0.4,
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
  refreshButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  refreshButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeRefreshButton: {
    backgroundColor: '#4A3F2D',
    borderColor: '#E0AA3E',
    borderWidth: 1,
  },
  refreshButtonText: {
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
  settingsButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#E0AA3E',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});

export default SensorsScreen;
