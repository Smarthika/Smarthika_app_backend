import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  withTiming, 
  useAnimatedStyle
} from 'react-native-reanimated';

export default function CustomButton({ 
  title, 
  onPress, 
  variant = 'primary',
  disabled = false,
  loading = false,
  icon = null,
  className = ''
}) {
  const scale = useSharedValue(1);

  const getButtonStyles = () => {
    const baseStyles = 'rounded-lg py-4 px-6 flex-row items-center justify-center';
    
    if (disabled || loading) {
      return `${baseStyles} bg-gray-300`;
    }

    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-green-500`;
      case 'secondary':
        return `${baseStyles} bg-blue-500`;
      case 'outline':
        return `${baseStyles} border-2 border-green-500 bg-transparent`;
      default:
        return `${baseStyles} bg-green-500`;
    }
  };

  const getTextStyles = () => {
    if (disabled || loading) {
      return 'text-gray-500 font-semibold text-base';
    }

    switch (variant) {
      case 'primary':
        return 'text-white font-semibold text-base';
      case 'secondary':
        return 'text-white font-semibold text-base';
      case 'outline':
        return 'text-green-500 font-semibold text-base';
      default:
        return 'text-white font-semibold text-base';
    }
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle} className={className}>
      <TouchableOpacity
        className={getButtonStyles()}
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {icon && <View className="mr-2">{icon}</View>}
        <Text className={getTextStyles()}>
          {loading ? 'Loading...' : title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}