import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';

const Advanced3DViewer = ({ 
  joint1Angle = 0,
  joint2Angle = 0, 
  joint3Angle = 0,
  joint4Angle = 0,
  joint5Angle = 0 
}) => {
  const onContextCreate = (gl) => {
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    
    const render = () => {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
      // Render 3D robot arm here using WebGL
      // This would require implementing a full 3D rendering pipeline
      
      gl.endFrameEXP();
      requestAnimationFrame(render);
    };
    
    render();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Advanced 3D Robot Viewer</Text>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 400,
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
  glView: {
    flex: 1,
    borderRadius: 8,
  },
});

export default Advanced3DViewer;