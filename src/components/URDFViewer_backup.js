// src/components/URDFViewer.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Asset } from 'expo-asset';
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

// GLB Robot Arm Component - Uses realistic 3D model
const GLBRobotArm = ({ jointAngles = {} }) => {
  const [glbAsset, setGlbAsset] = useState(null);
  const [loadingError, setLoadingError] = useState(null);
  
  useEffect(() => {
    const loadGLB = async () => {
      try {
        setLoadingError(null);
        // Try multiple approaches to load the GLB
        let asset;
        
        try {
          // Approach 1: Direct require
          asset = Asset.fromModule(require('../../assets/goliath_arm.glb'));
        } catch (err) {
          console.warn('Direct require failed, trying alternative:', err.message);
          // Approach 2: Using Asset.fromURI if the file is accessible
          const uri = 'file:///android_asset/assets/goliath_arm.glb'; // Android
          asset = Asset.fromURI(uri);
        }
        
        await asset.downloadAsync();
        setGlbAsset(asset);
        console.log('GLB asset loaded successfully:', asset.localUri || asset.uri);
        
      } catch (error) {
        console.warn('Failed to load GLB asset:', error.message);
        setLoadingError(error.message);
        setGlbAsset(null);
      }
    };
    loadGLB();
  }, []);

  // Always render fallback if GLB fails or while loading
  if (!glbAsset || loadingError) {
    return <FallbackRobotArm jointAngles={jointAngles} />;
  }

  return <GLBModel glbAsset={glbAsset} jointAngles={jointAngles} />;
};

// Separate component to handle GLB loading with useLoader
const GLBModel = ({ glbAsset, jointAngles }) => {
  const modelRef = useRef();
  
  // Extract joint angles with defaults
  const joint1 = jointAngles.joint_1 || 0;
  const joint2 = jointAngles.joint_2 || 0;
  const joint3 = jointAngles.joint_3 || 0;
  const joint4 = jointAngles.joint_4 || 0;
  const joint5 = jointAngles.joint_5 || 0;
  const joint6 = jointAngles.joint_6 || 0;

  const gltf = useLoader(GLTFLoader, glbAsset.localUri || glbAsset.uri);

  useEffect(() => {
    if (gltf && gltf.scene) {
      // Apply realistic materials to the model
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          // Enhanced material properties for realistic appearance
          if (child.material) {
            child.material.metalness = 0.3;
            child.material.roughness = 0.7;
            child.material.envMapIntensity = 1.0;
            
            // Set different colors based on mesh name or apply general industrial colors
            if (child.name.includes('base') || child.name.includes('Base')) {
              child.material.color = new THREE.Color('#303030'); // Dark gray base
            } else if (child.name.includes('joint') || child.name.includes('Joint')) {
              child.material.color = new THREE.Color('#404040'); // Medium gray joints
            } else if (child.name.includes('link') || child.name.includes('Link')) {
              child.material.color = new THREE.Color('#E8E8E8'); // Light gray links
            } else if (child.name.includes('tool') || child.name.includes('gripper')) {
              child.material.color = new THREE.Color('#FF8C00'); // Orange end-effector
            } else {
              child.material.color = new THREE.Color('#606060'); // Default medium gray
            }
          }
          
          // Enable shadows
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Apply joint rotations to the model
      // Note: This requires the GLB to have properly named joints/bones
      // You may need to adjust these based on your GLB's structure
      if (modelRef.current) {
        const scene = modelRef.current;
        
        // Try to find and animate joints by name
        const findAndRotateJoint = (jointName, rotation, axis = 'z') => {
          const joint = scene.getObjectByName(jointName);
          if (joint) {
            switch(axis) {
              case 'x': joint.rotation.x = rotation; break;
              case 'y': joint.rotation.y = rotation; break;
              case 'z': joint.rotation.z = rotation; break;
            }
          }
        };

        // Apply rotations (adjust joint names based on your GLB structure)
        findAndRotateJoint('joint_1', joint1, 'z');
        findAndRotateJoint('joint_2', joint2, 'y');
        findAndRotateJoint('joint_3', joint3, 'y');
        findAndRotateJoint('joint_4', joint4, 'x');
        findAndRotateJoint('joint_5', joint5, 'y');
        findAndRotateJoint('joint_6', joint6, 'z');
      }
    }
  }, [gltf, joint1, joint2, joint3, joint4, joint5, joint6]);

  if (!gltf) return null;

  return (
    <group ref={modelRef} scale={[1, 1, 1]} position={[0, 0, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
};

// Fallback Robot Arm Component if GLB fails to load
const FallbackRobotArm = ({ jointAngles = {} }) => {
  // Extract joint angles with defaults
  const joint1 = jointAngles.joint_1 || 0;
  const joint2 = jointAngles.joint_2 || 0;
  const joint3 = jointAngles.joint_3 || 0;
  const joint4 = jointAngles.joint_4 || 0;
  const joint5 = jointAngles.joint_5 || 0;
  const joint6 = jointAngles.joint_6 || 0;

  return (
    <group rotation={[Math.PI/2, 0, 0]}>
      {/* Base (Link 0) - Dark gray cylindrical base */}
      <mesh position={[0, -0.33, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.08, 32]} />
        <meshStandardMaterial color="#303030" metalness={0.4} roughness={0.6} />
      </mesh>
      
      {/* Joint housing */}
      <mesh position={[0, -0.29, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
        <meshStandardMaterial color="#404040" metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Shoulder (Link 1) - joint_1 rotation */}
      <group rotation={[joint1, 0, 0]}>
        <mesh position={[0, -0.24, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.12, 0.08]} />
          <meshStandardMaterial color="#606060" metalness={0.3} roughness={0.7} />
        </mesh>
        
        {/* Upper Arm (Link 2) - joint_2 - Main arm segment */}
        <group position={[0, -0.03, 0]} rotation={[0, 0, joint2]}>
          {/* Main upper arm body - larger and more industrial */}
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.35, 0.08]} />
            <meshStandardMaterial color="#E8E8E8" metalness={0.2} roughness={0.8} />
          </mesh>
          
          {/* Upper arm joint housing */}
          <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
            <meshStandardMaterial color="#606060" metalness={0.3} roughness={0.7} />
          </mesh>
          
          {/* Lower Arm (Link 3) - joint_3 - Forearm */}
          <group position={[0, 0.35, 0]} rotation={[joint3, 0, 0]}>
            {/* Main forearm body */}
            <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.06, 0.28, 0.06]} />
              <meshStandardMaterial color="#606060" metalness={0.3} roughness={0.7} />
            </mesh>
            
            {/* Forearm end joint */}
            <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} />
              <meshStandardMaterial color="#404040" metalness={0.3} roughness={0.7} />
            </mesh>
            
            {/* Wrist assembly (Link 4) - joint_4 */}
            <group position={[0, 0.3, 0]} rotation={[0, 0, joint4]}>
              <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
                <meshStandardMaterial color="#FF8C00" metalness={0.4} roughness={0.6} />
              </mesh>
              
              {/* Wrist pitch joint (Link 5) - joint_5 */}
              <group position={[0, 0.08, 0]} rotation={[joint5, 0, 0]}>
                <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 16]} />
                  <meshStandardMaterial color="#FF8C00" metalness={0.4} roughness={0.6} />
                </mesh>
                
                {/* End-effector/Tool flange (Link 6) - joint_6 */}
                <group position={[0, 0.06, 0]} rotation={[0, 0, joint6]}>
                  {/* Tool flange */}
                  <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.04, 0.03, 0.04, 16]} />
                    <meshStandardMaterial color="#303030" metalness={0.5} roughness={0.5} />
                  </mesh>
                  
                  {/* Simple gripper representation */}
                  <mesh position={[-0.025, 0.05, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.015, 0.08, 0.03]} />
                    <meshStandardMaterial color="#202020" metalness={0.3} roughness={0.7} />
                  </mesh>
                  <mesh position={[0.025, 0.05, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.015, 0.08, 0.03]} />
                    <meshStandardMaterial color="#202020" metalness={0.3} roughness={0.7} />
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

