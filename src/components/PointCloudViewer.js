import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Points, PointMaterial } from '@react-three/drei';
import ROSLIB from 'roslib';

const PointCloudViewer = ({ style, topic = '/unilidar/cloud' }) => {
  const [ros, setRos] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Create direct ROS connection within this component
  useEffect(() => {
    console.log('Creating ROS connection for PointCloudViewer...');
    
    const rosInstance = new ROSLIB.Ros({
      url: 'ws://192.168.2.23:9090' // Hardcode your robot's IP
    });

    rosInstance.on('connection', () => {
      console.log('PointCloudViewer: ROS connected successfully');
      setIsConnected(true);
      setIsLoading(false);
    });

    rosInstance.on('error', (error) => {
      console.log('PointCloudViewer: ROS connection error', error);
      setIsConnected(false);
      setIsLoading(false);
    });

    rosInstance.on('close', () => {
      console.log('PointCloudViewer: ROS connection closed');
      setIsConnected(false);
      setIsLoading(false);
    });

    setRos(rosInstance);

    // Cleanup
    return () => {
      if (rosInstance) {
        rosInstance.close();
        console.log('PointCloudViewer: Cleaned up ROS connection');
      }
    };
  }, []);

  const PointCloud = ({ topic }) => {
    const [rawData, setRawData] = useState(null);

    useEffect(() => {
      if (!ros || !isConnected) {
        console.log('Waiting for ROS connection before subscribing...');
        return;
      }

      console.log('Subscribing to point cloud topic:', topic);
      
      const pointCloudTopic = new ROSLIB.Topic({
        ros: ros,
        name: topic,
        messageType: 'sensor_msgs/PointCloud2'
      });

      pointCloudTopic.subscribe((message) => {
        console.log('Received point cloud message with', message.width * message.height, 'points');
        setRawData(message);
      });

      return () => {
        try {
          pointCloudTopic.unsubscribe();
          console.log('Unsubscribed from point cloud topic');
        } catch (error) {
          console.log('Error unsubscribing:', error);
        }
      };
    }, [ros, isConnected, topic]);

    const pointsData = useMemo(() => {
      if (!rawData) {
        // Generate test points if no real data
        const testPoints = [];
        for (let x = -3; x <= 3; x += 0.3) {
          for (let z = -3; z <= 3; z += 0.3) {
            testPoints.push(x, 0, z); // Simple grid on ground plane
          }
        }
        console.log('Using test points:', testPoints.length / 3);
        return testPoints;
      }
      
      console.log('Processing real point cloud data...');
      // Add your real point cloud processing logic here
      return []; // Return empty for now to use test points
    }, [rawData]);

    const geometry = useMemo(() => {
      if (pointsData.length === 0) return null;
      
      try {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(pointsData, 3));
        return geometry;
      } catch (error) {
        console.error('Error creating geometry:', error);
        return null;
      }
    }, [pointsData]);

    if (!geometry) {
      return (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ff6b6b" wireframe />
        </mesh>
      );
    }

    return (
      <Points positions={geometry.attributes.position.array}>
        <PointMaterial
          size={0.05}
          color="#E0AA3E"
          sizeAttenuation={true}
        />
      </Points>
    );
  };

  if (isLoading) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2A2A2A' }]}>
        <ActivityIndicator size="large" color="#E0AA3E" />
        <Text style={{ color: '#FFF', marginTop: 16 }}>Connecting to ROS...</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2A2A2A' }]}>
        <Text style={{ color: '#F44336', fontSize: 18, fontWeight: '600' }}>⚠️ Not Connected</Text>
        <Text style={{ color: '#FFF', marginTop: 8, textAlign: 'center' }}>
          Unable to connect to ROS at ws://192.168.2.23:9090
        </Text>
        <Text style={{ color: '#E0AA3E', marginTop: 16, fontFamily: 'monospace' }}>
          Topic: {topic}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Canvas
        style={style}
        camera={{ position: [10, 10, 10], fov: 75 }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        
        <PointCloud topic={topic} />
        
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={100}
        />
        
        <gridHelper args={[10, 10]} rotation={[Math.PI / 2, 0, 0]} />
        <axesHelper args={[5]} />
      </Canvas>
      
      {/* Connection status overlay */}
      <View style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 10,
        borderRadius: 5,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <View style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: isConnected ? '#4CAF50' : '#F44336',
            marginRight: 8
          }} />
          <Text style={{ color: '#FFF', fontSize: 12 }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <Text style={{ color: '#E0AA3E', fontSize: 10, fontFamily: 'monospace' }}>
          {topic}
        </Text>
      </View>
    </View>
  );
};

export default PointCloudViewer;
