import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Slam from '../components/Slam';

const SlamScreen = ({ route, navigation }) => {
  // Get ROS connection from route params
  const ros = route?.params?.ros;

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
      bounces={true}
    >
      <Slam ros={ros} navigation={navigation} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Ensure dark background
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  }
});

export default SlamScreen;