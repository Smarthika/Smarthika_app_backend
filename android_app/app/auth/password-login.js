import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../components/context/AuthContext';
import { AuthService } from '../../components/services/apiService';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FarmerLoginScreen() {
	const { role } = useLocalSearchParams();
	const { login } = useAuth();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const formOpacity = useSharedValue(0);

	useEffect(() => {
		formOpacity.value = withTiming(1, { duration: 600 });
	}, []);

	const handleLogin = async () => {
		if (!username.trim()) {
			Alert.alert('Error', 'Please enter your username');
			return;
		}
		if (!password) {
			Alert.alert('Error', 'Please enter your password');
			return;
		}

		setIsLoading(true);
		try {
			const response = await AuthService.authenticateFarmer(username, password);

			if (response.success) {
				await login(response.token, role || 'farmer', {
					username: response.farmerData?.username || username.trim(),
					name: response.farmerData?.name || 'Farmer',
					mobile: response.farmerData?.mobile,
				});
				router.replace('/(tabs)/home');
			} else {
				Alert.alert('Login Failed', response.message || 'Invalid username or password');
			}
		} catch (error) {
			Alert.alert('Error', 'Something went wrong. Please try again.');
			console.error('Login error:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const formAnimatedStyle = useAnimatedStyle(() => ({ opacity: formOpacity.value }));

	return (
		<SafeAreaView className="flex-1 bg-gray-50">
			<StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />

			<View className="items-center pt-16 pb-8">
				<View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
					<Text className="text-5xl">👨‍🌾</Text>
				</View>
				<Text className="text-2xl font-bold text-gray-800 mb-2">Farmer Login</Text>
				<Text className="text-base text-gray-600 text-center px-6">
					Sign in to access your farm dashboard
				</Text>
			</View>

			<Animated.View style={formAnimatedStyle} className="px-6">
				<View className="mb-5">
					<Text className="text-gray-700 font-medium mb-2">Username</Text>
					<TextInput
						className="bg-white border border-gray-200 rounded-lg px-4 py-4 text-base text-gray-800"
						placeholder="Enter username"
						placeholderTextColor="#6B7280"
						value={username}
						onChangeText={setUsername}
						autoCapitalize="none"
						autoCorrect={false}
					/>
				</View>

				<View className="mb-8">
					<Text className="text-gray-700 font-medium mb-2">Password</Text>
					<View className="flex-row items-center bg-white border border-gray-200 rounded-lg">
						<TextInput
							className="flex-1 px-4 py-4 text-base text-gray-800"
							placeholder="Enter password"
							placeholderTextColor="#6B7280"
							value={password}
							onChangeText={setPassword}
							secureTextEntry={!showPassword}
							autoCapitalize="none"
							autoCorrect={false}
						/>
						<TouchableOpacity
							onPress={() => setShowPassword(!showPassword)}
							className="px-4 py-4"
						>
							<Text className="text-gray-500 text-sm">{showPassword ? 'Hide' : 'Show'}</Text>
						</TouchableOpacity>
					</View>
				</View>

				<TouchableOpacity
					className={`bg-green-500 rounded-lg py-4 mb-4 ${isLoading ? 'opacity-50' : ''}`}
					onPress={handleLogin}
					disabled={isLoading}
				>
					<Text className="text-white text-center font-semibold text-lg">
						{isLoading ? 'Signing in...' : 'Sign In'}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity onPress={() => router.back()} className="py-3">
					<Text className="text-center text-gray-500 text-sm">← Back to role selection</Text>
				</TouchableOpacity>

				{/* <View className="mt-3 bg-green-50 rounded-lg p-3 border border-green-100">
					<Text className="text-green-700 text-xs text-center">Demo login: user1 / password</Text>
				</View> */}
			</Animated.View>
		</SafeAreaView>
	);
}
