import React, { useEffect, useState } from 'react';
import { View, Image, ActivityIndicator, Text, StyleSheet } from 'react-native';

const Camera = ({ ros, topic = '/camera/image_raw' }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ros) return;

    // For MJPEG streams, you might need to use a different approach
    // Many ROS cameras provide an MJPEG HTTP stream
    const mjpegUrl = 'http://192.168.2.7:9090/stream?topic=/camera/image_raw';
    
    setImageUrl(mjpegUrl);
    setLoading(false);

  }, [ros, topic]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E0AA3E" />
        <Text style={styles.loadingText}>Connecting to camera stream...</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={styles.image}
      resizeMode="cover"
    />
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 20,
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
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
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 5,
  },
  overlayText: {
    color: '#FFF',
    fontSize: 12,
  },
});

export default Camera;
