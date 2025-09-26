import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';

// Keep the native splash screen visible while we render our custom splash
ExpoSplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(auth)/splash',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null; // Avoid rendering before fonts are ready
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LanguageProvider>
          <WebSocketProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <GestureHandlerRootView style={{flex: 1}}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                }}
              >
              <Stack.Screen 
                name="(auth)/splash" 
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                }} 
              />
              <Stack.Screen name="(auth)/login" options={{headerShown: false}} />
              <Stack.Screen name="(auth)/signup" options={{headerShown: false}} />
              <Stack.Screen name="(auth)/forgotpassword" options={{headerShown: false}} />
              <Stack.Screen name="(auth)/resetpassword" options={{headerShown: false}} />
              <Stack.Screen name="(auth)/verify" options={{headerShown: false}} />
              <Stack.Screen name="(home)/dashboard" options={{headerShown: false}} />
              <Stack.Screen name="(home)/profile" options={{headerShown: false}} />
              <Stack.Screen name="(home)/parts-management" options={{headerShown: false}} />
              <Stack.Screen name="(home)/my-parts" options={{headerShown: false}} />
              <Stack.Screen name="(home)/add-part" options={{headerShown: false}} />
              <Stack.Screen name="(home)/edit-part/[id]" options={{headerShown: false}} />
              <Stack.Screen name="(home)/parts-requests" options={{headerShown: false}} />
              <Stack.Screen name="(home)/conversations" options={{headerShown: false}} />
              <Stack.Screen name="(home)/conversation/[id]" options={{headerShown: false}} />
              <Stack.Screen name="(home)/messages" options={{headerShown: false}} />
              <Stack.Screen name="(home)/notifications" options={{headerShown: false}} />
              <Stack.Screen name="(home)/settings" options={{headerShown: false}} />
              <Stack.Screen name="(home)/analytics" options={{headerShown: false}} />
              <Stack.Screen name="(home)/inventory" options={{headerShown: false}} />
              <Stack.Screen name="(home)/conversation-detail" options={{headerShown: false}} />
              <Stack.Screen name="(home)/(conversation-details)/[conversationId]" options={{headerShown: false}} />
              <Stack.Screen name='(home)/parts-requests-new' options={{headerShown: false}} />
              <Stack.Screen name="(home)/create-parts-request" options={{headerShown: false}} />
              <Stack.Screen name="(home)/history" options={{headerShown: false}} />
              {/* Tabs are intentionally excluded from Stack navigation */}
            </Stack>
                <StatusBar style="auto" />
              </GestureHandlerRootView>
            </ThemeProvider>
          </WebSocketProvider>
        </LanguageProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

