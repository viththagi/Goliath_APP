import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

const JointSlider = ({ 
  label, 
  angle, 
  setAngle, 
  min = -180, 
  max = 180,
  step = 0.1,
  units = '°'
}) => {
  // Convert radians to degrees for display
  const displayAngle = units === 'rad' ? angle : angle * (180 / Math.PI);
  const displayMin = units === 'rad' ? min : min * (180 / Math.PI);
  const displayMax = units === 'rad' ? max : max * (180 / Math.PI);
  
  const handleValueChange = (value) => {
    // Convert degrees to radians if needed
    const radianValue = units === 'rad' ? value : value * (Math.PI / 180);
    setAngle(radianValue);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueText}>
          {displayAngle.toFixed(1)}{units === 'rad' ? ' rad' : '°'}
        </Text>
      </View>
      
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={angle}
        onValueChange={handleValueChange}
        step={step}
        minimumTrackTintColor="#E0AA3E"
        maximumTrackTintColor="#444"
        thumbTintColor="#E0AA3E"
      />
      
      <View style={styles.rangeContainer}>
        <Text style={styles.rangeText}>
          {displayMin.toFixed(0)}{units === 'rad' ? 'r' : '°'}
        </Text>
        <Text style={styles.rangeText}>
          {displayMax.toFixed(0)}{units === 'rad' ? 'r' : '°'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#262626',
    margin: 10,
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  valueText: {
    color: '#E0AA3E',
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    height: 40,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  rangeText: {
    color: '#666',
    fontSize: 12,
  },
});

export default JointSlider;
