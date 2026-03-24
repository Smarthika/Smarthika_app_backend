# MQTT Motor Control Implementation

This document provides comprehensive setup instructions and documentation for the MQTT motor control feature in the Farmer App.

## Overview

The MQTT motor control system allows approved farmers to remotely control agricultural motors through a secure MQTT connection to EMQX Cloud. The system follows a hierarchical topic structure for security and proper message routing.

## Architecture

### Topic Structure
```
organization/context/site_type/site_id/device_type/device_id/message_type
```

**Example Topics:**
- Commands: `clextra/smarthika-agro/farm/inKAblrAZON03/gateway-controller/gw-motor-ctrl-001/commands`
- Status: `clextra/smarthika-agro/farm/inKAblrAZON03/gateway-controller/gw-motor-ctrl-001/status`
- Telemetry: `clextra/smarthika-agro/farm/inKAblrAZON03/gateway-controller/gw-motor-ctrl-001/telemetry`
- Valve Status: `clextra/smarthika-agro/farm/inKAblrAZON03/gateway-controller/gw-motor-ctrl-001/valve/valve-087/status`

### MQTT Broker Configuration

**EMQX Cloud Details:**
- Host: `wec99c16.ala.dedicated.gcp.emqxcloud.com`
- Port: `1883`
- Protocol: `mqtt://`
- Client ID: `mqttx_4f563b88`
- Username: `user1`
- Password: `[Configure in mqttConfig.js]`

## Setup Instructions

### 1. Prerequisites

Ensure you have the following dependencies installed:

```bash
npm install sp-react-native-mqtt
npm install @react-native-async-storage/async-storage
```

### 2. Configuration

1. **Update MQTT Password:**
   ```javascript
   // config/mqttConfig.js
   export const MQTT_CONFIG = {
     auth: {
       clientId: 'mqttx_4f563b88',
       username: 'user1',
       password: 'YOUR_MQTT_PASSWORD_HERE' // Add your password
     }
   };
   ```

2. **Customize Device Configuration:**
   ```javascript
   // config/mqttConfig.js
   topics: {
     organization: 'clextra',
     context: 'smarthika-agro',
     siteType: 'farm',
     siteId: 'inKAblrAZON03',        // Update for your site
     deviceType: 'gateway-controller',
     deviceId: 'gw-motor-ctrl-001',   // Update for your device
   }
   ```

### 3. File Structure

```
components/
├── services/
│   └── mqttService.js          # Core MQTT service
└── ui/
    └── MotorControl.js         # Motor control UI component

app/
├── (tabs)/
│   └── home.js                 # Home screen with motor control
└── motor/
    └── motor-status.js         # Detailed motor status screen

config/
└── mqttConfig.js               # MQTT configuration and constants
```

### 4. Integration Steps

The motor control feature is automatically integrated for approved farmers:

1. **Home Screen Integration:** Motor control widget appears on the farmer home screen
2. **Navigation:** Tap the motor control header to access detailed status
3. **Real-time Updates:** Automatic status updates via MQTT subscriptions

## Usage

### For Approved Farmers

1. **Access Motor Control:**
   - Navigate to the Home tab
   - Motor Control widget appears after approval
   - Shows current motor status and connection state

2. **Basic Controls:**
   - Toggle switch for ON/OFF control
   - Quick action buttons (Turn ON/Turn OFF)
   - Refresh button to request current status

3. **Detailed View:**
   - Tap motor control header to access detailed status
   - View telemetry data, valve status, and message history
   - Real-time connection monitoring

### Motor Commands

The system supports the following MQTT commands:

```javascript
// Turn motor ON
{
  "action": "motor_on",
  "timestamp": "2024-09-20T13:33:00.000Z",
  "device_id": "gw-motor-ctrl-001",
  "command_id": "cmd_1695215580000"
}

// Turn motor OFF
{
  "action": "motor_off",
  "timestamp": "2024-09-20T13:33:00.000Z",
  "device_id": "gw-motor-ctrl-001",
  "command_id": "cmd_1695215580000"
}

// Get status
{
  "action": "get_status",
  "timestamp": "2024-09-20T13:33:00.000Z",
  "device_id": "gw-motor-ctrl-001",
  "command_id": "cmd_1695215580000"
}
```

