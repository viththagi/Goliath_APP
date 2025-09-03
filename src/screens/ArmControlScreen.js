// src/screens/ArmControlScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useROS } from '../contexts/ROSContext';  // CORRECTED IMPORT PATH
import URDFViewer from '../components/URDFViewer';  // Added import (adjust path if needed)
import ROSLIB from 'roslib';

const ArmControlScreen = () => {
  const { ros, isConnected } = useROS();
  const [jointAngles, setJointAngles] = useState({
    joint_1: 0,
    joint_2: 0,
    joint_3: 0,
    joint_4: 0,
    joint_5: 0,
    joint_6: 0
  });

  const sendJointCommand = (joint, value) => {
    if (!ros || !isConnected) return;

    try {
      const topic = new ROSLIB.Topic({
        ros: ros,
        name: `/joint_states/command`,
        messageType: 'std_msgs/Float64'
      });

      const message = new ROSLIB.Message({
        data: value
      });

      topic.publish(message);
      console.log(`Sent ${joint} command: ${value}rad`);
    } catch (error) {
      console.error(`Error sending ${joint} command:`, error);
    }
  };

  const handleJointChange = (joint, value) => {
    setJointAngles(prev => ({
      ...prev,
      [joint]: value
    }));
    sendJointCommand(joint, value);
  };

  const presetPosition = (name) => {
    const presets = {
      home: { shoulder: 0, elbow: 0, wrist: 0, gripper: 0 },
      ready: { shoulder: Math.PI/4, elbow: -Math.PI/4, wrist: 0, gripper: 0.5 },
      extended: { shoulder: Math.PI/2, elbow: -Math.PI/2, wrist: Math.PI/4, gripper: 1 }
    };

    const preset = presets[name];
    if (preset) {
      setJointAngles(preset);
      Object.entries(preset).forEach(([joint, value]) => {
        sendJointCommand(joint, value);
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Robot Arm Control</Text>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isConnected ? 'git-branch' : 'git-branch-outline'} 
            size={20} 
            color={isConnected ? '#4CAF50' : '#E0AA3E'} 
          />
          <Text style={[styles.statusText, {color: isConnected ? '#4CAF50' : '#E0AA3E'}]}>
            {isConnected ? 'ROS Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Added URDFViewer here with fixed height; placed outside ScrollView for better performance */}
      <URDFViewer 
        ros={ros}
        isConnected={isConnected}  // Pass to sync connection state
        jointStatesTopic="/joint_states"
        defaultJointAngles={jointAngles}  // Pass local angles to reflect changes if not subscribed
        height={500}  // Fixed height to prevent taking over; adjust as needed
        width="100%"
        autoRotate={true}
        showGrid={false}
        showAxis={false}
        showOverlay={false}  // Hide overlay to avoid duplication with screen info
      />

      <ScrollView style={styles.content}>
        {/* Preset Positions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preset Positions</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => presetPosition('home')}
            >
              <Ionicons name="home" size={20} color="#FFF" />
              <Text style={styles.presetText}>Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => presetPosition('ready')}
            >
              <Ionicons name="play" size={20} color="#FFF" />
              <Text style={styles.presetText}>Ready</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.presetButton}
              onPress={() => presetPosition('extended')}
            >
              <Ionicons name="expand" size={20} color="#FFF" />
              <Text style={styles.presetText}>Extended</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Joint Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Joint Control</Text>
          
          {Object.entries(jointAngles).map(([joint, angle]) => (
            <View key={joint} style={styles.jointControl}>
              <Text style={styles.jointLabel}>
                {joint.toUpperCase()}: {(angle * 180 / Math.PI).toFixed(1)}°
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={-Math.PI}
                maximumValue={Math.PI}
                value={angle}
                onValueChange={(value) => handleJointChange(joint, value)}
                minimumTrackTintColor="#E0AA3E"
                maximumTrackTintColor="#333"
                thumbTintColor="#E0AA3E"
              />
              <View style={styles.jointButtons}>
                <TouchableOpacity 
                  style={styles.jointButton}
                  onPress={() => handleJointChange(joint, angle - 0.1)}
                >
                  <Ionicons name="remove" size={16} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.jointButton}
                  onPress={() => handleJointChange(joint, angle + 0.1)}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Connection Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Info</Text>
          <Text style={styles.infoText}>
            ● Status: {isConnected ? 'Connected ✓' : 'Disconnected ✗'}
          </Text>
          <Text style={styles.infoText}>
            ● ROS Master: {ros ? 'Available' : 'Not available'}
          </Text>
          <Text style={styles.infoText}>
            ● Control Topic: /joint_states/command
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 10,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 10,
    marginBottom: 10,
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#262626',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  presetButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 10,
    minWidth: 80,
  },
  presetText: {
    color: '#E0AA3E',
    fontSize: 12,
    marginTop: 5,
  },
  jointControl: {
    marginBottom: 20,
  },
  jointLabel: {
    color: '#E0AA3E',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  jointButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  jointButton: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 5,
    minWidth: 40,
    alignItems: 'center',
  },
  infoText: {
    color: '#E0AA3E',
    fontSize: 12,
    marginBottom: 5,
  },
});

export default ArmControlScreen;
