import { useRouter } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

const SplashScreen: React.FC = () => {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Keep the splash screen visible while we fetch resources
        await ExpoSplashScreen.preventAutoHideAsync();
        
        // Simulate app initialization (replace with your actual initialization logic)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Hide the native splash screen
        await ExpoSplashScreen.hideAsync();
        
        setIsReady(true);
        
        // Navigate after a short delay to show our custom splash
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 1000);
        
      } catch (e) {
        console.warn('Splash screen error:', e);
        // Navigate anyway if there's an error
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 1000);
      }
    }

    prepare();
  }, [router]);

  if (!isReady) {
    return null; // Let native splash screen show
  }

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require('../../assets/images/logo.png')} // Ensure logo.png exists
        style={styles.logo}
        resizeMode="contain"
      />
      {/* Title */}
      <Text style={styles.title}>Bienvenue chez Ipiece</Text>
      {/* Subtitle */}
      <Text style={styles.subtitle}>Votre solution pour les pièces automobiles</Text>
      {/* Loading Indicator */}
      <ActivityIndicator size="large" color="#1E3A8A" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Clean white background for professionalism
    padding: 20,
  },
  logo: {
    width: 180, // Slightly larger for prominence
    height: 180,
    marginBottom: 30,
  },
  title: {
    fontSize: 28, // Larger for emphasis
    fontWeight: '700', // Bolder for modern look
    color: '#1E3A8A', // Dark blue for contrast
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400', // Lighter for hierarchy
    color: '#4B5563', // Softer gray for readability
    textAlign: 'center',
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});

export default SplashScreen;