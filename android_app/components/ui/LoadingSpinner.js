import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function LoadingSpinner({ size = 'large', color = '#10b981' }) {
  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}