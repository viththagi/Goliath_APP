import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import * as ROS from './src/services/rosService';
import { ROSProvider } from './src/contexts/ROSContext';

import SlamScreen from './src/screens/SlamScreen';
import ArmControlScreen from './src/screens/ArmControlScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import SensorsScreen from './src/screens/SensorsScreen';
import TopicsScreen from './src/screens/TopicsScreen';
import PointCloudScreen from './src/screens/PointCloudScreen';
import SimpleEchoScreen from './src/screens/SimpleEchoScreen';



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
            bottom: 25,
            left: 15,
            right: 15,
            height: 60,
            paddingTop: 5,
            paddingBottom: 5,
            elevation: 0,
            shadowOpacity: 0,
            borderRadius: 20,
            marginHorizontal: 10,
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'SLAM') iconName = focused ? 'map' : 'map-outline';
            else if (route.name === 'Arm') iconName = focused ? 'git-branch' : 'git-branch-outline';
            else if (route.name === 'Navigate') iconName = focused ? 'navigate' : 'navigate-outline';
            else if (route.name === 'Sensors') iconName = focused ? 'hardware-chip' : 'hardware-chip-outline';
            else if (route.name === 'Topics') iconName = focused ? 'list' : 'list-outline';
            else if (route.name === '3D Map') iconName = focused ? 'cube' : 'cube-outline';
            else if (route.name === 'SimpleEcho') iconName = focused ? 'bug' : 'bug-outline';
            
            else if (route.name === '3D Arm') iconName = focused ? 'body' : 'body-outline'; // Icon for 3D Arm

            return <Ionicons name={iconName} size={24} color={color} />;
          },
          tabBarActiveTintColor: '#E0AA3E',
          tabBarInactiveTintColor: '#666666',
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
          name="SimpleEcho"
          component={SimpleEchoScreen}
          options={{
            tabBarLabel: 'Simple Echo',
          }}
        />
        <Tab.Screen
          name="3D Map"
          component={PointCloudScreen}
          options={{
            tabBarLabel: '3D Map',
          }}
        />
        <Tab.Screen
          name="Topics"
          component={TopicsScreen}
          options={{
            tabBarLabel: 'Topics',
          }}
        />
        <Tab.Screen
          name="SLAM"
          component={SlamScreen}
          options={{
            tabBarLabel: 'SLAM',
          }}
        />
        <Tab.Screen
          name="Arm"
          component={ArmControlScreen}
          options={{
            tabBarLabel: 'Arm',
          }}
        />
        
        <Tab.Screen
          name="Navigate"
          component={NavigationScreen}
          options={{
            tabBarLabel: 'Navigate',
          }}
        />
        <Tab.Screen
          name="Sensors"
          component={SensorsScreen}
          options={{
            tabBarLabel: 'Sensors',
          }}
        />
        
      </Tab.Navigator>
    </NavigationContainer>
  );
}
