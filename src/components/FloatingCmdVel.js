// src/components/FloatingCmdVel.js
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useROS } from '../contexts/ROSContext';
import { useCmdVel } from '../contexts/CmdVelContext';
import ROSLIB from 'roslib';

const FloatingCmdVel = () => {
  const { ros, isConnected } = useROS();
  const { cmdVelEnabled } = useCmdVel();
  const [visible, setVisible] = useState(false);
  const [linearVel, setLinearVel] = useState(0.5); // Default speed
  const [angularVel, setAngularVel] = useState(1.0); // Default turn speed
  const [pan] = useState(new Animated.ValueXY());
  
  const activeMoveRef = useRef(null);
  const intervalRef = useRef(null);

  if (!cmdVelEnabled) {
    return null;
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([
      null,
      { dx: pan.x, dy: pan.y }
    ], { useNativeDriver: false }),
    onPanResponderRelease: () => {
      pan.extractOffset();
    }
  });

  const sendCmdVel = useCallback((linear, angular) => {
    if (!ros || !isConnected) return;

    try {
      const cmdVelTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/cmd_vel',
        messageType: 'geometry_msgs/Twist'
      });

      const twist = new ROSLIB.Message({
        linear: {
          x: linear,
          y: 0,
          z: 0
        },
        angular: {
          x: 0,
          y: 0,
          z: angular
        }
      });

      cmdVelTopic.publish(twist);
    } catch (error) {
      console.error('Error sending cmd_vel:', error);
    }
  }, [ros, isConnected]);

  const startSending = useCallback((linear, angular) => {
    // Clear any existing interval
    stopSending();
    
    // Send immediately
    sendCmdVel(linear, angular);
    
    // Set up interval for continuous sending
    intervalRef.current = setInterval(() => {
      sendCmdVel(linear, angular);
    }, 200); // Send every 200ms
  }, [sendCmdVel]);

  const stopSending = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    sendCmdVel(0, 0); // Stop the robot
  }, [sendCmdVel]);

  const handleButtonPress = (direction) => {
    let linear = 0;
    let angular = 0;
    
    switch (direction) {
      case 'forward':
        linear = linearVel;
        angular = 0;
        break;
      case 'backward':
        linear = -linearVel;
        angular = 0;
        break;
      case 'left':
        linear = 0;
        angular = angularVel;
        break;
      case 'right':
        linear = 0;
        angular = -angularVel;
        break;
      case 'forwardLeft':
        linear = linearVel * 0.7;
        angular = angularVel * 0.7;
        break;
      case 'forwardRight':
        linear = linearVel * 0.7;
        angular = -angularVel * 0.7;
        break;
      case 'backwardLeft':
        linear = -linearVel * 0.7;
        angular = angularVel * 0.7;
        break;
      case 'backwardRight':
        linear = -linearVel * 0.7;
        angular = -angularVel * 0.7;
        break;
      default:
        return;
    }
    
    activeMoveRef.current = direction;
    startSending(linear, angular);
  };

  const handleButtonRelease = () => {
    activeMoveRef.current = null;
    stopSending();
  };

  const handleLinearChange = (value) => {
    setLinearVel(value);
    // Don't send cmd_vel on slider change
  };

  const handleAngularChange = (value) => {
    setAngularVel(value);
    // Don't send cmd_vel on slider change
  };

  if (!visible) {
    return (
      <Animated.View 
        style={[
          styles.floatingButton,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={() => setVisible(true)}>
          <Ionicons name="navigate" size={28} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.cmdVelContainer,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🎮 Robot Control</Text>
        <TouchableOpacity onPress={() => {
          setVisible(false);
          stopSending();
        }}>
          <Ionicons name="close-circle" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Joystick Layout */}
      <View style={styles.joystickContainer}>
        <View style={styles.joystickRow}>
          {/* Empty space for layout */}
          <View style={styles.joystickButtonPlaceholder} />
          
          <TouchableOpacity 
            style={[styles.joystickButton, styles.forwardButton]}
            onPressIn={() => handleButtonPress('forward')}
            onPressOut={handleButtonRelease}
          >
            <Ionicons name="arrow-up" size={24} color="#FFF" />
          </TouchableOpacity>
          
          {/* Empty space for layout */}
          <View style={styles.joystickButtonPlaceholder} />
        </View>

        <View style={styles.joystickRow}>
          <TouchableOpacity 
            style={[styles.joystickButton, styles.leftButton]}
            onPressIn={() => handleButtonPress('left')}
            onPressOut={handleButtonRelease}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          
          {/* Center stop button */}
          <TouchableOpacity 
            style={[styles.joystickButton, styles.stopButton]}
            onPress={stopSending}
          >
            <Ionicons name="stop" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.joystickButton, styles.rightButton]}
            onPressIn={() => handleButtonPress('right')}
            onPressOut={handleButtonRelease}
          >
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.joystickRow}>
          {/* Empty space for layout */}
          <View style={styles.joystickButtonPlaceholder} />
          
          <TouchableOpacity 
            style={[styles.joystickButton, styles.backwardButton]}
            onPressIn={() => handleButtonPress('backward')}
            onPressOut={handleButtonRelease}
          >
            <Ionicons name="arrow-down" size={24} color="#FFF" />
          </TouchableOpacity>
          
          {/* Empty space for layout */}
          <View style={styles.joystickButtonPlaceholder} />
        </View>

        {/* Diagonal buttons */}
        <View style={styles.diagonalContainer}>
          // In the diagonal buttons section, replace the icon names:
