import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';

export default function Chat() {
  return (
    <View className="flex-1 bg-green-50">
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      
      {/* Header */}
      <View className="bg-white pt-8 pb-4 px-6 shadow-sm">
        <View className="items-center">
          <View className="w-14 h-14 bg-green-900 rounded-full items-center justify-center mb-2 mt-5">
            <FontAwesome name="comments" size={24} color="#ffffff" />
          </View>
          <Text className="text-xl font-bold text-green-800">Chat</Text>
          <Text className="text-green-600 text-center mt-1 text-sm">
            Connect with farmers and experts
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        <View className="p-6">
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 items-center">
            <FontAwesome name="comments" size={60} color="#10b981" />
            <Text className="text-lg font-bold text-gray-800 mt-4 mb-2">Chat Coming Soon</Text>
            <Text className="text-gray-600 text-center text-sm">
              Chat with other farmers, agricultural experts, and Sahayaks for guidance and support.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
