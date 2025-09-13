import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, useGLTF } from '@react-three/drei/native';
import ROSLIB from 'roslib';

function Model({ url }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef();

  useFrame(() => {
    if (modelRef.current) {
      // Optional: Add animation logic here if needed
    }
  });

  return <primitive ref={modelRef} object={scene} scale={0.5} position={[0, 0, 0]} />;
}

// Use global ROS connection like other screens
let globalRosArm = null;
let globalArmConnectionStatus = false;

const Visualizer = () => {
  const [connected, setConnected] = useState(globalArmConnectionStatus);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const ROS_IP = '192.168.2.7';
  const ROS_PORT = 9090;
  const ros = useRef(globalRosArm);

  // Use the preloaded model URL directly
  const modelUrl = 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/robot-arm/model.gltf';

  useEffect(() => {
    // Check if global ROS connection exists
    if (globalRosArm && globalArmConnectionStatus) {
      console.log('Using existing ROS connection for Arm');
      ros.current = globalRosArm;
      setConnected(true);
      setupArmSubscribers();
    } else {
      initializeArmROS();
    }

    // Load the model
    setModelLoaded(true);
    
    return () => {
      // Keep connection alive for reuse
    };
  }, []);

  const initializeArmROS = () => {
    if (globalRosArm && globalRosArm.isConnected) {
      setConnected(true);
      return;
    }

    console.log(`Connecting to ROS at ${ROS_IP}:${ROS_PORT} for Arm...`);
    
    globalRosArm = new ROSLIB.Ros({
      url: `ws://${ROS_IP}:${ROS_PORT}`
    });

    ros.current = globalRosArm;

    globalRosArm.on('connection', () => {
      console.log('Connected to ROS bridge for Arm');
      globalArmConnectionStatus = true;
      setConnected(true);
      setupArmSubscribers();
    });

    globalRosArm.on('error', (error) => {
      console.error('Error connecting to ROS for Arm:', error);
      globalArmConnectionStatus = false;
      setConnected(false);
    });

    globalRosArm.on('close', () => {
      console.log('Arm ROS connection closed');
      globalArmConnectionStatus = false;
      setConnected(false);
      globalRosArm = null;
    });

    // 2 second timeout
    setTimeout(() => {
      if (!globalArmConnectionStatus) {
        console.log('Arm connection timeout');
      }
    }, 2000);
  };

  const setupArmSubscribers = () => {
    if (!ros.current) return;

    try {
      // Subscribe to joint state topics
      const jointStateListener = new ROSLIB.Topic({
        ros: ros.current,
        name: '/joint_states',
        messageType: 'sensor_msgs/JointState',
        throttle_rate: 100
      });

      jointStateListener.subscribe((message) => {
        console.log('Received joint states:', message);
        // Update robot arm position based on joint states
      });

    } catch (error) {
      console.error('Error setting up arm subscribers:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#E0AA3E" />
        <Text style={styles.loadingText}>Loading 3D Model...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Robot Arm Visualizer</Text>
        <Text style={styles.statusText}>
          {connected ? 'Connected: Receiving live data' : 'Not connected to robot'}
        </Text>
      </View>

      {modelError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{modelError}</Text>
        </View>
      ) : (
        <View style={styles.canvasContainer}>
          <Canvas style={styles.canvas}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <pointLight position={[-10, -10, -10]} />
            {modelLoaded && <Model url={modelUrl} />}
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          </Canvas>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#262626',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  statusText: {
    color: '#E0AA3E',
    fontSize: 14,
    marginTop: 4,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#333333',
  },
  canvas: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
  },
});

// Preload the model when the module loads
useGLTF.preload('https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/robot-arm/model.gltf');

export default Visualizer;
