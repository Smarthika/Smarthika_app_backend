import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');

  const quickLinks = [
    { id: 1, title: 'Weather Forecast', icon: 'cloud', color: 'bg-blue-500' },
    { id: 2, title: 'Soil Analysis', icon: 'leaf', color: 'bg-green-500' },
    { id: 3, title: 'Motor Control', icon: 'cog', color: 'bg-purple-500' },
    { id: 4, title: 'Land Details', icon: 'map', color: 'bg-orange-500' },
    { id: 5, title: 'Irrigation Schedule', icon: 'tint', color: 'bg-cyan-500' },
    { id: 6, title: 'Help & Support', icon: 'question-circle', color: 'bg-red-500' },
  ];

  const recentSearches = [
    'Weather today',
    'Soil moisture level',
    'Motor status',
    'Land registration',
  ];

  return (
    <View className="flex-1 bg-green-50">
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      
      {/* Fixed Header */}
      <View className="bg-white pt-8 pb-4 px-6 shadow-sm items-center">
        <Text className="items-center text-2xl font-bold text-green-800 mb-3 mt-8">Search</Text>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-1 mt-2">
          <FontAwesome name="search" size={16} color="#6b7280" />
          <TextInput
            className="flex-1 ml-3 text-gray-800"
            placeholder="Search for features, help..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* <ScrollView 
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        <Text className="text-lg font-semibold text-gray-800 mb-4">Quick Access</Text>
        <View className="flex-row flex-wrap mb-6">
          {quickLinks.map((link) => (
            <TouchableOpacity
              key={link.id}
              className="w-[30%] mr-[3.33%] mb-4"
            >
              <View className={`${link.color} rounded-xl p-4 items-center justify-center aspect-square`}>
                <FontAwesome name={link.icon} size={28} color="#ffffff" />
              </View>
              <Text className="text-gray-800 text-xs text-center mt-2 font-medium">
                {link.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
         {searchQuery.length === 0 && (
          <>
            <Text className="text-lg font-semibold text-gray-800 mb-4 mt-4">Recent Searches</Text>
            {recentSearches.map((search, index) => (
              <TouchableOpacity
                key={index}
                className="flex-row items-center bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
              >
                <FontAwesome name="history" size={16} color="#6b7280" />
                <Text className="text-gray-800 ml-3 flex-1">{search}</Text>
                <FontAwesome name="arrow-up" size={14} color="#9ca3af" style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>  */}
    </View>
  );
}
