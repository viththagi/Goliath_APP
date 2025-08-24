import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Sensors = ({ ros }) => {
  // Demo/fallback data for development and testing
  const [systemHealth, setSystemHealth] = useState({
    cpu: 45,
    temperature: 58,
    battery: 75
  });
  
  // Example MJPEG stream URL - replace with your actual camera stream
  const defaultCameraUrl = 'https://mjpeg.sanford.io/count.mjpeg';
  
  // Simple screen render state tracking
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Simulate data loading - remove this in production
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Helper function to get battery icon
  const getBatteryIcon = (level) => {
    if (level > 75) return "battery-full";
    if (level > 50) return "battery-half";
    if (level > 20) return "battery-quarter";
    return "battery-dead";
  };
  
  // Helper function to get temperature status and color
  const getTempStatus = (temp) => {
    if (temp > 80) return { status: 'Critical', color: '#E74C3C' };
    if (temp > 70) return { status: 'High', color: '#F39C12' };
    if (temp > 50) return { status: 'Normal', color: '#E0AA3E' };
    return { status: 'Optimal', color: '#2ECC71' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sensors</Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Camera Stream */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Camera Stream</Text>
            <TouchableOpacity style={styles.streamTypeButton}>
              <Text style={styles.streamTypeText}>MJPEG</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.cameraContainer}>
            {!isLoaded ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E0AA3E" />
                <Text style={styles.loadingText}>Loading stream...</Text>
              </View>
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="videocam" size={40} color="#666666" />
                <Text style={styles.placeholderText}>Camera feed unavailable</Text>
                <Text style={styles.placeholderSubtext}>Check connection to robot</Text>
              </View>
              /* Uncomment below and comment above to use actual camera
              <Image
                source={{ uri: defaultCameraUrl }}
                style={styles.cameraStream}
                resizeMode="contain"
              />
              */
            )}
          </View>
        </View>
        
        {/* LIDAR Visualization */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>LIDAR Point Cloud</Text>
            <TouchableOpacity style={styles.captureButton}>
              <Ionicons name="camera" size={18} color="#E0AA3E" />
              <Text style={styles.captureButtonText}>Capture</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.lidarContainer}>
            <View style={styles.placeholderContainer}>
              <Ionicons name="analytics" size={40} color="#666666" />
              <Text style={styles.placeholderText}>No LIDAR data available</Text>
              <Text style={styles.placeholderSubtext}>Tap 'Capture' to get a snapshot</Text>
            </View>
          </View>
        </View>
        
        {/* System Health */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>System Health</Text>
          
          <View style={styles.healthGrid}>
            {/* CPU Usage */}
            <View style={styles.healthItem}>
              <View style={styles.healthIconContainer}>
                <Ionicons name="hardware-chip-outline" size={24} color="#E0AA3E" />
              </View>
              <Text style={styles.healthLabel}>CPU Usage</Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${systemHealth.cpu}%`,
                      backgroundColor: systemHealth.cpu > 80 ? '#E74C3C' : 
                                      systemHealth.cpu > 60 ? '#F39C12' : '#2ECC71'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.healthValue}>{systemHealth.cpu}%</Text>
            </View>
            
            {/* Temperature */}
            <View style={styles.healthItem}>
              <View style={styles.healthIconContainer}>
                <Ionicons name="thermometer-outline" size={24} color="#E0AA3E" />
              </View>
              <Text style={styles.healthLabel}>Temperature</Text>
              <Text style={styles.healthValue}>{systemHealth.temperature}°C</Text>
              <Text 
                style={[
                  styles.healthStatus, 
                  { color: getTempStatus(systemHealth.temperature).color }
                ]}
              >
                {getTempStatus(systemHealth.temperature).status}
              </Text>
            </View>
            
            {/* Battery */}
            <View style={styles.healthItem}>
              <View style={styles.healthIconContainer}>
                <Ionicons 
                  name={getBatteryIcon(systemHealth.battery)} 
                  size={24} 
                  color={systemHealth.battery < 20 ? '#E74C3C' : '#E0AA3E'} 
                />
              </View>
              <Text style={styles.healthLabel}>Battery</Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${systemHealth.battery}%`,
                      backgroundColor: systemHealth.battery < 20 ? '#E74C3C' : 
                                      systemHealth.battery < 40 ? '#F39C12' : '#2ECC71'
                    }
                  ]} 
                />
              </View>
              <Text style={styles.healthValue}>{systemHealth.battery}%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#262626',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  streamTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  streamTypeText: {
    color: '#E0AA3E',
    fontSize: 14,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  captureButtonText: {
    color: '#E0AA3E',
    fontSize: 14,
    marginLeft: 6,
  },
  cameraContainer: {
    height: 200,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraStream: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1A1A',
  },
  lidarContainer: {
    height: 200,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lidarImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1A1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 14,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  placeholderSubtext: {
    color: '#666666',
    marginTop: 5,
    fontSize: 14,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  healthItem: {
    width: '48%',
    backgroundColor: '#333333',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  healthIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(224, 170, 62, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  healthLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  healthValue: {
    color: '#E0AA3E',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 5,
  },
  healthStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
});

export default Sensors;