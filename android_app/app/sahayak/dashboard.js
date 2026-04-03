import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../components/context/AuthContext';
import { SahayakService } from '../../components/services/apiService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function SahayakDashboard() {
  const { user, logout } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [filteredFarmers, setFilteredFarmers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const normalizeFlowStatus = (status) => {
    const normalizedStatus = String(status || '').trim().toUpperCase();

    if (
      normalizedStatus === 'PENDING_SITE_ANALYSIS'
      || normalizedStatus === 'SITE_ANALYSIS_PENDING'
      || normalizedStatus === 'PENDING_ANALYSIS'
    ) {
      return 'PENDING_PASSWORD_SETUP';
    }

    return normalizedStatus || 'PENDING_KYC';
  };

  useEffect(() => {
    loadFarmers();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFarmers();
    }, [])
  );

  // Filter farmers based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFarmers(farmers);
    } else {
      const filtered = farmers.filter(farmer => 
        farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        farmer.mobile.includes(searchQuery) ||
        farmer.village.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFarmers(filtered);
    }
  }, [searchQuery, farmers]);

  const loadFarmers = async () => {
    try {
      setIsLoading(true);

      // Load farmers managed by this Sahayak
      const response = await SahayakService.getSahayakFarmers();
      if (response.success) {
        const normalizedFarmers = (response.farmers || []).map((farmer) => ({
          ...farmer,
          status: normalizeFlowStatus(farmer?.status),
        }));

        setFarmers(normalizedFarmers);
        setFilteredFarmers(normalizedFarmers);
      }

    } catch (error) {
      console.error('Error loading farmers:', error);
      Alert.alert('Error', 'Failed to load farmers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadFarmers();
    setIsRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (normalizeFlowStatus(status)) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING_KYC': return 'bg-red-100 text-red-800';
      case 'PENDING_LAND_VERIFICATION': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING_PASSWORD_SETUP': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (normalizeFlowStatus(status)) {
      case 'APPROVED': return 'check-circle';
      case 'PENDING_KYC': return 'id-card';
      case 'PENDING_LAND_VERIFICATION': return 'map-marker';
      case 'PENDING_PASSWORD_SETUP': return 'key';
      default: return 'clock-o';
    }
  };

  const getDisplayStatus = (status) => normalizeFlowStatus(status);

  const handleOnboardNewFarmer = () => {
    router.push('/sahayak/onboard-farmer');
  };

  const handleFarmerSelect = (farmer) => {
    router.push(`/sahayak/farmer-detail?farmerId=${farmer.farmerId}`);
  };

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
            await logout();
            router.replace('/screens/language-selection');
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-blue-50 justify-center items-center">
        <View className="w-14 h-14 bg-blue-500 rounded-full items-center justify-center mb-1 mt-14">
          <Text className="text-white text-3xl">🤝</Text>
        </View>
        <Text className="text-xl font-semibold text-blue-800 mb-4">Loading dashboard...</Text>
        <LoadingSpinner size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-blue-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white pt-12 pb-6 px-6 shadow-sm">
        <View className="flex-row items-center justify-between mb-4 mt-5">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-blue-800">Sahayak Dashboard</Text>
            <Text className="text-blue-600 mt-1">
              Welcome {user?.name || 'Sahayak'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <FontAwesome name="sign-out" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View className="bg-blue-100 rounded-lg p-4">
          <Text className="text-blue-800 font-semibold text-base">
            Managing {farmers.length} Farmer{farmers.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Onboard New Farmer Button */}
        <View className="p-6">
          <TouchableOpacity
            className="bg-blue-500 rounded-lg py-4 px-6 shadow-sm"
            onPress={handleOnboardNewFarmer}
          >
            <View className="flex-row items-center justify-center">
              <FontAwesome name="plus" size={20} color="#ffffff" />
              <Text className="text-white font-semibold text-lg ml-2">+ Onboard New Farmer</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="px-6 pb-4">
          <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-3">
            <FontAwesome name="search" size={18} color="#6b7280" />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-800"
              placeholder="Search farmers by name, mobile, or village"
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <FontAwesome name="times" size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Farmers List */}
        <View className="px-6 pb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            {searchQuery ? `Search Results (${filteredFarmers.length})` : 'Your Farmers'}
          </Text>
          
          {filteredFarmers.length === 0 ? (
            <View className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
              <View className="items-center">
                <FontAwesome name="users" size={48} color="#d1d5db" />
                <Text className="text-gray-500 text-center mt-4 text-base">
                  {searchQuery ? 'No farmers found matching your search' : 'No farmers assigned yet'}
                </Text>
                {!searchQuery && (
                  <Text className="text-gray-400 text-center mt-2 text-sm">
                    Start by onboarding your first farmer
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View className="space-y-3">
              {filteredFarmers.map((farmer) => (
                <TouchableOpacity
                  key={farmer.farmerId}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-2"
                  onPress={() => handleFarmerSelect(farmer)}
                >
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mr-4 mb-4">
                      <FontAwesome name="user" size={20} color="#10b981" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-800">
                        {farmer.name}
                      </Text>
                      <Text className="text-gray-600 text-sm">
                        📱 {farmer.mobile} • 📍 {farmer.village}
                      </Text>
                      <Text className="text-gray-500 text-xs mt-1">
                        Registered: {farmer.registeredDate}
                      </Text>
                    </View>
                    <View className="ml-2 items-end">
                      <View className={`rounded-full px-3 py-1 ${getStatusColor(farmer.status)}`}>
                        <Text className="text-xs font-medium">
                          {getDisplayStatus(farmer.status).replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <FontAwesome 
                        name={getStatusIcon(farmer.status)} 
                        size={16} 
                        color="#6b7280" 
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Footer */}
        {/* <View className="p-6 pb-8">
          <View className="bg-blue-100 rounded-lg p-4">
            <Text className="text-blue-800 text-sm text-center">
              💡 Tap on any farmer to view their details and manage their application process.
            </Text>
          </View>
        </View> */}
      </ScrollView>
    </View>
  );
}
