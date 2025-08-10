import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RosConnector from './RosConnector';

const Home = () => {
  const [ros, setRos] = useState(null);
  const [connected, setConnected] = useState(false);
  const [ipAddress, setIpAddress] = useState('');

  const handleConnect = () => {
    if (!ipAddress) {
      // Add validation for empty IP
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }
    if (connected) {
      Alert.alert('Warning', 'Already connected to robot');
      return;
    }
    // Connection will be handled by RosConnector component
    Alert.alert('Success', 'Attempting to connect to robot...');
  };

  const handleDisconnect = () => {
    if (!connected) {
      Alert.alert('Warning', 'Not connected to any robot');
      return;
    }
    if (ros) {
      ros.close();
      setRos(null);
      Alert.alert('Success', 'Disconnected from robot');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Text style={styles.greeting}>Hi, Controller</Text>
          <Text style={styles.date}>27 June 2024</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection Status</Text>
        <View style={styles.statusBox}>
          <Ionicons 
            name={connected ? 'checkmark-circle' : 'close-circle'} 
            size={24} 
            color={connected ? '#E0AA3E' : '#666666'} 
          />
          <Text style={styles.statusText}>
            {connected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Robot IP Address"
            placeholderTextColor="#666666"
            value={ipAddress}
            onChangeText={setIpAddress}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleConnect}
          >
            <Ionicons name="power" size={20} color="#1A1A1A" />
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleDisconnect}
          >
            <Ionicons name="close-circle" size={20} color="#E0AA3E" />
            <Text style={styles.secondaryButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>

      <RosConnector 
        setRos={setRos} 
        setConnected={setConnected}
        ipAddress={ipAddress}
      />
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
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  date: {
    color: '#666666',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#262626',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  statusText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#333333',
    borderRadius: 15,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0AA3E',
    padding: 15,
    borderRadius: 15,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#E0AA3E',
  },
  buttonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#E0AA3E',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Home;