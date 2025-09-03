import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Modal,
  Switch,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import ROSLIB from 'roslib';

const { width, height } = Dimensions.get('window');

// Grid Component
 const Grid = ({ size = 10, divisions = 1, color = '#444' }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} wireframe opacity={0.8} transparent />
    </mesh>
  );
};

// Axis Helper Component
const Axis = ({ size = 0.8 }) => {
  return (
    <>
      {/* X Axis (Red) */}
      <mesh position={[0, 0, size/2]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[size, 0.05, 0.05]} />
        <meshBasicMaterial color="red" />
      </mesh>
      {/* Y Axis (Green) */}
      <mesh position={[size/2, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <boxGeometry args={[0.05, size, 0.05]} />
        <meshBasicMaterial color="green" />
      </mesh>
      {/* Z Axis (Blue) */}
      <mesh position={[0, size/2, 0]} rotation={[Math.PI/2, 0, 0]}>
        <boxGeometry args={[0.05, 0.05, size]} />
        <meshBasicMaterial color="blue" />
      </mesh>
    </>
  );
};

// Laser Scan Points Component
const LaserScanPoints = ({ points, color = '#00ff00' }) => {
  if (!points || points.length === 0) return null;

  const geometryRef = useRef();
  const positions = new Float32Array(points.length * 3);

  points.forEach((point, index) => {
    positions[index * 3] = point.y;
    positions[index * 3 + 1] = point.z;
    positions[index * 3 + 2] = point.x || 0;
  });

  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometryRef.current.attributes.position.needsUpdate = true;
    }
  }, [points]);

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={points.length}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.1}
        sizeAttenuation={true}
      />
    </points>
  );
};

// Simple 3D Scene with Grid, Axis and Laser Scan
const Basic3DScene = ({ autoRotate = false, laserPoints = [] }) => {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      <group ref={groupRef}>
        <Grid />
        <Axis />
        
        {/* Laser Scan Points */}
        <LaserScanPoints points={laserPoints} color="#ff0000" />
        
        {/* Reference cube to help with orientation */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.5, 0.2, 0.7]} />
          <meshStandardMaterial color="silver" />
        </mesh>
      </group>
    </>
  );
};

const LidarScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [laserPoints, setLaserPoints] = useState([]);
  const [ros, setRos] = useState(null);
  const [scanTopic, setScanTopic] = useState('/scan');

  useEffect(() => {
    // Initialize ROS connection
    const initROS = async () => {
      try {
        console.log('Connecting to ROS...');
        
        // Create ROS connection
        const ros = new ROSLIB.Ros({
          url: 'ws://192.168.2.7:9090' // Change this to your ROS bridge URL
        });

        ros.on('connection', () => {
          console.log('Connected to ROS bridge');
          setIsConnected(true);
          setIsLoading(false);
        });

        ros.on('error', (error) => {
          console.error('Error connecting to ROS:', error);
          setIsConnected(false);
          setIsLoading(false);
        });

        ros.on('close', () => {
          console.log('Connection to ROS closed');
          setIsConnected(false);
        });

        setRos(ros);

      } catch (error) {
        console.error('Failed to initialize ROS:', error);
        setIsLoading(false);
      }
    };

    initROS();

    return () => {
      if (ros) {
        ros.close();
      }
    };
  }, []);

  useEffect(() => {
    if (ros && isConnected) {
      // Subscribe to laser scan topic
      const scanListener = new ROSLIB.Topic({
        ros: ros,
        name: scanTopic,
        messageType: 'sensor_msgs/LaserScan'
      });

      scanListener.subscribe((message) => {
        // Convert LaserScan to 3D points
        const points = convertLaserScanToPoints(message);
        setLaserPoints(points);
      });

      return () => {
        scanListener.unsubscribe();
      };
    }
  }, [ros, isConnected, scanTopic]);

  // Convert LaserScan message to 3D points
  const convertLaserScanToPoints = (laserScan) => {
    const points = [];
    const { ranges, angle_min, angle_increment } = laserScan;

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      if (range === Infinity || range === 0) continue; // Skip invalid ranges

      const angle = angle_min + (i * angle_increment);
      
      // Convert polar coordinates to Cartesian (X, Y, Z)
      const x = range * Math.cos(angle);
      const y = range * Math.sin(angle);
      const z = 0; // 2D laser scan, so Z is 0

      points.push({ x, y, z });
    }

    return points;
  };

  const handleResetView = () => {
    console.log('Reset view');
  };

  const handleReconnect = async () => {
    setIsLoading(true);
    // Implement reconnection logic if needed
    setTimeout(() => setIsLoading(false), 1000);
  };

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
      <View style={styles.header}>
        <Text style={styles.title}>3D World Viewer</Text>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isConnected ? 'cloud-done' : 'cube'} 
            size={20} 
            color={isConnected ? '#4CAF50' : '#E0AA3E'} 
          />
          <Text style={[styles.statusText, {color: isConnected ? '#4CAF50' : '#E0AA3E'}]}>
            {isConnected ? 'ROS Connected' : 'Standalone Mode'}
          </Text>
        </View>
      </View>

      {/* Main content with fixed height for 3D viewer */}
      <View style={styles.mainContent}>
        <View style={styles.viewerContainer}>
          <Canvas
            style={styles.viewer}
            camera={{ position: [1, 3, -2.7], fov: 75 }}
            onCreated={({ gl }) => {
              gl.setClearColor('#000011');
            }}
          >
            <Basic3DScene autoRotate={autoRotate} laserPoints={laserPoints} />
          </Canvas>
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>Laser Scan Viewer</Text>
          <Text style={styles.infoText}>● Status: {isConnected ? 'Connected ✓' : 'Disconnected ✗'}</Text>
          <Text style={styles.infoText}>● Topic: {scanTopic}</Text>
          <Text style={styles.infoText}>● Points: {laserPoints.length}</Text>
          <Text style={styles.infoText}>● Frame: laser</Text>
          <Text style={styles.infoText}>● Auto Rotate: {autoRotate ? 'Enabled' : 'Disabled'}</Text>
        </View>
      </View>

      {/* Controls Section - Now fixed at the bottom */}
      <View style={styles.controls}>
        <Text style={styles.controlTitle}>View Controls</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.controlButton} onPress={handleResetView}>
            <Ionicons name="eye" size={20} color="#E0AA3E" />
            <Text style={styles.controlText}>Reset View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, autoRotate && styles.activeControlButton]} 
            onPress={() => setAutoRotate(!autoRotate)}
          >
            <Ionicons name="refresh" size={20} color="#E0AA3E" />
            <Text style={styles.controlText}>{autoRotate ? 'Stop Rotate' : 'Auto Rotate'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => setSettingsModalVisible(true)}
          >
            <Ionicons name="options" size={20} color="#E0AA3E" />
            <Text style={styles.controlText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

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
              <Text style={styles.modalTitle}>Laser Scan Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.settingItem}>
                <View style={styles.toggleContainer}>
                  <Text style={styles.settingLabel}>Auto Rotate</Text>
                  <Switch
                    value={autoRotate}
                    onValueChange={setAutoRotate}
                    trackColor={{ false: '#767577', true: '#E0AA3E' }}
                    thumbColor={autoRotate ? '#FFF' : '#f4f3f4'}
                  />
                </View>
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>ROS Topic</Text>
                <Text style={styles.topicText}>{scanTopic}</Text>
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Connection Status</Text>
                <Text style={[styles.statusText, {color: isConnected ? '#4CAF50' : '#F44336'}]}>
                  {isConnected ? 'Connected to ROS bridge' : 'Disconnected'}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Your custom styles (kept as requested)
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
  mainContent: {
    flex: 1,
  },
  viewerContainer: {
    flex: 2,
    margin: 10,
    marginBottom: 5,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#333',
  },
  viewer: {
    width: '100%',
    height: '100%',
  },
  infoPanel: {
    flex: 0.8,
    padding: 15,
    backgroundColor: '#262626',
    margin: 10,
    marginTop: 5,
    borderRadius: 10,
  },
  infoTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#E0AA3E',
    fontSize: 12,
    marginBottom: 3,
  },
  controls: {
    padding: 75,
    backgroundColor: '#262626',
    margin: 10,
    marginTop: 0,
    borderRadius: 15,
    minHeight: 100,
  },
  controlTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 10,
    minWidth: 90,
    minHeight: 60,
    justifyContent: 'center',
  },
  activeControlButton: {
    backgroundColor: '#4A3F2D',
    borderColor: '#E0AA3E',
    borderWidth: 1,
  },
  controlText: {
    color: '#E0AA3E',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
    textAlign: 'center',
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
    maxHeight: height,
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
  topicText: {
    color: '#E0AA3E',
    fontSize: 14,
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
  },
});

export default LidarScreen;
