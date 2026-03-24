/**
 * MotorStatusScreen
 *
 * Mobile mirror of the SMARTHIKA GRC 16x2 LCD UI flow (Payload Ref v2.1).
 *
 * LCD Slot mapping
 * -------------------------------------------------------------------------
 * IDLE (rotate every 4 s)
 *   A  SMARTHIKA AGRO / System OK
 *   B  GSM: Connected / PRI:ONLINE SEC:--
 *   C  Uptime: HH:MM  / Mode: AUTO
 *   D  V:231V F:50Hz  / SYSTEM STANDBY
 *
 * RUNNING (rotate every 3 s)
 *   A  Motor On       / Runtime MM:SS
 *   B  V:230 I:4.2A   / PHASE MONITORING
 *   C  RUNNING TIME:  / HH:MM:SS
 *
 * FAULT -- immediate override: SYSTEM FAULT! / <desc>
 *
 * Manual pages (tabs): STATUS . NETWORK . ENERGY . SYS INFO .
 *                       RUNTIME . PHASE . SETTINGS
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, RefreshControl, ActivityIndicator, Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../components/context/AuthContext';
import MQTTService from '../../components/services/mqttService';
import { MESSAGE_TYPES, MOTOR_STATES, MOTOR_COMMANDS, MQTT_CONFIG } from '../../config/mqttConfig';

// ── Format helpers (per UI Parameter Reference v1.0 §10) ─────────────────────
const fmtV  = (v) => (v == null ? 'V:--'  : `V:${Math.round(v)}V`);
const fmtI  = (i) => (i == null ? 'I:--'  : `I:${Number(i).toFixed(1)}A`);
const fmtF  = (f) => (f == null ? 'F:--'  : `F:${Math.round(f)}Hz`);
const avgV  = (arr) => arr && arr.length === 3 ? (arr[0] + arr[1] + arr[2]) / 3 : (arr?.[0] ?? null);
const lineV = (vP)  => vP == null ? '--' : `LINE V: ${Math.round(vP * Math.sqrt(3))}V`;

const fmtMMSS = (sec) => {
  if (sec == null) return '--:--';
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};
const fmtHHMMSS = (sec) => {
  if (sec == null) return '--:--:--';
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};
const fmtHHMM = (sec) => {
  if (sec == null) return '--:--';
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};
const motorModeLabel = (op) => {
  if (!op) return '--';
  if (/star.?delta/i.test(op)) return 'Star-Delta';
  if (/single/i.test(op)) return 'Single Co..';
  return op;
};

// ── LCD Card – mimics 16×2 green display ─────────────────────────────────────
function LcdCard({ row0, row1, accent = 'green', dot }) {
  const bg = accent === 'red' ? '#7f1d1d' : accent === 'yellow' ? '#713f12' : '#14532d';
  return (
    <View style={{
      backgroundColor: bg, borderRadius: 12,
      paddingHorizontal: 18, paddingVertical: 14, marginHorizontal: 2,
      shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    }}>
      <Text style={{ fontFamily: 'monospace', fontSize: 17, letterSpacing: 1.5, color: '#bbf7d0', fontWeight: '700', marginBottom: 6 }}>
        {row0}
      </Text>
      <Text style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 1.2, color: '#86efac', fontWeight: '500' }}>
        {row1}
      </Text>
      {dot != null && (
        <View style={{ flexDirection: 'row', marginTop: 10, gap: 5 }}>
          {Array.from({ length: dot.total }).map((_,i) => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 3,
              backgroundColor: i === dot.active ? '#bbf7d0' : '#166534' }} />
          ))}
        </View>
      )}
    </View>
  );
}

function Row({ label, value, valueColor }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ color: '#6b7280', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: valueColor || '#1f2937', fontWeight: '600', fontSize: 13 }}>{value ?? '--'}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 12,
      borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginBottom: 12,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af',
        textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.8 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const PAGES = ['STATUS','NETWORK','ENERGY','SYS INFO','RUNTIME','PHASE','SETTINGS'];

// ─────────────────────────────────────────────────────────────────────────────
export default function MotorStatusScreen() {
  const { user } = useAuth();

  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnected,  setIsConnected]  = useState(false);
  const [motorState,   setMotorState]   = useState({
    isOn: false, status: null, mode: null, trigger: null, lastUpdated: null,
  });
  const [telemetry,    setTelemetry]    = useState(null);   // { el, hy, m }
  const [healthData,   setHealthData]   = useState(null);   // { net, sys, conf }
  const [faultData,    setFaultData]    = useState(null);   // { code, sev, desc, snap }
  const [activePage,   setActivePage]   = useState(0);
  const [slotIndex,    setSlotIndex]    = useState(0);
  const [cmdPending,   setCmdPending]   = useState(false);
  const [requestedOn,  setRequestedOn]  = useState(null);
  const requestedOnRef = useRef(null);

  // Slot rotation
  const isRunning = motorState.isOn
    || motorState.status === MOTOR_STATES.RUNNING_STAR
    || motorState.status === MOTOR_STATES.RUNNING_DELTA;
  const slotCount = isRunning ? 3 : 4;
  const slotMs    = isRunning ? 3000 : 4000;

  useEffect(() => {
    if (activePage !== 0 || faultData) return;
    setSlotIndex(0);
    const t = setInterval(() => setSlotIndex(i => (i + 1) % slotCount), slotMs);
    return () => clearInterval(t);
  }, [isRunning, activePage, faultData, slotCount, slotMs]);

  // ── MQTT handler ──────────────────────────────────────────────────────────
  const handleMQTT = useCallback((event) => {
    switch (event.type) {
      case MESSAGE_TYPES.MOTOR_STATUS: {
        const mSt = event.status?.motor?.st;
        if (mSt !== undefined) {
          const isOn = mSt === MOTOR_STATES.RUNNING_STAR || mSt === MOTOR_STATES.RUNNING_DELTA;
          setMotorState(prev => ({
            ...prev, isOn, status: mSt,
            mode: event.status?.mode,
            trigger: event.status?.trigger,
            lastUpdated: new Date().toISOString(),
          }));
        }
        if (event.status?.motor?.st !== MOTOR_STATES.FAULT) setFaultData(null);
        setCmdPending(false);
        setRequestedOn(null);
        requestedOnRef.current = null;
        break;
      }
      case MESSAGE_TYPES.TELEMETRY:
        setTelemetry(event.telemetry || null);
        if (event.telemetry?.m?.st) {
          const mSt = event.telemetry.m.st;
          setMotorState(prev => ({
            ...prev,
            isOn: mSt === MOTOR_STATES.RUNNING_STAR || mSt === MOTOR_STATES.RUNNING_DELTA,
            status: mSt,
          }));
        }
        break;
      case MESSAGE_TYPES.HEALTH:
        setHealthData(event.health || null);
        break;
      case MESSAGE_TYPES.ERROR:
        setFaultData(event.error || null);
        break;
      case MESSAGE_TYPES.MOTOR_COMMAND:
        if (event.success === false) {
          setCmdPending(false);
          setRequestedOn(null);
          requestedOnRef.current = null;
          Alert.alert('Command Error', 'Failed to send command to gateway');
        }
        break;
      default: break;
    }
  }, []);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    init();
    MQTTService.addListener(handleMQTT);
    const iv = setInterval(() => setIsConnected(MQTTService.getConnectionStatus()), 2000);
    return () => {
      MQTTService.removeListener(handleMQTT);
      clearInterval(iv);
    };
  }, [handleMQTT]);

  const init = async () => {
    try {
      setIsLoading(true);
      await MQTTService.initialize();
      await MQTTService.loadMotorState();
      const s = MQTTService.getMotorState();
      if (s) setMotorState(prev => ({ ...prev, ...s }));
      setIsConnected(MQTTService.getConnectionStatus());
    } catch (e) {
      Alert.alert('Error', 'Failed to connect to motor control system');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await init();
    setIsRefreshing(false);
  };

  // ── Power toggle ───────────────────────────────────────────────────────────
  const handleToggle = async (value) => {
    if (!isConnected) {
      Alert.alert('Offline', 'Not connected to gateway', [
        { text: 'Retry', onPress: init },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    setCmdPending(true);
    setRequestedOn(value);
    requestedOnRef.current = value;
    try {
      if (value) await MQTTService.turnMotorOn();
      else       await MQTTService.turnMotorOff();
    } catch (e) {
      Alert.alert('Error', 'Failed to send command');
      setCmdPending(false);
      setRequestedOn(null);
      requestedOnRef.current = null;
    }
  };

  // ── LCD slot data ─────────────────────────────────────────────────────────
  const el   = telemetry?.el;
  const m    = telemetry?.m;
  const hy   = telemetry?.hy;
  const net  = healthData?.net;
  const sys  = healthData?.sys;
  const conf = healthData?.conf;
  const vAvg    = el?.v ? avgV(el.v) : null;
  const vPhaseR = el?.v?.[0] ?? null;
  const iPhaseR = el?.i?.[0] ?? null;

  const idleSlots = [
    { row0: 'SMARTHIKA AGRO',  row1: 'System OK' },
    {
      row0: net?.connected ? 'GSM: Connected'    : 'GSM: Searching..',
      row1: net?.connected ? 'PRI:ONLINE  SEC:--' : 'PRI:--  SEC:--',
    },
    { row0: `Uptime: ${fmtHHMM(sys?.upt)}`,  row1: `Mode: ${(conf?.mode || motorState.mode || 'AUTO').toUpperCase()}` },
    { row0: `${fmtV(vAvg)} ${fmtF(el?.f)}`, row1: 'SYSTEM STANDBY' },
  ];
  const runSlots = [
    {
      row0: motorState.status === MOTOR_STATES.RUNNING_DELTA ? 'Motor On (Delta)' : 'Motor On',
      row1: `Runtime ${fmtMMSS(m?.srt)}`,
    },
    { row0: `${fmtV(vPhaseR)} ${fmtI(iPhaseR)}`, row1: 'PHASE MONITORING' },
    { row0: 'RUNNING TIME:',                       row1: fmtHHMMSS(m?.srt) },
  ];

  const lcdSlot = isRunning ? runSlots[slotIndex % 3] : idleSlots[slotIndex % 4];
  const lcdDisplay = faultData
    ? { row0: 'SYSTEM FAULT!', row1: faultData.desc || faultData.code || 'Unknown fault', accent: 'red' }
    : { ...lcdSlot, accent: 'green' };

  // ── Motor state label ─────────────────────────────────────────────────────
  const stateLabel = () => {
    switch (motorState.status) {
      case MOTOR_STATES.IDLE:          return { text: 'Stopped',         color: '#ef4444' };
      case MOTOR_STATES.RUNNING_STAR:  return { text: 'Running (Star)',   color: '#10b981' };
      case MOTOR_STATES.RUNNING_DELTA: return { text: 'Running (Delta)',  color: '#10b981' };
      case MOTOR_STATES.FAULT:         return { text: 'FAULT',            color: '#f97316' };
      default: return {
        text: motorState.status ? motorState.status.toUpperCase() : 'Unknown',
        color: '#9ca3af',
      };
    }
  };
  const { text: stLabel, color: stColor } = stateLabel();

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex:1, backgroundColor:'#f0fdf4', justifyContent:'center', alignItems:'center' }}>
        <StatusBar style="dark" />
        <View style={{ width:80, height:80, backgroundColor:'#3b82f6', borderRadius:40,
          justifyContent:'center', alignItems:'center', marginBottom:20 }}>
          <Ionicons name="water" size={32} color="#fff" />
        </View>
        <Text style={{ fontSize:18, fontWeight:'600', color:'#1f2937', marginBottom:16 }}>
          Connecting to Gateway...
        </Text>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#f0fdf4', marginTop: 20 }}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={{
        backgroundColor: '#fff', paddingTop: 48, paddingBottom: 12, paddingHorizontal: 20,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 3,
      }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => router.back()}
            style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>Motor Control</Text>
          <TouchableOpacity onPress={onRefresh} disabled={isRefreshing}
            style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' }}>
            <Ionicons name="refresh" size={20} color={isRefreshing ? '#9ca3af' : '#374151'} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 6,
            backgroundColor: isConnected ? '#10b981' : '#ef4444' }} />
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            {isConnected ? `Connected · ${MQTT_CONFIG.topics.gatewayId}` : 'Disconnected'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>

        {/* ── LCD Display Card ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 }}>
          <LcdCard
            row0={lcdDisplay.row0}
            row1={lcdDisplay.row1}
            accent={lcdDisplay.accent}
            dot={!faultData ? { total: slotCount, active: slotIndex } : null}
          />

          {/* Fault controls */}
          {faultData && (
            <TouchableOpacity
              onPress={() => setFaultData(null)}
              style={{ marginTop: 8, backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Acknowledge Fault</Text>
            </TouchableOpacity>
          )}
          {faultData?.snap && (
            <View style={{ marginTop: 8, backgroundColor: '#fef2f2', borderRadius: 8, padding: 10,
              borderWidth: 1, borderColor: '#fca5a5' }}>
              <Text style={{ fontSize: 11, color: '#991b1b', fontWeight: '700', marginBottom: 4 }}>Snapshot at Fault</Text>
              <Text style={{ fontSize: 11, color: '#7f1d1d', fontFamily: 'monospace' }}>
                V: {faultData.snap.v?.map(v => `${Math.round(v)}V`).join('  ')}
              </Text>
              <Text style={{ fontSize: 11, color: '#7f1d1d', fontFamily: 'monospace' }}>
                I: {faultData.snap.i?.map(i => `${i}A`).join('  ')}   F: {faultData.snap.f}Hz
              </Text>
            </View>
          )}
        </View>

        {/* ── Power Toggle ── */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: 12,
            borderWidth: 1.5, borderColor: isRunning ? '#6ee7b7' : '#fca5a5',
            padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
          }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2937' }}>Motor Power</Text>
              <Text style={{ fontSize: 13, color: stColor, fontWeight: '600', marginTop: 2 }}>{stLabel}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {cmdPending && <ActivityIndicator size="small" color="#3b82f6" />}
              <Switch
                value={requestedOn !== null ? requestedOn : motorState.isOn}
                onValueChange={handleToggle}
                trackColor={{ false: '#f3f4f6', true: '#3b82f6' }}
                thumbColor="#ffffff"
                disabled={!isConnected || cmdPending}
              />
            </View>
          </View>
        </View>

        {/* ── Page tabs ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {PAGES.map((p, i) => (
            <TouchableOpacity key={p} onPress={() => setActivePage(i)} style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: activePage === i ? '#15803d' : '#e5e7eb',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700',
                color: activePage === i ? '#fff' : '#374151' }}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Page content ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>

          {/* STATUS */}
          {activePage === 0 && (
            <>
              <Section title="Motor State">
                <Row label="State"       value={stLabel} valueColor={stColor} />
                <Row label="Mode"        value={(motorState.mode || conf?.mode || '--')?.toUpperCase()} />
                <Row label="Device"      value={MQTT_CONFIG.topics.gatewayId} />
                <Row label="Last Update" value={motorState.lastUpdated
                  ? new Date(motorState.lastUpdated).toLocaleTimeString() : '--'} />
              </Section>
              {el && (
                <Section title="⚡ Electrical">
                  <Row label="Voltage R / Y / B" value={el.v?.map(v => `${Math.round(v)}V`).join('  ')} />
                  <Row label="Current R / Y / B" value={el.i?.map(i => `${Number(i).toFixed(1)}A`).join('  ')} />
                  <Row label="Frequency"         value={el.f  != null ? `${Math.round(el.f)} Hz` : '--'} />
                  <Row label="Power Factor"       value={el.pf ?? '--'} />
                  <Row label="Total Power"        value={el.tp != null ? `${el.tp} W` : '--'} />
                  <Row label="Imbalance"          value={el.imb != null ? `${el.imb}%` : '--'}
                    valueColor={el.imb > 5 ? '#f97316' : undefined} />
                  <Row label="Phase Sequence"     value={el.seq ?? '--'} />
                </Section>
              )}
              {hy && (
                <Section title="💧 Hydraulic">
                  <Row label="Pressure"    value={hy.p    != null ? `${hy.p} Bar`    : '--'} />
                  <Row label="Flow Rate"   value={hy.fl_m != null ? `${hy.fl_m} m³/h` : '--'} />
                  <Row label="Total Vol."  value={hy.vol_t!= null ? `${hy.vol_t} L`   : '--'} />
                  <Row label="Static Head" value={hy.st_h != null ? `${hy.st_h} m`    : '--'} />
                </Section>
              )}
            </>
          )}

          {/* NETWORK */}
          {activePage === 1 && (
            <Section title="Network Status">
              <Row label="Link"      value={net?.t ?? 'GSM/GPRS'} />
              <Row label="Status"    value={net?.connected ? 'CONNECTED' : 'SEARCHING..'}
                valueColor={net?.connected ? '#10b981' : '#f97316'} />
              <Row label="RSSI"      value={net?.s  != null ? `${net.s} dBm` : '--'} />
              <Row label="IP"        value={net?.ip  ?? '--'} />
              <Row label="SIM ICCID" value={net?.sim ?? '--'} />
              <Row label="Primary"   value={net?.connected ? 'ONLINE' : '--'} />
              <Row label="Secondary" value="--" />
            </Section>
          )}

          {/* ENERGY */}
          {activePage === 2 && (
            isRunning ? (
              <>
                <Section title="Page A — Voltage & Current">
                  {[0,1,2].map(n => (
                    <React.Fragment key={n}>
                      <Row label={`Voltage ${['R','Y','B'][n]}`} value={fmtV(el?.v?.[n])} />
                      <Row label={`Current ${['R','Y','B'][n]}`} value={fmtI(el?.i?.[n])} />
                    </React.Fragment>
                  ))}
                  <Row label="" value="PHASE MONITORING" valueColor="#1d4ed8" />
                </Section>
                <Section title="Page B — Session Time">
                  <Row label="Running Time" value={fmtHHMMSS(m?.srt)} />
                </Section>
              </>
            ) : (
              <Section title="Standby">
                <Row label="Avg Voltage" value={fmtV(vAvg)} />
                <Row label="Frequency"   value={fmtF(el?.f)} />
                <Row label="" value="SYSTEM STANDBY" valueColor="#6b7280" />
              </Section>
            )
          )}

          {/* SYS INFO */}
          {activePage === 3 && (
            <Section title="System Info">
              <Row label="Uptime"    value={`Uptime: ${fmtHHMM(sys?.upt)}`} />
              <Row label="Mode"      value={`Mode: ${(conf?.mode || '--').toUpperCase()}`} />
              <Row label="Firmware"  value={sys?.fw ?? '--'} />
              <Row label="Mains AC"  value={sys?.ac == null ? '--' : sys.ac ? 'Present' : 'Absent'}
                valueColor={sys?.ac ? '#10b981' : '#ef4444'} />
              <Row label="Battery"   value={sys?.bv != null ? `${sys.bv} V` : '--'} />
              <Row label="Battery %" value={sys?.bp != null ? `${sys.bp}%`  : '--'} />
              <Row label="Pump HP"   value={conf?.hp != null ? `${conf.hp} HP` : '--'} />
            </Section>
          )}

          {/* RUNTIME */}
          {activePage === 4 && (
            <Section title="Motor Runtime">
              <Row label="Total Runtime"   value={`Total: ${fmtHHMM(m?.rt)}`} />
              <Row label="Session Runtime" value={`Session: ${fmtMMSS(m?.srt)}`} />
              <Row label="Operation Mode"  value={motorModeLabel(m?.op)} />
              <Row label="Motor State"     value={stLabel} valueColor={stColor} />
            </Section>
          )}

          {/* PHASE */}
          {activePage === 5 && (
            <>
              <Section title="Phase Details">
                <Row label="LINE V (calc)"   value={lineV(el?.v?.[0])} />
                <Row label="" value="3-PHASE MONITOR" valueColor="#1d4ed8" />
                <Row label="Phase R Voltage" value={fmtV(el?.v?.[0])} />
                <Row label="Phase Y Voltage" value={fmtV(el?.v?.[1])} />
                <Row label="Phase B Voltage" value={fmtV(el?.v?.[2])} />
                <Row label="Avg Voltage"     value={fmtV(avgV(el?.v))} />
              </Section>
              <Section title="Phase Currents">
                <Row label="Phase R"    value={fmtI(el?.i?.[0])} />
                <Row label="Phase Y"    value={fmtI(el?.i?.[1])} />
                <Row label="Phase B"    value={fmtI(el?.i?.[2])} />
                <Row label="Imbalance"  value={el?.imb != null ? `${el.imb}%` : '--'}
                  valueColor={el?.imb > 5 ? '#f97316' : undefined} />
                <Row label="Phase Seq." value={el?.seq ?? '--'} />
              </Section>
            </>
          )}

          {/* SETTINGS */}
          {activePage === 6 && (
            <>
              <Section title="Settings">
                <Row label="Motor Mode"  value={motorModeLabel(m?.op ?? conf?.mode)} />
                <Row label="Conf. Mode"  value={(conf?.mode || '--').toUpperCase()} />
                <Row label="Pump HP"     value={conf?.hp != null ? `${conf.hp} HP` : '--'} />
                <Row label="" value="Hold SET 3–4 s on device to toggle" valueColor="#6b7280" />
              </Section>
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  onPress={async () => {
                    if (!isConnected) { Alert.alert('Offline', 'Not connected'); return; }
                    await MQTTService.sendCommand(MOTOR_COMMANDS.MODE_CHANGE, { mode: 'auto' });
                    Alert.alert('Sent', 'MODE_CHANGE auto sent to gateway');
                  }}
                  style={{ backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Switch to AUTO mode</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (!isConnected) { Alert.alert('Offline', 'Not connected'); return; }
                    await MQTTService.sendCommand(MOTOR_COMMANDS.MODE_CHANGE, { mode: 'manual' });
                    Alert.alert('Sent', 'MODE_CHANGE manual sent to gateway');
                  }}
                  style={{ backgroundColor: '#1d4ed8', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Switch to MANUAL mode</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Reconnect button */}
          {!isConnected && (
            <TouchableOpacity onPress={init} style={{
              marginTop: 16, backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
            }}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Reconnect to Gateway</Text>
            </TouchableOpacity>
          )}

          {/* Footer info */}
          <View style={{ marginTop: 18, backgroundColor: '#eff6ff', borderRadius: 10, padding: 12 }}>
            <Text style={{ fontSize: 11, color: '#1e40af', textAlign: 'center', lineHeight: 17 }}>
              {'Commands → gw/' + MQTT_CONFIG.topics.gatewayId + '/cmd\nStatus/Telemetry ← pushed on-change · v2.1'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
