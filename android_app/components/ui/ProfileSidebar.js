import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Modal, Dimensions, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileSidebar({ visible, onClose, farmerProfile, user }) {
  const { logout } = useAuth();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: SCREEN_WIDTH,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [visible]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await logout();
          }
        }
      ]
    );
  };

  const handleNavigateToSettings = () => {
    onClose();
    router.push('/(tabs)/settings');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        {/* Backdrop */}
        <TouchableOpacity 
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={onClose}
        />
        
        {/* Sliding Panel */}
        <Animated.View 
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: SCREEN_WIDTH * 0.85,
            backgroundColor: '#ffffff',
            transform: [{ translateX: slideAnim }],
            shadowColor: '#000',
            shadowOffset: { width: -2, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 5,
          }}
        >
          <ScrollView className="flex-1">
            <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
            {/* Profile Panel Header */}
            <View className="bg-green-900 pt-0 pb-4 px-4">
              <TouchableOpacity 
                className="absolute top-8 left-4 z-10"
                onPress={onClose}
              >
                <FontAwesome name="times" size={24} color="#ffffff" />
              </TouchableOpacity>
              
              <View className="items-center mt-4">
                <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-3">
                  <Text className="text-3xl">👤</Text>
                </View>
                <Text className="text-white text-xl font-bold">
                  {farmerProfile?.profile?.name || user?.name || 'Farmer'}
                </Text>
                <Text className="text-green-100 text-sm mt-1">
                  {farmerProfile?.profile?.mobile || user?.mobile || ''}
                </Text>
              </View>
            </View>

            {/* Profile Content */}
            <View className="p-6">
              {/* Personal Information Section */}
              {farmerProfile?.profile && (
                <>
                  <Text className="text-gray-500 text-xs font-semibold mb-3 uppercase">Personal Information</Text>
                  
                  <View className="bg-gray-50 rounded-lg p-4 mb-6">
                    <View className="mb-3">
                      <View className="flex-row items-center mb-1">
                        <FontAwesome name="user-circle" size={14} color="#6b7280" />
                        <Text className="text-gray-500 text-xs ml-2">Full Name</Text>
                      </View>
                      <Text className="text-gray-800 font-semibold text-sm ml-6">
                        {farmerProfile.profile.name}
                      </Text>
                    </View>

                    <View className="mb-3">
                      <View className="flex-row items-center mb-1">
                        <FontAwesome name="phone" size={14} color="#6b7280" />
                        <Text className="text-gray-500 text-xs ml-2">Mobile Number</Text>
                      </View>
                      <Text className="text-gray-800 font-semibold text-sm ml-6">
                        {farmerProfile.profile.mobile}
                      </Text>
                    </View>

                    {farmerProfile.profile.fatherName && (
                      <View className="mb-3">
                        <View className="flex-row items-center mb-1">
                          <FontAwesome name="male" size={14} color="#6b7280" />
                          <Text className="text-gray-500 text-xs ml-2">Father's Name</Text>
                        </View>
                        <Text className="text-gray-800 font-semibold text-sm ml-6">
                          {farmerProfile.profile.fatherName}
                        </Text>
                      </View>
                    )}

                    <View className="mb-3">
                      <View className="flex-row items-center mb-1">
                        <FontAwesome name="map-marker" size={14} color="#6b7280" />
                        <Text className="text-gray-500 text-xs ml-2">Village</Text>
                      </View>
                      <Text className="text-gray-800 font-semibold text-sm ml-6">
                        {farmerProfile.profile.village}
                      </Text>
                    </View>

                    <View>
                      <View className="flex-row items-center mb-1">
                        <FontAwesome name="building" size={14} color="#6b7280" />
                        <Text className="text-gray-500 text-xs ml-2">District</Text>
                      </View>
                      <Text className="text-gray-800 font-semibold text-sm ml-6">
                        {farmerProfile.profile.district}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {/* Registered Land Section */}
              {farmerProfile?.land && farmerProfile.land.length > 0 && (
                <>
                  <Text className="text-gray-500 text-xs font-semibold mb-3 uppercase">Registered Land</Text>
                  
                  <View className="bg-gray-50 rounded-lg p-4 mb-6">
                    {farmerProfile.land.map((land, index) => (
                      <View 
                        key={index} 
                        className={`${index !== 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}`}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center">
                            <View className="w-6 h-6 bg-green-500 rounded items-center justify-center mr-2">
                              <Text className="text-white font-bold text-xs">{index + 1}</Text>
                            </View>
                            <Text className="text-gray-800 font-bold text-sm">
                              Survey No: {land.surveyNo}
                            </Text>
                          </View>
                          <View className="bg-green-100 rounded-full px-2 py-0.5">
                            <Text className="text-green-700 font-semibold text-xs">
                              {land.landType}
                            </Text>
                          </View>
                        </View>

                        <View className="ml-6">
                          <View className="mb-2">
                            <Text className="text-gray-500 text-xs">Location</Text>
                            <Text className="text-gray-800 text-xs font-medium">
                              {land.village}, {land.tehsil}, {land.district}
                            </Text>
                          </View>
                          
                          <View className="flex-row items-center">
                            <FontAwesome name="expand" size={12} color="#10b981" />
                            <Text className="text-gray-500 text-xs ml-2">Area:</Text>
                            <Text className="text-green-600 font-bold text-sm ml-1">{land.area}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Settings Section */}
              <Text className="text-gray-500 text-xs font-semibold mb-3 mt-6 uppercase">Settings</Text>
              
              <TouchableOpacity 
                className="flex-row items-center py-4 border-b border-gray-200"
                onPress={handleNavigateToSettings}
              >
                <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                  <FontAwesome name="cog" size={18} color="#6b7280" />
                </View>
                <Text className="flex-1 text-gray-800 font-medium">App Settings</Text>
                <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {/* Support Section */}
              <Text className="text-gray-500 text-xs font-semibold mb-3 mt-6 uppercase">Support</Text>
              
              <TouchableOpacity className="flex-row items-center py-4 border-b border-gray-200">
                <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                  <FontAwesome name="headphones" size={18} color="#f97316" />
                </View>
                <Text className="flex-1 text-gray-800 font-medium">Help & Support</Text>
                <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center py-4 border-b border-gray-200">
                <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
                  <FontAwesome name="info-circle" size={18} color="#eab308" />
                </View>
                <Text className="flex-1 text-gray-800 font-medium">About</Text>
                <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
              </TouchableOpacity>

              {/* Logout */}
              <TouchableOpacity 
                className="flex-row items-center py-4 mt-4"
                onPress={handleLogout}
              >
                <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
                  <FontAwesome name="sign-out" size={18} color="#ef4444" />
                </View>
                <Text className="flex-1 text-red-600 font-semibold">Logout</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
