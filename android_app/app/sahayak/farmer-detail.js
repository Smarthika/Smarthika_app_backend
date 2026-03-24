import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { SahayakService } from '../../components/services/apiService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function FarmerDetailScreen() {
  const { farmerId } = useLocalSearchParams();
  const [farmer, setFarmer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [farmerPassword, setFarmerPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadFarmerDetails();
  }, [farmerId]);

  useFocusEffect(
    React.useCallback(() => {
      loadFarmerDetails();
    }, [farmerId])
  );

  const loadFarmerDetails = async () => {
    try {
      setIsLoading(true);

      // Load farmer details
      const response = await SahayakService.getFarmerDetails(null, farmerId);
      if (response.success) {
        setFarmer(response.farmer);
      } else {
        Alert.alert('Error', 'Farmer not found');
        router.back();
      }

    } catch (error) {
      console.error('Error loading farmer details:', error);
      Alert.alert('Error', 'Failed to load farmer details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING_KYC': return 'bg-red-100 text-red-800';
      case 'PENDING_LAND_VERIFICATION': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING_SITE_ANALYSIS': return 'bg-blue-100 text-blue-800';
      case 'PENDING_PASSWORD_SETUP': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canStartKYC = () => {
    return farmer?.status === 'PENDING_KYC';
  };

  const canRegisterLand = () => {
    return farmer?.status === 'PENDING_LAND_VERIFICATION';
  };

  const canCompleteSiteAnalysis = () => {
    return farmer?.status === 'PENDING_SITE_ANALYSIS';
  };

  const canRequestDevices = () => {
    return farmer?.status === 'PENDING_PASSWORD_SETUP';
  };

  const handleStartKYC = () => {
    router.push(`/sahayak/kyc-registration?farmerId=${farmerId}`);
  };

  const handleRegisterLand = () => {
    router.push(`/sahayak/land-registration?farmerId=${farmerId}`);
  };

  const handleCompleteSiteAnalysis = () => {
    router.push(`/sahayak/site-analysis?farmerId=${farmerId}`);
  };

  const handleSetFarmerPassword = async () => {
    if (!canRequestDevices()) {
      Alert.alert('Error', 'Complete site analysis first');
      return;
    }

    if (!farmerPassword.trim() || farmerPassword.trim().length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsSavingPassword(true);
      const response = await SahayakService.setFarmerPassword(null, farmerId, farmerPassword.trim());

      if (response.success) {
        Alert.alert(
          'Password Saved',
          `Farmer login credentials updated.\nUsername: ${response.username || farmer?.mobile}\nPassword: ${farmerPassword.trim()}`
        );
        setFarmerPassword('');
        setShowPassword(false);
        setIsPasswordModalVisible(false);
        // Auto-reload farmer details to reflect APPROVED status
        loadFarmerDetails();
      } else {
        Alert.alert('Error', response.message || 'Failed to set password');
      }
    } catch (error) {
      console.error('Set password error:', error);
      Alert.alert('Error', 'Failed to set password. Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-blue-50 justify-center items-center">
        <LoadingSpinner size="large" color="#3b82f6" />
        <Text className="text-blue-800 mt-4">Loading farmer details...</Text>
      </View>
    );
  }

  if (!farmer) {
    return (
      <View className="flex-1 bg-blue-50 justify-center items-center">
        <FontAwesome name="user-times" size={64} color="#d1d5db" />
        <Text className="text-gray-500 text-lg mt-4">Farmer not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      enabled={true}
    >
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.push('/sahayak/dashboard')}
            className="mr-4"
          >
            <FontAwesome name="arrow-left" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <View className="flex-1 mt-5">
            <Text className="text-2xl font-bold text-blue-800">Farmer Details</Text>
            <Text className="text-blue-600 mt-1">Manage farmer application</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1 bg-blue-50"
        scrollEnabled={true}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="p-6 space-y-6">
          {/* Farmer Info Card */}
          <View className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mr-4">
                <FontAwesome name="user" size={24} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-800">{farmer.name}</Text>
                <Text className="text-gray-600">ID: {farmer.farmerId}</Text>
              </View>
              <View className={`rounded-full px-3 py-1 ${getStatusColor(farmer.status)}`}>
                <Text className="text-xs font-medium">
                  {farmer.status.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>

            <View className="space-y-6">
              <View className="flex-row">
                <FontAwesome name="phone" size={20} color="#6b7280" />
                <Text className="text-gray-700 ml-5 mb-2">{farmer.mobile}</Text>
              </View>
              <View className="flex-row">
                <FontAwesome name="map-marker" size={20} color="#6b7280" />
                <Text className="text-gray-700 ml-5 mb-2">{farmer.village}</Text>
              </View>
              <View className="flex-row">
                <FontAwesome name="calendar" size={15} color="#6b7280" />
                <Text className="text-gray-700 ml-5 mb-2">Registered: {farmer.registeredDate}</Text>
              </View>
              {farmer.aadhaarNumber && (
                <View className="flex-row">
                  <FontAwesome name="id-card" size={15} color="#6b7280" />
                  <Text className="text-gray-700 ml-5 mb-2">Aadhaar: {farmer.aadhaarNumber}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-4 mt-4">
            <Text className="text-lg font-semibold text-gray-800">Available Actions</Text>

            {/* Start KYC Registration */}
            <TouchableOpacity
              className={`rounded-lg p-4 shadow-sm mb-4 ${
                canStartKYC() 
                  ? 'bg-red-500' 
                  : 'bg-gray-300'
              }`}
              onPress={canStartKYC() ? handleStartKYC : null}
              disabled={!canStartKYC()}
            >
              <View className="flex-row items-center">
                <FontAwesome 
                  name="id-card" 
                  size={20} 
                  color={canStartKYC() ? "#ffffff" : "#9ca3af"} 
                />
                <View className="flex-1 ml-3">
                  <Text className={`font-semibold text-base ${
                    canStartKYC() ? 'text-white' : 'text-gray-500'
                  }`}>
                    Start KYC Registration
                  </Text>
                  <Text className={`text-sm ${
                    canStartKYC() ? 'text-red-100' : 'text-gray-400'
                  }`}>
                    {canStartKYC() 
                      ? 'Begin Aadhaar verification process' 
                      : 'KYC already completed or not available'
                    }
                  </Text>
                </View>
                {canStartKYC() && (
                  <FontAwesome name="chevron-right" size={16} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>

            {/* Register Land */}
            <TouchableOpacity
              className={`rounded-lg p-4 shadow-sm mb-4 ${
                canRegisterLand() 
                  ? 'bg-yellow-500' 
                  : 'bg-gray-300'
              }`}
              onPress={canRegisterLand() ? handleRegisterLand : null}
              disabled={!canRegisterLand()}
            >
              <View className="flex-row items-center">
                <FontAwesome 
                  name="map" 
                  size={20} 
                  color={canRegisterLand() ? "#ffffff" : "#9ca3af"} 
                />
                <View className="flex-1 ml-3">
                  <Text className={`font-semibold text-base ${
                    canRegisterLand() ? 'text-white' : 'text-gray-500'
                  }`}>
                    Register Land
                  </Text>
                  <Text className={`text-sm ${
                    canRegisterLand() ? 'text-yellow-100' : 'text-gray-400'
                  }`}>
                    {canRegisterLand() 
                      ? 'Add land details and mark boundaries' 
                      : 'Complete KYC first or land already registered'
                    }
                  </Text>
                </View>
                {canRegisterLand() && (
                  <FontAwesome name="chevron-right" size={16} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>

            {/* Complete Site Analysis */}
            <TouchableOpacity
              className={`rounded-lg p-4 shadow-sm mb-4 ${
                canCompleteSiteAnalysis() 
                  ? 'bg-purple-500' 
                  : 'bg-gray-300'
              }`}
              onPress={canCompleteSiteAnalysis() ? handleCompleteSiteAnalysis : null}
              disabled={!canCompleteSiteAnalysis()}
            >
              <View className="flex-row items-center">
                <FontAwesome 
                  name="search" 
                  size={20} 
                  color={canCompleteSiteAnalysis() ? "#ffffff" : "#9ca3af"} 
                />
                <View className="flex-1 ml-3">
                  <Text className={`font-semibold text-base ${
                    canCompleteSiteAnalysis() ? 'text-white' : 'text-gray-500'
                  }`}>
                    Complete Site Analysis
                  </Text>
                  <Text className={`text-sm ${
                    canCompleteSiteAnalysis() ? 'text-purple-100' : 'text-gray-400'
                  }`}>
                    {canCompleteSiteAnalysis() 
                      ? 'Conduct site survey and approve for devices' 
                      : 'Complete land registration first'
                    }
                  </Text>
                </View>
                {canCompleteSiteAnalysis() && (
                  <FontAwesome name="chevron-right" size={16} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>

            {/* Set Farmer Password */}
            <TouchableOpacity
              className={`rounded-lg p-4 shadow-sm mb-4 ${
                canRequestDevices()
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-100 border border-gray-200'
              }`}
              onPress={canRequestDevices() ? () => setIsPasswordModalVisible(true) : null}
              disabled={!canRequestDevices()}
            >
              <View className="flex-row items-center mb-3">
                <FontAwesome
                  name="key"
                  size={20}
                  color={canRequestDevices() ? '#2563eb' : '#9ca3af'}
                />
                <Text className={`font-semibold text-base ml-3 ${canRequestDevices() ? 'text-blue-900' : 'text-gray-500'}`}>
                  Set Farmer Login Password
                </Text>
              </View>

              <Text className={`text-sm mb-3 ${canRequestDevices() ? 'text-blue-700' : 'text-gray-400'}`}>
                {canRequestDevices()
                  ? `Username will be mobile number: ${farmer.mobile}`
                  : 'Complete site analysis first'}
              </Text>

              <View className="flex-row items-center justify-between">
                <Text className={`text-sm ${canRequestDevices() ? 'text-blue-600' : 'text-gray-400'}`}>
                  Click to setup password
                </Text>
                {canRequestDevices() && (
                  <FontAwesome name="chevron-right" size={16} color="#2563eb" />
                )}
              </View>

            </TouchableOpacity>

          </View>

          {/* Progress Info */}
          {/* <View className="bg-blue-100 rounded-lg p-4">
            <View className="flex-row">
              <FontAwesome name="info-circle" size={16} color="#3b82f6" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-800 font-semibold text-sm mb-1">Progress Info:</Text>
                <Text className="text-blue-700 text-xs leading-4">
                  Actions are enabled based on the farmer's current status. Complete each step 
                  in order to progress the farmer's application through the system.
                </Text>
              </View>
            </View>
          </View> */}

          {/* Land Data (if available) */}
          {farmer.landData && (
            <View className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Land Details</Text>
              <View className="space-y-2">
                <Text className="text-gray-700">Survey No: {farmer.landData.surveyNo}</Text>
                <Text className="text-gray-700">Area: {farmer.landData.area}</Text>
                <Text className="text-gray-700">Village: {farmer.landData.village}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSavingPassword) {
            setIsPasswordModalVisible(false);
            setShowPassword(false);
          }
        }}
      >
        <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="bg-white rounded-xl p-5 w-full max-w-md border border-blue-200">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-blue-900">Setup Farmer Password</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!isSavingPassword) {
                    setIsPasswordModalVisible(false);
                    setShowPassword(false);
                  }
                }}
                disabled={isSavingPassword}
              >
                <FontAwesome name="times" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm text-blue-700 mb-3">
              Username: {farmer.mobile}
            </Text>

            <View className="bg-white rounded-lg border border-blue-200 px-3 py-2 mb-3">
              <TextInput
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor="#6B7280"
                value={farmerPassword}
                onChangeText={setFarmerPassword}
                secureTextEntry={!showPassword}
                editable={!isSavingPassword}
                autoCapitalize="none"
                autoCorrect={false}
                className="text-base text-gray-800"
              />
            </View>

            <TouchableOpacity
              className="mb-4 self-start"
              onPress={() => setShowPassword((prev) => !prev)}
              disabled={isSavingPassword}
            >
              <Text className="text-blue-600 font-medium">{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`rounded-lg py-3 ${!isSavingPassword ? 'bg-blue-600' : 'bg-gray-300'}`}
              onPress={handleSetFarmerPassword}
              disabled={isSavingPassword}
            >
              <Text className="text-white text-center font-semibold">
                {isSavingPassword ? 'Saving Password...' : 'Save Farmer Password'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
