import React, { useState } from 'react';
import { SafeAreaView, StatusBar, ScrollView, View, Text, StyleSheet } from 'react-native';
import URDFViewer from '../components/URDFViewer';
import JointSlider from '../components/JointSlider';

const ArmControlScreen = () => {
  // Joint angles in radians (as per URDF specs)
  const [joint1Angle, setJoint1Angle] = useState(0);      // Base: -π to π
  const [joint2Angle, setJoint2Angle] = useState(0);      // Shoulder: -π/2 to π/2
  const [joint3Angle, setJoint3Angle] = useState(0);      // Elbow: -π/2 to π/2
  const [joint4Angle, setJoint4Angle] = useState(0);      // Wrist roll: -π to π
  const [joint5Angle, setJoint5Angle] = useState(0);      // Wrist pitch: -π/2 to π/2

  return (
    <SafeAreaView style={styles.container}> 
      <StatusBar barStyle="light-content" />
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Goliath Robot Control</Text>
          <Text style={styles.subtitle}>5-DOF Robotic Arm</Text>
        </View>

        <URDFViewer 
          joint1Angle={joint1Angle}
          joint2Angle={joint2Angle}
          joint3Angle={joint3Angle}
          joint4Angle={joint4Angle}
          joint5Angle={joint5Angle}
        />

        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Joint Controls</Text>
          
          <JointSlider 
            label="Joint 1 (Base)" 
            angle={joint1Angle} 
            setAngle={setJoint1Angle} 
            min={-Math.PI} 
            max={Math.PI}
            units="rad"
          />
          
          <JointSlider 
            label="Joint 2 (Shoulder)" 
            angle={joint2Angle} 
            setAngle={setJoint2Angle} 
            min={-Math.PI/2} 
            max={Math.PI/2}
            units="rad"
          />
          
          <JointSlider 
            label="Joint 3 (Elbow)" 
            angle={joint3Angle} 
            setAngle={setJoint3Angle} 
            min={-Math.PI/2} 
            max={Math.PI/2}
            units="rad"
          />
          
          <JointSlider 
            label="Joint 4 (Wrist Roll)" 
            angle={joint4Angle} 
            setAngle={setJoint4Angle} 
            min={-Math.PI} 
            max={Math.PI}
            units="rad"
          />
          
          <JointSlider 
            label="Joint 5 (Wrist Pitch)" 
            angle={joint5Angle} 
            setAngle={setJoint5Angle} 
            min={-Math.PI/2} 
            max={Math.PI/2}
            units="rad"
          />
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
});

export default ArmControlScreen;