<TouchableOpacity 
  style={[styles.diagonalButton, styles.forwardLeftButton]}
  onPressIn={() => handleButtonPress('forwardLeft')}
  onPressOut={handleButtonRelease}
>
  <Ionicons name="return-up-back" size={16} color="#FFF" />
</TouchableOpacity>

<TouchableOpacity 
  style={[styles.diagonalButton, styles.forwardRightButton]}
  onPressIn={() => handleButtonPress('forwardRight')}
  onPressOut={handleButtonRelease}
>
  <Ionicons name="return-up-forward" size={16} color="#FFF" />
</TouchableOpacity>

<TouchableOpacity 
  style={[styles.diagonalButton, styles.backwardLeftButton]}
  onPressIn={() => handleButtonPress('backwardLeft')}
  onPressOut={handleButtonRelease}
>
  <Ionicons name="return-down-back" size={16} color="#FFF" />
</TouchableOpacity>

<TouchableOpacity 
  style={[styles.diagonalButton, styles.backwardRightButton]}
  onPressIn={() => handleButtonPress('backwardRight')}
  onPressOut={handleButtonRelease}
>
  <Ionicons name="return-down-forward" size={16} color="#FFF" />
</TouchableOpacity>
        </View>
      </View>

      {/* Speed Controls */}
      <View style={styles.controlSection}>
        <Text style={styles.label}>🚀 Speed: {linearVel.toFixed(1)} m/s</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.1}
          maximumValue={2.0}
          value={linearVel}
          onValueChange={handleLinearChange}
          minimumTrackTintColor="#4CAF50"
          maximumTrackTintColor="#333"
          thumbTintColor="#4CAF50"
        />
      </View>

      <View style={styles.controlSection}>
        <Text style={styles.label}>🔄 Turn Rate: {angularVel.toFixed(1)} rad/s</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.1}
          maximumValue={3.0}
          value={angularVel}
          onValueChange={handleAngularChange}
          minimumTrackTintColor="#2196F3"
          maximumTrackTintColor="#333"
          thumbTintColor="#2196F3"
        />
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusText}>
          {activeMoveRef.current ? `Moving: ${activeMoveRef.current}` : 'Ready'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#E0AA3E',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  cmdVelContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    width: 340,
    padding: 20,
    borderRadius: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  title: {
    color: '#E0AA3E',
    fontSize: 18,
    fontWeight: '700',
  },
  joystickContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  joystickRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  joystickButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  joystickButtonPlaceholder: {
    width: 60,
    height: 60,
    margin: 5,
  },
  forwardButton: {
    backgroundColor: '#4CAF50',
  },
  backwardButton: {
    backgroundColor: '#F44336',
  },
  leftButton: {
    backgroundColor: '#2196F3',
  },
  rightButton: {
    backgroundColor: '#2196F3',
  },
  stopButton: {
    backgroundColor: '#FF9800',
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  diagonalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  diagonalButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#666',
  },
  forwardLeftButton: {
    top: 10,
    left: 10,
  },
  forwardRightButton: {
    top: 10,
    right: 10,
  },
  backwardLeftButton: {
    bottom: 10,
    left: 10,
  },
  backwardRightButton: {
    bottom: 10,
    right: 10,
  },
  controlSection: {
    marginBottom: 15,
  },
  label: {
    color: '#E0AA3E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  statusRow: {
    alignItems: 'center',
    marginTop: 10,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default FloatingCmdVel;
