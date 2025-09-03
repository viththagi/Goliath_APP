// src/components/PointCloudViewer.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import ROSLIB from 'roslib';

const { width, height } = Dimensions.get('window');

// Grid Component - Fixed for XY plane (Z-up)
const Grid = ({ size = 10, color = '#444' }) => {
  return (
    <mesh position={[0, 0, 0]}> {/* No rotation - sits on XY plane */}
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} wireframe opacity={0.3} transparent />
    </mesh>
  );
};

// Axis Helper Component - FIXED ROS Convention: X=Red(Forward), Y=Green(Left), Z=Blue(Up)
const Axis = ({ size = 2 }) => {
  return (
    <>
      {/* X Axis (Red) - FORWARD */}
      <mesh position={[size/2, 0, 0]}>
        <boxGeometry args={[size, 0.03, 0.03]} />
        <meshBasicMaterial color="red" />
      </mesh>
      {/* Y Axis (Green) - LEFT */}
      <mesh position={[0, size/2, 0]} rotation={[0, 0, Math.PI/2]}>
        <boxGeometry args={[size, 0.03, 0.03]} />
        <meshBasicMaterial color="green" />
      </mesh>
      {/* Z Axis (Blue) - UP */}
      <mesh position={[0, 0, size/2]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[size, 0.03, 0.03]} />
        <meshBasicMaterial color="blue" />
      </mesh>
    </>
  );
};

// Point Cloud Component
const PointCloudPoints = ({ points, color = '#00ff00', pointSize = 0.05 }) => {
  if (!points || points.length === 0) return null;

  const geometryRef = useRef();
  const positions = new Float32Array(points.length * 3);

  points.forEach((point, index) => {
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = point.z;
  });

  useEffect(() => {
    if (geometryRef.current && positions.length > 0) {
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
        size={pointSize}
        sizeAttenuation={true}
      />
    </points>
  );
};

// 3D Scene Component - FIXED rotation
const PointCloudScene = ({ 
  autoRotate = false, 
  pointCloudData = [], 
  pointSize = 0.05,
  showGrid = true,
  showAxis = true 
}) => {
  const groupRef = useRef();

  useFrame((state, delta) => {
    if (autoRotate && groupRef.current) {
      // Rotate around Z axis (up) instead of Y axis
      groupRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, 5]} intensity={0.4} />
      
      <group ref={groupRef}>
        {showGrid && <Grid />}
        {showAxis && <Axis />}
        <PointCloudPoints points={pointCloudData} pointSize={pointSize} />
      </group>
    </>
  );
};

const PointCloudViewer = ({ 
  ros = null,
  topic = '/unilidar/cloud',
  pointSize = 0.05,
  autoRotate = false,
  showGrid = true,
  showAxis = true,
  style = {},
  onPointsUpdate = null
}) => {
  const [pointCloudData, setPointCloudData] = useState([]);
  const [pointCount, setPointCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parse PointCloud2 message
  const parsePointCloud2 = (pointCloud) => {
    try {
      const points = [];
      const { data, fields, point_step, width, height } = pointCloud;
      
      // Find field offsets
      let xOffset = -1, yOffset = -1, zOffset = -1;
      fields.forEach((field) => {
        if (field.name === 'x') xOffset = field.offset;
        if (field.name === 'y') yOffset = field.offset;
        if (field.name === 'z') zOffset = field.offset;
      });

      if (xOffset === -1 || yOffset === -1 || zOffset === -1) {
        throw new Error('Missing coordinate fields in PointCloud2');
      }

      // Handle different data formats
      let buffer;
      if (typeof data === 'string') {
        // Base64 string - decode it
        const binaryString = atob(data);
        buffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          buffer[i] = binaryString.charCodeAt(i);
        }
      } else if (Array.isArray(data)) {
        // Array of numbers
        buffer = new Uint8Array(data);
      } else if (data instanceof Uint8Array) {
        // Already Uint8Array
        buffer = data;
      } else {
        throw new Error('Unsupported data format: ' + typeof data);
      }

      const dataView = new DataView(buffer.buffer);
      const totalPoints = width * height;

      for (let i = 0; i < totalPoints; i++) {
        const pointStart = i * point_step;
        
        const x = dataView.getFloat32(pointStart + xOffset, true);
        const y = dataView.getFloat32(pointStart + yOffset, true);
        const z = dataView.getFloat32(pointStart + zOffset, true);

        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          points.push({ x, y, z });
        }
      }

      return points;
    } catch (err) {
      console.error('Error parsing PointCloud2:', err);
      return [];
    }
  };

  useEffect(() => {
    if (!ros) {
      setLoading(false);
      setError('ROS connection not provided');
      return;
    }

    setLoading(true);
    setError(null);

    const listener = new ROSLIB.Topic({
      ros: ros,
      name: topic,
      messageType: 'sensor_msgs/PointCloud2'
    });

    listener.subscribe((message) => {
      try {
        console.log('Received PointCloud2 message, fields:', message.fields);
        const points = parsePointCloud2(message);
        setPointCloudData(points);
        setPointCount(points.length);
        setLoading(false);
        setIsConnected(true);
        
        if (onPointsUpdate) {
          onPointsUpdate(points);
        }
      } catch (err) {
        console.error('Error processing PointCloud2:', err);
        setError(`Processing error: ${err.message}`);
        setLoading(false);
      }
    });

    listener.on('error', (err) => {
      console.error('Topic error:', err);
      setError(`Topic error: ${err.message}`);
      setLoading(false);
    });

    return () => {
      listener.unsubscribe();
    };
  }, [ros, topic]);

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#E0AA3E" />
          <Text style={styles.loadingText}>Connecting to {topic}...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.infoText}>Topic: {topic}</Text>
          <Text style={styles.infoText}>Type: PointCloud2</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Canvas
        style={styles.canvas}
        camera={{ position: [0, -5, 5], fov: 80 }} // Camera looking from behind-left-above
        onCreated={({ gl }) => {
          gl.setClearColor('#111133');
        }}
      >
        <PointCloudScene 
          autoRotate={autoRotate}
          pointCloudData={pointCloudData}
          pointSize={pointSize}
          showGrid={showGrid}
          showAxis={showAxis}
        />
      </Canvas>
      
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>Points: {pointCount}</Text>
        <Text style={styles.overlayText}>Topic: {topic}</Text>
        <Text style={styles.overlayText}>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
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
  errorText: {
    color: '#F44336',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    color: '#E0AA3E',
    fontSize: 12,
    marginTop: 5,
  },
  overlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 6,
    minWidth: 120,
  },
  overlayText: {
    color: '#FFF',
    fontSize: 12,
    marginBottom: 2,
  },
});

export default PointCloudViewer;
