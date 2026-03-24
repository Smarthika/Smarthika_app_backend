import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { SahayakService } from '../../components/services/apiService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function LandRegistrationScreen() {
  const params = useLocalSearchParams();
  const { farmerId } = params;
  const [landData, setLandData] = useState({
    surveyNo: '',
    village: '',
    tehsil: '',
    district: '',
    area: '',
    landType: 'Agricultural'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setLandData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { surveyNo, village, tehsil, district, area } = landData;
    
    if (!surveyNo.trim()) {
      Alert.alert('Validation Error', 'Please enter the survey number.');
      return false;
    }
    if (!village.trim()) {
      Alert.alert('Validation Error', 'Please enter the village name.');
      return false;
    }
    if (!tehsil.trim()) {
      Alert.alert('Validation Error', 'Please enter the tehsil name.');
      return false;
    }
    if (!district.trim()) {
      Alert.alert('Validation Error', 'Please enter the district name.');
      return false;
    }
    if (!area.trim()) {
      Alert.alert('Validation Error', 'Please enter the land area.');
      return false;
    }
    
    return true;
  };

  const handleSubmitLandDetails = async () => {
    console.log('Submit button pressed');
    console.log('Current landData:', landData);
    console.log('Has geoJson:', !!landData.geoJson);
    console.log('GeoJson content:', landData.geoJson);
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    try {
      setIsLoading(true);

      // Call Phase 2 API to register land
      const response = await SahayakService.registerLand(null, farmerId, landData);
      
      if (response.success) {
        Alert.alert(
          'Land Registered!',
          'The farmer\'s land details have been registered successfully. The application will now proceed to site analysis.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to farmer detail page instead of going back
                router.navigate({
                  pathname: '/sahayak/farmer-detail',
                  params: { farmerId: farmerId }
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to register land');
      }
    } catch (error) {
      console.error('Error registering land:', error);
      Alert.alert('Error', 'Failed to register land. Please try again.');
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
            className="mr-4"
          >
            <FontAwesome name="arrow-left" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <View className="flex-1 mt-5">
            <Text className="text-2xl font-bold text-blue-800">Land Registration</Text>
            <Text className="text-blue-600 mt-1">Register farmer's land details</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6 space-y-6">
          {/* Info Card */}
          <View className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-yellow-100 rounded-full items-center justify-center mr-4">
                <FontAwesome name="map" size={20} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">Land Details</Text>
                <Text className="text-gray-600 text-sm">Farmer ID: {farmerId}</Text>
              </View>
            </View>
            
            {/* <Text className="text-gray-700 text-sm leading-5">
              Enter the farmer's land details and mark the boundaries on the satellite map. 
              This information will be used for site analysis and device installation planning.
            </Text> */}
          </View>

          {/* Land Form */}
          <View className="space-y-4">
            {/* Survey Number */}
            <View className="space-y-2">
              <Text className="text-blue-800 font-semibold text-lg">
                Survey Number <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
                <FontAwesome name="file-text" size={20} color="#3b82f6" />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-800"
                  placeholder="e.g., 123/4"
                  placeholderTextColor="#6B7280"
                  value={landData.surveyNo}
                  onChangeText={(value) => handleInputChange('surveyNo', value)}
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
                  value={landData.village}
                  onChangeText={(value) => handleInputChange('village', value)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Tehsil */}
            <View className="space-y-2">
              <Text className="text-blue-800 font-semibold text-lg">
                Tehsil <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
                <FontAwesome name="building" size={20} color="#3b82f6" />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-800"
                  placeholder="Enter tehsil name"
                  placeholderTextColor="#6B7280"
                  value={landData.tehsil}
                  onChangeText={(value) => handleInputChange('tehsil', value)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* District */}
            <View className="space-y-2">
              <Text className="text-blue-800 font-semibold text-lg">
                District <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
                <FontAwesome name="building-o" size={20} color="#3b82f6" />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-800"
                  placeholder="Enter district name"
                  placeholderTextColor="#6B7280"
                  value={landData.district}
                  onChangeText={(value) => handleInputChange('district', value)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Area */}
            <View className="space-y-2">
              <Text className="text-blue-800 font-semibold text-lg">
                Area <Text className="text-red-500">*</Text>
              </Text>
              <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
                <FontAwesome name="calculator" size={20} color="#3b82f6" />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-800"
                  placeholder="e.g., 2.5 acres"
                  placeholderTextColor="#6B7280"
                  value={landData.area}
                  onChangeText={(value) => handleInputChange('area', value)}
                />
              </View>
            </View>
          </View>

          {/* Map Section */}
          {/* <View className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Land Boundaries</Text>

            <View className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <View className="flex-row items-center">
                <FontAwesome name="info-circle" size={18} color="#b45309" />
                <Text className="text-yellow-800 font-semibold ml-2">Map marking skipped</Text>
              </View>
              <Text className="text-yellow-700 text-sm mt-1">
                Boundary map marking is currently disabled. You can submit land details directly.
              </Text>
            </View>
          </View> */}

          {/* Submit Button */}
          <TouchableOpacity
            className={`rounded-lg py-4 px-6 mb-20 mt-4 ${isLoading ? 'bg-yellow-300' : 'bg-yellow-500'} shadow-sm`}
            onPress={handleSubmitLandDetails}
            disabled={isLoading}
          >
            {isLoading ? (
              <View className="flex-row items-center justify-center">
                <LoadingSpinner size="small" color="#ffffff" />
                <Text className="text-white font-semibold text-lg ml-2">Registering Land...</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-lg text-center">Submit Land Details</Text>
            )}
          </TouchableOpacity>

          {/* Instructions */}
          {/* <View className="bg-blue-100 rounded-lg p-4">
            <View className="flex-row">
              <FontAwesome name="info-circle" size={16} color="#3b82f6" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-800 font-semibold text-sm mb-1">Instructions:</Text>
                <Text className="text-blue-700 text-xs leading-4">
                  1. Fill in all required land details accurately{'\n'}
                  2. Use the map interface to mark exact land boundaries{'\n'}
                  3. Submit the details to proceed to site analysis phase{'\n'}
                  4. Ensure the farmer is present to verify information
                </Text>
              </View>
            </View>
          </View> */}
        </View>
      </ScrollView>
    </View>
  );
}
