// src/components/URDFViewer.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import ROSLIB from 'roslib';

// Grid Component (unchanged)
const Grid = ({ size = 10, color = '#444' }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} wireframe opacity={0.3} transparent />
    </mesh>
  );
};

// Axis Helper Component - ROS Convention (unchanged)
const Axis = ({ size = 2 }) => {
  return (
    <>
      {/* X Axis (Red) - FORWARD */}
      <mesh position={[size/2, 0, -0.33]}>
        <boxGeometry args={[size, 0.03, 0.03]} />
        <meshBasicMaterial color="red" />
      </mesh>
      {/* Y Axis (Green) - LEFT */}
      <mesh position={[0, size/2, -0.33]} rotation={[0, 0, Math.PI/2]}>
        <boxGeometry args={[size, 0.03, 0.03]} />
        <meshBasicMaterial color="green" />
      </mesh>
      {/* Z Axis (Blue) - UP */}
      <mesh position={[0, 0, size/3]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[size, 0.03, 0.03]} />
        <meshBasicMaterial color="blue" />  
      </mesh>
    </>
  );
};

// Robot Arm Component - UPDATED to use joint_1, joint_2, etc.
const RobotArm = ({ jointAngles = {} }) => {
  // Extract joint angles with defaults
  const joint1 = jointAngles.joint_1 || 0;
  const joint2 = jointAngles.joint_2 || 0;
  const joint3 = jointAngles.joint_3 || 0;
  const joint4 = jointAngles.joint_4 || 0;
  const joint5 = jointAngles.joint_5 || 0;
  const joint6 = jointAngles.joint_6 || 0;

  return (
    <group rotation={[Math.PI/2, 0, 0]}>
      {/* Base (Link 1) */}
      <mesh position={[0, -0.33, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.05, 32]} />
        <meshStandardMaterial color="#888888" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Shoulder (Link 2) - joint_1 */}
      <group rotation={[joint1, 0, 0]}>
        <mesh position={[0, -0.24, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#FF6B6B" metalness={0.3} roughness={0.7} />
        </mesh>
        
        {/* Upper Arm (Link 3) - joint_2 */}
        <group position={[0, -0.03, 0]} rotation={[0, 0, joint2]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.06, 0.3, 0.06]} />
            <meshStandardMaterial color="#4ECDC4" metalness={0.3} roughness={0.7} />
          </mesh>
          
          {/* Lower Arm (Link 4) - joint_3 */}
          <group position={[0, 0.3, 0]} rotation={[joint3, 0, 0]}>
            <mesh position={[0, -0.03, 0]}>
              <boxGeometry args={[0.05, 0.25, 0.05]} />
              <meshStandardMaterial color="#45B7D1" metalness={0.3} roughness={0.7} />
            </mesh>
            
            {/* Wrist (Link 5) - joint_4 */}
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
              <meshStandardMaterial color="#F9A826" metalness={0.3} roughness={0.7} />
            </mesh>
            
            {/* End-Effector Link (eflink, Link 6) - joint_5 */}
            <group position={[0, 0.19, 0]} rotation={[joint5, 0, 0]}>
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.08, 16]} />
                <meshStandardMaterial color="#666666" metalness={0.3} roughness={0.7} />
              </mesh>
              
              {/* Gripper Link (Link 7) - joint_6 */}
              <group position={[0, 0.06, 0]} rotation={[0, 0, joint6]}>
                <mesh position={[-0.03, 0, 0]}>
                  <boxGeometry args={[0.02, 0.1, 0.04]} />
                  <meshStandardMaterial color="#E71D36" metalness={0.3} roughness={0.7} />
                </mesh>
                <mesh position={[0.03, 0, 0]}>
                  <boxGeometry args={[0.02, 0.1, 0.04]} />
                  <meshStandardMaterial color="#E71D36" metalness={0.3} roughness={0.7} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// 3D Scene Component (unchanged)
const URDFScene = ({ 
  autoRotate = false,
  showGrid = true,
  showAxis = true,
  jointAngles = {}
}) => {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, 5]} intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />
      
      <group ref={groupRef}>
        {showGrid && <Grid />}
        {showAxis && <Axis />}
        <RobotArm jointAngles={jointAngles} />
      </group>
    </>
  );
};

