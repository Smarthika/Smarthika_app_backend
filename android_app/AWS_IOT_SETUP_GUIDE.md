# AWS IoT Core Migration - Setup Guide

## ✅ Migration Complete

Your app has been successfully migrated from EMQX to AWS IoT Core. All logic remains the same - only the connection mechanism has changed.

## 🔧 Required Configuration

Before running your app, you **MUST** update the following values in `config/mqttConfig.js`:

### 1. AWS Identity Pool ID

Replace `YOUR_IDENTITY_POOL_ID` with your actual AWS Cognito Identity Pool ID:

```javascript
identityPoolId: 'ap-south-1:YOUR_IDENTITY_POOL_ID'
```

**How to get it:**
1. Go to AWS Console → Cognito
2. Navigate to Identity Pools
3. Copy your Identity Pool ID (format: `region:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 2. AWS IoT Endpoint

Update the IoT endpoint if different:

```javascript
iotEndpoint: 'a2hbea512zkq36-ats.iot.ap-south-1.amazonaws.com'
```

**How to get it:**
1. Go to AWS Console → IoT Core
2. Navigate to Settings
3. Copy your Custom endpoint (under Device data endpoint)

## 📦 Dependencies Installed

The following packages have been added to your project:

- `aws-sdk` - AWS SDK for JavaScript
- `react-native-get-random-values` - Polyfill for crypto.getRandomValues()
- `react-native-url-polyfill` - URL API polyfill for React Native

## 🔄 Changes Made

### 1. App.js
Added required polyfills at the top:
```javascript
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
```

### 2. config/mqttConfig.js
- Replaced EMQX broker configuration with AWS IoT Core settings
- Updated to use AWS Cognito Identity Pool authentication
- Changed QoS levels to align with AWS IoT Core recommendations (QoS 1 for commands/status)

### 3. components/services/mqttService.js
- Added AWS SDK import
- Updated connection logic to use AWS Cognito credentials
- Modified to connect via WebSocket Secure (WSS) to AWS IoT Core
- All business logic (motor control, subscriptions, message handling) remains unchanged

## 🧪 Testing Your Setup

### Option 1: AWS IoT Core MQTT Test Client (Recommended)

1. Go to AWS Console → IoT Core → MQTT Test Client

2. **Subscribe to commands:**
   - Topic: `clextra/smarthika-agro/farm/inKAblrAZON03/gateway/gw-motor-ctrl-001/commands`
   - Press "Subscribe"

3. **Test from your app:**
   - Press "Turn Motor ON" in your app
   - You should see the message in AWS Test Client:
     ```json
     {
       "action": "motor_on",
       "timestamp": "...",
       "device_id": "gw-motor-ctrl-001",
       "command_id": "cmd_..."
     }
     ```

4. **Publish status to app:**
   - Topic: `clextra/smarthika-agro/farm/inKAblrAZON03/gateway/gw-motor-ctrl-001/status`
   - Message:
     ```json
     {
       "motor_status": "on"
     }
     ```
   - Your app should receive and display this

### Option 2: Check Console Logs

Your app will log:
```
AWS credentials obtained successfully
Connecting to AWS IoT Core: wss://...
MQTT connected successfully to AWS IoT Core
```

## 🔒 AWS IAM Policy Requirements

Your Cognito Identity Pool **unauthenticated role** must have these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Connect",
        "iot:Publish",
        "iot:Subscribe",
        "iot:Receive"
      ],
      "Resource": "*"
    }
  ]
}
```

**For production**, restrict the `Resource` to specific topic patterns:
```json
"Resource": [
  "arn:aws:iot:ap-south-1:YOUR_ACCOUNT_ID:topic/clextra/smarthika-agro/*",
  "arn:aws:iot:ap-south-1:YOUR_ACCOUNT_ID:client/expo-farmer-app-*"
]
```

## 🎯 Topic Structure (Unchanged)

Your topics follow the same structure:

```
clextra/smarthika-agro/farm/inKAblrAZON03/gateway/gw-motor-ctrl-001/commands
clextra/smarthika-agro/farm/inKAblrAZON03/gateway/gw-motor-ctrl-001/status
clextra/smarthika-agro/farm/inKAblrAZON03/gateway/gw-motor-ctrl-001/telemetry
```

## ⚠️ Common Issues

### Connection Fails

**Check:**
1. ✅ Identity Pool ID is correct in `mqttConfig.js`
2. ✅ IoT endpoint is correct
3. ✅ IAM policy attached to Cognito Identity Pool role
4. ✅ Region matches (ap-south-1)

**Debug:**
- Check console logs for detailed error messages
- Verify AWS Cognito credentials are being obtained

### No Messages Received

**Check:**
1. ✅ Topics match exactly (case-sensitive)
2. ✅ IAM policy allows `iot:Subscribe` and `iot:Receive`
3. ✅ QoS level is compatible (AWS IoT supports QoS 0 and 1 only)

## 🚀 Running the App

No changes needed to your run commands:

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
```

## 📝 Notes

- AWS IoT Core supports QoS 0 and 1 only (QoS 2 not supported)
- WebSocket connections use WSS (secure) protocol
- Credentials are automatically refreshed by AWS SDK
- All motor control logic remains exactly the same
- Message formats and topic structure are unchanged

## 🆘 Support

If you encounter issues:

1. Check AWS IoT Core CloudWatch logs
2. Enable verbose logging in AWS SDK
3. Verify IAM permissions are correct
4. Test connection using AWS MQTT Test Client first

---

**Migration completed on:** February 14, 2026
**AWS Region:** ap-south-1
**Service:** AWS IoT Core
