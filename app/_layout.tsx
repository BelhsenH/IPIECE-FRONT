import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {LanguageProvider} from '../contexts/LanguageContext';
import {AuthProvider} from '../contexts/AuthContext';
import {WebSocketProvider} from '../contexts/WebSocketContext';
import {useFonts} from 'expo-font';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import 'react-native-reanimated';
import {useColorScheme} from '@/hooks/useColorScheme';

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
              <Stack>
              <Stack.Screen name="(auth)/splash" options={{headerShown: false}} />
              <Stack.Screen name="(auth)/login" options={{headerShown: false}} />
              <Stack.Screen name="(auth)/signup" options={{headerShown: false}} />
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

