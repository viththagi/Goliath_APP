import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Sensors from '../components/Sensors';

const SensorsScreen = ({ route, navigation }) => {
  // Get ROS connection from route params
  const ros = route?.params?.ros;

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
      bounces={true}
    >
      <Sensors ros={ros} navigation={navigation} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  }
});

export default SensorsScreen;