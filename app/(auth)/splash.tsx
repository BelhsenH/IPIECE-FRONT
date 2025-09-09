import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useRouter } from 'expo-router';

const SplashScreen: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Prevent auto-hiding of the splash screen
    ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

    // Simulate loading or initialization
    const timer = setTimeout(() => {
      // Hide the splash screen and navigate to the main screen
      ExpoSplashScreen.hideAsync().catch(() => {});
      router.replace('/(auth)/login'); // Adjust to your route path
    }, 3000); // 3-second delay

    return () => clearTimeout(timer); // Cleanup timer
  }, [router]);

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