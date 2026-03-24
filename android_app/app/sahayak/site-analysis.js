import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { SahayakService } from '../../components/services/apiService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function SiteAnalysisScreen() {
  const { farmerId } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState({
    soilType: '',
    waterSource: '',
    powerAvailability: '',
    siteCondition: '',
    recommendations: '',
    suitabilityScore: 85 // Default score
  });

  const handleInputChange = (field, value) => {
    setAnalysisData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!analysisData.soilType.trim()) {
      Alert.alert('Error', 'Please enter soil type');
      return false;
    }
    if (!analysisData.waterSource.trim()) {
      Alert.alert('Error', 'Please specify water source availability');
      return false;
    }
    if (!analysisData.powerAvailability.trim()) {
      Alert.alert('Error', 'Please specify power availability');
      return false;
    }
    if (!analysisData.siteCondition.trim()) {
      Alert.alert('Error', 'Please describe site condition');
      return false;
    }
    return true;
  };

  const handleCompleteSiteAnalysis = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // Call API to complete site analysis
      const response = await SahayakService.completeSiteAnalysis(null, farmerId, analysisData);
      
      if (response.success) {
        Alert.alert(
          'Site Analysis Completed!',
          response.message,
          [
            {
              text: 'OK',
              onPress: () => {
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to complete site analysis');
      }
    } catch (error) {
      console.error('Error completing site analysis:', error);
      Alert.alert('Error', 'Failed to complete site analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-purple-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <FontAwesome name="arrow-left" size={24} color="#7c3aed" />
          </TouchableOpacity>
          <View className="flex-1 mt-5">
            <Text className="text-2xl font-bold text-purple-800">Site Analysis</Text>
            <Text className="text-purple-600 mt-1">Conduct field assessment</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Info Card */}
        <View className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mr-4">
              <FontAwesome name="search" size={20} color="#7c3aed" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-800">Field Assessment</Text>
              <Text className="text-gray-600 text-sm">Farmer ID: {farmerId}</Text>
            </View>
          </View>
          
          <Text className="text-gray-700 text-sm leading-5">
            Conduct a thorough site analysis to determine suitability for smart farming devices. 
            Assess soil conditions, water availability, power infrastructure, and overall site conditions.
          </Text>
        </View>

        {/* Form Fields */}
        <View className="space-y-6">
          {/* Soil Type */}
          <View className="space-y-2">
            <Text className="text-purple-800 font-semibold text-lg">
              Soil Type <Text className="text-red-500">*</Text>
            </Text>
            <View className="bg-white rounded-lg border border-purple-200 flex-row items-center px-4 py-4">
              <FontAwesome name="leaf" size={20} color="#7c3aed" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-800"
                placeholder="e.g., Clay, Sandy, Loamy, Black soil"
                placeholderTextColor="#6B7280"
                value={analysisData.soilType}
                onChangeText={(value) => handleInputChange('soilType', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Water Source */}
          <View className="space-y-2">
            <Text className="text-purple-800 font-semibold text-lg">
              Water Source Availability <Text className="text-red-500">*</Text>
            </Text>
            <View className="bg-white rounded-lg border border-purple-200 flex-row items-center px-4 py-4">
              <FontAwesome name="tint" size={20} color="#7c3aed" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-800"
                placeholder="e.g., Borewell, Canal, Pond, River access"
                placeholderTextColor="#6B7280"
                value={analysisData.waterSource}
                onChangeText={(value) => handleInputChange('waterSource', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Power Availability */}
          <View className="space-y-2">
            <Text className="text-purple-800 font-semibold text-lg">
              Power Availability <Text className="text-red-500">*</Text>
            </Text>
            <View className="bg-white rounded-lg border border-purple-200 flex-row items-center px-4 py-4">
              <FontAwesome name="bolt" size={20} color="#7c3aed" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-800"
                placeholder="e.g., Grid power, Solar potential, Generator"
                placeholderTextColor="#6B7280"
                value={analysisData.powerAvailability}
                onChangeText={(value) => handleInputChange('powerAvailability', value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Site Condition */}
          <View className="space-y-2">
            <Text className="text-purple-800 font-semibold text-lg">
              Site Condition <Text className="text-red-500">*</Text>
            </Text>
            <View className="bg-white rounded-lg border border-purple-200 flex-row items-start px-4 py-4">
              <FontAwesome name="map-marker" size={20} color="#7c3aed" style={{marginTop: 2}} />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-800"
                placeholder="Describe terrain, accessibility, obstacles, etc."
                placeholderTextColor="#6B7280"
                value={analysisData.siteCondition}
                onChangeText={(value) => handleInputChange('siteCondition', value)}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Recommendations */}
          <View className="space-y-2">
            <Text className="text-purple-800 font-semibold text-lg">Recommendations</Text>
            <View className="bg-white rounded-lg border border-purple-200 flex-row items-start px-4 py-4">
              <FontAwesome name="lightbulb-o" size={20} color="#7c3aed" style={{marginTop: 2}} />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-800"
                placeholder="Suggest optimal device placement, preparations needed, etc."
                placeholderTextColor="#6B7280"
                value={analysisData.recommendations}
                onChangeText={(value) => handleInputChange('recommendations', value)}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Suitability Score */}
          {/* <View className="space-y-2">
            <Text className="text-purple-800 font-semibold text-lg">Suitability Score</Text>
            <View className="bg-white rounded-lg border border-purple-200 p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-700">Overall Suitability</Text>
                <Text className="text-2xl font-bold text-purple-600">{analysisData.suitabilityScore}%</Text>
              </View>
              <View className="bg-gray-200 rounded-full h-3">
                <View 
                  className="bg-purple-500 h-3 rounded-full" 
                  style={{width: `${analysisData.suitabilityScore}%`}}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-2">
                Score based on soil, water, power, and site conditions
              </Text>
            </View>
          </View> */}
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          className={`rounded-lg py-4 px-6 mt-8 mb-20 ${isLoading ? 'bg-purple-300' : 'bg-purple-500'} shadow-sm`}
          onPress={handleCompleteSiteAnalysis}
          disabled={isLoading}
        >
          {isLoading ? (
            <View className="flex-row items-center justify-center">
              <LoadingSpinner size="small" color="#ffffff" />
              <Text className="text-white font-semibold text-lg ml-2">Completing Analysis...</Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-lg text-center">Complete Site Analysis</Text>
          )}
        </TouchableOpacity>

        {/* Important Notes */}
        {/* <View className="bg-yellow-100 rounded-lg p-4 mt-6">
          <View className="flex-row">
            <FontAwesome name="exclamation-triangle" size={16} color="#f59e0b" />
            <View className="flex-1 ml-3">
              <Text className="text-yellow-800 font-semibold text-sm mb-1">Important:</Text>
              <Text className="text-yellow-700 text-xs leading-4">
                • Conduct physical site visit before completing analysis{'\n'}
                • Verify all infrastructure requirements{'\n'}
                • Document any special conditions or requirements{'\n'}
                • Completion will approve farmer for device installation
              </Text>
            </View>
          </View>
        </View> */}

        {/* Demo Note */}
        {/* <View className="bg-purple-100 rounded-lg p-4 mt-4 mb-8">
          <View className="flex-row">
            <FontAwesome name="info-circle" size={16} color="#7c3aed" />
            <View className="flex-1 ml-3">
              <Text className="text-purple-800 font-semibold text-sm mb-1">Demo Mode:</Text>
              <Text className="text-purple-700 text-xs leading-4">
                In demo mode, any values will be accepted. In production, this would integrate 
                with field survey tools and validation systems.
              </Text>
            </View>
          </View>
        </View> */}
      </ScrollView>
    </View>
  );
}
