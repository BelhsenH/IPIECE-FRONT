import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authService, LoginData, RegisterData } from '../scripts/auth-script';

interface User {
  _id: string;
  // New fields for compatibility with UserService
  firstName: string;
  lastName: string;
  phone: string;
  userType: 'icar' | 'ipiece' | 'irepair';
  companyName?: string;
  location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  specialization?: {
    partTypes: string[];
    vehicleBrands: string[];
    vehicleModels: string[];
  };
  // Legacy fields (keep for backward compatibility)
  type?: 'boutique' | 'societe';
  nomBoutiqueSociete?: string;
  nomGerant?: string;
  adresse?: string;
  geolocation?: {
    lat: number;
    lng: number;
  };
  zoneGeoCouverte?: string;
  phoneNumber?: string;
  email: string;
  typesPieces?: ('neuf' | 'occasion')[];
  marqueSpecialise?: string;
  modeleSpecialise?: string;
  raisonSociale?: any;
  password?: string;
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: LoginData) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUserProfile: () => Promise<void>;
  isAuthenticated: boolean;
  clearAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(async () => {
    try {
      await authService.clearAuthData();
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Clear auth error:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      await clearAuth();
    } catch (error) {
      console.error('Logout error:', error);
      await clearAuth();
    }
  }, [clearAuth]);

  const mapLegacyUserData = (data: any): User => {
    return {
      _id: data._id,
      firstName: data.firstName || data.nomGerant || '',
      lastName: data.lastName || '',
      phone: data.phone || data.phoneNumber || '',
      userType: data.userType || 'ipiece',
      companyName: data.companyName || data.nomBoutiqueSociete || '',
      location: data.location || (data.geolocation ? {
        address: data.adresse || '',
        latitude: data.geolocation.lat || 0,
        longitude: data.geolocation.lng || 0,
      } : undefined),
      specialization: data.specialization || {
        partTypes: data.typesPieces || [],
        vehicleBrands: data.marqueSpecialise ? [data.marqueSpecialise] : [],
        vehicleModels: data.modeleSpecialise ? [data.modeleSpecialise] : [],
      },
      email: data.email || '',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
      // Keep legacy fields for backward compatibility
      type: data.type,
      nomBoutiqueSociete: data.nomBoutiqueSociete,
      nomGerant: data.nomGerant,
      adresse: data.adresse,
      geolocation: data.geolocation,
      zoneGeoCouverte: data.zoneGeoCouverte,
      phoneNumber: data.phoneNumber,
      typesPieces: data.typesPieces,
      marqueSpecialise: data.marqueSpecialise,
      modeleSpecialise: data.modeleSpecialise,
      raisonSociale: data.raisonSociale,
      password: data.password,
      verified: data.verified,
    };
  };

  const loadStoredAuth = useCallback(async () => {
    try {
      const isAuthenticated = await authService.isAuthenticated();
      console.log('AuthContext: isAuthenticated check:', isAuthenticated);

      if (isAuthenticated) {
        // Try to get profile to verify token is still valid
        console.log('AuthContext: Fetching profile...');
        const response = await authService.getProfile();
        console.log('AuthContext: Profile response:', response);

        if (response.success && response.data) {
          console.log('AuthContext: Raw profile data:', response.data);
          const mappedUser = mapLegacyUserData(response.data);
          console.log('AuthContext: Mapped user data:', mappedUser);
          setUser(mappedUser);
          // Token is stored internally in authService
          setToken('valid'); // Just a flag to indicate authenticated state
        } else {
          console.log('AuthContext: Failed to get profile, clearing auth');
          await clearAuth();
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      await clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const login = async (credentials: LoginData): Promise<boolean> => {
    try {
      setLoading(true);

      const response = await authService.login(credentials);
      console.log('AuthContext: Login response:', response);

      if (response.success && response.data) {
        console.log('AuthContext: Login success, user data:', response.data.user);
        setToken('valid');
        const mappedUser = mapLegacyUserData(response.data.user);
        console.log('AuthContext: Mapped user from login:', mappedUser);
        setUser(mappedUser);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setLoading(true);
      
      const response = await authService.register(userData);
      
      if (response.success) {
        // Note: Registration doesn't automatically log in the user
        // They need to verify their phone number first
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  const refreshUserProfile = async () => {
    try {
      if (!token) return;

      const response = await authService.getProfile();
      if (response.success && response.data) {
        const mappedUser = mapLegacyUserData(response.data);
        setUser(mappedUser);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUserProfile,
    isAuthenticated: !!user && !!token,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
