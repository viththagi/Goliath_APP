# Goliath Robot Control App

A React Native mobile application for controlling the Goliath 5-DOF robotic arm via ROS2 bridge connection. The app provides an intuitive interface for robot operation, real-time visualization, and system monitoring.

## 🚀 Features

### 📱 Core Functionality
- **Real-time Robot Control**: Direct control of 5-DOF robotic arm joints
- **3D Visualization**: Interactive 3D robot arm visualization with touch controls
- **ROS2 Integration**: WebSocket connection to ROS2 systems via rosbridge_suite
- **SLAM Operations**: Mapping and localization control interface
- **Navigation Control**: Robot movement and path planning
- **Sensor Monitoring**: Real-time sensor data display

### 🎨 User Interface
- **Adaptive Theming**: Automatically adapts to system dark/light mode
- **Instagram-inspired Design**: Modern UI with gold accent colors (#E0AA3E)
- **Responsive Layout**: Optimized for mobile devices
- **Touch-friendly Controls**: Gesture-based 3D viewport manipulation
- **Bottom Tab Navigation**: Easy access to all app sections

### 🔧 Technical Features
- **Modular Architecture**: Clean component-based structure
- **Real-time Updates**: Live joint angle feedback and visualization
- **WebSocket Communication**: Reliable ROS bridge connection
- **Cross-platform**: Works on both iOS and Android

## 📋 Prerequisites

- Node.js (v16 or higher)
- React Native development environment
- Expo CLI (optional, for easier development)
- ROS2 system with rosbridge_suite installed

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/viththagi/Goliath_APP.git
   cd Goliath_APP
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/emulator**
   ```bash
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   ```

## 📦 Dependencies

### Core Dependencies
- `react-native`: Mobile app framework
- `@react-navigation/native`: Navigation library
- `@react-navigation/bottom-tabs`: Bottom tab navigation
- `react-native-svg`: SVG graphics for visualizations
- `@react-native-community/slider`: Joint control sliders
- `roslib`: ROS bridge WebSocket communication
- `@expo/vector-icons`: Icon library

### Development Dependencies
- `@babel/core`: JavaScript compiler
- `expo`: Development platform (optional)

## 🏗️ Project Structure

```
ros2-bridge-app/
├── App.js                          # Main app component with navigation
├── package.json                    # Project dependencies and scripts
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── Home.js                # Connection management component
│   │   ├── RosConnector.js        # ROS WebSocket connection handler
│   │   ├── URDFViewer.js          # 3D robot visualization component
│   │   ├── JointSlider.js         # Individual joint control slider
│   │   ├── ArmVisualizer.js       # 2D arm visualization (legacy)
│   │   ├── Navigation.js          # Navigation control component
│   │   ├── Sensors.js             # Sensor monitoring component
│   │   └── Slam.js                # SLAM operations component
│   └── screens/                   # Main app screens
│       ├── HomeScreen.js          # Home/connection screen
│       ├── ArmControlScreen.js    # Robot arm control interface
│       ├── SlamScreen.js          # SLAM operations screen
│       ├── NavigationScreen.js    # Navigation control screen
│       └── SensorsScreen.js       # Sensor monitoring screen
└── assets/                        # Static assets and documentation
    ├── README.md                  # Robot model documentation
    └── mesh/                      # 3D model files (STL format)
```

## 🤖 Robot Specifications

### Goliath 5-DOF Robotic Arm
- **Base Joint**: Rotation around Z-axis (-π to π rad)
- **Shoulder Joint**: Pitch movement (-π/2 to π/2 rad)
- **Elbow Joint**: Pitch movement (-π/2 to π/2 rad)
- **Wrist Roll**: Rotation around X-axis (-π to π rad)
- **Wrist Pitch**: Pitch movement (-π/2 to π/2 rad)

### Control Interface
- Real-time joint angle sliders with radian/degree conversion
- 3D visualization with touch-based rotation
- Emergency stop functionality
- Home position presets

## 🔌 ROS2 Integration

### Required ROS2 Packages
```bash
# Install rosbridge_suite
sudo apt install ros-foxy-rosbridge-suite

# Launch rosbridge server
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

### Connection Setup
1. Ensure ROS2 system is running rosbridge_server on port 9090
2. Connect mobile device to same network as ROS2 system
3. Enter ROS2 system IP address in the app
4. Tap "Connect" to establish WebSocket connection

### Supported ROS2 Topics
- Joint control commands
- Sensor data subscriptions
- SLAM map data
- Navigation goals
- System status messages

## 📱 App Screens

### 1. Home Screen
- ROS2 connection management
- IP address configuration
- Connection status indicator
- Connect/disconnect controls

### 2. Arm Control Screen
- 3D robot arm visualization
- Individual joint control sliders
- Real-time angle feedback
- Touch-based 3D viewport rotation

### 3. SLAM Screen
- Start/stop mapping operations
- Save map functionality
- Mapping progress indicator
- Reset map controls

### 4. Navigation Screen
- Goal setting interface
- Path planning visualization
- Navigation status monitoring
- Emergency stop controls

### 5. Sensors Screen
- Real-time sensor data display
- Temperature, humidity, pressure readings
- Data refresh controls
- Historical data trends

## 🎨 Theming

The app automatically adapts to your device's theme settings:

### Dark Mode
- Background: `#1A1A1A`
- Cards: `#262626`
- Text: `#FFFFFF`
- Accent: `#E0AA3E` (Gold)

### Light Mode
- Background: `#FFFFFF`
- Cards: `#FAFAFA`
- Text: `#262626`
- Accent: `#E0AA3E` (Gold)

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
ROS_BRIDGE_PORT=9090
DEFAULT_ROBOT_IP=192.168.1.100
```

### Robot Parameters
Modify joint limits in `src/screens/ArmControlScreen.js`:
```javascript
const JOINT_LIMITS = {
  joint1: { min: -Math.PI, max: Math.PI },
  joint2: { min: -Math.PI/2, max: Math.PI/2 },
  // ... other joints
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify ROS2 system is running rosbridge_server
   - Check network connectivity
   - Ensure correct IP address is entered

2. **App Not Responding**
   - Clear Metro cache: `npm start -- --clear`
   - Restart development server
   - Check for JavaScript errors in console

3. **3D Visualization Issues**
   - Ensure device supports hardware acceleration
   - Try restarting the app
   - Check for memory issues

### Development Debug
```bash
# Clear cache and restart
npm start -- --clear

# View logs
npx react-native log-android  # For Android
npx react-native log-ios      # For iOS