const URDFViewer = ({ 
  ros = null,
  isConnected = false,
  jointStatesTopic = '/joint_states',
  autoRotate = false,
  showGrid = true,
  showAxis = true,
  showOverlay = true,
  showLoading = true,
  showError = true,
  style = {},
  defaultJointAngles = { 
    joint_1: 0, 
    joint_2: 0, 
    joint_3: 0, 
    joint_4: 0,
    joint_5: 0,
    joint_6: 0
  },
  height = 300,
  width = '100%'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jointStates, setJointStates] = useState(defaultJointAngles);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');

  // Make jointStates reactive to defaultJointAngles if not connected
  useEffect(() => {
    if (!ros || !isConnected) {
      setJointStates(defaultJointAngles);
    }
  }, [defaultJointAngles, ros, isConnected]);

  useEffect(() => {
    if (!ros) {
      setError('ROS connection not provided - using demo mode');
      setConnectionStatus('Demo Mode (No ROS connection)');
      setLoading(false);
      return;
    }

    setError(null);
    setConnectionStatus('Connecting to ROS...');

    // Use provided isConnected if available, else check ros
    if (isConnected || ros.isConnected) {
      setConnectionStatus('Connected to ROS');
      setLoading(false);
      subscribeToJointStates();
    }

    // Set up ROS event listeners
    const handleConnection = () => {
      setConnectionStatus('Connected to ROS');
      setLoading(false);
      setError(null);
      subscribeToJointStates();
    };

    const handleError = (err) => {
      setConnectionStatus('ROS connection error');
      setError(`ROS error: ${err.message}`);
      setLoading(false);
    };

    const handleClose = () => {
      setConnectionStatus('Disconnected from ROS');
      setError('ROS connection closed');
      setLoading(false);
    };

    ros.on('connection', handleConnection);
    ros.on('error', handleError);
    ros.on('close', handleClose);

    // If already connected, subscribe
    if (ros.isConnected) {
      handleConnection();
    }

    function subscribeToJointStates() {
      try {
        const jointStatesListener = new ROSLIB.Topic({
          ros: ros,
          name: jointStatesTopic,
          messageType: 'sensor_msgs/JointState'
        });

        jointStatesListener.subscribe((message) => {
          try {
            const states = {};
            if (message.name && message.position) {
              // Direct mapping - use the actual joint names from ROS
              message.name.forEach((name, index) => {
                states[name] = message.position[index];
              });
              setJointStates(states);
              setConnectionStatus('Receiving joint states');
            }
          } catch (err) {
            setError(`Error processing joint states: ${err.message}`);
          }
        });
      } catch (err) {
        setError(`Error creating listener: ${err.message}`);
      }
    }

    return () => {
      ros.off('connection', handleConnection);
      ros.off('error', handleError);
      ros.off('close', handleClose);
    };
  }, [ros, jointStatesTopic, isConnected]);

  return (
    <View style={[styles.container, style, { height, width, flex: 0 }]}>
      <Canvas
        style={[styles.canvas, { height, width }]}
        camera={{ position: [0, -1.2, 0.5], fov: 60 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#111133');
        }}
      >
        <URDFScene 
          autoRotate={autoRotate}
          showGrid={showGrid}
          showAxis={showAxis}
          jointAngles={jointStates}
        />
      </Canvas>
      
      {showOverlay && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>🤖 Robot Arm Viewer</Text>
          <Text style={styles.overlayText}>Status: {connectionStatus}</Text>
          <Text style={styles.overlayText}>Joints: {Object.keys(jointStates).length}</Text>
          {Object.entries(jointStates).slice(0, 6).map(([joint, angle]) => (
            <Text key={joint} style={styles.overlayText}>
              {joint}: {(angle * 180 / Math.PI).toFixed(1)}°
            </Text>
          ))}
        </View>
      )}
      
      {showLoading && loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E0AA3E" />
          <Text style={styles.loadingText}>Loading Robot Model...</Text>
        </View>
      )}
      
      {showError && error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.infoText}>Topic: {jointStatesTopic}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    flex: 0,
  },
  canvas: {
    width: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 17, 51, 0.8)',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoText: {
    color: '#E0AA3E',
    fontSize: 12,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 6,
    minWidth: 160,
    maxHeight: 300,
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 6,
  },
  overlayText: {
    color: '#FFF',
    fontSize: 11,
    marginBottom: 2,
  },
});

export default URDFViewer;
