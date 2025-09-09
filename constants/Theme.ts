// Modern Color Palette for ipiece app
export const Colors = {
  // Primary Colors (Blue theme to match dashboard)
  primary: '#1E3A8A', // Deep blue
  primaryLight: '#3B82F6', // Lighter blue
  primaryDark: '#1E40AF', // Darker blue
  
  // Secondary Colors
  secondary: '#10B981', // Green for success/availability
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  
  // Accent Colors
  accent: '#F59E0B', // Amber for warnings/pending
  accentLight: '#FCD34D',
  accentDark: '#D97706',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  background: '#F8FAFC', // Light gray background
  backgroundDark: '#0F172A', // Dark blue background
  surface: '#FFFFFF', // Card backgrounds
  surfaceDark: '#1E293B',
  
  // Text Colors
  text: '#1E293B', // Dark slate
  textSecondary: '#64748B', // Slate gray
  textLight: '#94A3B8', // Light slate
  textDark: '#FFFFFF',
  
  // Status Colors
  success: '#22C55E', // Green
  warning: '#F59E0B', // Amber
  error: '#EF4444', // Red
  info: '#3B82F6', // Blue
  
  // Glass Effect
  glass: 'rgba(255, 255, 255, 0.1)',
  glassDark: 'rgba(0, 0, 0, 0.1)',
  
  // Shadow
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.3)',
};

// Typography Scale
export const Typography = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Spacing Scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

// Border Radius
export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Animation Durations
export const Animations = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
};

// Breakpoints for responsive design
export const Breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};