## Technical Implementation

### MQTTService Features

1. **Connection Management:**
   - Automatic reconnection with exponential backoff
   - Connection status monitoring
   - Persistent state management

2. **Topic Management:**
   - Dynamic topic generation based on configuration
   - Multiple topic subscriptions (status, telemetry, valve)
   - Message routing and processing

3. **State Management:**
   - Motor state persistence with AsyncStorage
   - Real-time state synchronization
   - Event-driven updates

### UI Components

1. **MotorControl Component:**
   - Configurable size (small, medium, large)
   - Real-time status display
   - Interactive controls with loading states
   - Connection status indicator

2. **Motor Status Screen:**
   - Comprehensive motor information
   - Telemetry data display
   - Message history for debugging
   - Connection management tools

## Security Considerations

1. **Authentication:**
   - MQTT username/password authentication
   - Client ID-based identification

2. **Authorization:**
   - Feature available only to approved farmers
   - Role-based access control

3. **Topic Security:**
   - Hierarchical topic structure for isolation
   - Device-specific routing

## Troubleshooting

### Common Issues

1. **Connection Failed:**
   - Check internet connectivity
   - Verify MQTT credentials in `mqttConfig.js`
   - Ensure EMQX Cloud service is accessible

2. **Commands Not Working:**
   - Verify topic structure matches device expectations
   - Check device ID configuration
   - Monitor MQTT message logs

3. **UI Not Updating:**
   - Check MQTT service initialization
   - Verify event listeners are properly attached
   - Review AsyncStorage permissions

### Debug Tools

1. **Message History:**
   - View recent MQTT messages in Motor Status screen
   - Monitor command success/failure

2. **Connection Status:**
   - Real-time connection monitoring
   - Reconnection attempt tracking

3. **Logging:**
   - Comprehensive console logging for debugging
   - Error tracking and reporting

## Testing

### Manual Testing Steps

1. **Connection Test:**
   - Open app as approved farmer
   - Navigate to Home screen
   - Verify "Online" status in motor control widget

2. **Command Test:**
   - Toggle motor ON/OFF using switch
   - Verify loading states during commands
   - Check for success/error notifications

3. **Status Update Test:**
   - Use refresh button to request status
   - Verify real-time updates from MQTT messages
   - Check persistence across app restarts

### Mock Testing

For testing without physical devices, modify the MQTT service to include mock responses:

```javascript
// Add to mqttService.js for testing
const MOCK_MODE = __DEV__; // Enable in development

if (MOCK_MODE) {
  // Simulate device responses
  setTimeout(() => {
    this.notifyListeners({
      type: MESSAGE_TYPES.MOTOR_STATUS,
      status: { motor_status: 'on' }
    });
  }, 2000);
}
```

## Production Deployment

### Configuration Checklist

- [ ] Update MQTT password in `mqttConfig.js`
- [ ] Configure correct device IDs and site IDs
- [ ] Verify EMQX Cloud accessibility
- [ ] Test with actual hardware devices
- [ ] Enable proper error logging
- [ ] Set up monitoring and alerts

### Performance Considerations

1. **Connection Management:**
   - Implement proper cleanup on app background/foreground
   - Optimize reconnection strategies
   - Monitor battery usage

2. **Message Handling:**
   - Limit message history size
   - Implement message deduplication
   - Handle high-frequency updates efficiently

## Future Enhancements

1. **Multiple Motor Support:**
   - Dynamic device discovery
   - Multi-motor control interface
   - Device grouping and scheduling

2. **Advanced Features:**
   - Scheduled motor operations
   - Conditional automation
   - Analytics and reporting

3. **Monitoring:**
   - Real-time telemetry dashboards
   - Alert notifications
   - Usage analytics

## Support

For technical support or questions:

1. Check the troubleshooting section above
2. Review console logs for error messages
3. Verify MQTT broker connectivity
4. Contact development team with specific error details

---

**Last Updated:** September 2024
**Version:** 1.0.0
