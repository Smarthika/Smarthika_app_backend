import { Stack } from 'expo-router';
import '../global.css';
import { AuthProvider } from '../components/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="screens/splash" options={{ headerShown: false }} />
        <Stack.Screen name="screens/language-selection" options={{ headerShown: false }} />
        <Stack.Screen name="screens/role-selection" options={{ headerShown: false }} />
        
        {/* Farmer Authentication */}
        <Stack.Screen name="auth/password-login" options={{ headerShown: false }} />
        
        {/* Sahayak Authentication */}
        <Stack.Screen name="auth/sahayak-login" options={{ headerShown: false }} />
        
        {/* Farmer Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Land Management (legacy) */}
        <Stack.Screen name="land/land-claiming" options={{ headerShown: false }} />
        <Stack.Screen name="land/add-land-manually" options={{ headerShown: false }} />
        <Stack.Screen name="land/map-view" options={{ headerShown: false }} />
        
        {/* Motor Control Screens */}
        <Stack.Screen name="motor/motor-status" options={{ headerShown: false }} />
        
        {/* Sahayak Screens */}
        <Stack.Screen name="sahayak/dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="sahayak/onboard-farmer" options={{ headerShown: false }} />
        <Stack.Screen name="sahayak/farmer-detail" options={{ headerShown: false }} />
        <Stack.Screen name="sahayak/kyc-registration" options={{ headerShown: false }} />
        <Stack.Screen name="sahayak/land-registration" options={{ headerShown: false }} />
        <Stack.Screen name="sahayak/map-boundary-marking" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}