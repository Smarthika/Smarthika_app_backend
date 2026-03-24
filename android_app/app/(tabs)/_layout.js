import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { View, Text, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../components/context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';


function ProtectedTabs() {
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    // Set navigation bar color for Android
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#ffffff');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#000000',
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
          borderTopColor: 'transparent',
        },
        tabBarBackground: () => (
          <View style={{ 
            flex: 1, 
            backgroundColor: '#ffffff',
          }} />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View className={`items-center justify-center ${focused ? 'bg-green-500' : ''} rounded-full w-12 h-8`}>
              <FontAwesome 
                size={22} 
                name="home" 
                color={focused ? '#ffffff' : '#000000'} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ focused }) => (
            <View className={`items-center justify-center ${focused ? 'bg-green-500' : ''} rounded-full w-12 h-8`}>
              <FontAwesome 
                size={22} 
                name="shopping-cart" 
                color={focused ? '#ffffff' : '#000000'} 
              />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => (
            <View className={`items-center justify-center ${focused ? 'bg-green-500' : ''} rounded-full w-12 h-8`}>
              <FontAwesome 
                size={22} 
                name="search" 
                color={focused ? '#ffffff' : '#000000'} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => (
            <View className={`items-center justify-center ${focused ? 'bg-green-500' : ''} rounded-full w-12 h-8`}>
              <FontAwesome 
                size={22} 
                name="comments" 
                color={focused ? '#ffffff' : '#000000'} 
              />
            </View>
          ),
        }}
      />
      
      {/* Hidden tabs - accessible via navigation but not shown in tab bar */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading, userRole } = useAuth();

  useEffect(() => {
    console.log('TabLayout: Auth state changed:', { isLoading, isAuthenticated, userRole });
    
    // Don't redirect while loading
    if (isLoading) {
      return;
    }

    // If not authenticated, redirect to language selection
    if (!isAuthenticated) {
      console.log('TabLayout: User not authenticated, redirecting to language selection');
      router.replace('/screens/language-selection');
      return;
    }

    // If user is Sahayak, redirect to Sahayak dashboard
    if (userRole === 'sahayak') {
      console.log('TabLayout: Sahayak user detected, redirecting to dashboard');
      router.replace('/sahayak/dashboard');
      return;
    }

    console.log('TabLayout: Farmer user authenticated, showing tabs');
  }, [isLoading, isAuthenticated, userRole]);

  // Show loading while auth is being checked
  if (isLoading) {
    return (
      <View className="flex-1 bg-green-50 justify-center items-center">
        <View className="w-20 h-20 bg-green-700 rounded-full items-center justify-center mb-6">
          <Image source={require('../../assets/logo.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />
        </View>
        <Text className="text-xl font-semibold text-green-800 mb-4">FarmApp</Text>
        <LoadingSpinner size="large" color="#10b981" />
      </View>
    );
  }

  // Show empty view if not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-green-50 justify-center items-center">
        <Text className="text-green-600">Redirecting...</Text>
      </View>
    );
  }

  // Show tabs only if authenticated
  return <ProtectedTabs />;
}