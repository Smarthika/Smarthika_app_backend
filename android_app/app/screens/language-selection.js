import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../components/context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Animated, { 
  useSharedValue, 
  withTiming, 
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' }
];

// Separate component for language button
function LanguageButton({ language, isSelected, onPress, delay }) {
  const buttonScale = useSharedValue(0);
  
  useEffect(() => {
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 15 });
    }, delay);
  }, [delay]);

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  return (
    <Animated.View style={buttonAnimatedStyle}>
      <TouchableOpacity
        className={`p-6 rounded-2xl mb-6 border-2 shadow-sm ${
          isSelected
            ? 'bg-green-500 border-green-500'
            : 'bg-white border-green-200'
        }`}
        onPress={onPress}
      >
        <Text
          className={`text-center text-xl font-semibold ${
            isSelected
              ? 'text-white'
              : 'text-green-800'
          }`}
        >
          {language.nativeName}
        </Text>
        <Text
          className={`text-center text-sm mt-1 ${
            isSelected
              ? 'text-green-100'
              : 'text-green-600'
          }`}
        >
          {language.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LanguageSelectionScreen() {
  const { setLanguage, isAuthenticated, isLoading } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState('');
  
  const titleOpacity = useSharedValue(0);
  const languageOpacity = useSharedValue(0);

  useEffect(() => {
    console.log('Language screen: Auth state:', { isLoading, isAuthenticated });
    
    // Don't do anything while still loading auth state
    if (isLoading) {
      return;
    }

    // If user is already authenticated, redirect to home
    if (isAuthenticated) {
      console.log('Language screen: User is authenticated, redirecting to home');
      router.replace('/(tabs)/home');
      return;
    }

    console.log('Language screen: User not authenticated, showing language selection');
    
    // Animate elements
    titleOpacity.value = withTiming(1, { duration: 600 });
    
    setTimeout(() => {
      languageOpacity.value = withTiming(1, { duration: 500 });
    }, 300);
  }, [isLoading, isAuthenticated]);

  const handleLanguageSelect = async (languageCode) => {
    console.log('Language selected:', languageCode);
    setSelectedLanguage(languageCode);
    
    try {
      await setLanguage(languageCode);
      console.log('Language saved, navigating to role selection...');
      
      setTimeout(() => {
        router.replace('/screens/role-selection');
      }, 300);
    } catch (error) {
      console.error('Error saving language selection:', error);
      // Still navigate even if there's an error
      setTimeout(() => {
        router.replace('/screens/role-selection');
      }, 300);
    }
  };

  const titleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: titleOpacity.value,
    };
  });

  const languageAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: languageOpacity.value,
    };
  });

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-green-50">
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      
      {/* Show loading spinner while auth is initializing */}
      {isLoading && (
        <View className="flex-1 justify-center items-center">
          <View className="w-20 h-20 bg-green-700 rounded-full items-center justify-center mb-6">
            <Text className="text-white text-5xl">🌐</Text>
          </View>
          <Text className="text-xl font-semibold text-green-800 mb-4">FarmApp</Text>
          <LoadingSpinner size="large" color="#10b981" />
        </View>
      )}
      
      {/* Show language selection once auth loading is complete and user is not authenticated */}
      {!isLoading && !isAuthenticated && (
        <>
          {/* Header */}
          <Animated.View style={titleAnimatedStyle} className="items-center pt-20 pb-8">
            <View className="w-20 h-20 bg-green-700 rounded-full items-center justify-center mb-6">
              <Text className="text-white text-5xl">🌐</Text>
            </View>
            <Text className="text-2xl font-bold text-green-800 mb-2">Choose Language</Text>
            <Text className="text-base text-green-600 text-center px-6">
              Select your preferred language to continue
            </Text>
          </Animated.View>

          {/* Language Options */}
          <Animated.View style={languageAnimatedStyle} className="flex-1 justify-center px-10">
            <View className="space-y-6">
              {languages.map((lang, index) => (
                <LanguageButton
                  key={lang.code}
                  language={lang}
                  isSelected={selectedLanguage === lang.code}
                  onPress={() => handleLanguageSelect(lang.code)}
                  delay={index * 150}
                />
              ))}
            </View>
          </Animated.View>

          {/* Footer */}
          <View className="pb-8 px-6">
            <Text className="text-center text-green-500 text-sm">
              You can change the language later in settings
            </Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}