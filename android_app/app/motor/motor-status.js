import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import MQTTService from '../../components/services/mqttService';
import {
  MESSAGE_TYPES,
  MOTOR_COMMANDS,
  MOTOR_STATES,
  MQTT_CONFIG,
} from '../../config/mqttConfig';

const MANUAL_PAGES = ['STATUS', 'NETWORK', 'ENERGY', 'SYS INFO', 'RUNTIME', 'PHASE', 'SETTINGS'];

const LED_LABELS = [
  'LINE1',
  'LINE2',
  'LINE3',
  'MOTOR ON',
  'MOTOR TRIP',
  'SMART MODE',
  'MANUAL MODE',
  'NET1',
  'NET2',
  'NET3',
];

const LED_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#3b82f6',
  '#22c55e',
  '#ef4444',
  '#16a34a',
  '#2563eb',
  '#22c55e',
  '#a855f7',
  '#0ea5e9',
];

const fmtV = (v) => (v == null ? 'V:--' : `V:${Math.round(v)}V`);
const fmtI = (i) => (i == null ? 'I:--' : `I:${Number(i).toFixed(1)}A`);
const fmtF = (f) => (f == null ? 'F:--' : `F:${Math.round(f)}Hz`);
const fmtMMSS = (sec) => {
  if (sec == null) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
const fmtHHMM = (sec) => {
  if (sec == null) return '--:--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getConnectionState = (lastPacketTs) => {
  if (!lastPacketTs) return 'offline';
  const age = Date.now() - lastPacketTs;
  if (age < 20000) return 'normal';
  if (age < 120000) return 'warning';
  if (age < 600000) return 'offline';
  return 'full-offline';
};

export default function MotorStatusScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [telemetry, setTelemetry] = useState(null);
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [display, setDisplay] = useState(null);
  const [ota, setOta] = useState(null);
  const [yieldTest, setYieldTest] = useState(null);

  const [manualPage, setManualPage] = useState(0);
  const [isCommandPending, setIsCommandPending] = useState(false);

  const lastPacketRef = useRef(null);
  const [connectionState, setConnectionState] = useState('offline');

  const refreshConnectionState = useCallback(() => {
    const packetTs = MQTTService.getLastPacketTimestamp();
    lastPacketRef.current = packetTs;
    setIsConnected(MQTTService.getConnectionStatus());
    setConnectionState(getConnectionState(packetTs));
  }, []);

  const handleMqttEvent = useCallback((event) => {
    refreshConnectionState();

    switch (event.type) {
      case MESSAGE_TYPES.TELEMETRY:
        setTelemetry(event.telemetry || null);
        break;
      case MESSAGE_TYPES.MOTOR_STATUS:
        setStatus(event.status || null);
        break;
      case MESSAGE_TYPES.HEALTH:
        setHealth(event.health || null);
        break;
      case MESSAGE_TYPES.ERROR:
        setError(event.error || null);
        break;
      case MESSAGE_TYPES.RESPONSE:
        setResponse(event.response || null);
        setIsCommandPending(false);
        if (event.response?.result === 'rejected') {
          Alert.alert('Command Rejected', event.response?.reason_code || 'Unknown rejection');
        }
        break;
      case MESSAGE_TYPES.DISPLAY:
        setDisplay(event.display || null);
        break;
      case MESSAGE_TYPES.OTA:
        setOta(event.ota || null);
        break;
      case MESSAGE_TYPES.YIELDTEST:
        setYieldTest(event.yieldtest || null);
        break;
      default:
        break;
    }
  }, [refreshConnectionState]);

  const init = useCallback(async () => {
    try {
      setIsLoading(true);
      await MQTTService.initialize();
      refreshConnectionState();
    } catch (e) {
      Alert.alert('Error', 'Failed to initialize motor controller stream');
    } finally {
      setIsLoading(false);
    }
  }, [refreshConnectionState]);

  useEffect(() => {
    init();
    MQTTService.addListener(handleMqttEvent);
    const iv = setInterval(refreshConnectionState, 2000);
    return () => {
      MQTTService.removeListener(handleMqttEvent);
      clearInterval(iv);
    };
  }, [handleMqttEvent, init, refreshConnectionState]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await init();
    setIsRefreshing(false);
  };

  const isFault = Boolean(error);
  const activeTest = status?.active_test || null;
  const isYieldTestActive = activeTest === 'yield_test';

  const otaMode = useMemo(() => {
    const otaState = String(ota?.state || ota?.status || '').toLowerCase();
    if (otaState.includes('start') || otaState.includes('progress') || otaState.includes('running')) return 'active';
    return 'idle';
  }, [ota]);

  const isOtaActive = otaMode === 'active';

  const controlsDisabled = !isConnected || isOtaActive || connectionState === 'full-offline';

  const motorStateCode = status?.motor?.st || telemetry?.m?.st || MOTOR_STATES.UNKNOWN;
  const motorRunning = motorStateCode === MOTOR_STATES.RUNNING_STAR || motorStateCode === MOTOR_STATES.RUNNING_DELTA;

  const ledState = useMemo(() => {
    const leds = Array.isArray(display?.leds) && display.leds.length === 10
      ? display.leds.map((value) => Boolean(value))
      : Array(10).fill(false);
    return leds;
  }, [display]);

  const lcd = useMemo(() => {
    if (display?.lcd) {
      return {
        row0: String(display.lcd.row0 || ''),
        row1: String(display.lcd.row1 || ''),
        source: 'display',
      };
    }

    if (isFault) {
      return {
        row0: 'SYSTEM FAULT!',
        row1: String(error?.desc || error?.code || 'Unknown fault'),
        source: 'error',
      };
    }

    if (isOtaActive) {
      return {
        row0: 'FW UPGRADE',
        row1: String(ota?.step || ota?.progress || 'In progress'),
        source: 'ota',
      };
    }

    if (!telemetry) {
      return {
        row0: 'WAITING FOR DATA',
        row1: connectionState === 'full-offline' ? 'DEVICE OFFLINE' : '... ',
        source: 'none',
      };
    }

    if (motorRunning) {
      return {
        row0: motorStateCode === MOTOR_STATES.RUNNING_DELTA ? 'Motor On (Delta)' : 'Motor On',
        row1: `Runtime ${fmtMMSS(telemetry?.m?.srt)}`,
        source: 'telemetry',
      };
    }

    return {
      row0: `${fmtV(telemetry?.el?.v?.[0])} ${fmtF(telemetry?.el?.f)}`,
      row1: `Mode ${(status?.mode || 'auto').toUpperCase()}`,
      source: 'telemetry',
    };
  }, [display, isFault, error, isOtaActive, ota, telemetry, motorRunning, motorStateCode, connectionState, status]);

  const sendCmd = async (cmd, params = {}) => {
    if (controlsDisabled) {
      Alert.alert('Unavailable', 'Command is disabled due to connectivity/OTA state.');
      return;
    }

    try {
      setIsCommandPending(true);
      await MQTTService.sendCommand(cmd, params);
    } catch (e) {
      setIsCommandPending(false);
      Alert.alert('Error', 'Failed to publish command');
    }
  };

  const handleStart = () => sendCmd(MOTOR_COMMANDS.PUMP_START);
  const handleStop = () => sendCmd(MOTOR_COMMANDS.PUMP_STOP);
  const handleModeToggle = () => {
    const mode = String(status?.mode || 'auto').toLowerCase() === 'auto' ? 'manual' : 'auto';
    sendCmd(MOTOR_COMMANDS.MODE_CHANGE, { mode });
  };
  const handleFaultReset = () => sendCmd(MOTOR_COMMANDS.CMD_FAULT_RESET);
  const handleAbortYieldTest = () => sendCmd(MOTOR_COMMANDS.YIELD_TEST_STOP);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 12, color: '#1f2937' }}>Connecting to SMARTHIKA...</Text>
      </View>
    );
  }

  const connectionLabel = connectionState === 'normal'
    ? 'Connected'
    : connectionState === 'warning'
      ? 'Weak/Delayed'
      : connectionState === 'offline'
        ? 'Offline'
        : 'Full Offline';

  const connectionColor = connectionState === 'normal'
    ? '#16a34a'
    : connectionState === 'warning'
      ? '#d97706'
      : '#dc2626';

  return (
    <View style={{ flex: 1, backgroundColor: '#f0fdf4', marginTop: 20 }}>
      <StatusBar style="dark" />

      <View style={{ backgroundColor: '#ffffff', paddingTop: 46, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>Motor Controller</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={22} color="#1f2937" />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
          <Text style={{ color: '#4b5563', fontSize: 12 }}>Gateway: {MQTT_CONFIG.topics.gatewayId}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: connectionColor, marginRight: 6 }} />
          <Text style={{ color: connectionColor, fontSize: 12, fontWeight: '600' }}>{connectionLabel}</Text>
        </View>
      </View>

      {isFault && (
        <View style={{ backgroundColor: '#fee2e2', borderBottomWidth: 1, borderBottomColor: '#ef4444', padding: 10 }}>
          <Text style={{ color: '#991b1b', fontWeight: '700' }}>
            Fault: {error?.code || error?.e_code || 'UNKNOWN'}
          </Text>
          <Text style={{ color: '#7f1d1d', marginTop: 2 }}>{error?.desc || 'Fault reported by device'}</Text>
        </View>
      )}

      {isOtaActive && (
        <View style={{ backgroundColor: '#e0f2fe', borderBottomWidth: 1, borderBottomColor: '#0ea5e9', padding: 10 }}>
          <Text style={{ color: '#075985', fontWeight: '700' }}>OTA in progress - controls disabled</Text>
          <Text style={{ color: '#0c4a6e', marginTop: 2 }}>
            {String(ota?.step || ota?.status || ota?.progress || 'Updating firmware')}
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <View style={{ backgroundColor: '#14532d', borderRadius: 12, padding: 14 }}>
          <Text style={{ color: '#bbf7d0', fontFamily: 'monospace', fontSize: 18, fontWeight: '700' }}>{lcd.row0}</Text>
          <Text style={{ color: '#86efac', fontFamily: 'monospace', fontSize: 15, marginTop: 6 }}>{lcd.row1}</Text>
          <Text style={{ color: '#d1fae5', fontSize: 11, marginTop: 8 }}>source: {lcd.source}</Text>
        </View>

        <View style={{ marginTop: 12, backgroundColor: '#ffffff', borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: '700', color: '#1f2937', marginBottom: 8 }}>LED Panel (display topic authoritative)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {LED_LABELS.map((label, index) => (
              <View key={label} style={{ width: '33%', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: ledState[index] ? LED_COLORS[index] : '#d1d5db',
                      marginRight: 6,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: '#374151' }}>{label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 12, backgroundColor: '#ffffff', borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: '700', color: '#1f2937', marginBottom: 8 }}>Controls</Text>

          {isYieldTestActive ? (
            <TouchableOpacity
              disabled={controlsDisabled || isCommandPending}
              onPress={handleAbortYieldTest}
              style={{
                backgroundColor: controlsDisabled || isCommandPending ? '#9ca3af' : '#dc2626',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700' }}>Abort Yield Test</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                disabled={controlsDisabled || isCommandPending || isFault}
                onPress={handleStart}
                style={{
                  flex: 1,
                  backgroundColor: controlsDisabled || isCommandPending || isFault ? '#9ca3af' : '#16a34a',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>START</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={controlsDisabled || isCommandPending}
                onPress={handleStop}
                style={{
                  flex: 1,
                  backgroundColor: controlsDisabled || isCommandPending ? '#9ca3af' : '#dc2626',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>STOP</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              disabled={controlsDisabled || isCommandPending}
              onPress={handleModeToggle}
              style={{
                flex: 1,
                backgroundColor: controlsDisabled || isCommandPending ? '#9ca3af' : '#2563eb',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700' }}>MODE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={controlsDisabled || isCommandPending}
              onPress={handleFaultReset}
              style={{
                flex: 1,
                backgroundColor: controlsDisabled || isCommandPending ? '#9ca3af' : '#4b5563',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700' }}>SET (Fault Reset)</Text>
            </TouchableOpacity>
          </View>

          {isCommandPending && (
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={{ marginLeft: 8, color: '#1f2937' }}>Waiting for response...</Text>
            </View>
          )}

          {response && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: '#374151' }}>
                Last response: {String(response?.result || 'unknown').toUpperCase()}
                {response?.reason_code ? ` (${response.reason_code})` : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 12, backgroundColor: '#ffffff', borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: '700', color: '#1f2937', marginBottom: 8 }}>Manual Mode Pages</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {MANUAL_PAGES.map((page, index) => (
              <TouchableOpacity
                key={page}
                onPress={() => setManualPage(index)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: manualPage === index ? '#15803d' : '#e5e7eb',
                }}
              >
                <Text style={{ color: manualPage === index ? '#ffffff' : '#374151', fontSize: 11, fontWeight: '700' }}>
                  {page}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 }}>
            {manualPage === 0 && (
              <>
                <Text style={{ color: '#1f2937' }}>State: {String(motorStateCode).toUpperCase()}</Text>
                <Text style={{ color: '#1f2937' }}>Mode: {String(status?.mode || '--').toUpperCase()}</Text>
              </>
            )}
            {manualPage === 1 && (
              <>
                <Text style={{ color: '#1f2937' }}>Connected: {String(telemetry?.net?.connected ?? health?.net?.connected ?? '--')}</Text>
                <Text style={{ color: '#1f2937' }}>RSSI: {String(telemetry?.sys?.net_s ?? health?.sys?.net_s ?? '--')}</Text>
              </>
            )}
            {manualPage === 2 && (
              <>
                <Text style={{ color: '#1f2937' }}>{fmtV(telemetry?.el?.v?.[0])}</Text>
                <Text style={{ color: '#1f2937' }}>{fmtI(telemetry?.el?.i?.[0])}</Text>
              </>
            )}
            {manualPage === 3 && (
              <>
                <Text style={{ color: '#1f2937' }}>Uptime: {fmtHHMM(telemetry?.sys?.upt ?? health?.sys?.upt)}</Text>
                <Text style={{ color: '#1f2937' }}>Battery: {String(telemetry?.sys?.bp ?? health?.sys?.bp ?? '--')}%</Text>
              </>
            )}
            {manualPage === 4 && (
              <>
                <Text style={{ color: '#1f2937' }}>Total Runtime: {fmtHHMM(telemetry?.m?.rt)}</Text>
                <Text style={{ color: '#1f2937' }}>Session Runtime: {fmtMMSS(telemetry?.m?.srt)}</Text>
              </>
            )}
            {manualPage === 5 && (
              <>
                <Text style={{ color: '#1f2937' }}>R: {fmtV(telemetry?.el?.v?.[0])}</Text>
                <Text style={{ color: '#1f2937' }}>Y: {fmtV(telemetry?.el?.v?.[1])}</Text>
                <Text style={{ color: '#1f2937' }}>B: {fmtV(telemetry?.el?.v?.[2])}</Text>
              </>
            )}
            {manualPage === 6 && (
              <>
                <Text style={{ color: '#1f2937' }}>Operation: {String(telemetry?.m?.op || '--')}</Text>
                <Text style={{ color: '#1f2937' }}>Dry Run Count: {String(telemetry?.m?.dry ?? '--')}</Text>
              </>
            )}
          </View>
        </View>

        {isYieldTestActive && (
          <View style={{ marginTop: 12, backgroundColor: '#fff7ed', borderRadius: 12, padding: 12 }}>
            <Text style={{ fontWeight: '700', color: '#9a3412', marginBottom: 6 }}>Yield Test</Text>
            <Text style={{ color: '#7c2d12' }}>Status: {String(yieldTest?.status || 'running')}</Text>
            <Text style={{ color: '#7c2d12' }}>Step: {String(yieldTest?.step || status?.step || '--')}</Text>
            <Text style={{ color: '#7c2d12' }}>Progress: {String(yieldTest?.progress ?? '--')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
