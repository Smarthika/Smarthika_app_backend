import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { LandService } from '../../components/services/apiService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import CustomButton from '../../components/ui/CustomButton';

export default function AddLandManuallyScreen() {
  const [formData, setFormData] = useState({
    district: '',
    tehsil: '',
    village: '',
    surveyNo: ''
  });
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset search results when form changes
    if (hasSearched) {
      setSearchResults(null);
      setHasSearched(false);
    }
  };

  const validateForm = () => {
    const { district, tehsil, village, surveyNo } = formData;
    
    if (!district.trim()) {
      Alert.alert('Validation Error', 'Please enter the district name.');
      return false;
    }
    if (!tehsil.trim()) {
      Alert.alert('Validation Error', 'Please enter the tehsil name.');
      return false;
    }
    if (!village.trim()) {
      Alert.alert('Validation Error', 'Please enter the village name.');
      return false;
    }
    if (!surveyNo.trim()) {
      Alert.alert('Validation Error', 'Please enter the survey number.');
      return false;
    }
    
    return true;
  };

  const handleSearch = async () => {
    if (!validateForm()) return;

    try {
      setIsSearching(true);
      setHasSearched(true);
      
      const searchData = {
        villageId: formData.village, // In real implementation, this would be mapped to village ID
        surveyNo: formData.surveyNo
      };

      const response = await LandService.searchLand(searchData);
      
      if (response.success) {
        setSearchResults(response.landDetails);
      } else {
        setSearchResults(null);
        Alert.alert(
          'Land Not Found', 
          response.message || 'No land parcel found with the provided details. Please verify the information and try again.'
        );
      }
    } catch (error) {
      console.error('Error searching land:', error);
      Alert.alert('Error', 'Failed to search for land. Please try again.');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewOnMap = () => {
    if (searchResults) {
      router.push({
        pathname: '/land/map-view',
        params: { 
          landData: JSON.stringify(searchResults)
        }
      });
    }
  };

  const handleConfirmLand = () => {
    Alert.alert(
      'Confirm Land Addition',
      'Are you sure you want to add this land parcel to your claim?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // Add the land to the claim list and navigate back
            Alert.alert(
              'Success',
              'Land parcel has been added to your claim. You can now proceed with your application.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // In a real app, you would store this in AsyncStorage or context
                    // For now, we'll simulate the addition
                    router.navigate({
                      pathname: '/land/land-claiming',
                      params: {
                        addedLand: JSON.stringify(searchResults)
                      }
                    });
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-green-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-green-500 pt-12 pb-6 px-6">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="mr-4 p-2"
          >
            <FontAwesome name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">Add Land Manually</Text>
            <Text className="text-green-100 text-sm">
              Search for your land using survey details
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Instructions */}
        {/* <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
          <View className="flex-row items-center mb-2">
            <FontAwesome name="info-circle" size={20} color="#3b82f6" />
            <Text className="text-blue-800 font-semibold ml-2">How to Search</Text>
          </View>
          <Text className="text-blue-700 text-sm leading-5">
            Enter the exact details as mentioned in your land documents. 
            Make sure the survey number format matches your official records (e.g., 123/4, 45/2A, etc.).
          </Text>
        </View> */}

        {/* Search Form */}
        <View className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-4">Land Details</Text>
          
          {/* District Input */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">District *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800 bg-gray-50"
              placeholder="Enter district name"
              placeholderTextColor="#6B7280"
              value={formData.district}
              onChangeText={(value) => handleInputChange('district', value)}
              autoCapitalize="words"
            />
          </View>

          {/* Tehsil Input */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Tehsil *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800 bg-gray-50"
              placeholder="Enter tehsil name"
              placeholderTextColor="#6B7280"
              value={formData.tehsil}
              onChangeText={(value) => handleInputChange('tehsil', value)}
              autoCapitalize="words"
            />
          </View>

          {/* Village Input */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Village *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800 bg-gray-50"
              placeholder="Enter village name"
              placeholderTextColor="#6B7280"
              value={formData.village}
              onChangeText={(value) => handleInputChange('village', value)}
              autoCapitalize="words"
            />
          </View>

          {/* Survey Number Input */}
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-2">Survey Number *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800 bg-gray-50"
              placeholder="e.g., 123/4, 45/2A"
              placeholderTextColor="#6B7280"
              value={formData.surveyNo}
              onChangeText={(value) => handleInputChange('surveyNo', value)}
              autoCapitalize="characters"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Enter the survey number exactly as shown in your land documents
            </Text>
          </View>

          {/* Search Button */}
          <CustomButton
            title="Search Land"
            onPress={handleSearch}
            loading={isSearching}
            icon={<FontAwesome name="search" size={18} color="white" />}
          />
        </View>

        {/* Search Results */}
        {hasSearched && (
          <View className="bg-white rounded-xl p-6 border border-gray-200 mb-16">
            <Text className="text-lg font-bold text-gray-800 mb-4">Search Results</Text>
            
            {searchResults ? (
              <View>
                {/* Success Message */}
                <View className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
                  <View className="flex-row items-center mb-2">
                    <FontAwesome name="check-circle" size={20} color="#10b981" />
                    <Text className="text-green-800 font-semibold ml-2">Land Found!</Text>
                  </View>
                  <Text className="text-green-700 text-sm">
                    We found a matching land parcel. Please verify the details below.
                  </Text>
                </View>

                {/* Land Details */}
                <View className="space-y-3 mb-6">
                  <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600 font-medium">Survey Number:</Text>
                    <Text className="text-gray-800 font-bold">{searchResults.surveyNo}</Text>
                  </View>
                  <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600 font-medium">Village:</Text>
                    <Text className="text-gray-800">{searchResults.village}</Text>
                  </View>
                  <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600 font-medium">Tehsil:</Text>
                    <Text className="text-gray-800">{searchResults.tehsil}</Text>
                  </View>
                  <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600 font-medium">District:</Text>
                    <Text className="text-gray-800">{searchResults.district}</Text>
                  </View>
                  <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600 font-medium">Owner Name:</Text>
                    <Text className="text-gray-800">{searchResults.ownerName}</Text>
                  </View>
                  <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600 font-medium">Area:</Text>
                    <Text className="text-gray-800">{searchResults.area}</Text>
                  </View>
                  <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600 font-medium">Land Type:</Text>
                    <Text className="text-gray-800">{searchResults.landType}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="space-y-3">
                  <CustomButton
                    className='mb-3'
                    title="View on Map"
                    onPress={handleViewOnMap}
                    variant="outline"
                    icon={<FontAwesome name="map" size={18} color="#10b981" />}
                  />
                  <CustomButton
                    title="Confirm This is My Land"
                    onPress={handleConfirmLand}
                    variant="primary"
                    icon={<FontAwesome name="check" size={18} color="white" />}
                  />
                </View>
              </View>
            ) : (
              <View className="items-center py-8">
                <FontAwesome name="search" size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-4 mb-2 font-semibold">
                  No Land Found
                </Text>
                <Text className="text-gray-400 text-center text-sm">
                  No land parcel found with the provided details.
                  Please verify the information and try again.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Help Section */}
        {/* <View className="bg-yellow-50 rounded-xl p-4 mt-6 border border-yellow-200">
          <View className="flex-row items-center mb-2">
            <FontAwesome name="question-circle" size={20} color="#f59e0b" />
            <Text className="text-yellow-800 font-semibold ml-2">Need Help?</Text>
          </View>
          <Text className="text-yellow-700 text-sm leading-5">
            If you're unable to find your land, please check your land documents for the exact 
            spellings and survey number format. You can also contact our support team for assistance.
          </Text>
        </View> */}
      </ScrollView>
    </View>
  );
}
