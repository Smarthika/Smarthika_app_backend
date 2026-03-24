import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { AuthService } from '../../components/services/apiService';
import { useAuth } from '../../components/context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Animated, { 
  useSharedValue, 
  withTiming, 
  useAnimatedStyle
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SahayakLoginScreen() {
  const { login } = useAuth();
  const [sahayakId, setSahayakId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formOpacity = useSharedValue(0);

  useEffect(() => {
    formOpacity.value = withTiming(1, { duration: 600 });
  }, []);

  const formAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
    };
  });

  const handleLogin = async () => {
    if (!sahayakId.trim()) {
      Alert.alert('Error', 'Please enter your Sahayak ID');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      
      // Phase 2 - Use Sahayak authentication API
      const response = await AuthService.authenticateSahayak(sahayakId, password);
      
      if (response.success) {
        console.log('Sahayak login successful:', response);
        
        // Use AuthContext login method
        await login(response.token, 'sahayak', response.sahayakData);
        
        // Navigate to Sahayak dashboard
        router.replace('/sahayak/dashboard');
      } else {
        Alert.alert('Login Failed', response.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Sahayak login error:', error);
      Alert.alert('Login Failed', 'Unable to reach backend server. Check network and backend status.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <Animated.View style={formAnimatedStyle} className="items-center pt-16 pb-8">
        <View className="w-20 h-20 bg-blue-300 rounded-full items-center justify-center mb-6">
          <Text className="text-white text-5xl">🤝</Text>
        </View>
        <Text className="text-2xl font-bold text-blue-800 mb-2">Sahayak Login</Text>
        <Text className="text-base text-blue-600 text-center px-6">
          Sign in to help farmers and manage their applications
        </Text>
      </Animated.View>

      {/* Login Form */}
      <Animated.View style={formAnimatedStyle} className="px-6 space-y-6">
        {/* Sahayak ID Input */}
        <View className="space-y-2">
          <Text className="text-blue-800 font-semibold text-lg">Sahayak ID</Text>
          <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
            <FontAwesome name="id-card" size={20} color="#3b82f6" />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-800"
              placeholder="Enter your Sahayak ID"
              value={sahayakId}
              onChangeText={setSahayakId}
              placeholderTextColor="#6B7280"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Password Input */}
        <View className="space-y-2">
          <Text className="text-blue-800 font-semibold text-lg">Password</Text>
          <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
            <FontAwesome name="lock" size={20} color="#3b82f6" />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-800"
              placeholder="Enter your password"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <FontAwesome 
                name={showPassword ? "eye-slash" : "eye"} 
                size={18} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          className={`rounded-lg py-4 px-6 mt-8 ${isLoading ? 'bg-blue-300' : 'bg-blue-500'} shadow-sm`}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <View className="flex-row items-center justify-center">
              <LoadingSpinner size="small" color="#ffffff" />
              <Text className="text-white font-semibold text-lg ml-2">Signing In...</Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-lg text-center">Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Demo Credentials */}
        {/* <View className="bg-blue-100 rounded-lg p-4 mt-6">
          <Text className="text-blue-800 font-semibold text-sm mb-2">Backend Credentials:</Text>
          <Text className="text-blue-700 text-xs">ID: SH001 | Password: password123</Text>
        </View> */}
      </Animated.View>

      {/* Back Button */}
      <View className="absolute bottom-28 left-6 right-6">
        <TouchableOpacity
          className="bg-gray-500 rounded-lg py-3 px-6"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold text-center">Back to Role Selection</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
