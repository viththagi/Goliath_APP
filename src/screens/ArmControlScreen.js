import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, ScrollView, View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import URDFViewer from '../components/URDFViewer';
import JointSlider from '../components/JointSlider';
import ROSLIB from 'roslib';

const ArmControlScreen = () => {
  // Joint angles in radians
  const [joint1Angle, setJoint1Angle] = useState(0);
  const [joint2Angle, setJoint2Angle] = useState(0);
  const [joint3Angle, setJoint3Angle] = useState(0);
  const [joint4Angle, setJoint4Angle] = useState(0);
  const [joint5Angle, setJoint5Angle] = useState(0);
  const [jointPublisher, setJointPublisher] = useState(null);
  const [ros, setRos] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Hard-coded ROS connection details
  const ROS_IP = '192.168.2.23'; // Replace with your robot's IP address
  const ROS_PORT = 9090;

  // Initialize ROS connection with hard-coded IP
  useEffect(() => {
    console.log(`Connecting to ROS at ${ROS_IP}:${ROS_PORT}...`);
    
    // Create a new ROS connection
    const ros = new ROSLIB.Ros({
      url: `ws://${ROS_IP}:${ROS_PORT}`
    });

    setRos(ros);

    // Add event listeners
    ros.on('connection', () => {
      console.log('Connected to ROS bridge');
      setIsConnected(true);
      
      // Initialize publisher after connection is established
      const publisher = new ROSLIB.Topic({
        ros: ros,
        name: '/position_controller/commands',
        messageType: 'std_msgs/Float64MultiArray'
      });

      setJointPublisher(publisher);
      console.log('ROS Joint Publisher initialized');
    });

    ros.on('error', (error) => {
      console.error('Error connecting to ROS:', error);
      setIsConnected(false);
      Alert.alert('Connection Error', `Failed to connect to ${ROS_IP}:${ROS_PORT}`);
    });

    ros.on('close', () => {
      console.log('Connection to ROS closed');
      setIsConnected(false);
    });

    // Attempt to connect
    try {
      ros.connect(`ws://${ROS_IP}:${ROS_PORT}`);
    } catch (error) {
      console.error('Failed to connect to ROS:', error);
      Alert.alert('Connection Error', `Failed to connect to ${ROS_IP}:${ROS_PORT}`);
    }

    // Cleanup on unmount
    return () => {
      if (ros) {
        ros.close();
      }
    };
  }, []);

  // Function to publish all joints as Float64MultiArray
  const publishAllJoints = () => {
    if (!jointPublisher || !isConnected) {
      Alert.alert('Error', 'Not connected to ROS');
      return;
    }

    // Create the joint command message in the exact format your robot expects
    const message = new ROSLIB.Message({
      data: [joint1Angle, joint2Angle, joint3Angle, joint4Angle, joint5Angle]
    });

    jointPublisher.publish(message);
    console.log('Published joints:', [joint1Angle, joint2Angle, joint3Angle, joint4Angle, joint5Angle]);
    Alert.alert('Success', 'Joint commands published successfully');
  };

  // Function to handle individual joint changes
  const handleJointChange = (jointIndex, value) => {
    // Update the specific joint state
    switch(jointIndex) {
      case 0: setJoint1Angle(value); break;
      case 1: setJoint2Angle(value); break;
      case 2: setJoint3Angle(value); break;
      case 3: setJoint4Angle(value); break;
      case 4: setJoint5Angle(value); break;
    }
  };

  // Function to reconnect to ROS
  const reconnectROS = () => {
    if (ros) {
      try {
        ros.connect(`ws://${ROS_IP}:${ROS_PORT}`);
        Alert.alert('Reconnecting', `Attempting to connect to ${ROS_IP}:${ROS_PORT}`);
      } catch (error) {
        console.error('Failed to reconnect to ROS:', error);
        Alert.alert('Connection Error', `Failed to connect to ${ROS_IP}:${ROS_PORT}`);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}> 
      <StatusBar barStyle="light-content" />
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Goliath Robot Control</Text>
          <Text style={styles.subtitle}>5-DOF Robotic Arm</Text>
          <Text style={[styles.connectionStatus, {color: isConnected ? '#4CAF50' : '#F44336'}]}>
            ROS: {isConnected ? 'Connected' : 'Disconnected'} to {ROS_IP}
          </Text>
          <Text style={styles.topicInfo}>
            Publishing to: /position_controller/commands
          </Text>
          <Text style={styles.topicInfo}>
            Message: std_msgs/Float64MultiArray
          </Text>
          
          {!isConnected && (
            <TouchableOpacity onPress={reconnectROS} style={styles.reconnectButton}>
              <Text style={styles.reconnectButtonText}>Reconnect</Text>
            </TouchableOpacity>
          )}
        </View>

        <URDFViewer 
          joint1Angle={joint1Angle}
          joint2Angle={joint2Angle}
          joint3Angle={joint3Angle}
          joint4Angle={joint4Angle}
          joint5Angle={joint5Angle}
        />

        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Joint Controls (Radians)</Text>
          
          <JointSlider 
            label="Joint 1 (Base)" 
            angle={joint1Angle} 
            setAngle={(value) => handleJointChange(0, value)} 
            min={-Math.PI} 
            max={Math.PI}
            step={0.01}
            units="rad"
          />
          
          <JointSlider 
            label="Joint 2 (Shoulder)" 
            angle={joint2Angle} 
            setAngle={(value) => handleJointChange(1, value)} 
            min={-Math.PI/2} 
            max={Math.PI/2}
            step={0.01}
            units="rad"
          />
          
          <JointSlider 
            label="Joint 3 (Elbow)" 
            angle={joint3Angle} 
            setAngle={(value) => handleJointChange(2, value)} 
            min={-Math.PI/2} 
            max={Math.PI/2}
            step={0.01}
            units="rad"
          />
          
          <JointSlider 
            label="Joint 4 (Wrist Roll)" 
            angle={joint4Angle} 
            setAngle={(value) => handleJointChange(3, value)} 
            min={-Math.PI} 
            max={Math.PI}
            step={0.01}
            units="rad"
          />
          
          <JointSlider 
            label="Joint 5 (Wrist Pitch)" 
            angle={joint5Angle} 
            setAngle={(value) => handleJointChange(4, value)} 
            min={-Math.PI/2} 
            max={Math.PI/2}
            step={0.01}
            units="rad"
          />

          {/* Publish Button */}
          <TouchableOpacity 
            style={[styles.publishButton, !isConnected && styles.publishButtonDisabled]}
            onPress={publishAllJoints}
            disabled={!isConnected}
          >
            <Text style={styles.publishButtonText}>
              {isConnected ? 'PUBLISH JOINT COMMANDS' : 'CONNECT TO PUBLISH'}
            </Text>
          </TouchableOpacity>

          {/* Current Values Display */}
          <View style={styles.valuesContainer}>
            <Text style={styles.valuesTitle}>Current Joint Values (radians):</Text>
            <Text style={styles.valuesText}>
              [{joint1Angle.toFixed(2)}, {joint2Angle.toFixed(2)}, {joint3Angle.toFixed(2)}, {joint4Angle.toFixed(2)}, {joint5Angle.toFixed(2)}]
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  connectionStatus: {
    fontSize: 12,
    color: '#E0AA3E',
    marginBottom: 2,
    fontWeight: '600',
  },
  topicInfo: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 1,
  },
  reconnectButton: {
    backgroundColor: '#E0AA3E',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  reconnectButtonText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  controlsSection: {
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 10,
    marginBottom: 10,
  },
  publishButton: {
    backgroundColor: '#E0AA3E',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 10,
  },
  publishButtonDisabled: {
    backgroundColor: '#666666',
  },
  publishButtonText: {
    color: '#1A1A1A',
    fontWeight: '600',
    fontSize: 16,
  },
  valuesContainer: {
    backgroundColor: '#262626',
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    marginHorizontal: 10,
  },
  valuesTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  valuesText: {
    color: '#E0AA3E',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});

export default ArmControlScreen;
