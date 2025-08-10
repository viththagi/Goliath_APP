import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';

const URDFViewer = ({ 
  joint1Angle = 0,
  joint2Angle = 0, 
  joint3Angle = 0,
  joint4Angle = 0,
  joint5Angle = 0 
}) => {
  const [rotationX, setRotationX] = useState(new Animated.Value(0));
  const [rotationY, setRotationY] = useState(new Animated.Value(0));

  // Convert radians to degrees
  const joint1Deg = joint1Angle * (180 / Math.PI);
  const joint2Deg = joint2Angle * (180 / Math.PI);
  const joint3Deg = joint3Angle * (180 / Math.PI);
  const joint4Deg = joint4Angle * (180 / Math.PI);
  const joint5Deg = joint5Angle * (180 / Math.PI);

  // Create pan responder for 3D rotation
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      setRotationY(new Animated.Value(gestureState.dx * 0.5));
      setRotationX(new Animated.Value(gestureState.dy * 0.5));
    },
  });

  // 3D Robot arm segments with proper hierarchy
  const renderRobotArm = () => {
    return (
      <View style={styles.robotContainer}>
        {/* Base */}
        <View style={[styles.base, { transform: [{ rotateZ: `${joint1Deg}deg` }] }]}>
          <View style={styles.baseVisual} />
          
          {/* Link 1 - Shoulder */}
          <View style={[styles.link1, { transform: [{ rotateY: `${joint2Deg}deg` }] }]}>
            <View style={styles.linkVisual} />
            
            {/* Link 2 - Elbow */}
            <View style={[styles.link2, { transform: [{ rotateY: `${joint3Deg}deg` }] }]}>
              <View style={[styles.linkVisual, { backgroundColor: '#E0AA3E' }]} />
              
              {/* Link 3 - Wrist */}
              <View style={[styles.link3, { transform: [{ rotateY: `${joint4Deg}deg` }] }]}>
                <View style={[styles.linkVisual, { backgroundColor: '#FFA500' }]} />
                
                {/* End Effector */}
                <View style={[styles.endEffector, { transform: [{ rotateY: `${joint5Deg}deg` }] }]}>
                  <View style={styles.gripperLeft} />
                  <View style={styles.gripperRight} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>3D Goliath Robot Arm</Text>
      
      <Animated.View 
        style={[
          styles.viewport3D,
          {
            transform: [
              { perspective: 1000 },
              { rotateX: rotationX.interpolate({
                inputRange: [-100, 100],
                outputRange: ['-15deg', '15deg'],
              })},
              { rotateY: rotationY.interpolate({
                inputRange: [-100, 100],
                outputRange: ['-30deg', '30deg'],
              })},
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {renderRobotArm()}
      </Animated.View>
      
      <View style={styles.controls}>
        <Text style={styles.controlText}>Drag to rotate • Pinch to zoom</Text>
      </View>
      
      <View style={styles.jointInfo}>
        <View style={styles.jointRow}>
          <Text style={styles.jointLabel}>Base:</Text>
          <Text style={styles.jointValue}>{joint1Deg.toFixed(1)}°</Text>
        </View>
        <View style={styles.jointRow}>
          <Text style={styles.jointLabel}>Shoulder:</Text>
          <Text style={styles.jointValue}>{joint2Deg.toFixed(1)}°</Text>
        </View>
        <View style={styles.jointRow}>
          <Text style={styles.jointLabel}>Elbow:</Text>
          <Text style={styles.jointValue}>{joint3Deg.toFixed(1)}°</Text>
        </View>
        <View style={styles.jointRow}>
          <Text style={styles.jointLabel}>Wrist:</Text>
          <Text style={styles.jointValue}>{joint4Deg.toFixed(1)}°</Text>
        </View>
        <View style={styles.jointRow}>
          <Text style={styles.jointLabel}>End:</Text>
          <Text style={styles.jointValue}>{joint5Deg.toFixed(1)}°</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 450,
    backgroundColor: '#262626',
    borderRadius: 10,
    margin: 10,
    padding: 15,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  viewport3D: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  robotContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  base: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseVisual: {
    width: 50,
    height: 30,
    backgroundColor: '#666666',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#E0AA3E',
  },
  link1: {
    width: 80,
    height: 20,
    position: 'absolute',
    top: -40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  link2: {
    width: 60,
    height: 15,
    position: 'absolute',
    right: -60,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  link3: {
    width: 50,
    height: 12,
    position: 'absolute',
    right: -50,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  linkVisual: {
    flex: 1,
    backgroundColor: '#E0AA3E',
    borderRadius: 3,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  endEffector: {
    width: 30,
    height: 20,
    position: 'absolute',
    right: -30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  gripperLeft: {
    width: 15,
    height: 3,
    backgroundColor: '#FF6B6B',
    marginRight: 2,
    borderRadius: 1,
  },
  gripperRight: {
    width: 15,
    height: 3,
    backgroundColor: '#FF6B6B',
    marginLeft: 2,
    borderRadius: 1,
  },
  controls: {
    padding: 8,
    alignItems: 'center',
  },
  controlText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  jointInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  jointRow: {
    alignItems: 'center',
    marginVertical: 2,
    minWidth: '30%',
  },
  jointLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  jointValue: {
    color: '#E0AA3E',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default URDFViewer;