// Smart Robot Arm component that tries GLB first, falls back to geometric shapes
const RobotArm = ({ jointAngles = {} }) => {
  const [useGLB, setUseGLB] = useState(true);

  return (
    <React.Suspense fallback={<FallbackRobotArm jointAngles={jointAngles} />}>
      {useGLB ? (
        <GLBRobotArm 
          jointAngles={jointAngles} 
          onError={() => setUseGLB(false)} 
        />
      ) : (
        <FallbackRobotArm jointAngles={jointAngles} />
      )}
    </React.Suspense>
  );
};

// Enhanced 3D Scene Component with realistic lighting
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
      {/* Realistic lighting setup for industrial robot */}
      <ambientLight intensity={0.3} color="#404040" />
      
      {/* Main key light - simulates workshop/factory lighting */}
      <directionalLight 
        position={[10, 10, 10]} 
        intensity={1.2} 
        color="#ffffff"
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      {/* Fill light from opposite side */}
      <directionalLight 
        position={[-5, 5, 8]} 
        intensity={0.6} 
        color="#f0f0f0"
      />
      
      {/* Accent lights for metallic surfaces */}
      <pointLight position={[3, 3, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-3, 2, 4]} intensity={0.5} color="#f5f5f5" />
      
      {/* Subtle rim light for depth */}
      <directionalLight 
        position={[0, -10, 2]} 
        intensity={0.3} 
        color="#8080ff"
      />
      
      <group ref={groupRef}>
        {showGrid && <Grid />}
        {showAxis && <Axis />}
        <RobotArm jointAngles={jointAngles} />
        
        {/* Add a ground plane for shadows */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0, -0.4]} 
          receiveShadow
        >
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial 
            color="#2a2a2a" 
            metalness={0.1} 
            roughness={0.9}
            transparent
            opacity={0.8}
          />
        </mesh>
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
        camera={{ position: [1, -1.5, 0.8], fov: 50 }}
        shadows
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#1a1a1a');
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
          gl.outputEncoding = THREE.sRGBEncoding;
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
