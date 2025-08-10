# Goliath Robot Model

## Overview
This repository contains the URDF (Unified Robot Description Format) model for the "Goliath" robot. The model consists of a base, a 5-link robotic arm, and an end effector, with all meshes stored in the repository's mesh directory.

## Repository Information
- **Created by**: viththagi
- **Creation Date**: 2025-07-29
- **Last Updated**: 2025-07-29 16:25:30 UTC

## Model Structure
The Goliath robot has the following structure:
- **base_link**: The foundational link of the robot
- **link1**: Connected to base_link via joint1 (rotates around Z-axis)
- **link2**: Connected to link1 via joint2 (rotates around Y-axis)
- **link3**: Connected to link2 via joint3 (rotates around Y-axis)
- **link4**: Connected to link3 via joint4 (rotates around X-axis)
- **end_effector**: Connected to link4 via joint5 (rotates around Y-axis)

## Files
- `goliath.urdf`: The main URDF file describing the robot structure
- `/mesh`: Directory containing STL mesh files for each robot link
  - base_link.stl
  - link1.stl
  - link2.stl
  - link3.stl
  - link4.stl
  - end_effector.stl

## Usage
To use this URDF model in your robotics project:

1. Clone this repository:
   ```
   git clone https://github.com/viththagi/viththagi.github.io.git
   ```

2. Use the URDF file in your robotics software (e.g., ROS, Gazebo, etc.)
   ```
   roslaunch your_package_name display.launch model:=path_to_goliath.urdf
   ```

## Joint Specifications

| Joint Name | Type     | Parent    | Child       | Axis    | Limits (rad)        | Max Effort | Max Velocity |
|------------|----------|-----------|-------------|---------|---------------------|------------|--------------|
| joint1     | revolute | base_link | link1       | [0,0,1] | [-3.14159, 3.14159] | 100        | 1.0          |
| joint2     | revolute | link1     | link2       | [0,1,0] | [-1.57079, 1.57079] | 100        | 1.0          |
| joint3     | revolute | link2     | link3       | [0,1,0] | [-1.57079, 1.57079] | 80         | 1.0          |
| joint4     | revolute | link3     | link4       | [1,0,0] | [-3.14159, 3.14159] | 50         | 1.5          |
| joint5     | revolute | link4     | end_effector | [0,1,0] | [-1.57079, 1.57079] | 30         | 2.0          |

## Visualization
For visualization of this robot model, you can use tools like:
- RViz (ROS Visualization)
- Gazebo Simulator
- MoveIt Motion Planning Framework
