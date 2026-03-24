import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Switch } from 'react-native';
// Link removed: header should not navigate
import { Ionicons } from '@expo/vector-icons';
import MQTTService from '../services/mqttService';
import { MESSAGE_TYPES, MOTOR_STATES } from '../../config/mqttConfig';
import LoadingSpinner from './LoadingSpinner';

export default function MotorControl({ 
  isVisible = true, 
  size = 'medium', 
  showStatus = true 
}) {
  const [motorState, setMotorState] = useState({
    isOn: false,
  status: null,
    lastUpdated: null
  });
  const [telemetry, setTelemetry] = useState({
    el: { v: null, i: null, f: null, pf: null, tp: null, imb: null, seq: null },
    hy: { p: null, fl_m: null, vol_t: null, st_h: null },
    m:  { st: null, rt: null, srt: null, op: null },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [commandPending, setCommandPending] = useState(false);
  const [requestedIsOn, setRequestedIsOn] = useState(null);
  const requestedIsOnRef = useRef(null);
  const [userOverrideIsOn, setUserOverrideIsOn] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);

  // --- MQTT message handler and helpers (extracted for readability) ---
  const normalizeMessage = (event) => {
    return event.status || event.message || event.payload || event;
  };

  const extractStatus = (source) => {
    if (!source) return null;
    // v2.1: { motor: { st, active }, mode, trigger }
    if (source?.motor?.st !== undefined) return source.motor.st;
    // legacy fallbacks
    try {
      if (source.payload && source.payload.motor) {
        const m = source.payload.motor;
        if (typeof m === 'object' && m.state !== undefined) return m.state;
        if (typeof m === 'string') return m;
      }
    } catch (e) { /* ignore */ }
    if (source.motor_status !== undefined) return source.motor_status;
    if (typeof source === 'string' || typeof source === 'boolean') return source;
    if (source.status && (typeof source.status === 'string' || typeof source.status === 'boolean')) return source.status;
    return null;
  };

  const handleMQTTMessage = (event) => {
    console.log('MotorControl received MQTT event:', event);
    const msg = normalizeMessage(event);

    // Determine if event represents a status message
    let isStatusEvent = false;
    if (event.type === MESSAGE_TYPES.MOTOR_STATUS) {
      isStatusEvent = true;
    } else if (event.type === MESSAGE_TYPES.MQTT_MESSAGE) {
      try {
        let parsed = null;
        if (typeof event.message === 'string') parsed = JSON.parse(event.message);
        else if (event.raw && typeof event.raw === 'string') parsed = JSON.parse(event.raw);
        else if (msg && typeof msg === 'object') parsed = msg;
        if (parsed && (parsed.messageType === 'status' || (parsed.payload && parsed.payload.motor))) isStatusEvent = true;
      } catch (e) {
        if (msg && (msg.messageType === 'status' || (msg.payload && msg.payload.motor))) isStatusEvent = true;
      }
    }

    if (isStatusEvent) {
      const statusValue = extractStatus(msg);
      let displayStatus = '';
      if (statusValue !== null && statusValue !== undefined && statusValue !== '') {
        displayStatus = statusValue;
      } else if (msg && msg.payload) {
        try {
          if (msg.payload.motor) {
            const m = msg.payload.motor;
            if (typeof m === 'object') displayStatus = (m.state !== undefined && m.state !== null) ? m.state : JSON.stringify(m);
            else if (typeof m === 'string') displayStatus = m;
          } else {
            displayStatus = JSON.stringify(msg.payload);
          }
        } catch (e) {
          displayStatus = '';
        }
      } else if (msg && typeof msg === 'string') displayStatus = msg;

      try {
        console.log('MotorControl parsed MQTT status ->', {
          eventType: event.type,
          statusValue,
          displayStatus,
          payloadPreview: msg && msg.payload ? (msg.payload.motor || msg.payload) : msg
        });
      } catch (e) {
        console.log('MotorControl parsed MQTT status - logging failed', e);
      }

      const isDefinitiveOn = (
        displayStatus === MOTOR_STATES.RUNNING_STAR  ||
        displayStatus === MOTOR_STATES.RUNNING_DELTA ||
        displayStatus === true
      );
      const isDefinitiveOff = (
        displayStatus === MOTOR_STATES.IDLE   ||
        displayStatus === MOTOR_STATES.FAULT  ||
        displayStatus === false
      );

      setMotorState(prev => ({
        ...prev,
        isOn: (commandPending && requestedIsOnRef.current !== null) ? requestedIsOnRef.current : (isDefinitiveOn ? true : isDefinitiveOff ? false : prev.isOn),
        status: displayStatus,
        lastUpdated: new Date().toISOString()
      }));

      setCommandPending(false);
      setRequestedIsOn(null);
      requestedIsOnRef.current = null;
      setIsLoading(false);
      console.log('MotorControl updated motorState.status ->', displayStatus);
      return;
    }

    // Telemetry message — v2.1 payload: { el, hy, m }
    if (event.type === MESSAGE_TYPES.TELEMETRY) {
      const t = event.telemetry || {};
      setTelemetry({
        el: t.el || { v: null, i: null, f: null, pf: null, tp: null, imb: null, seq: null },
        hy: t.hy || { p: null, fl_m: null, vol_t: null, st_h: null },
        m:  t.m  || { st: null, rt: null, srt: null, op: null },
      });
      return;
    }

    // Command ack/failure: only act on explicit failure
    if (event.type === MESSAGE_TYPES.MOTOR_COMMAND) {
      if (event.success === false) {
        setIsLoading(false);
        setCommandPending(false);
        setRequestedIsOn(null);
        Alert.alert('Motor Control Error', 'Failed to send command to motor');
      }
      return;
    }
  };

  useEffect(() => {
    initializeMQTT();
    loadMotorState();

    // Add MQTT message listener

  // Add listener
  MQTTService.addListener(handleMQTTMessage);

    // Check connection status periodically
    const connectionInterval = setInterval(() => {
      setIsConnected(MQTTService.getConnectionStatus());
    }, 2000);

    return () => {
      MQTTService.removeListener(handleMQTTMessage);
      clearInterval(connectionInterval);
    };
  }, []);

  const initializeMQTT = async () => {
    try {
      setIsConnecting(true);
      await MQTTService.initialize();
      setIsConnected(MQTTService.getConnectionStatus());
    } catch (error) {
      console.error('Failed to initialize MQTT:', error);
      Alert.alert('Connection Error', 'Failed to connect to motor control system');
    } finally {
      setIsConnecting(false);
    }
  };

  const loadMotorState = async () => {
    try {
      await MQTTService.loadMotorState();
      const state = MQTTService.getMotorState();
      // Treat saved 'unknown' as no status (null) so UI enables Turn ON by default
      const mapped = {
        ...state,
        status: state?.status === 'unknown' ? null : state?.status
      };
      setMotorState(mapped);
    } catch (error) {
      console.error('Failed to load motor state:', error);
    }
  };

  const updateMotorState = (statusPayload) => {
    // v2.1: { motor: { st, active }, mode ... }
    const mSt = statusPayload?.motor?.st;
    if (mSt !== undefined) {
      const isOn = mSt === MOTOR_STATES.RUNNING_STAR || mSt === MOTOR_STATES.RUNNING_DELTA;
      setMotorState(prev => ({
        ...prev,
        isOn,
        status: mSt,
        lastUpdated: new Date().toISOString()
      }));
    }
  };

  const handleMotorToggle = async (value) => {
    if (!isConnected) {
      Alert.alert(
        'Connection Error',
        'Not connected to motor control system. Please check your internet connection.',
        [
          { text: 'Retry', onPress: initializeMQTT },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    setIsLoading(true);
    setCommandPending(true);
    setRequestedIsOn(value);
  requestedIsOnRef.current = value;
  // Persist user's choice so toggle stays as they set it regardless of incoming MQTT status
  setUserOverrideIsOn(value);
    try {
      if (value) {
        await MQTTService.turnMotorOn();
      } else {
        await MQTTService.turnMotorOff();
      }
      // Do NOT set status here; only update from MQTT
    } catch (error) {
      console.error('Motor control error:', error);
      Alert.alert(
        'Motor Control Error',
        'Failed to control motor. Please try again.',
        [{ text: 'OK' }]
      );
      setIsLoading(false);
      setCommandPending(false);
  setRequestedIsOn(null);
  setUserOverrideIsOn(null);
    }
  };

  const handleRefreshStatus = async () => {
    if (!isConnected) {
      Alert.alert('Connection Error', 'Not connected to motor control system');
      return;
    }

    try {
      setIsLoading(true);
      await MQTTService.getMotorStatus();
    } catch (error) {
      console.error('Failed to refresh motor status:', error);
      Alert.alert('Error', 'Failed to refresh motor status');
      // Clear loading on explicit error so UI isn't stuck
      setIsLoading(false);
    }
  };

  const handleViewDetails = () => {
    // No longer needed, navigation handled by Link
  };

  const getStatusColor = (status) => {
    if (status === MOTOR_STATES.RUNNING_STAR || status === MOTOR_STATES.RUNNING_DELTA) return 'text-green-600';
    if (status === MOTOR_STATES.IDLE)  return 'text-red-600';
    if (status === MOTOR_STATES.FAULT) return 'text-orange-600';
    return '';
  };

  const getStatusText = (status) => {
    if (status === null || status === undefined) return '';
    switch (status) {
      case MOTOR_STATES.IDLE:          return 'idle';
      case MOTOR_STATES.RUNNING_STAR:  return 'run — star';
      case MOTOR_STATES.RUNNING_DELTA: return 'run — delta';
      case MOTOR_STATES.FAULT:         return 'fault';
      default: return String(status);
    }
  };

  // Hide 'unknown' and undefined; show all other v2.1 states
  const shouldShowStatus = (status) => {
    if (status === null || status === undefined) return false;
    const s = String(status).trim();
    if (!s) return false;
    return !/^unknown$/i.test(s);
  };

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isVisible) return null;

  const containerClass = size === 'large' ? 'p-6' : size === 'small' ? 'p-3' : 'p-4';
  const titleClass = size === 'large' ? 'text-xl' : size === 'small' ? 'text-base' : 'text-lg';

  return (
  <View className={`bg-white rounded-xl shadow-sm border-2 border-green-200 ${containerClass}`}>
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
          <View className="flex-row items-start flex-1 gap-2">
            <View className="flex-1">
              <Text className={`font-bold text-gray-800 ${titleClass}`}>
                Motor Control
              </Text>
              {showStatus && (
                // Show exact raw MQTT state string prefixed with 'status:' but hide certain default/transitional states
                shouldShowStatus(motorState.status) ? (
                  <Text className={`text-xs mt-0.5 ${getStatusColor(motorState.status)}`}>
                    {`status: ${getStatusText(motorState.status)}`}
                  </Text>
                ) : (
                  <Text className="text-xs text-gray-500 mt-0.5"> </Text>
                )
              )}
              {/* STATUS line: always visible */}
              <Text className="text-xs text-gray-800 font-medium mt-0.5">
                {shouldShowStatus(motorState.status) ? `STATUS: ${String(motorState.status)}` : 'STATUS:'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#9ca3af" style={{ marginTop: 2 }} />
          </View>

        {/* Connection Status */}
        <View className="flex-row items-center ml-2">
          <View className={`w-2 h-2 rounded-full mr-1.5 ${
            isConnecting ? 'bg-yellow-500' : 
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <Text className="text-xs text-gray-500">
            {isConnecting ? 'Connecting' : isConnected ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Motor Control Switch */}
      <View className="flex-row items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg mb-2">
        <View className="flex-row items-center">
          <Text className="text-sm font-semibold text-gray-800">
            Motor Power
          </Text>
          <Text className="text-xs text-gray-500">
            {/* {motorState.isOn ? 'Running' : 'Stopped'} */}
          </Text>
        </View>
        
        <View className="flex-row items-center">
          <Switch
            value={
              userOverrideIsOn !== null ? userOverrideIsOn : (commandPending && requestedIsOn !== null ? requestedIsOn : motorState.isOn)
            }
            onValueChange={handleMotorToggle}
            trackColor={{ false: '#f3f4f6', true: '#3b82f6' }}
            thumbColor={motorState.isOn ? '#ffffff' : '#ffffff'}
            disabled={!isConnected}
          />
          {commandPending && (
            <View className="ml-2">
              <LoadingSpinner size="small" color="#3b82f6" />
            </View>
          )}
        </View>
      </View>

      {/* Status Information */}
      {showStatus && (
        <View className="pt-2 border-t border-gray-100">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs text-gray-500">Last Updated</Text>
            <Text className="text-xs text-gray-700 font-medium">
              {formatLastUpdated(motorState.lastUpdated)}
            </Text>
          </View>
          
          {/* Telemetry Toggle Button */}
          <TouchableOpacity
            onPress={() => setShowTelemetry(!showTelemetry)}
            className="py-2 px-3 bg-blue-50 rounded-lg flex-row items-center justify-between"
          >
            <Text className="text-xs text-blue-700 font-semibold">
              {showTelemetry ? 'Hide' : 'Show'} Telemetry Data
            </Text>
            <Ionicons 
              name={showTelemetry ? 'chevron-up' : 'chevron-down'} 
              size={14} 
              color="#1d4ed8" 
            />
          </TouchableOpacity>

          {/* Collapsible Telemetry Section — v2.1 structured data */}
          {showTelemetry && (
            <View className="mt-2 pt-2 border-t border-gray-100">
              {/* Electrical */}
              {telemetry.el && (
                <>
                  <Text className="text-xs font-semibold text-gray-500 uppercase mb-1">⚡ Electrical</Text>
                  {telemetry.el.v && (
                    <View className="flex-row items-center mb-1">
                      <Text className="text-xs text-gray-500 w-24">Voltage R/Y/B</Text>
                      <Text className="text-xs text-gray-700 font-semibold">
                        {telemetry.el.v.map(v => `${v}V`).join('  ')}
                      </Text>
                    </View>
                  )}
                  {telemetry.el.i && (
                    <View className="flex-row items-center mb-1">
                      <Text className="text-xs text-gray-500 w-24">Current R/Y/B</Text>
                      <Text className="text-xs text-gray-700 font-semibold">
                        {telemetry.el.i.map(i => `${i}A`).join('  ')}
                      </Text>
                    </View>
                  )}
                  {telemetry.el.f !== null && (
                    <View className="flex-row items-center mb-1">
                      <Text className="text-xs text-gray-500 w-24">Frequency</Text>
                      <Text className="text-xs text-gray-700 font-semibold">{telemetry.el.f} Hz</Text>
                    </View>
                  )}
                  {telemetry.el.pf !== null && (
                    <View className="flex-row items-center mb-1">
                      <Text className="text-xs text-gray-500 w-24">Power Factor</Text>
                      <Text className="text-xs text-gray-700 font-semibold">{telemetry.el.pf}</Text>
                    </View>
                  )}
                  {telemetry.el.tp !== null && (
                    <View className="flex-row items-center mb-1.5">
                      <Text className="text-xs text-gray-500 w-24">Total Power</Text>
                      <Text className="text-xs text-gray-700 font-semibold">{telemetry.el.tp} W</Text>
                    </View>
                  )}
                </>
              )}
              {/* Hydraulic */}
              {telemetry.hy && (
                <>
                  <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 mt-1">💧 Hydraulic</Text>
                  {telemetry.hy.p !== null && (
                    <View className="flex-row items-center mb-1">
                      <Text className="text-xs text-gray-500 w-24">Pressure</Text>
                      <Text className="text-xs text-gray-700 font-semibold">{telemetry.hy.p} Bar</Text>
                    </View>
                  )}
                  {telemetry.hy.fl_m !== null && (
                    <View className="flex-row items-center mb-1">
                      <Text className="text-xs text-gray-500 w-24">Flow Rate</Text>
                      <Text className="text-xs text-gray-700 font-semibold">{telemetry.hy.fl_m} m³/h</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {!isConnected && (
            <TouchableOpacity
              onPress={initializeMQTT}
              className="mt-2 py-2 px-4 bg-yellow-100 rounded-lg"
            >
              <Text className="text-center text-yellow-800 font-medium text-xs">
                Tap to Reconnect
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
