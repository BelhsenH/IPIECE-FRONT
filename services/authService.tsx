import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config/index';

export interface LoginCredentials {
  phoneNumber: string; // changed from email to phoneNumber
  password: string;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userType: 'ipiece';
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
}

export interface AuthResponse {
  token: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    userType: string;
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
    createdAt: string;
    updatedAt: string;
  };
}

class AuthService {
  private readonly TOKEN_KEY = '@auth_token';
  private readonly USER_KEY = '@ipiece_user_data';

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('[AuthService] ===== LOGIN START =====');
      console.log('[AuthService] API URL:', config.apiUrl);
      console.log('[AuthService] Login endpoint:', `${config.apiUrl}/api/auth/ipiece/login`);
      console.log('[AuthService] Attempting login with credentials:', {
        phoneNumber: credentials.phoneNumber,
        passwordLength: credentials.password.length
      });
      
      const requestBody = JSON.stringify(credentials);
      console.log('[AuthService] Request body:', requestBody);

      const response = await fetch(`${config.apiUrl}/api/auth/ipiece/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      console.log('[AuthService] Login response status:', response.status);
      console.log('[AuthService] Login response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthService] Login failed:', errorData);
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      console.log('[AuthService] Login successful, received data:', data);

      // Store auth data with detailed logging
      console.log('[AuthService] Storing token:', data.token);
      console.log('[AuthService] Storing user data:', JSON.stringify(data.user));
      await AsyncStorage.setItem(this.TOKEN_KEY, data.token);
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      
      // Verify storage
      const storedToken = await AsyncStorage.getItem(this.TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(this.USER_KEY);
      console.log('[AuthService] Verified stored token:', storedToken);
      console.log('[AuthService] Verified stored user:', storedUser);

      return data;
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      throw error;
    }
  }

  // Register new user
  async signup(userData: SignupData): Promise<AuthResponse> {
    try {
      console.log('[AuthService] Attempting signup with:', userData);
      const response = await fetch(`${config.apiUrl}/api/auth/ipiece/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('[AuthService] Signup response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthService] Signup failed:', errorData);
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      console.log('[AuthService] Signup successful, received data:', data);

      await AsyncStorage.setItem(this.TOKEN_KEY, data.token);
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.user));

      return data;
    } catch (error) {
      console.error('[AuthService] Signup error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(this.TOKEN_KEY);
      console.log('[AuthService] Logging out, token:', token);

      if (token) {
        const response = await fetch(`${config.apiUrl}/api/auth/ipiece/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('[AuthService] Logout API response status:', response.status);
      }
    } catch (error) {
      console.error('[AuthService] Logout API error:', error);
    } finally {
      await AsyncStorage.multiRemove([this.TOKEN_KEY, this.USER_KEY]);
      console.log('[AuthService] Cleared local auth data');
    }
  }

  // Get stored token
  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(this.TOKEN_KEY);
      console.log('[AuthService] Retrieved token:', token);
      return token;
    } catch (error) {
      console.error('[AuthService] Error getting token:', error);
      return null;
    }
  }

  // Get stored user data
  async getUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      console.log('[AuthService] Retrieved user data:', userData);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('[AuthService] Error getting user data:', error);
      return null;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const [token, user] = await Promise.all([
        this.getToken(),
        this.getUser(),
      ]);
      const isAuth = !!(token && user);
      console.log('[AuthService] isAuthenticated:', isAuth);
      return isAuth;
    } catch (error) {
      console.error('[AuthService] Error checking authentication:', error);
      return false;
    }
  }

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    try {
      const token = await this.getToken();
      console.log('[AuthService] Attempting token refresh, token:', token);

      if (!token) {
        throw new Error('No token available');
      }

      const response = await fetch(`${config.apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[AuthService] Refresh token response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthService] Token refresh failed:', errorData);
        throw new Error(errorData.message || 'Token refresh failed');
      }

      const data = await response.json();
      console.log('[AuthService] Token refresh successful, received data:', data);

      await AsyncStorage.setItem(this.TOKEN_KEY, data.token);
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.user));

      return data;
    } catch (error) {
      console.error('[AuthService] Token refresh error:', error);
      throw error;
    }
  }

  // Verify token
  async verifyToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      console.log('[AuthService] Verifying token:', token);

      if (!token) {
        return false;
      }

      const response = await fetch(`${config.apiUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[AuthService] Verify token response status:', response.status);

      return response.ok;
    } catch (error) {
      console.error('[AuthService] Token verification error:', error);
      return false;
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<void> {
    try {
      console.log('[AuthService] Sending forgot password for:', email);
      const response = await fetch(`${config.apiUrl}/api/auth/ipiece/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('[AuthService] Forgot password response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthService] Forgot password failed:', errorData);
        throw new Error(errorData.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('[AuthService] Forgot password error:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      console.log('[AuthService] Resetting password with token:', token);
      const response = await fetch(`${config.apiUrl}/api/auth/ipiece/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      console.log('[AuthService] Reset password response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AuthService] Reset password failed:', errorData);
        throw new Error(errorData.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('[AuthService] Reset password error:', error);
      throw error;
    }
  }
}

export default new AuthService();
