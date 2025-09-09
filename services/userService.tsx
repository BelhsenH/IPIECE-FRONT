import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
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

class UserService {
  private async getAuthHeaders() {
    try {
      // Small delay to ensure AsyncStorage is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const token = await AsyncStorage.getItem('@auth_token');
      
      if (__DEV__) {
        console.log('UserService: Retrieved token from storage:', token ? 'Present (' + token.substring(0, 20) + '...)' : 'Missing');
      }
      
      if (!token) {
        console.warn('UserService: No auth token found in storage');
        throw new Error('No authentication token available');
      }
      
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('UserService: Error getting auth headers:', error);
      throw error;
    }
  }

  private async handleResponse(response: Response) {
    if (response.status === 401) {
      // Token expired or invalid, clear storage and throw error
      console.warn('UserService: 401 Unauthorized - clearing auth data');
      await AsyncStorage.multiRemove(['@auth_token', '@ipiece_user_data']);
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || 'Request failed');
    }
    
    return response.json();
  }

  // Get current user profile
  async getProfile(): Promise<UserProfile> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${config.apiUrl}/api/auth/me`;
      
      if (__DEV__) {
        console.log('UserService: Fetching profile from:', url);
        console.log('UserService: Headers:', { ...headers, Authorization: headers.Authorization ? '[REDACTED]' : '' });
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (__DEV__) {
        console.log('UserService: Response status:', response.status);
      }

      const data = await this.handleResponse(response);
      
      if (__DEV__) {
        console.log('UserService: Profile data received:', {
          firstName: data.firstName || data.nomGerant,
          lastName: data.lastName,
          companyName: data.companyName || data.nomBoutiqueSociete,
          email: data.email,
          userType: data.userType
        });
      }
      
      // Map the backend field names to frontend expected names
      const mappedData: UserProfile = {
        _id: data._id,
        firstName: data.firstName || data.nomGerant || '',
        lastName: data.lastName || '',
        email: data.email || '',
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
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
      };
      
      // Return the mapped data
      return mappedData;
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      if (__DEV__) {
        console.error('UserService: Profile fetch failed:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      throw error;
    }
  }

  // Update user profile
  async updateProfile(profileData: UpdateProfileData): Promise<UserProfile> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/auth/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData),
      });

      const data = await this.handleResponse(response);
      // The response should be { user: UserProfile }
      return data.user || data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Get user by ID (for conversations)
  async getUserById(userId: string): Promise<UserProfile> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/user/ipiece/${userId}`, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/auth/change-password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      await this.handleResponse(response);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Delete account
  async deleteAccount(): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/users/profile`, {
        method: 'DELETE',
        headers,
      });

      await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
}

export default new UserService();
