import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ROSLIB from 'roslib';

const Slam = ({ navigation, route, ros }) => {
  const [isMappingActive, setIsMappingActive] = useState(false);
  const [mapUrl, setMapUrl] = useState(null);
  const [robotPosition, setRobotPosition] = useState({ x: 50, y: 50, theta: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize ROS subscribers when component mounts or ros connection changes
  useEffect(() => {
    let poseListener = null;
    let mapListener = null;
    
    if (ros && ros.isConnected) {
      // Subscribe to robot position (from odometry or amcl)
      poseListener = new ROSLIB.Topic({
        ros: ros,
        name: '/robot_pose',  // Change to your actual topic
        messageType: 'geometry_msgs/Pose'
      });
      
      poseListener.subscribe((message) => {
        setRobotPosition({
          x: message.position.x * 100 + 50, // Scale and offset for display
          y: message.position.y * 100 + 50,
          theta: Math.atan2(2 * message.orientation.w * message.orientation.z, 
                           1 - 2 * message.orientation.z * message.orientation.z)
        });
      });
      
      // Connect to map topic for updates if mapping is active
      if (isMappingActive) {
        mapListener = new ROSLIB.Topic({
          ros: ros,
          name: '/map_image/compressed',  // Replace with your actual topic
          messageType: 'sensor_msgs/CompressedImage'
        });
        
        mapListener.subscribe((message) => {
          // Update map URL
          const base64Image = message.data;
          setMapUrl(`data:image/png;base64,${base64Image}`);
        });
      }
    }
    
    // Clean up subscriptions when component unmounts or dependencies change
    return () => {
      if (poseListener) {
        poseListener.unsubscribe();
      }
      if (mapListener) {
        mapListener.unsubscribe();
      }
    };
  }, [ros, isMappingActive]);
  
  // Start SLAM mapping
  const startMapping = () => {
    if (!ros || !ros.isConnected) {
      Alert.alert('Error', 'ROS is not connected');
      return;
    }
    
    setIsLoading(true);
    
    // Call the ROS service to start SLAM
    const startSlamService = new ROSLIB.Service({
      ros: ros,
      name: '/start_slam',  // Replace with your actual service name
      serviceType: 'std_srvs/Trigger'
    });
    
    const request = new ROSLIB.ServiceRequest({});
    
    startSlamService.callService(request, 
      (result) => {
        setIsLoading(false);
        if (result.success) {
          setIsMappingActive(true);
          Alert.alert('Success', 'SLAM mapping started');
        } else {
          Alert.alert('Error', result.message || 'Failed to start SLAM mapping');
        }
      }, 
      (error) => {
        setIsLoading(false);
        console.error('Service call error:', error);
        Alert.alert('Error', 'Service call failed. Check console for details.');
      }
    );
  };
  
  // Stop SLAM mapping
  const stopMapping = () => {
    if (!ros || !ros.isConnected) {
      Alert.alert('Error', 'ROS is not connected');
      return;
    }
    
    setIsLoading(true);
    
    // Call the ROS service to stop SLAM
    const stopSlamService = new ROSLIB.Service({
      ros: ros,
      name: '/stop_slam',  // Replace with your actual service name
      serviceType: 'std_srvs/Trigger'
    });
    
    const request = new ROSLIB.ServiceRequest({});
    
    stopSlamService.callService(request, 
      (result) => {
        setIsLoading(false);
        if (result.success) {
          setIsMappingActive(false);
          Alert.alert('Success', 'SLAM mapping stopped');
        } else {
          Alert.alert('Error', result.message || 'Failed to stop SLAM mapping');
        }
      }, 
      (error) => {
        setIsLoading(false);
        console.error('Service call error:', error);
        Alert.alert('Error', 'Service call failed. Check console for details.');
      }
    );
  };
  
  // Save the current map
  const saveMap = () => {
    if (!ros || !ros.isConnected) {
      Alert.alert('Error', 'ROS is not connected');
      return;
    }
    
    setIsLoading(true);
    
    // Call the ROS service to save the map
    const saveMapService = new ROSLIB.Service({
      ros: ros,
      name: '/save_map',  // Replace with your actual service name
      serviceType: 'std_srvs/Trigger'
    });
    
    const request = new ROSLIB.ServiceRequest({});
    
    saveMapService.callService(request, 
      (result) => {
        setIsLoading(false);
        if (result.success) {
          Alert.alert('Success', 'Map saved successfully');
        } else {
          Alert.alert('Error', result.message || 'Failed to save map');
        }
      }, 
      (error) => {
        setIsLoading(false);
        console.error('Service call error:', error);
        Alert.alert('Error', 'Service call failed. Check console for details.');
      }
    );
  };
  
  // Reset the current map
  const resetMap = () => {
    if (!ros || !ros.isConnected) {
      Alert.alert('Error', 'ROS is not connected');
      return;
    }
    
    Alert.alert(
      'Confirm Reset',
      'Are you sure you want to reset the current map?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setIsLoading(true);
            
            // Call the ROS service to reset the map
            const resetMapService = new ROSLIB.Service({
              ros: ros,
              name: '/reset_map',  // Replace with your actual service name
              serviceType: 'std_srvs/Trigger'
            });
            
            const request = new ROSLIB.ServiceRequest({});
            
            resetMapService.callService(request, 
              (result) => {
                setIsLoading(false);
                if (result.success) {
                  Alert.alert('Success', 'Map reset successfully');
                  setMapUrl(null);
                } else {
                  Alert.alert('Error', result.message || 'Failed to reset map');
                }
              }, 
              (error) => {
                setIsLoading(false);
                console.error('Service call error:', error);
                Alert.alert('Error', 'Service call failed. Check console for details.');
              }
            );
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SLAM Mapping</Text>
      </View>
      
      {/* Map Display */}
      <View style={styles.mapContainer}>
        {mapUrl ? (
          <View style={styles.mapView}>
            <Image 
              source={{ uri: mapUrl }} 
              style={styles.mapImage} 
              resizeMode="contain"
            />
            {/* Robot position marker */}
            <View 
              style={[
                styles.robotMarker, 
                {
                  left: robotPosition.x, 
                  top: robotPosition.y
                }
              ]}
            >
              <View 
                style={[
                  styles.robotDirectionIndicator,
                  {
                    transform: [{ rotate: `${robotPosition.theta}rad` }]
                  }
                ]} 
              />
            </View>
          </View>
        ) : (
          <View style={styles.noMapContainer}>
            <Ionicons name="map-outline" size={64} color="#666666" />
            <Text style={styles.noMapText}>No map available</Text>
            <Text style={styles.noMapSubtext}>Start mapping to generate a map</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>Controls</Text>
        
        <View style={styles.buttonContainer}>
          {/* Start/Stop Mapping Button */}
          {!isMappingActive ? (
            <TouchableOpacity 
              style={styles.startButton}
              onPress={startMapping}
              disabled={isLoading}
            >
              <Ionicons name="play" size={20} color="#1A1A1A" />
              <Text style={styles.startButtonText}>Start Mapping</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.stopButton}
              onPress={stopMapping}
              disabled={isLoading}
            >
              <Ionicons name="stop" size={20} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>Stop Mapping</Text>
            </TouchableOpacity>
          )}
          
          {/* Save Map Button */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={saveMap}
            disabled={!mapUrl || isLoading}
          >
            <Ionicons name="save-outline" size={20} color="#E0AA3E" />
            <Text style={styles.actionButtonText}>Save Map</Text>
          </TouchableOpacity>
          
          {/* Reset Map Button */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={resetMap}
            disabled={!mapUrl || isLoading}
          >
            <Ionicons name="refresh-outline" size={20} color="#E0AA3E" />
            <Text style={styles.actionButtonText}>Reset Map</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E0AA3E" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Keep dark background
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
  mapContainer: {
    height: 350,
    backgroundColor: '#262626', // Dark container for map
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapView: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  robotMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0AA3E',
    marginLeft: -10,
    marginTop: -10,
  },
  robotDirectionIndicator: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: '#000',
    left: 9,
    top: 0,
  },
  noMapContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMapText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 10,
  },
  noMapSubtext: {
    color: '#666666',
    fontSize: 14,
    marginTop: 5,
  },
  controlsContainer: {
    flex: 1,
    backgroundColor: '#262626', // Dark container for controls
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  buttonContainer: {
    flex: 1,
    width: '100%',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0AA3E',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    height: 56,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    height: 56,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333333',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    height: 56,
    borderWidth: 1,
    borderColor: '#E0AA3E',
  },
  startButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#E0AA3E',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
});

export default Slam;