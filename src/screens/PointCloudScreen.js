import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Switch, 
  ScrollView, 
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useROS } from '../contexts/ROSContext';
import PointCloudViewer from '../components/PointCloudViewer';

const PointCloudScreen = () => {
  const { ros, isConnected } = useROS();
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [pointSize, setPointSize] = useState(0.05);

  const handleChangePointSize = (value) => {
    setPointSize(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>3D Point Cloud Viewer</Text>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={isConnected ? 'cloud-done' : 'cube'} 
            size={20} 
            color={isConnected ? '#4CAF50' : '#E0AA3E'} 
          />
          <Text style={[styles.statusText, {color: isConnected ? '#4CAF50' : '#E0AA3E'}]}>
            {isConnected ? 'ROS Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <PointCloudViewer
        ros={ros}
        topic="/unilidar/cloud"
        pointSize={pointSize}
        autoRotate={autoRotate}
        showGrid={true}
        showAxis={true}
        style={styles.viewer}
      />

      <View style={styles.controls}>
        <Text style={styles.controlTitle}>View Controls</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="eye" size={20} color="#E0AA3E" />
            <Text style={styles.controlText}>Reset View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, autoRotate && styles.activeControlButton]} 
            onPress={() => setAutoRotate(!autoRotate)}
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
                <Text style={styles.settingLabel}>Point Size: {pointSize.toFixed(2)}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.01}
                  maximumValue={0.2}
                  value={pointSize}
                  onValueChange={handleChangePointSize}
                  minimumTrackTintColor="#E0AA3E"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#E0AA3E"
                />
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.toggleContainer}>
                  <Text style={styles.settingLabel}>Auto Rotate</Text>
                  <Switch
                    value={autoRotate}
                    onValueChange={setAutoRotate}
                    trackColor={{ false: '#767577', true: '#E0AA3E' }}
                    thumbColor={autoRotate ? '#FFF' : '#f4f3f4'}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Use fixed heights instead of Dimensions
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
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
  viewer: {
    flex: 1,
    margin: 10,
    borderRadius: 15,
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
    padding: 70,
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
    maxHeight: 300,  // Fixed height instead of using Dimensions
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
    maxHeight: 200,  // Fixed height instead of using Dimensions
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default PointCloudScreen;
