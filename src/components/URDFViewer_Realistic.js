// src/components/URDFViewer_Realistic.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import ROSLIB from 'roslib';

// Grid Component
const Grid = ({ size = 10, color = '#444' }) => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} wireframe opacity={0.3} transparent />
    </mesh>
  );
};

// Axis Helper Component - ROS Convention
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

// Highly Realistic Robot Arm Component - Designed to match the target image exactly
const RealisticRobotArm = ({ jointAngles = {} }) => {
  // Extract joint angles with defaults
  const joint1 = jointAngles.joint_1 || 0;
  const joint2 = jointAngles.joint_2 || 0;
  const joint3 = jointAngles.joint_3 || 0;
  const joint4 = jointAngles.joint_4 || 0;
  const joint5 = jointAngles.joint_5 || 0;
  const joint6 = jointAngles.joint_6 || 0;

  return (
    <group rotation={[Math.PI/2, 0, 0]}>
      {/* Base Platform - Dark gray industrial base */}
      <mesh position={[0, -0.35, 0]} receiveShadow>
        <cylinderGeometry args={[0.2, 0.24, 0.1, 32]} />
        <meshStandardMaterial 
          color="#2A2A2A" 
          metalness={0.7} 
          roughness={0.3}
          envMapIntensity={0.8}
        />
      </mesh>
      
      {/* Base mounting bolts */}
      {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.18, -0.32, Math.sin(angle) * 0.18]} receiveShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
          <meshStandardMaterial color="#1A1A1A" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      
      {/* Base detail ring */}
      <mesh position={[0, -0.31, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 32]} />
        <meshStandardMaterial color="#1A1A1A" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Shoulder assembly - joint_1 rotation */}
      <group rotation={[0, 0, joint1]}>
        {/* Main shoulder housing */}
        <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.15, 16]} />
          <meshStandardMaterial color="#4A4A4A" metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Shoulder bracket */}
        <mesh position={[0, -0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.08, 0.12]} />
          <meshStandardMaterial color="#6A6A6A" metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* Upper Arm - joint_2 rotation */}
        <group position={[0, -0.08, 0]} rotation={[0, 0, joint2]}>
          {/* Main upper arm body - White/light gray industrial housing */}
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.09, 0.38, 0.09]} />
            <meshStandardMaterial 
              color="#E8E8E8" 
              metalness={0.2} 
              roughness={0.7}
              envMapIntensity={0.3}
            />
          </mesh>
          
          {/* Upper arm joint housing */}
          <mesh position={[0, 0.37, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
            <meshStandardMaterial color="#5A5A5A" metalness={0.6} roughness={0.4} />
          </mesh>
          
          {/* Upper arm details - cable management */}
          <mesh position={[-0.05, 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.02, 0.3, 0.03]} />
            <meshStandardMaterial color="#3A3A3A" metalness={0.8} roughness={0.2} />
          </mesh>
          
          {/* Forearm - joint_3 rotation */}
          <group position={[0, 0.42, 0]} rotation={[joint3, 0, 0]}>
            {/* Main forearm body - Gray metallic */}
            <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.07, 0.32, 0.07]} />
              <meshStandardMaterial 
                color="#606060" 
                metalness={0.6} 
                roughness={0.4}
                envMapIntensity={0.5}
              />
            </mesh>
            
            {/* Forearm end joint */}
            <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} />
              <meshStandardMaterial color="#4A4A4A" metalness={0.7} roughness={0.3} />
            </mesh>
            
            {/* Wrist assembly - joint_4 rotation */}
            <group position={[0, 0.36, 0]} rotation={[0, 0, joint4]}>
              {/* Wrist roll joint - Orange/yellow accent */}
              <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
                <meshStandardMaterial 
                  color="#FF8C00" 
                  metalness={0.5} 
                  roughness={0.4}
                  envMapIntensity={0.6}
                />
              </mesh>
              
              {/* Wrist pitch joint - joint_5 rotation */}
              <group position={[0, 0.08, 0]} rotation={[joint5, 0, 0]}>
                <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 16]} />
                  <meshStandardMaterial 
                    color="#FF8C00" 
                    metalness={0.5} 
                    roughness={0.4}
                    envMapIntensity={0.6}
                  />
                </mesh>
                
                {/* End-effector/Tool flange - joint_6 rotation */}
                <group position={[0, 0.06, 0]} rotation={[0, 0, joint6]}>
                  {/* Tool flange - Dark metallic */}
                  <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.045, 0.035, 0.05, 16]} />
                    <meshStandardMaterial 
                      color="#2A2A2A" 
                      metalness={0.8} 
                      roughness={0.2}
                      envMapIntensity={0.7}
                    />
                  </mesh>
                  
                  {/* Gripper base */}
                  <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.06, 0.03, 0.04]} />
                    <meshStandardMaterial color="#3A3A3A" metalness={0.7} roughness={0.3} />
                  </mesh>
                  
                  {/* Gripper fingers */}
                  <mesh position={[-0.035, 0.08, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.015, 0.06, 0.025]} />
                    <meshStandardMaterial color="#1A1A1A" metalness={0.8} roughness={0.2} />
                  </mesh>
                  <mesh position={[0.035, 0.08, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.015, 0.06, 0.025]} />
                    <meshStandardMaterial color="#1A1A1A" metalness={0.8} roughness={0.2} />
                  </mesh>
                  
                  {/* Gripper tips - Rubber/plastic */}
                  <mesh position={[-0.035, 0.11, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.012, 0.02, 0.02]} />
                    <meshStandardMaterial color="#2E4057" metalness={0.1} roughness={0.8} />
                  </mesh>
                  <mesh position={[0.035, 0.11, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.012, 0.02, 0.02]} />
                    <meshStandardMaterial color="#2E4057" metalness={0.1} roughness={0.8} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// 3D Scene Component
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
      {/* Enhanced realistic lighting setup */}
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <pointLight position={[-5, -5, 5]} intensity={0.8} />
      <directionalLight position={[10, 10, 10]} intensity={1.0} castShadow />
      <directionalLight position={[-10, -10, 10]} intensity={0.4} />
      <spotLight position={[0, 10, 5]} intensity={0.8} angle={0.3} penumbra={0.1} castShadow />
      
      <group ref={groupRef}>
        {showGrid && <Grid />}
        {showAxis && <Axis />}
        <RealisticRobotArm jointAngles={jointAngles} />
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
        shadows
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#111133');
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          scene.fog = new THREE.Fog('#111133', 5, 15);
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
          <Text style={styles.overlayText}>🤖 Realistic Robot Arm</Text>
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
          <Text style={styles.loadingText}>Loading Realistic Robot Model...</Text>
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