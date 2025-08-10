import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Circle, Path } from 'react-native-svg';

const ArmVisualizer = ({ 
  baseAngle = 0,
  shoulderAngle = 0, 
  elbowAngle = 0,
  wristAngle = 0,
  wristRotationAngle = 0,
  gripperAngle = 0,
  gripperWidth = 20
}) => {
  // Constants for arm segments (in pixels)
  const BASE_HEIGHT = 40;
  const SHOULDER_LENGTH = 100;
  const ELBOW_LENGTH = 80;
  const WRIST_LENGTH = 60;
  const GRIPPER_LENGTH = 30;
  
  // Center position
  const CENTER_X = 200;
  const CENTER_Y = 250;

  // Convert angles to radians
  const toRad = angle => (angle * Math.PI) / 180;
  const baseRad = toRad(baseAngle);
  const shoulderRad = toRad(shoulderAngle);
  const elbowRad = toRad(elbowAngle);
  const wristRad = toRad(wristAngle);
  const gripperRad = toRad(gripperAngle);

  // Calculate joint positions
  const shoulderPos = {
    x: CENTER_X,
    y: CENTER_Y - BASE_HEIGHT
  };

  const elbowPos = {
    x: shoulderPos.x + SHOULDER_LENGTH * Math.cos(shoulderRad),
    y: shoulderPos.y - SHOULDER_LENGTH * Math.sin(shoulderRad)
  };

  const wristPos = {
    x: elbowPos.x + ELBOW_LENGTH * Math.cos(shoulderRad + elbowRad),
    y: elbowPos.y - ELBOW_LENGTH * Math.sin(shoulderRad + elbowRad)
  };

  const endEffectorPos = {
    x: wristPos.x + WRIST_LENGTH * Math.cos(shoulderRad + elbowRad + wristRad),
    y: wristPos.y - WRIST_LENGTH * Math.sin(shoulderRad + elbowRad + wristRad)
  };

  // Calculate gripper points
  const gripperAngleLeft = gripperRad - Math.PI/4;
  const gripperAngleRight = gripperRad + Math.PI/4;
  
  const leftGripperEnd = {
    x: endEffectorPos.x + GRIPPER_LENGTH * Math.cos(shoulderRad + elbowRad + wristRad + gripperAngleLeft),
    y: endEffectorPos.y - GRIPPER_LENGTH * Math.sin(shoulderRad + elbowRad + wristRad + gripperAngleLeft)
  };

  const rightGripperEnd = {
    x: endEffectorPos.x + GRIPPER_LENGTH * Math.cos(shoulderRad + elbowRad + wristRad + gripperAngleRight),
    y: endEffectorPos.y - GRIPPER_LENGTH * Math.sin(shoulderRad + elbowRad + wristRad + gripperAngleRight)
  };

  return (
    <View style={{ height: 400, backgroundColor: '#1A1A1A', margin: 10, borderRadius: 10 }}>
      <Svg height="400" width="400">
        {/* Base */}
        <Path
          d={`M${CENTER_X-30},${CENTER_Y} h60 v-${BASE_HEIGHT} h-60 Z`}
          fill="#333"
          stroke="#E0AA3E"
          strokeWidth="2"
        />
        
        {/* Shoulder joint */}
        <Circle cx={shoulderPos.x} cy={shoulderPos.y} r="8" fill="#E0AA3E" />
        
        {/* Shoulder to elbow */}
        <Line
          x1={shoulderPos.x}
          y1={shoulderPos.y}
          x2={elbowPos.x}
          y2={elbowPos.y}
          stroke="#E0AA3E"
          strokeWidth="4"
        />
        
        {/* Elbow joint */}
        <Circle cx={elbowPos.x} cy={elbowPos.y} r="6" fill="#FFF" />
        
        {/* Elbow to wrist */}
        <Line
          x1={elbowPos.x}
          y1={elbowPos.y}
          x2={wristPos.x}
          y2={wristPos.y}
          stroke="#E0AA3E"
          strokeWidth="4"
        />
        
        {/* Wrist joint */}
        <Circle cx={wristPos.x} cy={wristPos.y} r="6" fill="#FFF" />
        
        {/* Wrist to end effector */}
        <Line
          x1={wristPos.x}
          y1={wristPos.y}
          x2={endEffectorPos.x}
          y2={endEffectorPos.y}
          stroke="#E0AA3E"
          strokeWidth="4"
        />
        
        {/* Grippers */}
        <Line
          x1={endEffectorPos.x}
          y1={endEffectorPos.y}
          x2={leftGripperEnd.x}
          y2={leftGripperEnd.y}
          stroke="#E0AA3E"
          strokeWidth="3"
        />
        
        <Line
          x1={endEffectorPos.x}
          y1={endEffectorPos.y}
          x2={rightGripperEnd.x}
          y2={rightGripperEnd.y}
          stroke="#E0AA3E"
          strokeWidth="3"
        />
        
        {/* End effector joint */}
        <Circle cx={endEffectorPos.x} cy={endEffectorPos.y} r="5" fill="#FFF" />
      </Svg>
    </View>
  );
};

export default ArmVisualizer;
