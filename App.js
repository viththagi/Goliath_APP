import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';


import HomeScreen from './src/screens/HomeScreen';
import SlamScreen from './src/screens/SlamScreen';
import ArmControlScreen from './src/screens/ArmControlScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import SensorsScreen from './src/screens/SensorsScreen';
import Slam from './src/components/Slam';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1A1A1A',
            borderTopWidth: 0,
            position: 'absolute',
            bottom: 15, // Increased from 0 to raise the nav bar
            left: 15,   // Added left padding
            right: 15,  // Added right padding
            height: 60,
            paddingTop: 5,
            paddingBottom: 5,
            elevation: 0,
            shadowOpacity: 0,
            borderRadius: 20, // Added rounded corners
            marginHorizontal: 10, // Added horizontal margin
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'wallet' : 'wallet-outline';
            else if (route.name === 'SLAM') iconName = focused ? 'map' : 'map-outline';
            else if (route.name === 'Arm') iconName = focused ? 'git-branch' : 'git-branch-outline';
            else if (route.name === 'Navigate') iconName = focused ? 'navigate' : 'navigate-outline';
            else if (route.name === 'Sensors') iconName = focused ? 'hardware-chip' : 'hardware-chip-outline';
            
            return <Ionicons name={iconName} size={24} color={color} />;
          },
          tabBarActiveTintColor: '#E0AA3E', // Gold accent color
          tabBarInactiveTintColor: '#666666', // Darker grey for inactive
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            fontFamily: 'System',
            marginTop: 2,
            paddingBottom: 4,
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home'
          }}
        />
        <Tab.Screen 
          name="SLAM" 
          component={SlamScreen}
          options={{
            tabBarLabel: 'SLAM'
          }}
        />
        <Tab.Screen 
          name="Arm" 
          component={ArmControlScreen}
          options={{
            tabBarLabel: 'Arm'
          }}
        />
        <Tab.Screen 
          name="Navigate" 
          component={NavigationScreen}
          options={{
            tabBarLabel: 'Navigate'
          }}
        />
        <Tab.Screen 
          name="Sensors" 
          component={SensorsScreen}
          options={{
            tabBarLabel: 'Sensors'
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}


