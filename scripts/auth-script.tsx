import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config/index';

const API_BASE_URL = config.apiUrl;

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface RegisterData {
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
  raisonSociale?: any; // file or string
  password: string;
}

interface LoginData {
  phoneNumber: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
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
  };
}

interface VerifyPhoneData {
  phoneNumber: string;
  code: string;
}

interface ForgotPasswordData {
  phoneNumber: string;
}

interface ResetPasswordData {
  phoneNumber: string;
  code: string;
  newPassword: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface UpdateProfileData {
  nomBoutiqueSociete?: string;
  nomGerant?: string;
  adresse?: string;
  zoneGeoCouverte?: string;
  email?: string;
  typesPieces?: ('neuf' | 'occasion')[];
  marqueSpecialise?: string;
  modeleSpecialise?: string;
  password?: string;
}

class AuthService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      console.log('[AuthScript] ===== REQUEST START =====');
      console.log('[AuthScript] Endpoint:', `${API_BASE_URL}${endpoint}`);
      console.log('[AuthScript] Options:', options);
      
      const token = await AsyncStorage.getItem('@auth_token');
      console.log('[AuthScript] Stored token:', token);
      
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      console.log('[AuthScript] Request config:', config);
      console.log('[AuthScript] Full URL:', `${API_BASE_URL}${endpoint}`);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      console.log('[AuthScript] Response status:', response.status);
      console.log('[AuthScript] Response statusText:', response.statusText);
      
      const data = await response.json();
      console.log('[AuthScript] Response data:', data);

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'An error occurred',
        };
      }

      console.log('[AuthScript] Request successful');
      return {
        success: true,
        data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async register(userData: RegisterData): Promise<ApiResponse> {
    return this.makeRequest('/api/auth/ipiece/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async verifyPhone(data: VerifyPhoneData): Promise<ApiResponse> {
    return this.makeRequest('/api/auth/ipiece/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(credentials: LoginData): Promise<ApiResponse<LoginResponse>> {
    console.log('[AuthScript] ===== LOGIN START =====');
    console.log('[AuthScript] Login credentials:', credentials);
    
    // Login should not include Authorization header - make direct fetch call
    try {
      console.log('[AuthScript] Making direct login request to:', `${API_BASE_URL}/api/auth/ipiece/login`);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/ipiece/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Login failed',
        };
      }

      if (data.token) {
        await AsyncStorage.setItem('@auth_token', data.token);
        
        // Store user data if available
        if (data.user) {
          await AsyncStorage.setItem('@ipiece_user_data', JSON.stringify(data.user));
        }
      }

      return {
        success: true,
        data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async forgotPassword(data: ForgotPasswordData): Promise<ApiResponse> {
    return this.makeRequest('/api/auth/ipiece/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetPassword(data: ResetPasswordData): Promise<ApiResponse> {
    return this.makeRequest('/api/auth/ipiece/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: ChangePasswordData): Promise<ApiResponse> {
    return this.makeRequest('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<ApiResponse> {
    return this.makeRequest('/api/auth/me', {
      method: 'GET',
    });
  }

  async updateProfile(data: UpdateProfileData): Promise<ApiResponse> {
    return this.makeRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async resendVerificationCode(phoneNumber: string): Promise<ApiResponse> {
    return this.makeRequest('/api/auth/ipiece/resend-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.makeRequest('/api/auth/ipiece/logout', {
      method: 'POST',
    });
    
    await AsyncStorage.removeItem('@auth_token');
    return response;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('@auth_token');
    const userData = await AsyncStorage.getItem('@ipiece_user_data');
    console.log('[AuthScript] Checking authentication - token:', !!token, 'userData:', !!userData);
    return !!(token && userData);
  }

  async clearAuthData(): Promise<void> {
    console.log('[AuthScript] Clearing all auth data');
    await AsyncStorage.multiRemove(['@auth_token', '@ipiece_user_data']);
  }
}

export const authService = new AuthService();
export type {
    ChangePasswordData, ForgotPasswordData, LoginData, LoginResponse, RegisterData, ResetPasswordData, UpdateProfileData, VerifyPhoneData
};

