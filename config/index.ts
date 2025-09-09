// API Configuration for ipiece app
import Constants from 'expo-constants';

// Check if running on Android emulator
const isAndroidEmulator = Constants.platform?.android && Constants.isDevice === false;
const defaultApiUrl = isAndroidEmulator ? 'http://10.0.2.2:8888' : 'http://192.168.43.6:8888';

const config = {
  // Update these URLs to match your backend services
  apiUrl: process.env.EXPO_PUBLIC_API_URL || defaultApiUrl, // Base URL for all services through nginx gateway
  
  // Service-specific endpoints
  services: {
    auth: '/api/auth',
    parts: '/api/parts',
    conversation: '/api/parts/conversations',
    upload: '/api/parts/upload',
  },
  
  // App configuration
  app: {
    name: process.env.EXPO_PUBLIC_APP_NAME || 'iPiece',
    version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.EXPO_PUBLIC_ENV || (__DEV__ ? 'development' : 'production'),
  },
  
  // Image upload configuration
  upload: {
    maxImageSize: parseInt(process.env.EXPO_PUBLIC_MAX_IMAGE_SIZE || '5242880'), // 5MB
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    maxImagesPerMessage: parseInt(process.env.EXPO_PUBLIC_MAX_IMAGES_PER_MESSAGE || '2'),
  },
  
  // Pagination
  pagination: {
    defaultLimit: parseInt(process.env.EXPO_PUBLIC_DEFAULT_LIMIT || '20'),
    maxLimit: parseInt(process.env.EXPO_PUBLIC_MAX_LIMIT || '100'),
  },
  
  // Location settings
  location: {
    defaultRadius: parseInt(process.env.EXPO_PUBLIC_DEFAULT_RADIUS || '50'), // km
    maxRadius: parseInt(process.env.EXPO_PUBLIC_MAX_RADIUS || '200'), // km
  },
  
  // Real-time settings
  realtime: {
    reconnectInterval: parseInt(process.env.EXPO_PUBLIC_RECONNECT_INTERVAL || '5000'), // ms
    heartbeatInterval: parseInt(process.env.EXPO_PUBLIC_HEARTBEAT_INTERVAL || '30000'), // ms
  },
  
  // Debug settings
  debug: process.env.EXPO_PUBLIC_DEBUG === 'true' || __DEV__,
  logLevel: process.env.EXPO_PUBLIC_LOG_LEVEL || 'info',
};

export default config;
