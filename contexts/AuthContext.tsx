import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authService, LoginData, RegisterData } from '../scripts/auth-script';

interface User {
  _id: string;
  type: 'boutique' | 'societe';
  nomBoutiqueSociete: string;
  nomGerant: string;
  adresse: string;
  geolocation: {
    lat: number;
    lng: number;
  };
  zoneGeoCouverte: string;
  phoneNumber: string;
  email: string;
  typesPieces: ('neuf' | 'occasion')[];
  marqueSpecialise?: string;
  modeleSpecialise?: string;
  raisonSociale?: any;
  password: string;
  verified: boolean;
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

  const loadStoredAuth = useCallback(async () => {
    try {
      const isAuthenticated = await authService.isAuthenticated();
      
      if (isAuthenticated) {
        // Try to get profile to verify token is still valid
        const response = await authService.getProfile();
        if (response.success && response.data) {
          setUser(response.data as User);
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
      
      if (response.success && response.data) {
        setToken('valid');
        setUser(response.data.user as User);
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
        setUser(response.data as User);
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
