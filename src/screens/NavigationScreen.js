import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Navigation from '../components/Navigation';

const NavigationScreen = ({ route, navigation }) => {
  // Get ROS connection from route params
  const ros = route?.params?.ros;

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false} // Hides scrollbar
      contentContainerStyle={styles.contentContainer}
      bounces={true} // Gives a nice bounce effect at edges
    >
      <Navigation ros={ros} navigation={navigation} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  contentContainer: {
    flexGrow: 1, // Makes content expand to fill space
    paddingBottom: 20, // Adds padding at bottom for better scrolling
  }
});

export default NavigationScreen;