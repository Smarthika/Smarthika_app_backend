import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, Linking, Dimensions, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useAuth } from '../../components/context/AuthContext';
import { FarmerService } from '../../components/services/apiService';
import StorageService from '../../components/services/storageService';
import MQTTService from '../../components/services/mqttService';
import { MESSAGE_TYPES, MOTOR_COMMANDS, MOTOR_STATES, MQTT_CONFIG } from '../../config/mqttConfig';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import MotorControl from '../../components/ui/MotorControl';
import ProfileSidebar from '../../components/ui/ProfileSidebar';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const fmtV = (v) => (v == null ? 'V:--' : `V:${Math.round(v)}V`);
const fmtI = (i) => (i == null ? 'I:--' : `I:${Number(i).toFixed(1)}A`);
const fmtF = (f) => (f == null ? 'F:--' : `F:${Math.round(f)}Hz`);
const avgV = (arr) => arr && arr.length === 3 ? (arr[0] + arr[1] + arr[2]) / 3 : (arr?.[0] ?? null);
const lineV = (vP) => vP == null ? '--' : `${Math.round(vP * Math.sqrt(3))}V`;

const fmtMMSS = (sec) => {
  if (sec == null) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const fmtHHMMSS = (sec) => {
  if (sec == null) return '--:--:--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const fmtHHMM = (sec) => {
  if (sec == null) return '--:--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const starterModeLabel = (op) => {
  if (!op) return 'Star-Delta';
  if (/star.?delta/i.test(op)) return 'Star-Delta';
  if (/single/i.test(op)) return 'Single Co..';
  return op;
};

const LCD_PAGES = ['STATUS', 'NETWORK', 'ENERGY', 'SYSTEM INFO', 'MOTOR RUNTIME', 'PHASE DETAILS', 'SETTINGS'];

// Smarthika Controller Component
const SmarthikaController = ({
  onScrollClick,
  lcdScreen,
  indicators,
  onStartPress,
  onSetPress,
  onModePress,
  onStopPress,
  controls,
}) => {
  const lcdRow0 = lcdScreen?.row0 || 'GRC SMARTHIKA';
  const lcdRow1 = lcdScreen?.row1 || 'SMART AGRO V3.0';
  const lcdAccent = lcdScreen?.accent || '#93c23de8';
  const dot = lcdScreen?.dot;

  const indicatorColor = (active, activeColor) => (active ? activeColor : '#d1d5db');
  const phaseColor = (active, activeColor) => (active ? activeColor : '#d1d5db');

  return (
    <View className="" style={{ minHeight: SCREEN_HEIGHT - 290, paddingTop: 40, paddingBottom: 200, paddingHorizontal: 20 }}>
      
      {/* Header Section */}
      <View className="items-start mb-6">
        <View className="flex-row items-center">
          <FontAwesome name="sliders" size={20} color="#4b5563" />
          <Text className="text-gray-700 font-bold text-2xl ml-3 tracking-wide">SMARTHIKA</Text>
          <TouchableOpacity className="ml-auto">
            <FontAwesome name="cog" size={20} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Phase Indicators */}
      <View className="flex-row justify-center mb-8" style={{ gap: 70 }}>
        <View className="items-center">
          <View className="w-14 h-14 rounded-full shadow-2xl border-[1px] border-black" style={{ 
            backgroundColor: phaseColor(indicators?.phaseR, '#ef4444'),
            shadowColor: phaseColor(indicators?.phaseR, '#ef4444'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: indicators?.phaseR ? 0.8 : 0.2,
            shadowRadius: 12,
            elevation: 8
          }}></View>
          <Text className="text-gray-600 text-xs font-semibold mt-2">PHASE R</Text>
        </View>
        <View className="items-center">
          <View className="w-14 h-14 rounded-full shadow-2xl border-[1px] border-black" style={{ 
            backgroundColor: phaseColor(indicators?.phaseY, '#fbbf24'),
            shadowColor: phaseColor(indicators?.phaseY, '#fbbf24'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: indicators?.phaseY ? 0.8 : 0.2,
            shadowRadius: 12,
            elevation: 8
          }}></View>
          <Text className="text-gray-600 text-xs font-semibold mt-2">PHASE Y</Text>
        </View>
        <View className="items-center">
          <View className="w-14 h-14 rounded-full shadow-2xl border-[1px] border-black" style={{ 
            backgroundColor: phaseColor(indicators?.phaseB, '#3b82f6'),
            shadowColor: phaseColor(indicators?.phaseB, '#3b82f6'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: indicators?.phaseB ? 0.8 : 0.2,
            shadowRadius: 12,
            elevation: 8
          }}></View>
          <Text className="text-gray-600 text-xs font-semibold mt-2">PHASE B</Text>
        </View>
      </View>

      {/* LCD Display */}
      <View className="bg-gray-300 rounded-xl p-5 mb-8" style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8
      }}>
        <View className="rounded-lg p-6 items-center justify-center" style={{ 
          minHeight: 100,
          backgroundColor: lcdAccent,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 4,
          elevation: -5
        }}>
          <Text className="font-mono font-bold text-xl tracking-wider" style={{ color: '#1a1a1a' }}>{lcdRow0}</Text>
          <Text className="font-mono text-sm tracking-widest mt-2" style={{ color: '#1a1a1a' }}>{lcdRow1}</Text>
        </View>
        {dot && (
          <View className="flex-row justify-center mt-3" style={{ gap: 6 }}>
            {Array.from({ length: dot.total }).map((_, index) => (
              <View
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index === dot.active ? '#16a34a' : '#9ca3af'
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* Status Indicators */}
      <View className="flex-row justify-between mb-12 px-4">
        <View className="items-center">
          <View className="w-8 h-8 rounded-full border-[1px] border-black" style={{ 
            backgroundColor: indicatorColor(indicators?.motorOn, '#22c55e'),
            shadowColor: indicatorColor(indicators?.motorOn, '#22c55e'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 10,
            elevation: 6
          }}></View>
          <Text className="text-gray-700 text-xs font-semibold mt-2">MOTOR ON</Text>
        </View>
        <View className="items-center">
          <View className="w-8 h-8 rounded-full border-[1px] border-black" style={{ 
            backgroundColor: indicatorColor(indicators?.motorTrip, '#ef4444'),
            shadowColor: indicatorColor(indicators?.motorTrip, '#ef4444'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 10,
            elevation: 6
          }}></View>
          <Text className="text-gray-700 text-xs font-semibold mt-2">MOTOR TRIP</Text>
        </View>
        <View className="items-center">
          <View className="w-8 h-8 rounded-full border-[1px] border-black" style={{ 
            backgroundColor: indicatorColor(indicators?.smartMode, '#22c55e'),
            shadowColor: indicatorColor(indicators?.smartMode, '#22c55e'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 10,
            elevation: 6
          }}></View>
          <Text className="text-gray-700 text-xs font-semibold mt-2">SMART MODE</Text>
        </View>
        <View className="items-center">
          <View className="w-8 h-8 rounded-full border-[1px] border-black" style={{ 
            backgroundColor: indicatorColor(indicators?.manualMode, '#3b82f6'),
            shadowColor: indicatorColor(indicators?.manualMode, '#3b82f6'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 10,
            elevation: 6
          }}></View>
          <Text className="text-gray-700 text-xs font-semibold mt-2">MANUAL MODE</Text>
        </View>
      </View>

      <View className="flex-row justify-center mb-8" style={{ gap: 24 }}>
        <View className="items-center">
          <View className="w-6 h-6 rounded-full border-[1px] border-black" style={{ 
            backgroundColor: indicatorColor(indicators?.net1, '#22c55e'),
            shadowColor: indicatorColor(indicators?.net1, '#22c55e'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: indicators?.net1 ? 0.9 : 0.2,
            shadowRadius: 8,
            elevation: 4
          }}></View>
          <Text className="text-gray-700 text-xs font-semibold mt-2">NET1</Text>
        </View>
        <View className="items-center">
          <View className="w-6 h-6 rounded-full border-[1px] border-black" style={{ 
            backgroundColor: indicatorColor(indicators?.net2, '#a855f7'),
            shadowColor: indicatorColor(indicators?.net2, '#a855f7'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: indicators?.net2 ? 0.9 : 0.2,
            shadowRadius: 8,
            elevation: 4
          }}></View>
          <Text className="text-gray-700 text-xs font-semibold mt-2">NET2</Text>
        </View>
        <View className="items-center">
          <View className="w-6 h-6 rounded-full border-[1px] border-black" style={{ 
            backgroundColor: indicatorColor(indicators?.net3, '#0ea5e9'),
            shadowColor: indicatorColor(indicators?.net3, '#0ea5e9'),
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: indicators?.net3 ? 0.9 : 0.2,
            shadowRadius: 8,
            elevation: 4
          }}></View>
          <Text className="text-gray-700 text-xs font-semibold mt-2">NET3</Text>
        </View>
      </View>

      {/* Scroll Indicator */}
      <TouchableOpacity 
        className="absolute bottom-[-75] left-0 right-0"
        onPress={onScrollClick}
      >
        <View className="items-center">
          <FontAwesome name="chevron-down" size={20} color="#9ca3af" />
          <Text className="text-xs text-gray-500 mt-1">down for more details</Text>
        </View>
      </TouchableOpacity>

      {/* Control Buttons - Fixed at Bottom */}
      <View className="absolute bottom-0 left-0 right-0 px-5">
        <View className="bg-gray-200 rounded-3xl p-5" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 10
        }}>
          <View className="flex-row justify-between">
            <TouchableOpacity className={`items-center ${controls?.startDisabled ? 'opacity-40' : ''}`} activeOpacity={0.7} onPress={onStartPress} disabled={controls?.startDisabled}>
              <View style={{ position: 'relative' }}>
                <View className="w-20 h-20 rounded-full items-center justify-center" style={{
                  backgroundColor: '#16a34a',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 12,
                  borderWidth: 3,
                  borderTopColor: '#22c55e',
                  borderLeftColor: '#22c55e',
                  borderRightColor: '#15803d',
                  borderBottomColor: '#15803d'
                }}>
                  <FontAwesome name="play" size={28} color="white" style={{ marginLeft: 2 }} />
                </View>
              </View>
              <Text className="text-gray-700 text-xs font-bold mt-2">START</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className={`items-center ${controls?.setDisabled ? 'opacity-40' : ''}`} activeOpacity={0.7} onPress={onSetPress} disabled={controls?.setDisabled}>
              <View style={{ position: 'relative' }}>
                <View className="w-20 h-20 rounded-full items-center justify-center" style={{
                  backgroundColor: '#4b5563',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 12,
                  borderWidth: 3,
                  borderTopColor: '#6b7280',
                  borderLeftColor: '#6b7280',
                  borderRightColor: '#374151',
                  borderBottomColor: '#374151'
                }}>
                  <FontAwesome name="sliders" size={28} color="white" />
                </View>
              </View>
              <Text className="text-gray-700 text-xs font-bold mt-2">SET</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className={`items-center ${controls?.modeDisabled ? 'opacity-40' : ''}`} activeOpacity={0.7} onPress={onModePress} disabled={controls?.modeDisabled}>
              <View style={{ position: 'relative' }}>
                <View className="w-20 h-20 rounded-full items-center justify-center" style={{
                  backgroundColor: '#2563eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 12,
                  borderWidth: 3,
                  borderTopColor: '#3b82f6',
                  borderLeftColor: '#3b82f6',
                  borderRightColor: '#1d4ed8',
                  borderBottomColor: '#1d4ed8'
                }}>
                  <FontAwesome name="exchange" size={28} color="white" />
                </View>
              </View>
              <Text className="text-gray-700 text-xs font-bold mt-2">MODE</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className={`items-center ${controls?.stopDisabled ? 'opacity-40' : ''}`} activeOpacity={0.7} onPress={onStopPress} disabled={controls?.stopDisabled}>
              <View style={{ position: 'relative' }}>
                <View className="w-20 h-20 rounded-full items-center justify-center" style={{
                  backgroundColor: '#dc2626',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 12,
                  borderWidth: 3,
                  borderTopColor: '#ef4444',
                  borderLeftColor: '#ef4444',
                  borderRightColor: '#b91c1c',
                  borderBottomColor: '#b91c1c'
                }}>
                  <FontAwesome name="stop" size={28} color="white" />
                </View>
              </View>
              <Text className="text-gray-700 text-xs font-bold mt-2">STOP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

// Farm Details Cards Component
const FarmDetailsCards = ({ onBackClick, devices = [] }) => {
  const assignedDevices = Array.isArray(devices) ? devices : [];
  const hasMotorControl = assignedDevices.some((device) => {
    const deviceKey = String(device?.deviceKey || '').toLowerCase();
    const deviceName = String(device?.deviceName || '').toLowerCase();
    return deviceKey === 'motor_control' || deviceName.includes('motor');
  });

  return (
    <View className="bg-green-50 pt-4" style={{ minHeight: SCREEN_HEIGHT - 250, marginBottom: 10 }}>
      <View className="px-6 pb-2 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-green-800">Farm Details</Text>
        <TouchableOpacity onPress={onBackClick} className="flex-row items-center">
          <FontAwesome name="chevron-up" size={16} color="#15803d" />
          <Text className="text-green-800 text-sm ml-2 font-semibold">Back to Controller</Text>
        </TouchableOpacity>
      </View>

      {/* Assigned Devices */}
      <View className="px-6 pb-4">
        <View className="bg-white rounded-xl p-4 shadow-sm border-2 border-green-200 mb-4">
          <Text className="text-gray-800 text-sm font-semibold mb-2">Assigned Devices</Text>
          {assignedDevices.length > 0 ? (
            <View className="flex-row flex-wrap">
              {assignedDevices.map((device) => (
                <View
                  key={device.deviceId}
                  className="bg-green-100 border border-green-200 rounded-full px-3 py-1 mr-2 mb-2"
                >
                  <Text className="text-green-800 text-xs font-semibold">
                    {device.deviceName}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-gray-500 text-sm">
              No devices have been assigned yet.
            </Text>
          )}
        </View>

        {hasMotorControl ? (
          <MotorControl 
            size="medium" 
            showStatus={true} 
          />
        ) : (
          <View className="bg-yellow-50 rounded-xl p-4 shadow-sm border-2 border-yellow-200">
            <Text className="text-yellow-800 text-sm font-semibold mb-1">Motor Control Not Assigned</Text>
            <Text className="text-yellow-700 text-sm">
              Ask your Sahayak to assign the motor control device before using pump controls.
            </Text>
          </View>
        )}
      </View>

      {/* Weather Card */}
      <View className="px-6 pb-4">
        <View className="bg-blue-500 rounded-xl p-4 shadow-sm border-2 border-green-200">
          <Text className="text-white text-sm font-semibold mb-3">Weather Forecast</Text>
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-white text-2xl font-bold">28°C</Text>
              <Text className="text-blue-100 text-xs mt-1">Partly Cloudy</Text>
            </View>
            <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
              <Text className="text-3xl">⛅</Text>
            </View>
          </View>
          
          <View className="flex-row justify-between py-2 border-t border-white/20">
            <View className="items-center flex-1">
              <FontAwesome name="tint" size={14} color="#ffffff" />
              <Text className="text-white/80 text-xs mt-1">Humidity</Text>
              <Text className="text-white font-semibold text-xs">65%</Text>
            </View>
            <View className="items-center flex-1">
              <FontAwesome name="leaf" size={14} color="#ffffff" />
              <Text className="text-white/80 text-xs mt-1">Wind</Text>
              <Text className="text-white font-semibold text-xs">12 km/h</Text>
            </View>
            <View className="items-center flex-1">
              <FontAwesome name="sun-o" size={14} color="#ffffff" />
              <Text className="text-white/80 text-xs mt-1">UV Index</Text>
              <Text className="text-white font-semibold text-xs">Moderate</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Soil Moisture Card */}
      <View className="px-6 pb-4">
        <View className="bg-white rounded-xl p-4 shadow-sm border-2 border-green-200">
          <Text className="text-gray-800 text-sm font-semibold mb-3">Soil Moisture</Text>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-gray-800 text-xl font-bold">68%</Text>
              <Text className="text-green-600 text-xs font-medium mt-1">Optimal Level</Text>
            </View>
            <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center">
              <Text className="text-2xl">💧</Text>
            </View>
          </View>

          <View className="mb-3">
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View className="h-full bg-green-500 rounded-full" style={{ width: '68%' }} />
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-gray-400 text-xs">Low</Text>
              <Text className="text-gray-400 text-xs">High</Text>
            </View>
          </View>

          <View className="flex-row items-center bg-green-50 rounded-lg p-2">
            <FontAwesome name="check-circle" size={14} color="#10b981" />
            <Text className="text-green-700 text-xs ml-2 flex-1">
              Optimal. No immediate irrigation required.
            </Text>
          </View>
        </View>
      </View>

      {/* Irrigation Card */}
      <View className="px-6 pb-4">
        <View className="bg-white rounded-xl p-4 shadow-xl border-2 border-green-200">
          <Text className="text-gray-800 text-sm font-semibold mb-3">Irrigation Schedule</Text>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-gray-800 text-base font-bold">Next Irrigation</Text>
              <Text className="text-gray-500 text-xs">Tomorrow morning, 6:00 AM</Text>
            </View>
            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
              <FontAwesome name="clock-o" size={16} color="#3b82f6" />
            </View>
          </View>

          <View className="space-y-2 mb-3">
            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-green-100 rounded-lg items-center justify-center mr-2">
                <Text className="text-sm">🌅</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-800 font-semibold text-xs">Morning Session</Text>
                <Text className="text-gray-500 text-xs">6:00 AM - 7:30 AM</Text>
              </View>
              <View className="bg-blue-100 px-2 py-1 rounded-full">
                <Text className="text-blue-600 text-xs font-semibold">90 min</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-8 h-8 bg-orange-100 rounded-lg items-center justify-center mr-2">
                <Text className="text-sm">🌇</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-800 font-semibold text-xs">Evening Session</Text>
                <Text className="text-gray-500 text-xs">5:30 PM - 6:30 PM</Text>
              </View>
              <View className="bg-orange-100 px-2 py-1 rounded-full">
                <Text className="text-orange-600 text-xs font-semibold">60 min</Text>
              </View>
            </View>
          </View>

          <View className="bg-blue-50 rounded-lg p-3">
            <Text className="text-blue-900 font-semibold text-xs mb-2">Today's Usage</Text>
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <FontAwesome name="tint" size={12} color="#3b82f6" />
                <Text className="text-blue-900 text-xs mt-1">Water</Text>
                <Text className="text-blue-600 font-bold text-sm">450 L</Text>
              </View>
              <View className="items-center flex-1">
                <FontAwesome name="clock-o" size={12} color="#3b82f6" />
                <Text className="text-blue-900 text-xs mt-1">Time</Text>
                <Text className="text-blue-600 font-bold text-sm">2.5h</Text>
              </View>
              <View className="items-center flex-1">
                <FontAwesome name="bar-chart" size={12} color="#3b82f6" />
                <Text className="text-blue-900 text-xs mt-1">Efficiency</Text>
                <Text className="text-blue-600 font-bold text-sm">94%</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function Home() {
  const bootSequence = [
    {
      duration: 3500,
      row0: 'GRC SMARTHIKA',
      row1: 'SMART AGRO V3.0',
    },
    {
      duration: 1200,
      row0: 'SYSTEM DIAG...',
      row1: 'LCD:OK LED:OK',
    },
    {
      duration: 1200,
      row0: 'GSM:OK LORA:OK',
      row1: 'PRI:OK SEC:OK',
    },
    {
      duration: 800,
      row0: 'SMARTHIKA AGRO',
      row1: 'System OK...',
    }
  ];

  const { user } = useAuth();
  const [farmerStatus, setFarmerStatus] = useState(null);
  const [farmerProfile, setFarmerProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGatewayConnected, setIsGatewayConnected] = useState(false);
  const [isGatewayInitializing, setIsGatewayInitializing] = useState(false);
  const [motorState, setMotorState] = useState({ isOn: false, status: null, mode: null, trigger: null, lastUpdated: null });
  const [telemetry, setTelemetry] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [faultData, setFaultData] = useState(null);
  const [manualPageIndex, setManualPageIndex] = useState(0);
  const [statusSlotIndex, setStatusSlotIndex] = useState(0);
  const [energySlotIndex, setEnergySlotIndex] = useState(0);
  const [localSystemMode, setLocalSystemMode] = useState(null);
  const [showFarmDetails, setShowFarmDetails] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  const [bootScreenIndex, setBootScreenIndex] = useState(-1);
  const [hasPlayedBootSequence, setHasPlayedBootSequence] = useState(false);
  const [startupPhase, setStartupPhase] = useState('boot');
  const [gsmWaitStatus, setGsmWaitStatus] = useState('connecting');
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [statusLeds, setStatusLeds] = useState(null);
  const [hasStatusPayload, setHasStatusPayload] = useState(false);
  const [motorUiOn, setMotorUiOn] = useState(false);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [pendingMotorCommand, setPendingMotorCommand] = useState(null);
  const [gsmStartupError, setGsmStartupError] = useState(null);
  const [smartModeActive, setSmartModeActive] = useState(false);
  const [smartModeError, setSmartModeError] = useState(null);
  const scrollViewRef = useRef(null);
  const gsmWaitStartRef = useRef(null);
  const startupCmdSentRef = useRef(false);
  const gsmErrorTimerRef = useRef(null);
  const smartModeErrorTimerRef = useRef(null);

  const isApproved = farmerStatus?.overallStatus === 'APPROVED';
  const net = healthData?.net;
  const sys = healthData?.sys;
  const conf = healthData?.conf;
  const el = telemetry?.el;
  const m = telemetry?.m;

  const isRunning = motorState.isOn
    || motorState.status === MOTOR_STATES.RUNNING_STAR
    || motorState.status === MOTOR_STATES.RUNNING_DELTA;
  const systemMode = (localSystemMode || conf?.mode || motorState.mode || 'AUTO').toUpperCase();
  const isManualMode = systemMode === 'MANUAL';
  const starterMode = starterModeLabel(m?.op || conf?.starter || conf?.motorType);

  useEffect(() => {
    loadFarmerData();
  }, []);

  const handleMQTT = useCallback((event) => {
    switch (event.type) {
      case MESSAGE_TYPES.MOTOR_STATUS: {
        const status = event.status || {};
        const motorSt = status?.motor?.st;
        const motorActive = typeof status?.motor?.active === 'boolean'
          ? status.motor.active
          : motorSt === MOTOR_STATES.RUNNING_STAR || motorSt === MOTOR_STATES.RUNNING_DELTA;
        if (motorSt !== undefined) {
          setMotorState(prev => ({
            ...prev,
            isOn: motorActive,
            status: motorSt,
            mode: status?.mode || prev.mode,
            trigger: status?.trigger,
            lastUpdated: new Date().toISOString(),
          }));
        }
        setMotorUiOn(Boolean(motorActive));
        if (status?.mode) {
          setLocalSystemMode(String(status.mode).toUpperCase());
        }
        if (motorSt !== MOTOR_STATES.FAULT) {
          setFaultData(null);
        }
        if (status?.leds && typeof status.leds === 'object') {
          setStatusLeds({
            phase_1: Boolean(status.leds.phase_1),
            phase_2: Boolean(status.leds.phase_2),
            phase_3: Boolean(status.leds.phase_3),
            motor_on: Boolean(status.leds.motor_on),
            motor_trip: Boolean(status.leds.motor_trip),
            smarthika: Boolean(status.leds.smarthika),
            manual: Boolean(status.leds.manual),
            net_1: Boolean(status.leds.net_1),
            net_2: Boolean(status.leds.net_2),
            net_3: Boolean(status.leds.net_3),
          });
          setHasStatusPayload(true);
          setGsmStartupError(null);
          if (gsmErrorTimerRef.current) {
            clearTimeout(gsmErrorTimerRef.current);
            gsmErrorTimerRef.current = null;
          }
          setGsmWaitStatus('connected');
          if (status?.mode) {
            setLocalSystemMode(String(status.mode).toUpperCase());
          }
        }
        break;
      }
      case MESSAGE_TYPES.RESPONSE: {
        const response = event.response || {};
        const result = String(response?.result || '').toLowerCase();
        const cmd = String(response?.cmd || pendingMotorCommand || '').toUpperCase();
        const isStart = cmd === 'PUMP_START';
        const isStop = cmd === 'PUMP_STOP';

        setIsGatewayConnected(MQTTService.getConnectionStatus());

        if (result === 'ok') {
          const motorOn = isStart ? true : isStop ? false : motorUiOn;
          setMotorUiOn(motorOn);
          setMotorState(prev => ({
            ...prev,
            isOn: motorOn,
            status: motorOn ? MOTOR_STATES.RUNNING_STAR : MOTOR_STATES.IDLE,
            lastUpdated: new Date().toISOString(),
          }));
          setStatusLeds(prev => ({
            ...(prev || {}),
            motor_on: motorOn,
          }));
        } else if (result === 'rejected' || result === 'error') {
          const motorOn = isStart ? false : isStop ? true : motorUiOn;
          setMotorUiOn(motorOn);
          setMotorState(prev => ({
            ...prev,
            isOn: motorOn,
            status: motorOn ? MOTOR_STATES.RUNNING_STAR : MOTOR_STATES.IDLE,
            lastUpdated: new Date().toISOString(),
          }));
          setStatusLeds(prev => ({
            ...(prev || {}),
            motor_on: motorOn,
          }));
        }

        setPendingMotorCommand(null);
        setIsCommandPending(false);
        break;
      }
      case MESSAGE_TYPES.TELEMETRY:
        setTelemetry(event.telemetry || null);
        if (event.telemetry?.m?.st) {
          const motorSt = event.telemetry.m.st;
          setMotorState(prev => ({
            ...prev,
            isOn: motorSt === MOTOR_STATES.RUNNING_STAR || motorSt === MOTOR_STATES.RUNNING_DELTA,
            status: motorSt,
          }));
        }
        break;
      case MESSAGE_TYPES.HEALTH:
        setHealthData(event.health || null);
        if (event.health?.conf?.mode) {
          setLocalSystemMode(String(event.health.conf.mode).toUpperCase());
        }
        break;
      case MESSAGE_TYPES.ERROR:
        if (startupPhase === 'gsm-wait' || !hasStatusPayload) {
          const errorDesc = String(event.error?.desc || event.error?.code || event.error?.message || 'Error');
          setGsmStartupError(errorDesc);
          setGsmWaitStatus('error');
          setLocalSystemMode('MANUAL');
          if (gsmErrorTimerRef.current) clearTimeout(gsmErrorTimerRef.current);
          gsmErrorTimerRef.current = setTimeout(() => {
            setGsmWaitStatus('manual');
            setGsmStartupError(null);
          }, 5000);
        } else if (startupPhase === 'home' && smartModeActive) {
          const errorDesc = String(event.error?.desc || event.error?.code || event.error?.message || 'Error');
          setSmartModeError(errorDesc);
          if (smartModeErrorTimerRef.current) clearTimeout(smartModeErrorTimerRef.current);
          smartModeErrorTimerRef.current = setTimeout(() => {
            setSmartModeError(null);
          }, 5000);
        } else {
          setFaultData(event.error || null);
        }
        break;
      default:
        break;
    }
  }, [startupPhase, hasStatusPayload, pendingMotorCommand, motorUiOn]);

  useEffect(() => {
    if (!isApproved) return;

    let mounted = true;
    const initializeGateway = async () => {
      try {
        setIsGatewayInitializing(true);
        await MQTTService.initialize();
        await MQTTService.loadMotorState();
        const saved = MQTTService.getMotorState();
        if (mounted && saved) {
          setMotorState(prev => ({ ...prev, ...saved }));
        }
        if (mounted) {
          setIsGatewayConnected(MQTTService.getConnectionStatus());
        }
      } catch (error) {
        console.error('Failed to initialize gateway on home screen:', error);
      } finally {
        if (mounted) {
          setIsGatewayInitializing(false);
        }
      }
    };

    initializeGateway();
    MQTTService.addListener(handleMQTT);
    const interval = setInterval(() => {
      if (mounted) {
        setIsGatewayConnected(MQTTService.getConnectionStatus());
      }
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (gsmErrorTimerRef.current) {
        clearTimeout(gsmErrorTimerRef.current);
        gsmErrorTimerRef.current = null;
      }
      MQTTService.removeListener(handleMQTT);
    };
  }, [isApproved, handleMQTT]);

  useEffect(() => {
    // Start LCD boot sequence on first approved load
    if (!isLoading && farmerStatus?.overallStatus === 'APPROVED' && !hasPlayedBootSequence) {
      setBootScreenIndex(0);
      setHasPlayedBootSequence(true);
      setStartupPhase('boot');
    }
  }, [isLoading, farmerStatus, hasPlayedBootSequence]);

  useEffect(() => {
    if (bootScreenIndex < 0 || bootScreenIndex >= bootSequence.length) {
      return;
    }

    const timer = setTimeout(() => {
      if (bootScreenIndex === bootSequence.length - 1) {
        setBootScreenIndex(-1);
        setStartupPhase('gsm-wait');
        gsmWaitStartRef.current = Date.now();
        setGsmWaitStatus('connecting');
        startupCmdSentRef.current = false;
      } else {
        setBootScreenIndex(prev => prev + 1);
      }
    }, bootSequence[bootScreenIndex].duration);

    return () => clearTimeout(timer);
  }, [bootScreenIndex, bootSequence]);

  useEffect(() => {
    if (!isApproved || startupPhase !== 'gsm-wait') return;

    if (!gsmWaitStartRef.current) {
      gsmWaitStartRef.current = Date.now();
    }

    if (!startupCmdSentRef.current && MQTTService.getConnectionStatus()) {
      startupCmdSentRef.current = true;
      MQTTService.sendStatusSync()
        .catch((error) => {
          console.warn('Failed to send STATUS_SYNC during gsm-wait:', error?.message || error);
        });
    }

    if (hasStatusPayload) {
      setGsmWaitStatus('connected');
      setGsmStartupError(null);
      const timer = setTimeout(() => setStartupPhase('home'), 1000);
      return () => clearTimeout(timer);
    }

    const timer = setInterval(() => {
      const elapsed = Date.now() - gsmWaitStartRef.current;
      if (elapsed >= 120000 && gsmWaitStatus === 'connecting') {
        setGsmWaitStatus('manual');
        setLocalSystemMode('MANUAL');
        setGsmStartupError(null);
      }
      if (!startupCmdSentRef.current && MQTTService.getConnectionStatus()) {
        startupCmdSentRef.current = true;
        MQTTService.sendStatusSync()
          .catch((error) => {
            console.warn('Failed to send STATUS_SYNC during gsm-wait:', error?.message || error);
          });
      }
    }, 1000);

    setGsmWaitStatus((current) => current === 'error' || current === 'manual' ? current : 'connecting');
    return () => clearInterval(timer);
  }, [isApproved, startupPhase, hasStatusPayload, isGatewayConnected, gsmWaitStatus]);

  useEffect(() => {
    if (!isApproved || startupPhase !== 'home' || faultData || manualPageIndex !== 0) return;

    const slotCount = isRunning ? 3 : 4;
    const slotDelay = isRunning ? 3000 : 4000;
    setStatusSlotIndex(0);
    const timer = setInterval(() => {
      setStatusSlotIndex(prev => (prev + 1) % slotCount);
    }, slotDelay);

    return () => clearInterval(timer);
  }, [isApproved, startupPhase, faultData, manualPageIndex, isRunning]);

  useEffect(() => {
    if (!isApproved || startupPhase !== 'home' || manualPageIndex !== 2 || !isRunning) {
      setEnergySlotIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setEnergySlotIndex(prev => (prev + 1) % 2);
    }, 3000);

    return () => clearInterval(timer);
  }, [isApproved, startupPhase, manualPageIndex, isRunning]);

  useEffect(() => {
    // Hide welcome message after 10 seconds when page is loaded
    if (!isLoading && farmerStatus?.overallStatus === 'APPROVED' && startupPhase === 'home') {
      const timer = setTimeout(() => {
        setShowWelcomeMessage(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, farmerStatus, startupPhase]);

  useEffect(() => {
    // Reset smartModeActive when leaving home phase
    if (startupPhase !== 'home') {
      setSmartModeActive(false);
    }
  }, [startupPhase]);

  useEffect(() => {
    // Show "System ok" for 5 seconds, then switch to "Smart Mode"
    if (startupPhase !== 'home' || smartModeActive) return;

    const timer = setTimeout(() => {
      setSmartModeActive(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [startupPhase, smartModeActive]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFarmerData();
    }, [])
  );

  const loadFarmerData = async () => {
    try {
      setIsLoading(true);
      
      // Get auth token from storage
      const token = await StorageService.getAuthToken();
      
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      // Load farmer status (Phase 1 critical API)
      const statusResponse = await FarmerService.getFarmerStatus(token);
      if (statusResponse.success) {
        setFarmerStatus(statusResponse);
      }

      // Load farmer profile (for both approved and pending farmers)
      const profileResponse = await FarmerService.getFarmerProfile(token);
      if (profileResponse.success) {
        setFarmerProfile(profileResponse);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load farmer data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadFarmerData();
    setIsRefreshing(false);
  };

  const initializeGateway = async () => {
    try {
      setIsGatewayInitializing(true);
      await MQTTService.initialize();
      setIsGatewayConnected(MQTTService.getConnectionStatus());
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect to gateway.');
    } finally {
      setIsGatewayInitializing(false);
    }
  };

  const handleStartPress = async () => {
    if (startupPhase !== 'home') return;
    if (!isGatewayConnected || isCommandPending || motorUiOn) return;
    try {
      setIsCommandPending(true);
      setPendingMotorCommand('PUMP_START');
      await MQTTService.turnMotorOn();
    } catch (error) {
      setIsCommandPending(false);
      setPendingMotorCommand(null);
      console.error('Failed to send start command:', error);
      Alert.alert('Command Error', 'Unable to start motor.');
    }
  };

  const handleStopPress = async () => {
    if (startupPhase !== 'home' || !isGatewayConnected || isCommandPending || !motorUiOn) return;

    try {
      setIsCommandPending(true);
      setPendingMotorCommand('PUMP_STOP');
      await MQTTService.turnMotorOff();
    } catch (error) {
      setIsCommandPending(false);
      setPendingMotorCommand(null);
      console.error('Failed to send stop command:', error);
      Alert.alert('Command Error', 'Unable to stop motor.');
    }
  };

  const handleModePress = async () => {
    if (startupPhase !== 'home') return;
    const nextMode = isManualMode ? 'AUTO' : 'MANUAL';
    setLocalSystemMode(nextMode);
    if (nextMode === 'AUTO') {
      setManualPageIndex(0);
    }

    if (!isGatewayConnected) return;
    try {
      await MQTTService.sendCommand(MOTOR_COMMANDS.MODE_CHANGE, { mode: nextMode.toLowerCase() });
    } catch (error) {
      console.error('Failed to send mode change command:', error);
    }
  };

  const handleSetPress = () => {
    if (faultData) {
      setFaultData(null);
      return;
    }

    if (startupPhase !== 'home' || !isManualMode) return;
    setManualPageIndex(prev => (prev + 1) % LCD_PAGES.length);
  };

  const lcdScreen = useMemo(() => {
    if (bootScreenIndex >= 0) {
      return {
        ...bootSequence[bootScreenIndex],
        accent: '#93c23de8',
        dot: { total: bootSequence.length, active: bootScreenIndex },
      };
    }

    if (startupPhase === 'gsm-wait') {
      const row1 = gsmWaitStatus === 'error'
        ? String(gsmStartupError || 'Error')
        : gsmWaitStatus === 'manual'
          ? 'Manual Mode'
          : gsmWaitStatus === 'connected'
            ? 'System ok'
            : 'Connecting to GSM';
      return {
        row0: 'SMARTHIKA AGRO',
        row1,
        accent: '#93c23de8',
      };
    }

    if (faultData) {
      return {
        row0: 'SYSTEM FAULT!',
        row1: faultData.desc || faultData.code || 'Unknown fault',
        accent: '#fca5a5',
      };
    }

    if (startupPhase === 'home') {
      if (smartModeError) {
        return {
          row0: 'SMARTHIKA AGRO',
          row1: smartModeError,
          accent: '#fca5a5',
        };
      }

      if (smartModeActive) {
        return {
          row0: 'SMARTHIKA AGRO',
          row1: 'Smart Mode',
          accent: '#93c23de8',
        };
      }

      return {
        row0: 'SMARTHIKA AGRO',
        row1: 'System ok',
        accent: '#93c23de8',
      };
    }

    const vAverage = avgV(el?.v);
    const statusModeRow = `Mode: ${systemMode}`;
    const idleSlots = [
      { row0: 'SMARTHIKA AGRO', row1: 'System OK' },
      {
        row0: net?.connected ? 'GSM: Connected' : 'GSM: Searching..',
        row1: net?.connected ? 'PRI:ONLINE SEC:--' : 'PRI:-- SEC:--',
      },
      { row0: `Uptime: ${fmtHHMM(sys?.upt)}`, row1: statusModeRow },
      { row0: `${fmtV(vAverage)} ${fmtF(el?.f)}`, row1: 'SYSTEM STANDBY' },
    ];

    const runSlots = [
      {
        row0: starterMode === 'Single Co..' ? 'Motor Running' : 'Motor On',
        row1: `Runtime ${fmtMMSS(m?.srt)}`,
      },
      { row0: `${fmtV(el?.v?.[0])} ${fmtI(el?.i?.[0])}`, row1: 'PHASE MONITORING' },
      { row0: 'RUNNING TIME:', row1: fmtHHMMSS(m?.srt) },
    ];

    if (manualPageIndex === 0) {
      const slots = isRunning ? runSlots : idleSlots;
      const slotCount = slots.length;
      const activeSlot = slots[statusSlotIndex % slotCount];
      return {
        ...activeSlot,
        accent: '#93c23de8',
        dot: { total: slotCount, active: statusSlotIndex % slotCount },
      };
    }

    if (manualPageIndex === 1) {
      return {
        row0: 'Link: GSM/GPRS',
        row1: net?.connected ? 'NET: CONNECTED' : 'NET: SEARCHING',
        accent: '#93c23de8',
      };
    }

    if (manualPageIndex === 2) {
      if (isRunning) {
        return energySlotIndex === 0
          ? { row0: `${fmtV(el?.v?.[0])} ${fmtI(el?.i?.[0])}`, row1: 'PHASE MONITORING', accent: '#93c23de8', dot: { total: 2, active: 0 } }
          : { row0: 'RUNNING TIME:', row1: fmtHHMMSS(m?.srt), accent: '#93c23de8', dot: { total: 2, active: 1 } };
      }
      return {
        row0: `${fmtV(vAverage)} ${fmtF(el?.f)}`,
        row1: 'SYSTEM STANDBY',
        accent: '#93c23de8',
      };
    }

    if (manualPageIndex === 3) {
      return {
        row0: `Uptime: ${fmtHHMM(sys?.upt)}`,
        row1: `Mode: ${systemMode}`,
        accent: '#93c23de8',
      };
    }

    if (manualPageIndex === 4) {
      return {
        row0: 'Motor Runtime',
        row1: `Total: ${fmtHHMM(m?.rt)}`,
        accent: '#93c23de8',
      };
    }

    if (manualPageIndex === 5) {
      return {
        row0: `LINE V: ${lineV(el?.v?.[0])}`,
        row1: '3-PHASE MONITOR',
        accent: '#93c23de8',
      };
    }

    return {
      row0: `Motor: ${starterMode}`,
      row1: 'Hold SET 3-4s',
      accent: '#93c23de8',
    };
  }, [bootScreenIndex, bootSequence, startupPhase, gsmWaitStatus, faultData, el, net, sys, systemMode, isRunning, starterMode, m, manualPageIndex, statusSlotIndex, energySlotIndex, smartModeActive, smartModeError]);

  const indicatorState = useMemo(() => ({
    phaseR: bootScreenIndex < 0 && ((startupPhase === 'home' && hasStatusPayload) ? Boolean(statusLeds?.phase_1) : (startupPhase === 'gsm-wait' && (gsmWaitStatus === 'manual' || gsmWaitStatus === 'error'))),
    phaseY: bootScreenIndex < 0 && ((startupPhase === 'home' && hasStatusPayload) ? Boolean(statusLeds?.phase_2) : (startupPhase === 'gsm-wait' && (gsmWaitStatus === 'manual' || gsmWaitStatus === 'error'))),
    phaseB: bootScreenIndex < 0 && ((startupPhase === 'home' && hasStatusPayload) ? Boolean(statusLeds?.phase_3) : (startupPhase === 'gsm-wait' && (gsmWaitStatus === 'manual' || gsmWaitStatus === 'error'))),
    motorOn: bootScreenIndex < 0 && startupPhase === 'home' ? Boolean(statusLeds?.motor_on ?? motorUiOn) : false,
    motorTrip: bootScreenIndex < 0 && startupPhase === 'home' && hasStatusPayload ? Boolean(statusLeds?.motor_trip) : false,
    smartMode: bootScreenIndex < 0 && startupPhase === 'home' && hasStatusPayload ? Boolean(statusLeds?.smarthika) : false,
    manualMode: bootScreenIndex < 0 && ((startupPhase === 'home' && hasStatusPayload) ? Boolean(statusLeds?.manual) : (startupPhase === 'gsm-wait' && (gsmWaitStatus === 'manual' || gsmWaitStatus === 'error'))),
    net1: bootScreenIndex < 0 && startupPhase === 'home' && hasStatusPayload ? Boolean(statusLeds?.net_1) : false,
    net2: bootScreenIndex < 0 && startupPhase === 'home' && hasStatusPayload ? Boolean(statusLeds?.net_2) : false,
    net3: bootScreenIndex < 0 && startupPhase === 'home' && hasStatusPayload ? Boolean(statusLeds?.net_3) : false,
  }), [bootScreenIndex, startupPhase, gsmWaitStatus, hasStatusPayload, statusLeds, motorUiOn]);

  const controlState = useMemo(() => ({
    startDisabled: startupPhase !== 'home' || isGatewayInitializing || !isGatewayConnected || isCommandPending || motorUiOn,
    setDisabled: true,
    modeDisabled: true,
    stopDisabled: startupPhase !== 'home' || isGatewayInitializing || !isGatewayConnected || isCommandPending || !motorUiOn,
  }), [startupPhase, isGatewayInitializing, isGatewayConnected, motorUiOn, isCommandPending]);

  const getStageIcon = (stage, status) => {
    const iconMap = {
      kyc: status === 'COMPLETED' ? 'check-circle' : status === 'PENDING' ? 'clock-o' : 'times-circle',
      land: status === 'COMPLETED' ? 'check-circle' : status === 'PENDING_VERIFICATION' ? 'clock-o' : 'times-circle',
      devices: status === 'INSTALLED' ? 'check-circle' : status === 'NOT_REQUESTED' ? 'times-circle' : 'clock-o'
    };
    return iconMap[stage] || 'times-circle';
  };

  const getStageColor = (status) => {
    switch (status) {
      case 'COMPLETED': 
      case 'INSTALLED': 
        return 'text-green-600';
      case 'PENDING': 
      case 'PENDING_VERIFICATION': 
      case 'REQUESTED':
        return 'text-yellow-600';
      case 'NOT_REQUESTED': 
        return 'text-gray-400';
      default: 
        return 'text-red-600';
    }
  };

  const getStageTitle = (stage) => {
    const titleMap = {
      kyc: 'KYC Verification',
      land: 'Land Verification',
      devices: 'Device Installation'
    };
    return titleMap[stage] || stage;
  };

  const getStageDescription = (stage, status) => {
    if (stage === 'kyc') {
      return status === 'COMPLETED' ? 'Your identity has been verified' : 'Aadhaar verification pending';
    }
    if (stage === 'land') {
      return status === 'COMPLETED' ? 'Land records verified' : 'Land verification in progress';
    }
    if (stage === 'devices') {
      if (status === 'REQUESTED') return 'Devices assigned and awaiting installation';
      return status === 'INSTALLED' ? 'Devices installed and active' : 'Device installation not initiated';
    }
    return 'Status unknown';
  };

  const handleContactSahayak = () => {
    if (farmerStatus?.sahayakContact) {
      const phoneNumber = farmerStatus.sahayakContact.replace(/\s/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleContactHelpdesk = () => {
    Linking.openURL('tel:+911800123456'); // Central helpdesk number
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-green-50 justify-center items-center">
        <View className="w-14 h-14 bg-green-700 rounded-full items-center justify-center mb-2 mt-12">
          <Image source={require('../../assets/logo.png')} style={{ width: 45, height: 45 }} resizeMode="contain" />
        </View>
        <Text className="text-xl font-semibold text-green-800 mb-4">Loading your farm data...</Text>
        <LoadingSpinner size="large" color="#10b981" />
      </View>
    );
  }

  // Phase 1: Show progress page if farmer is not approved
  if (farmerStatus?.overallStatus !== 'APPROVED') {
    return (
      <View className="flex-1 bg-green-50">
        <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
        
        {/* Fixed Header */}
        <View className="bg-white pt-8 pb-4 px-6 shadow-sm">
          <View className="items-center">
            <View className="w-14 h-14 bg-green-700 rounded-full items-center justify-center mb-2 mt-5">
              <Image source={require('../../assets/logo.png')} style={{ width: 45, height: 45 }} resizeMode="contain" />
            </View>
            <Text className="text-xl font-bold text-green-800">Application Status</Text>
            <Text className="text-green-600 text-center mt-1 text-sm">
              Welcome {farmerProfile?.profile?.name || user?.name || 'Farmer'}
            </Text>
          </View>

          {/* Overall Status */}
          <View className="bg-yellow-100 rounded-lg p-3 mt-3">
            <View className="flex-row items-center justify-center">
              <FontAwesome name="clock-o" size={18} color="#f59e0b" />
              <Text className="text-base font-semibold text-yellow-800 ml-2">
                Pending Approval
              </Text>
            </View>
            <Text className="text-yellow-700 text-center mt-1 text-xs">
              Your application is being processed
            </Text>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 90 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >

          {/* Progress Stages */}
          <View className="p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Application Progress</Text>
            
            <View className="space-y-4">
              {farmerStatus?.stages && Object.entries(farmerStatus.stages).map(([stage, status], index) => (
                <View key={stage} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-2">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-4">
                      <FontAwesome 
                        name={getStageIcon(stage, status)} 
                        size={16} 
                        color={status === 'COMPLETED' || status === 'INSTALLED' ? '#10b981' : 
                               status === 'PENDING' || status === 'PENDING_VERIFICATION' ? '#f59e0b' : '#6b7280'} 
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-800">
                        {getStageTitle(stage)}
                      </Text>
                      <Text className={`text-sm font-medium ${getStageColor(status)}`}>
                        {status.replace(/_/g, ' ')}
                      </Text>
                      <Text className="text-xs text-gray-600 mt-1">
                        {getStageDescription(stage, status)}
                      </Text>
                    </View>
                    <View className="ml-2">
                      <Text className="text-2xl">{index + 1}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Contact Section */}
          <View className="p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Need Help?</Text>
            
            <View className="space-y-3">
              {/* Sahayak Contact */}
              {farmerStatus?.sahayakContact && (
                <TouchableOpacity 
                  className="bg-blue-500 rounded-lg p-4 shadow-sm mb-2"
                  onPress={handleContactSahayak}
                >
                  <View className="flex-row items-center">
                    <FontAwesome name="user" size={20} color="#ffffff" />
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-semibold text-base">Contact Your Sahayak</Text>
                      <Text className="text-blue-100 text-sm">{farmerStatus.sahayakContact}</Text>
                    </View>
                    <FontAwesome name="phone" size={16} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              )}

              {/* Helpdesk Contact */}
              <TouchableOpacity 
                className="bg-gray-600 rounded-lg p-4 shadow-sm"
                onPress={handleContactHelpdesk}
              >
                <View className="flex-row items-center">
                  <FontAwesome name="headphones" size={20} color="#ffffff" />
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-semibold text-base">Contact Helpdesk</Text>
                    <Text className="text-gray-300 text-sm">+91 1800 123 456</Text>
                  </View>
                  <FontAwesome name="phone" size={16} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Message */}
          {/* <View className="p-6 pb-8">
            <View className="bg-yellow-100 rounded-lg p-4">
              <Text className="text-yellow-800 text-sm text-center">
                💡 You will be notified when your application status changes. 
                Pull down to refresh and check for updates.
              </Text>
            </View>
          </View> */}
        </ScrollView>
      </View>
    );
  }

  // Phase 1: Show homepage if farmer is approved
  return (
    <View className="flex-1 bg-green-50">
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      
      {/* Fixed Header */}
      <View className="bg-white pt-8 pb-4 px-6 shadow-sm">
        {/* Farmer Logo and Welcome Message - Left Side */}
        <View className="absolute top-10 left-6 z-10 mt-5 flex-row items-center">
          <View className="w-14 h-14 bg-green-700 rounded-full items-center justify-center mr-3 shadow-sm">
            <Image source={require('../../assets/logo.png')} style={{ width: 45, height: 45 }} resizeMode="contain" />
          </View>
          <View>
            <Text className="text-base font-bold text-green-800">
              Welcome Back, {farmerProfile?.profile?.name || user?.name || 'Farmer'}
            </Text>
            {/* <Text className="text-green-600 text-sm font-semibold">
              {farmerProfile?.profile?.name || user?.name || 'Farmer'}
            </Text> */}
            {/* <View className="flex-row items-center bg-green-100 rounded-full px-2 py-0.5 mt-1">
              <FontAwesome name="check-circle" size={8} color="#10b981" />
              <Text className="text-green-700 text-xs font-semibold ml-1">
                Approved
              </Text>
            </View> */}
          </View>
        </View>

        {/* Notification and Profile Icons - Right Side */}
        <View className="absolute top-10 right-6 z-10 mt-5 flex-row space-x-2">
          <TouchableOpacity>
            <View className="w-14 h-14 bg-white rounded-full items-center justify-center shadow-sm mr-2">
              <FontAwesome name="bell" size={25} color="#000000" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowProfilePanel(true)}
          >
            <View className="w-14 h-14 bg-white rounded-full items-center justify-center shadow-sm">
              <FontAwesome name="user-circle" size={28} color="#000000" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Spacer to maintain header height */}
        <View className="h-14 mt-5" />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* Conditional Rendering - Either Smarthika Controller OR Farm Details Cards */}
        {!showFarmDetails ? (
          <SmarthikaController
            onScrollClick={() => setShowFarmDetails(true)}
            lcdScreen={lcdScreen}
            indicators={indicatorState}
            onStartPress={handleStartPress}
            onSetPress={handleSetPress}
            onModePress={handleModePress}
            onStopPress={handleStopPress}
            controls={controlState}
          />
        ) : (
          <FarmDetailsCards onBackClick={() => setShowFarmDetails(false)} devices={farmerProfile?.devices || []} />
        )}

      </ScrollView>

      {/* Sliding Profile Panel */}
      <ProfileSidebar 
        visible={showProfilePanel}
        onClose={() => setShowProfilePanel(false)}
        farmerProfile={farmerProfile}
        user={user}
      />
    </View>
  );
}

