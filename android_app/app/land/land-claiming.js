import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { LandService, ApplicationService } from '../../components/services/apiService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import CustomButton from '../../components/ui/CustomButton';

export default function LandClaimingScreen() {
  const { addedLand } = useLocalSearchParams();
  const [landBuckets, setLandBuckets] = useState([]);
  const [selectedBuckets, setSelectedBuckets] = useState([]);
  const [addedLands, setAddedLands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLandBuckets();
  }, []);

  // Handle manually added lands from navigation params
  useEffect(() => {
    if (addedLand) {
      try {
        const landData = JSON.parse(addedLand);
        setAddedLands(prev => {
          // Check if this land is already added to avoid duplicates
          const exists = prev.some(land => land.surveyNo === landData.surveyNo);
          if (!exists) {
            return [...prev, landData];
          }
          return prev;
        });
      } catch (error) {
        console.error('Error parsing added land data:', error);
      }
    }
  }, [addedLand]);

  // Listen for manually added lands from other screens
  useEffect(() => {
    const handleRouteParams = () => {
      // This will be triggered when returning from add-land-manually screen
      // In a real app, you might use a context or navigation params
    };
    
    // Load any saved manually added lands from storage if needed
    loadAddedLands();
  }, []);

  const loadAddedLands = () => {
    // In a real app, this would load from AsyncStorage or context
    // For now, we'll use a simple state management
    console.log('Loading manually added lands');
  };

  const loadLandBuckets = async () => {
    try {
      setIsLoading(true);
      const response = await LandService.getLandBuckets();
      
      if (response.success) {
        setLandBuckets(response.buckets);
      } else {
        Alert.alert('Error', 'Failed to load land data');
      }
    } catch (error) {
      console.error('Error loading land buckets:', error);
      Alert.alert('Error', 'Failed to load land data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadLandBuckets();
    setIsRefreshing(false);
  };

  const toggleBucketSelection = (bucketId) => {
    setSelectedBuckets(prev => {
      if (prev.includes(bucketId)) {
        return prev.filter(id => id !== bucketId);
      } else {
        return [...prev, bucketId];
      }
    });
  };

  const handleClaimSelected = async () => {
    const totalLands = selectedBuckets.length + addedLands.length;
    if (totalLands === 0) {
      Alert.alert('No Selection', 'Please select at least one land parcel to claim or add land manually.');
      return;
    }

    Alert.alert(
      'Confirm Land Claim',
      `You are about to claim ${totalLands} land parcel(s) (${selectedBuckets.length} pre-populated + ${addedLands.length} manually added). This action cannot be undone. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: submitClaim,
          style: 'default'
        }
      ]
    );
  };

  const submitClaim = async () => {
    try {
      setIsSubmitting(true);
      
      const claimData = {
        claimedBuckets: selectedBuckets,
        addedLands: addedLands // Now properly includes manually added lands
      };

      console.log('Submitting claim data:', claimData);
      console.log('Added lands count:', addedLands.length);
      console.log('Selected buckets count:', selectedBuckets.length);

      const response = await ApplicationService.claimLands(claimData);
      
      if (response.success) {
        Alert.alert(
          'Success!',
          `Your land claim application has been submitted successfully.\n\nApplication ID: ${response.applicationId}\nTotal Lands: ${response.totalLands}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to home and refresh the data
                router.replace('/(tabs)/home');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit land claim');
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
      Alert.alert('Error', 'Failed to submit land claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddManually = () => {
    router.push('/land/add-land-manually');
  };

  const handleViewOnMap = (bucket) => {
    // Create land data object compatible with map view
    const landData = {
      landId: bucket.bucketId,
      village: bucket.village,
      tehsil: bucket.tehsil,
      district: bucket.district,
      surveyNo: bucket.surveyNo,
      ownerName: bucket.ownerName,
      area: bucket.area,
      landType: bucket.landType || 'Agricultural',
      geoJson: bucket.geoJson || {
        type: 'Polygon',
        coordinates: [[[75.1230, 14.4560], [75.1240, 14.4560], [75.1240, 14.4570], [75.1230, 14.4570], [75.1230, 14.4560]]]
      }
    };

    router.push({
      pathname: '/land/map-view',
      params: { 
        landData: JSON.stringify(landData)
      }
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-green-50">
        <StatusBar style="dark" />
        <LoadingSpinner size="large" color="#10b981" />
      </View>
    );
  }

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
            <Text className="text-white text-xl font-bold">Claim Your Land</Text>
            <Text className="text-green-100 text-sm">
              Select the land parcels that belong to you
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-6 py-6"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Instructions */}
        {/* <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
          <View className="flex-row items-center mb-2">
            <FontAwesome name="info-circle" size={20} color="#3b82f6" />
            <Text className="text-blue-800 font-semibold ml-2">Instructions</Text>
          </View>
          <Text className="text-blue-700 text-sm leading-5">
            • Review the pre-populated land records below
            {'\n'}• Select the lands that belong to you by tapping the checkbox
            {'\n'}• If your land is not listed, use "Add Manually" option
            {'\n'}• Submit your selection to create your land claim application
          </Text>
        </View> */}
        {/* Add Manually Section */}
        <View className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
          <View className="flex-row items-center mb-4">
            <FontAwesome name="plus-circle" size={24} color="#10b981" />
            <Text className="text-lg font-bold text-gray-800 ml-3">
              Land Not Listed?
            </Text>
          </View>
          <Text className="text-gray-600 mb-4 leading-5">
            If your land is not shown in the above list, you can search and add it manually 
            using the survey number and other details.
          </Text>
          <CustomButton
            title="Add Land Manually"
            onPress={handleAddManually}
            variant="outline"
            icon={<FontAwesome name="search" size={18} color="#10b981" />}
          />
        </View>

        {/* Selection Summary */}
        {(selectedBuckets.length > 0 || addedLands.length > 0) && (
          <View className="bg-green-100 rounded-xl p-4 mb-6 border border-green-200">
            <Text className="text-green-800 font-semibold">
              {selectedBuckets.length + addedLands.length} land parcel(s) selected 
              ({selectedBuckets.length} pre-populated + {addedLands.length} manually added)
            </Text>
          </View>
        )}

        {/* Manually Added Lands Section */}
        {addedLands.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-4">
              Manually Added Lands
            </Text>
            {addedLands.map((land, index) => (
              <View
                key={`manual_${index}`}
                className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200"
              >
                <View className="flex-row items-center mb-2">
                  <FontAwesome name="plus-circle" size={16} color="#3b82f6" />
                  <Text className="text-gray-800 font-bold ml-2">
                    Survey No: {land.surveyNo}
                  </Text>
                </View>
                
                <View className="space-y-1">
                  <View className="flex-row items-center">
                    <Text className="text-gray-600 text-sm w-20">Village:</Text>
                    <Text className="text-gray-800 text-sm font-medium">
                      {land.village}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-gray-600 text-sm w-20">District:</Text>
                    <Text className="text-gray-800 text-sm font-medium">
                      {land.district}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-gray-600 text-sm w-20">Area:</Text>
                    <Text className="text-gray-800 text-sm font-medium">
                      {land.area}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  onPress={() => {
                    setAddedLands(prev => prev.filter((_, i) => i !== index));
                  }}
                  className="mt-3 bg-red-500 rounded-lg py-2 px-3 flex-row items-center justify-center"
                >
                  <FontAwesome name="trash" size={14} color="white" />
                  <Text className="text-white text-sm font-semibold ml-1">Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Land Buckets List */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Available Land Records
          </Text>
          
          {landBuckets.length === 0 ? (
            <View className="bg-white rounded-xl p-6 items-center border border-gray-200">
              <FontAwesome name="map-o" size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-center mt-4 mb-2 font-semibold">
                No Land Records Found
              </Text>
              <Text className="text-gray-400 text-center text-sm">
                No pre-populated land records are available for your profile.
                You can manually add your land details.
              </Text>
            </View>
          ) : (
            landBuckets.map((bucket, index) => (
              <TouchableOpacity
                key={bucket.bucketId}
                onPress={() => toggleBucketSelection(bucket.bucketId)}
                className={`bg-white rounded-xl p-4 mb-4 border-2 ${
                  selectedBuckets.includes(bucket.bucketId)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200'
                }`}
              >
                <View className="flex-row items-start">
                  <View className={`w-6 h-6 rounded border-2 mr-4 mt-1 items-center justify-center ${
                    selectedBuckets.includes(bucket.bucketId)
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedBuckets.includes(bucket.bucketId) && (
                      <FontAwesome name="check" size={14} color="white" />
                    )}
                  </View>
                  
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <FontAwesome name="map-marker" size={16} color="#10b981" />
                      <Text className="text-gray-800 font-bold ml-2">
                        Survey No: {bucket.surveyNo}
                      </Text>
                    </View>
                    
                    <View className="space-y-1">
                      <View className="flex-row items-center">
                        <Text className="text-gray-600 text-sm w-20">Village:</Text>
                        <Text className="text-gray-800 text-sm font-medium">
                          {bucket.village}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-gray-600 text-sm w-20">Tehsil:</Text>
                        <Text className="text-gray-800 text-sm font-medium">
                          {bucket.tehsil}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-gray-600 text-sm w-20">District:</Text>
                        <Text className="text-gray-800 text-sm font-medium">
                          {bucket.district}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-gray-600 text-sm w-20">Area:</Text>
                        <Text className="text-gray-800 text-sm font-medium">
                          {bucket.area}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-gray-600 text-sm w-20">Owner:</Text>
                        <Text className="text-gray-800 text-sm font-medium">
                          {bucket.ownerName}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Action buttons */}
                    {/* <View className="flex-row mt-3 space-x-2">
                      <TouchableOpacity
                        onPress={() => handleViewOnMap(bucket)}
                        className="flex-1 bg-blue-500 rounded-lg py-2 px-3 flex-row items-center justify-center"
                      >
                        <FontAwesome name="map" size={14} color="white" />
                        <Text className="text-white text-sm font-semibold ml-1">View on Map</Text>
                      </TouchableOpacity>
                    </View> */}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>


      </ScrollView>

      {/* Bottom Action Buttons */}
      <View className="bg-white border-t border-gray-200 p-6">
        <CustomButton
          title={`Claim Selected Lands (${selectedBuckets.length + addedLands.length})`}
          onPress={handleClaimSelected}
          disabled={selectedBuckets.length === 0 && addedLands.length === 0}
          loading={isSubmitting}
          variant="primary"
          icon={<FontAwesome name="paper-plane" size={18} color="white" />}
        />
      </View>
    </View>
  );
}
