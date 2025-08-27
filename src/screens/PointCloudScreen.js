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

const { width, height } = Dimensions.get('window');

// Grid Component
const Grid = ({ size = 10, divisions = 10, color = '#444' }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} wireframe opacity={0.5} transparent />
    </mesh>
  );
};

// Axis Helper Component
const Axis = ({ size = 2 }) => {
  return (
    <>
      {/* X Axis (Red) */}
      <mesh position={[size/2, 0, 0]}>
        <boxGeometry args={[size, 0.05, 0.05]} />
        <meshBasicMaterial color="red" />
      </mesh>
      {/* Y Axis (Green) */}
      <mesh position={[0, size/2, 0]}>
        <boxGeometry args={[0.05, size, 0.05]} />
        <meshBasicMaterial color="green" />
      </mesh>
      {/* Z Axis (Blue) */}
      <mesh position={[0, 0, size/2]}>
        <boxGeometry args={[0.05, 0.05, size]} />
        <meshBasicMaterial color="blue" />
      </mesh>
    </>
  );
};

// Simple 3D Scene with Grid and Axis
const Basic3DScene = ({ autoRotate = false }) => {
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
        
        {/* Reference cube to help with orientation */}
        <mesh position={[2, 0, 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        
        {/* Reference sphere */}
        <mesh position={[-2, 1, -2]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="cyan" />
        </mesh>
      </group>
    </>
  );
};

const PointCloudScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [pointSize, setPointSize] = useState(2);
  const [pointColor, setPointColor] = useState('intensity');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsConnected(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleResetView = () => {
    console.log('Reset view');
  };

  const handleReconnect = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsConnected(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#E0AA3E" />
          <Text style={styles.loadingText}>Initializing 3D Viewer...</Text>
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
            camera={{ position: [8, 6, 8], fov: 60 }}
            onCreated={({ gl }) => {
              gl.setClearColor('#000011');
            }}
          >
            <Basic3DScene autoRotate={autoRotate} />
          </Canvas>
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>3D World Preview</Text>
          <Text style={styles.infoText}>● Status: Standalone Mode</Text>
          <Text style={styles.infoText}>● Grid: 10x10 units</Text>
          <Text style={styles.infoText}>● Axis: XYZ (RGB colors)</Text>
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
              <Text style={styles.modalTitle}>3D Viewer Settings</Text>
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
                <Text style={styles.settingLabel}>ROS Integration</Text>
                <Text style={styles.settingDescription}>
                  ROS connectivity will be available once the ROS context is properly configured.
                </Text>
              </View>
            </ScrollView>
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
  centerContent: {
    flex: 2,
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
    flex: 2, // Takes 3 parts of available space
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
    flex: 0.8, // Takes 1 part of available space
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
    minHeight: 100, // Ensure minimum height for controls
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
  settingDescription: {
    color: '#CCC',
    fontSize: 14,
    marginTop: 5,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default PointCloudScreen;
