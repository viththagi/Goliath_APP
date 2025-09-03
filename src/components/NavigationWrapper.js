// src/components/NavigationWrapper.js
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ArmControlScreen from '../screens/ArmControlScreen';
import NavigationScreen from '../screens/NavigationScreen';
import SensorsScreen from '../screens/SensorsScreen';
import TopicsScreen from '../screens/TopicsScreen';
import PointCloudScreen from '../screens/PointCloudScreen';

import LidarScreen from '../screens/LidarScreen';
import FloatingCmdVel from './FloatingCmdVel';

const Tab = createBottomTabNavigator();

const NavigationWrapper = () => {
  return (
    <View style={{ flex: 1 }}>
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
            if (route.name === 'Arm') iconName = focused ? 'git-branch' : 'git-branch-outline';
            else if (route.name === 'Navigate') iconName = focused ? 'navigate' : 'navigate-outline';
            else if (route.name === 'Sensors') iconName = focused ? 'hardware-chip' : 'hardware-chip-outline';
            else if (route.name === 'Topics') iconName = focused ? 'list' : 'list-outline';
            else if (route.name === 'Lidar') iconName = focused ? 'scan' : 'list-outline';
            else if (route.name === '3D Map') iconName = focused ? 'cube' : 'cube-outline';
           
            else if (route.name === '3D Arm') iconName = focused ? 'body' : 'body-outline';

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
          name="Lidar"
          component={LidarScreen}
          options={{
            tabBarLabel: 'Lidar',
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
      <FloatingCmdVel />
    </View>
  );
};

export default NavigationWrapper;
