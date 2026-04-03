import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { SahayakService } from '../../components/services/apiService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function OnboardFarmerScreen() {
  const [formData, setFormData] = useState({
    name: '',
    mobileNumber: '',
    village: '',
    district: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { name, mobileNumber, village } = formData;
    
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter farmer\'s name.');
      return false;
    }
    if (!mobileNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter farmer\'s mobile number.');
      return false;
    }
    if (mobileNumber.length !== 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return false;
    }
    if (!village.trim()) {
      Alert.alert('Validation Error', 'Please enter farmer\'s village.');
      return false;
    }
    
    return true;
  };

  const handleOnboardFarmer = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // Call Phase 2 API to onboard farmer
      const response = await SahayakService.onboardNewFarmer(null, formData);
      
      if (response.success) {
        Alert.alert(
          '✓ Farmer Onboarded Successfully',
          `${formData.name} has been registered.\n\nFarmer ID: ${response.farmerId}\nUsername: ${response.username}\n\nNext Steps:
1. Complete KYC verification (Aadhaar)
2. Register land details
3. Set password for approval`,
          [
            {
              text: 'Done',
              onPress: () => {
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to onboard farmer');
      }
    } catch (error) {
      console.error('Error onboarding farmer:', error);
      Alert.alert('Error', 'Failed to onboard farmer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-blue-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome name="arrow-left" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <View className="flex-1 mt-5">
            <Text className="text-2xl font-bold text-blue-800">Onboard New Farmer</Text>
            <Text className="text-blue-600 mt-1">Create a new farmer profile</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6 space-y-6">
          {/* Farmer Name */}
          <View className="space-y-2">
            <Text className="text-blue-800 font-semibold text-lg">
              Farmer's Name <Text className="text-red-500">*</Text>
            </Text>
            <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
              <FontAwesome name="user" size={20} color="#3b82f6" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-800"
                placeholder="Enter farmer's full name"
                placeholderTextColor="#6B7280"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Mobile Number */}
          <View className="space-y-2">
            <Text className="text-blue-800 font-semibold text-lg">
              Mobile Number <Text className="text-red-500">*</Text>
            </Text>
            <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
              <FontAwesome name="phone" size={20} color="#3b82f6" />
              <Text className="ml-3 text-base text-gray-800 font-semibold">+91</Text>
              <TextInput
                className="flex-1 ml-2 text-base text-gray-800"
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#6B7280"
                value={formData.mobileNumber}
                onChangeText={(value) => handleInputChange('mobileNumber', value)}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Village */}
          <View className="space-y-2">
            <Text className="text-blue-800 font-semibold text-lg">
              Village <Text className="text-red-500">*</Text>
            </Text>
            <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
              <FontAwesome name="map-marker" size={20} color="#3b82f6" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-800"
                placeholder="Enter village name"
                placeholderTextColor="#6B7280"
                value={formData.village}
                onChangeText={(value) => handleInputChange('village', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* District (Optional) */}
          <View className="space-y-2">
            <Text className="text-blue-800 font-semibold text-lg">
              District <Text className="text-gray-500 font-normal text-sm">(optional)</Text>
            </Text>
            <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
              <FontAwesome name="building" size={20} color="#3b82f6" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-800"
                placeholder="Farmer's district of residence"
                placeholderTextColor="#6B7280"
                value={formData.district}
                onChangeText={(value) => handleInputChange('district', value)}
                autoCapitalize="words"
              />
            </View>
            {/* <Text className="text-xs text-gray-600 px-1">Note: Land may be registered in a different district</Text> */}
          </View>

          {/* Onboard Button */}
          <TouchableOpacity
            className={`rounded-lg py-4 px-6 mt-8 ${isLoading ? 'bg-blue-300' : 'bg-blue-500'} shadow-sm`}
            onPress={handleOnboardFarmer}
            disabled={isLoading}
          >
            {isLoading ? (
              <View className="flex-row items-center justify-center">
                <LoadingSpinner size="small" color="#ffffff" />
                <Text className="text-white font-semibold text-lg ml-2">Onboarding...</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-lg text-center">Onboard Farmer</Text>
            )}
          </TouchableOpacity>

          {/* Info Note */}
          {/* <View className="bg-blue-100 rounded-lg p-4 mt-6">
            <View className="flex-row">
              <FontAwesome name="info-circle" size={16} color="#3b82f6" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-800 font-semibold text-sm mb-1">Note:</Text>
                <Text className="text-blue-700 text-xs leading-4">
                  After onboarding, the farmer will need to complete KYC verification and land registration 
                  through your guidance. You can manage their progress from the farmer detail page.
                </Text>
              </View>
            </View>
          </View> */}
        </View>
      </ScrollView>
    </View>
  );
}
