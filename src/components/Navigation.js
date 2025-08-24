import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ROSLIB from 'roslib';

const Navigation = ({ ros }) => {
  // State management
  const [mapUrl, setMapUrl] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [robotPosition, setRobotPosition] = useState({ x: 50, y: 50, theta: 0 });
  const [targetPosition, setTargetPosition] = useState(null);
  const [path, setPath] = useState([]);
  const [obstacles, setObstacles] = useState([]);
  const [manualCoords, setManualCoords] = useState({ x: '', y: '' });
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0, resolution: 0.05 });
  const [mapOrigin, setMapOrigin] = useState({ x: 0, y: 0 });
  const [showCoordinateInput, setShowCoordinateInput] = useState(false);

  const mapViewRef = useRef(null);
  const mapImageRef = useRef(null);
  
  // Map tap handler using PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        // Only allow taps when not navigating
        if (isNavigating) return;
        
        // Get tap coordinates relative to the map image
        const { locationX, locationY } = evt.nativeEvent;
        
        // Convert screen coordinates to map coordinates
        const mapX = (locationX / mapDimensions.width) * (mapDimensions.width * mapDimensions.resolution) + mapOrigin.x;
        const mapY = ((mapDimensions.height - locationY) / mapDimensions.height) * (mapDimensions.height * mapDimensions.resolution) + mapOrigin.y;
        
        // Set target position
        setTargetPosition({ x: mapX, y: mapY });
        
        // Get path from current position to target
        if (ros && ros.isConnected) {
          fetchPath(mapX, mapY);
        }
      }
    })
  ).current;

  // Initialize ROS subscribers
  useEffect(() => {
    let poseListener = null;
    let mapListener = null;
    let pathListener = null;
    let obstacleListener = null;
    
    if (ros && ros.isConnected) {
      // Subscribe to map metadata to get dimensions and resolution
      const mapMetadataListener = new ROSLIB.Topic({
        ros: ros,
        name: '/map_metadata',
        messageType: 'nav_msgs/MapMetaData'
      });
      
      mapMetadataListener.subscribe((message) => {
        setMapDimensions({
          width: message.width,
          height: message.height,
          resolution: message.resolution
        });
        setMapOrigin({
          x: message.origin.position.x,
          y: message.origin.position.y
        });
      });
      
      // Subscribe to robot pose
      poseListener = new ROSLIB.Topic({
        ros: ros,
        name: '/robot_pose',
        messageType: 'geometry_msgs/Pose'
      });
      
      poseListener.subscribe((message) => {
        setRobotPosition({
          x: message.position.x,
          y: message.position.y,
          theta: Math.atan2(
            2 * message.orientation.w * message.orientation.z,
            1 - 2 * message.orientation.z * message.orientation.z
          )
        });
      });
      
      // Subscribe to map image
      mapListener = new ROSLIB.Topic({
        ros: ros,
        name: '/map_image/compressed',
        messageType: 'sensor_msgs/CompressedImage'
      });
      
      mapListener.subscribe((message) => {
        const base64Image = message.data;
        setMapUrl(`data:image/png;base64,${base64Image}`);
      });
      
      // Subscribe to path
      pathListener = new ROSLIB.Topic({
        ros: ros,
        name: '/path',
        messageType: 'nav_msgs/Path'
      });
      
      pathListener.subscribe((message) => {
        // Convert path poses to screen coordinates
        const pathPoints = message.poses.map(pose => {
          const worldX = pose.pose.position.x;
          const worldY = pose.pose.position.y;
          
          // Convert world coordinates to screen coordinates
          const screenX = ((worldX - mapOrigin.x) / (mapDimensions.width * mapDimensions.resolution)) * mapDimensions.width;
          const screenY = mapDimensions.height - ((worldY - mapOrigin.y) / (mapDimensions.height * mapDimensions.resolution)) * mapDimensions.height;
          
          return { x: screenX, y: screenY };
        });
        
        setPath(pathPoints);
      });
      
      // Subscribe to obstacle data
      obstacleListener = new ROSLIB.Topic({
        ros: ros,
        name: '/obstacles',
        messageType: 'visualization_msgs/MarkerArray'
      });
      
      obstacleListener.subscribe((message) => {
        // Convert obstacle markers to screen coordinates
        const obstaclePoints = message.markers.map(marker => {
          const worldX = marker.pose.position.x;
          const worldY = marker.pose.position.y;
          const radius = marker.scale.x / 2; // Assuming circular markers
          
          // Convert world coordinates to screen coordinates
          const screenX = ((worldX - mapOrigin.x) / (mapDimensions.width * mapDimensions.resolution)) * mapDimensions.width;
          const screenY = mapDimensions.height - ((worldY - mapOrigin.y) / (mapDimensions.height * mapDimensions.resolution)) * mapDimensions.height;
          const screenRadius = (radius / (mapDimensions.width * mapDimensions.resolution)) * mapDimensions.width;
          
          return { x: screenX, y: screenY, radius: screenRadius };
        });
        
        setObstacles(obstaclePoints);
      });
      
      // Cleanup function
      return () => {
        if (mapMetadataListener) mapMetadataListener.unsubscribe();
        if (poseListener) poseListener.unsubscribe();
        if (mapListener) mapListener.unsubscribe();
        if (pathListener) pathListener.unsubscribe();
        if (obstacleListener) obstacleListener.unsubscribe();
      };
    }
  }, [ros, mapDimensions.width, mapDimensions.height, mapDimensions.resolution, mapOrigin.x, mapOrigin.y]);

  // Convert screen coordinates to world coordinates
  const screenToWorld = (screenX, screenY) => {
    const worldX = (screenX / mapDimensions.width) * (mapDimensions.width * mapDimensions.resolution) + mapOrigin.x;
    const worldY = ((mapDimensions.height - screenY) / mapDimensions.height) * (mapDimensions.height * mapDimensions.resolution) + mapOrigin.y;
    return { x: worldX, y: worldY };
  };

  // Convert world coordinates to screen coordinates
  const worldToScreen = (worldX, worldY) => {
    const screenX = ((worldX - mapOrigin.x) / (mapDimensions.width * mapDimensions.resolution)) * mapDimensions.width;
    const screenY = mapDimensions.height - ((worldY - mapOrigin.y) / (mapDimensions.height * mapDimensions.resolution)) * mapDimensions.height;
    return { x: screenX, y: screenY };
  };

  // Fetch path from current position to target
  const fetchPath = (targetX, targetY) => {
    if (!ros || !ros.isConnected) {
      Alert.alert('Error', 'ROS is not connected');
      return;
    }
    
    setIsLoading(true);
    
    // Call the ROS service to get the path
    const getPathService = new ROSLIB.Service({
      ros: ros,
      name: '/plan_path',
      serviceType: 'nav_msgs/GetPlan'
    });
    
    const request = new ROSLIB.ServiceRequest({
      start: {
        header: {
          frame_id: 'map'
        },
        pose: {
          position: {
            x: robotPosition.x,
            y: robotPosition.y,
            z: 0.0
          },
          orientation: {
            x: 0.0,
            y: 0.0,
            z: Math.sin(robotPosition.theta / 2),
            w: Math.cos(robotPosition.theta / 2)
          }
        }
      },
      goal: {
        header: {
          frame_id: 'map'
        },
        pose: {
          position: {
            x: targetX,
            y: targetY,
            z: 0.0
          },
          orientation: {
            x: 0.0,
            y: 0.0,
            z: 0.0,
            w: 1.0
          }
        }
      },
      tolerance: 0.5
    });
    
    getPathService.callService(request, (result) => {
      setIsLoading(false);
      if (result.plan && result.plan.poses) {
        // Convert path poses to screen coordinates
        const pathPoints = result.plan.poses.map(pose => {
          const worldX = pose.pose.position.x;
          const worldY = pose.pose.position.y;
          
          // Convert world coordinates to screen coordinates
          return worldToScreen(worldX, worldY);
        });
        
        setPath(pathPoints);
      } else {
        Alert.alert('Error', 'Could not find a path to the target');
      }
    }, (error) => {
      setIsLoading(false);
      Alert.alert('Error', 'Failed to get path: ' + error);
    });
  };

  // Start navigation
  const startNavigation = () => {
    if (!ros || !ros.isConnected) {
      Alert.alert('Error', 'ROS is not connected');
      return;
    }
    
    if (!targetPosition) {
      Alert.alert('Error', 'No destination selected');
      return;
    }
    
    setIsLoading(true);
    
    // Call the ROS service to start navigation
    const startNavService = new ROSLIB.Service({
      ros: ros,
      name: '/navigate_to_pose',
      serviceType: 'std_srvs/Trigger'
    });
    
    const request = new ROSLIB.ServiceRequest({
      pose: {
        header: {
          frame_id: 'map'
        },
        pose: {
          position: {
            x: targetPosition.x,
            y: targetPosition.y,
            z: 0.0
          },
          orientation: {
            x: 0.0,
            y: 0.0,
            z: 0.0,
            w: 1.0
          }
        }
      }
    });
    
    startNavService.callService(request, (result) => {
      setIsLoading(false);
      if (result.success) {
        setIsNavigating(true);
        setIsPaused(false);
        Alert.alert('Success', 'Navigation started');
      } else {
        Alert.alert('Error', result.message || 'Failed to start navigation');
      }
    }, (error) => {
      setIsLoading(false);
      Alert.alert('Error', 'Service call failed: ' + error);
    });
  };

  // Pause navigation
  const pauseNavigation = () => {
    if (!ros || !ros.isConnected) {
      Alert.alert('Error', 'ROS is not connected');
      return;
    }
    
    setIsLoading(true);
    
    // Call the ROS service to pause navigation
    const pauseNavService = new ROSLIB.Service({
      ros: ros,
      name: '/pause_navigation',
      serviceType: 'std_srvs/Trigger'
    });
    
    const request = new ROSLIB.ServiceRequest({});
    
    pauseNavService.callService(request, (result) => {
      setIsLoading(false);
      if (result.success) {
        setIsPaused(true);
        Alert.alert('Success', 'Navigation paused');
      } else {
        Alert.alert('Error', result.message || 'Failed to pause navigation');
      }
    }, (error) => {
      setIsLoading(false);
      Alert.alert('Error', 'Service call failed: ' + error);
    });
  };

  // Resume navigation
  const resumeNavigation = () => {
    if (!ros || !ros.isConnected) {
      Alert.alert('Error', 'ROS is not connected');
      return;
    }
    
    setIsLoading(true);
    
    // Call the ROS service to resume navigation
    const resumeNavService = new ROSLIB.Service({
      ros: ros,
      name: '/resume_navigation',
      serviceType: 'std_srvs/Trigger'
    });
    
    const request = new ROSLIB.ServiceRequest({});
    
    resumeNavService.callService(request, (result) => {
      setIsLoading(false);
      if (result.success) {
        setIsPaused(false);
        Alert.alert('Success', 'Navigation resumed');
      } else {
        Alert.alert('Error', result.message || 'Failed to resume navigation');
      }
    }, (error) => {
      setIsLoading(false);
      Alert.alert('Error', 'Service call failed: ' + error);
    });
  };

  // Cancel navigation
  const cancelNavigation = () => {
    if (!ros || !ros.isConnected) {
      Alert.alert('Error', 'ROS is not connected');
      return;
    }
    
    setIsLoading(true);
    
    // Call the ROS service to cancel navigation
    const cancelNavService = new ROSLIB.Service({
      ros: ros,
      name: '/cancel_navigation',
      serviceType: 'std_srvs/Trigger'
    });
    
    const request = new ROSLIB.ServiceRequest({});
    
    cancelNavService.callService(request, (result) => {
      setIsLoading(false);
      if (result.success) {
        setIsNavigating(false);
        setIsPaused(false);
        setTargetPosition(null);
        setPath([]);
        Alert.alert('Success', 'Navigation cancelled');
      } else {
        Alert.alert('Error', result.message || 'Failed to cancel navigation');
      }
    }, (error) => {
      setIsLoading(false);
      Alert.alert('Error', 'Service call failed: ' + error);
    });
  };

  // Set destination manually
  const setManualDestination = () => {
    const x = parseFloat(manualCoords.x);
    const y = parseFloat(manualCoords.y);
    
    if (isNaN(x) || isNaN(y)) {
      Alert.alert('Error', 'Invalid coordinates');
      return;
    }
    
    setTargetPosition({ x, y });
    setShowCoordinateInput(false);
    fetchPath(x, y);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Navigation</Text>
      </View>
      
      {/* Map Display */}
      <View style={styles.mapContainer}>
        {mapUrl ? (
          <View 
            style={styles.mapView} 
            ref={mapViewRef}
            {...panResponder.panHandlers}
          >
            <Image 
              ref={mapImageRef}
              source={{ uri: mapUrl }} 
              style={styles.mapImage} 
              resizeMode="contain"
            />
            
            {/* Path visualization */}
            {path.length > 0 && (
              <View style={styles.pathOverlay}>
                {path.map((point, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.pathPoint,
                      { left: point.x, top: point.y }
                    ]} 
                  />
                ))}
              </View>
            )}
            
            {/* Target marker */}
            {targetPosition && (
              <View 
                style={[
                  styles.targetMarker,
                  { 
                    left: worldToScreen(targetPosition.x, targetPosition.y).x, 
                    top: worldToScreen(targetPosition.x, targetPosition.y).y 
                  }
                ]}
              >
                <Ionicons name="location" size={24} color="#E74C3C" />
              </View>
            )}
            
            {/* Robot position marker */}
            <View 
              style={[
                styles.robotMarker, 
                {
                  left: worldToScreen(robotPosition.x, robotPosition.y).x, 
                  top: worldToScreen(robotPosition.x, robotPosition.y).y
                }
              ]}
            >
              <View style={styles.robotBody}>
                <View 
                  style={[
                    styles.robotDirection,
                    { transform: [{ rotate: `${robotPosition.theta}rad` }] }
                  ]} 
                />
              </View>
            </View>
            
            {/* Obstacles visualization */}
            {obstacles.map((obstacle, index) => (
              <View 
                key={`obstacle-${index}`}
                style={[
                  styles.obstacle,
                  { 
                    left: obstacle.x, 
                    top: obstacle.y,
                    width: obstacle.radius * 2,
                    height: obstacle.radius * 2,
                    borderRadius: obstacle.radius,
                    marginLeft: -obstacle.radius,
                    marginTop: -obstacle.radius
                  }
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.noMapContainer}>
            <Ionicons name="map-outline" size={64} color="#666666" />
            <Text style={styles.noMapText}>No map available</Text>
            <Text style={styles.noMapSubtext}>Connect to ROS to load map</Text>
          </View>
        )}
      </View>

      {/* Manual Coordinate Input */}
      {showCoordinateInput && (
        <View style={styles.coordInputContainer}>
          <Text style={styles.coordInputTitle}>Enter Destination Coordinates</Text>
          <View style={styles.coordInputRow}>
            <View style={styles.coordInputField}>
              <Text style={styles.coordLabel}>X:</Text>
              <TextInput
                style={styles.coordInput}
                value={manualCoords.x}
                onChangeText={(text) => setManualCoords({ ...manualCoords, x: text })}
                keyboardType="numeric"
                placeholder="0.0"
                placeholderTextColor="#666666"
              />
            </View>
            <View style={styles.coordInputField}>
              <Text style={styles.coordLabel}>Y:</Text>
              <TextInput
                style={styles.coordInput}
                value={manualCoords.y}
                onChangeText={(text) => setManualCoords({ ...manualCoords, y: text })}
                keyboardType="numeric"
                placeholder="0.0"
                placeholderTextColor="#666666"
              />
            </View>
          </View>
          <View style={styles.coordButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => setShowCoordinateInput(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={setManualDestination}
            >
              <Text style={styles.buttonText}>Set Destination</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>Controls</Text>
        
        {!isNavigating ? (
          <>
            {/* Destination selection */}
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowCoordinateInput(true)}
                disabled={isLoading}
              >
                <Ionicons name="create-outline" size={20} color="#1A1A1A" />
                <Text style={styles.buttonText}>Enter Coordinates</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.buttonRow}>
              <Text style={styles.instructionText}>
                {targetPosition ? "Tap the map to change destination" : "Tap on map to set destination"}
              </Text>
            </View>
            
            {/* Start navigation */}
            {targetPosition && (
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={startNavigation}
                  disabled={isLoading || !targetPosition}
                >
                  <Ionicons name="navigate" size={20} color="#1A1A1A" />
                  <Text style={styles.buttonText}>Start Navigation</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Navigation controls */}
            <View style={styles.buttonRow}>
              {isPaused ? (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={resumeNavigation}
                  disabled={isLoading}
                >
                  <Ionicons name="play" size={20} color="#1A1A1A" />
                  <Text style={styles.buttonText}>Resume</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.warningButton]}
                  onPress={pauseNavigation}
                  disabled={isLoading}
                >
                  <Ionicons name="pause" size={20} color="#1A1A1A" />
                  <Text style={styles.buttonText}>Pause</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.dangerButton]}
                onPress={cancelNavigation}
                disabled={isLoading}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.dangerButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            {/* Status */}
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={styles.statusValue}>
                {isPaused ? "Navigation Paused" : "Navigating to Destination"}
              </Text>
            </View>
            
            {/* ETA (example) */}
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>ETA:</Text>
              <Text style={styles.statusValue}>2 min</Text>
            </View>
          </>
        )}
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
  mapContainer: {
    height: 350,
    backgroundColor: '#262626',
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
    zIndex: 10,
  },
  robotBody: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0AA3E',
    marginLeft: -10,
    marginTop: -10,
    alignItems: 'center',
  },
  robotDirection: {
    position: 'absolute',
    width: 2,
    height: 12,
    backgroundColor: '#000',
    top: -6,
  },
  targetMarker: {
    position: 'absolute',
    marginLeft: -12,
    marginTop: -24,
    zIndex: 5,
  },
  pathOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  pathPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3498DB',
    marginLeft: -2,
    marginTop: -2,
  },
  obstacle: {
    position: 'absolute',
    backgroundColor: 'rgba(231, 76, 60, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.7)',
    zIndex: 3,
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
  coordInputContainer: {
    backgroundColor: '#333333',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  coordInputTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  coordInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  coordInputField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  coordLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  coordInput: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 16,
  },
  coordButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlsContainer: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0AA3E',
    padding: 15,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  secondaryButton: {
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#E0AA3E',
  },
  warningButton: {
    backgroundColor: '#F39C12',
  },
  dangerButton: {
    backgroundColor: '#C0392B',
  },
  buttonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#E0AA3E',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructionText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    width: '100%',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    color: '#999999',
    fontSize: 14,
    width: 70,
  },
  statusValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
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

export default Navigation;