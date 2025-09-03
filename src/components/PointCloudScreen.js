import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Modal,
  Switch,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PointCloudViewer from '../components/PointCloudViewer';
import { useROS } from '../contexts/ROSContext';
import Slider from '@react-native-community/slider';

const { width, height } = Dimensions.get('window');

const PointCloudScreen = () => {
  const { ros, isConnected, error, connectROS, disconnectROS } = useROS();
  const [pointCloudTopic, setPointCloudTopic] = useState('/unilidar/cloud');
  const [isLoading, setIsLoading] = useState(true);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [pointSize, setPointSize] = useState(2);
  const [pointColor, setPointColor] = useState('intensity');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const pointCloudViewerRef = useRef(null);

  useEffect(() => {
    // Initialize ROS connection when component mounts
    const initROS = async () => {
      console.log('Creating ROS connection for PointCloudScreen...');
      try {
        await connectROS();
        console.log('PointCloudScreen: ROS connected successfully');
      } catch (err) {
        console.error('PointCloudScreen: Failed to connect to ROS', err);
      } finally {
        setIsLoading(false);
      }
    };

    initROS();

    // Cleanup on unmount
    return () => {
      console.log('PointCloudScreen unmounting');
      // Only disconnect if no other components need ROS
      // disconnectROS();
    };
  }, [connectROS]);

  const handleResetView = () => {
    if (pointCloudViewerRef.current) {
      pointCloudViewerRef.current.resetView();
    }
  };

  const handleChangePointSize = (value) => {
    setPointSize(value);
    if (pointCloudViewerRef.current) {
      pointCloudViewerRef.current.setPointSize(value);
    }
  };

  const handleChangeColorMode = (mode) => {
    setPointColor(mode);
    if (pointCloudViewerRef.current) {
      pointCloudViewerRef.current.setColorMode(mode);
    }
  };

  const handleToggleAutoRotate = (value) => {
    setAutoRotate(value);
    if (pointCloudViewerRef.current) {
      pointCloudViewerRef.current.setAutoRotate(value);
    }
  };

  const handleToggleStats = (value) => {
    setShowStats(value);
    if (pointCloudViewerRef.current) {
      pointCloudViewerRef.current.toggleStats(value);
    }
  };

  const handleReconnect = async () => {
    setIsLoading(true);
    try {
      await connectROS();
      console.log('Reconnected to ROS in PointCloudScreen');
    } catch (err) {
      console.error('Failed to reconnect to ROS', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#E0AA3E" />
          <Text style={styles.loadingText}>Connecting to ROS...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>3D Point Cloud Viewer</Text>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isConnected ? 'cloud-done' : 'cloud-offline'} 
            size={20} 
            color={isConnected ? '#4CAF50' : '#F44336'} 
          />
          <Text style={[styles.statusText, {color: isConnected ? '#4CAF50' : '#F44336'}]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          {!isConnected && (
            <TouchableOpacity onPress={handleReconnect} style={styles.reconnectButton}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.reconnectText}>Reconnect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.viewerContainer}>
        {isConnected ? (
          <PointCloudViewer 
            ref={pointCloudViewerRef}
            style={styles.viewer}
            topic={pointCloudTopic}
            pointSize={pointSize}
            colorMode={pointColor}
            autoRotate={autoRotate}
            showStats={showStats}
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="cube" size={64} color="#666" />
            <Text style={styles.placeholderText}>
              {ros ? 'Connecting to ROS...' : 'ROS not available'}
            </Text>
            {error && (
              <Text style={styles.errorText}>Error: {error.message}</Text>
            )}
            <Text style={styles.topicText}>
              Topic: {pointCloudTopic}
            </Text>
            <TouchableOpacity onPress={handleReconnect} style={styles.reconnectButtonLarge}>
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.reconnectTextLarge}>Reconnect to ROS</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>UniLidar Point Cloud</Text>
        <Text style={styles.infoText}>● Status: {isConnected ? 'Connected ✓' : 'Disconnected ✗'}</Text>
        <Text style={styles.infoText}>● Topic: {pointCloudTopic}</Text>
        <Text style={styles.infoText}>● Message: sensor_msgs/PointCloud2</Text>
        <Text style={styles.infoText}>● Point Size: {pointSize.toFixed(1)}px</Text>
        <Text style={styles.infoText}>● Color Mode: {pointColor}</Text>
        {isConnected ? (
          <>
            <Text style={styles.infoText}>● Receiving: Live 3D data</Text>
            <Text style={styles.infoText}>● Renderer: Three.js + WebGL</Text>
          </>
        ) : (
          <Text style={styles.infoText}>● Waiting for connection...</Text>
        )}
      </View>

      {/* Controls Section */}
      <View style={styles.controls}>
        <Text style={styles.controlTitle}>View Controls</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.controlButton} onPress={handleResetView}>
            <Ionicons name="eye" size={20} color="#E0AA3E" />
            <Text style={styles.controlText}>Reset View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, autoRotate && styles.activeControlButton]} 
            onPress={() => handleToggleAutoRotate(!autoRotate)}
          >
            <Ionicons name="refresh" size={20} color="#E0AA3E" />
            <Text style={styles.controlText}>{autoRotate ? 'Stop Rotate' : 'Auto Rotate'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={() => setSettingsModalVisible(true)}
          >
            <Ionicons name="options" size={20} color="#E0AA3E" />
            <Text style={styles.controlText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Point Cloud Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Point Size: {pointSize.toFixed(1)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={10}
                  value={pointSize}
                  onValueChange={handleChangePointSize}
                  minimumTrackTintColor="#E0AA3E"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#E0AA3E"
                />
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Color Mode</Text>
                <View style={styles.colorModeButtons}>
                  <TouchableOpacity 
                    style={[styles.colorButton, pointColor === 'intensity' && styles.activeColorButton]}
                    onPress={() => handleChangeColorMode('intensity')}
                  >
                    <Text style={styles.colorButtonText}>Intensity</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.colorButton, pointColor === 'height' && styles.activeColorButton]}
                    onPress={() => handleChangeColorMode('height')}
                  >
                    <Text style={styles.colorButtonText}>Height</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.colorButton, pointColor === 'rgb' && styles.activeColorButton]}
                    onPress={() => handleChangeColorMode('rgb')}
                  >
                    <Text style={styles.colorButtonText}>RGB</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.toggleContainer}>
                  <Text style={styles.settingLabel}>Auto Rotate</Text>
                  <Switch
                    value={autoRotate}
                    onValueChange={handleToggleAutoRotate}
                    trackColor={{ false: '#767577', true: '#E0AA3E' }}
                    thumbColor={autoRotate ? '#FFF' : '#f4f3f4'}
                  />
                </View>
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.toggleContainer}>
                  <Text style={styles.settingLabel}>Show Performance Stats</Text>
                  <Switch
                    value={showStats}
                    onValueChange={handleToggleStats}
                    trackColor={{ false: '#767577', true: '#E0AA3E' }}
                    thumbColor={showStats ? '#FFF' : '#f4f3f4'}
                  />
                </View>
              </View>
              
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>ROS Topic</Text>
                <View style={styles.topicInputContainer}>
                  <Text style={styles.topicText}>{pointCloudTopic}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FFF',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262626',
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
  reconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0AA3E',
    padding: 5,
    borderRadius: 5,
    marginLeft: 10,
  },
  reconnectText: {
    color: '#000',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },
  reconnectButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0AA3E',
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  reconnectTextLarge: {
    color: '#000',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  viewerContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#333',
  },
  viewer: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 20,
  },
  placeholderText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    color: '#F44336',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  topicText: {
    color: '#E0AA3E',
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  controls: {
    padding: 15,
    backgroundColor: '#262626',
    margin: 10,
    borderRadius: 15,
  },
  controlTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 10,
    minWidth: 80,
  },
  activeControlButton: {
    backgroundColor: '#4A3F2D',
    borderColor: '#E0AA3E',
    borderWidth: 1,
  },
  controlText: {
    color: '#E0AA3E',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },
  infoPanel: {
    padding: 15,
    backgroundColor: '#262626',
    margin: 10,
    borderRadius: 10,
  },
  infoTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#E0AA3E',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#262626',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    maxHeight: height * 0.6,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  colorModeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeColorButton: {
    backgroundColor: '#4A3F2D',
    borderColor: '#E0AA3E',
    borderWidth: 1,
  },
  colorButtonText: {
    color: '#E0AA3E',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicInputContainer: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
  },
});

export default PointCloudScreen;
