import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function Settings() {

  return (
  <View className="flex-1 bg-green-50">
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      
      {/* Fixed Header */}
      <View className="bg-white pt-8 pb-4 px-6 shadow-sm items-center">
        <Text className="items-center text-2xl font-bold text-green-800 mb-3 mt-8">Settings</Text>
      </View>
    </View>
  );
}