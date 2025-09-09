import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

export interface VehicleInfo {
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  vin?: string;
  engineType?: string;
  color?: string;
}

export interface PartsRequest {
  _id: string;
  partName: string;
  item?: {
    _id: string;
    name: string;
    imagePath?: string;
  };
  category?: {
    _id: string;
    name: string;
    imagePath?: string;
  };
  subCategory?: {
    _id: string;
    name: string;
    imagePath?: string;
  };
  description?: string;
  notes?: string;
  requester: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    userType: 'icar' | 'irepair';
    // For icar users
    accountType?: 'entreprise' | 'personal';
    // For irepair users
    businessName?: string; // nomGarage for irepair
    businessType?: 'boutique' | 'societe' | 'garagiste';
    address?: string;
    serviceZone?: string; // For irepair users - zoneGeo
    serviceTypes?: string[]; // For irepair users - typeService
    geolocation?: { lat: number; lng: number };
    // For ipiece users
    specializedBrand?: string;
    specializedModel?: string;
    partTypes?: string[]; // ['neuf', 'occasion']
  };
  vehicleInfo: VehicleInfo & {
    fuelType?: string;
    engineType?: string;
    kilometrage?: number;
  };
  quantity?: number;
  preferredCommunicationMethod?: 'call' | 'message';
  urgencyLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  budget?: {
    min?: number;
    max?: number;
    currency: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  images?: string[]; // User uploaded images
  lastContactedAt?: string;
  conversationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartsRequestData {
  partName: string;
  category: string;
  subCategory?: string;
  description?: string;
  notes?: string;
  vehicleInfo: VehicleInfo;
  quantity?: number;
  urgencyLevel: 'low' | 'medium' | 'high';
}

class PartsService {
  private async getAuthHeaders() {
    try {
      // Small delay to ensure AsyncStorage is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const token = await AsyncStorage.getItem('@auth_token');
      
      if (__DEV__) {
        console.log('PartsService: Retrieved token from storage:', token ? 'Present (' + token.substring(0, 20) + '...)' : 'Missing');
      }
      
      if (!token) {
        console.warn('PartsService: No auth token found in storage');
        throw new Error('No authentication token available');
      }
      
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('PartsService: Error getting auth headers:', error);
      throw error;
    }
  }

  private async handleResponse(response: Response) {
    if (response.status === 401) {
      // Token expired or invalid, but don't clear storage immediately
      // Let the auth context handle token management
      console.warn('PartsService: 401 Unauthorized - token may be invalid for this service');
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || 'Request failed');
    }
    
    return response.json();
  }

  // Get all parts requests (for providers to see available requests)
  async getPartsRequests(): Promise<PartsRequest[]> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${config.apiUrl}/api/parts/requests?populate=category,subCategory`;
      
      if (__DEV__) {
        console.log('PartsService: Fetching parts requests from:', url);
        console.log('PartsService: Headers:', { ...headers, Authorization: headers.Authorization ? '[REDACTED]' : '' });
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (__DEV__) {
        console.log('PartsService: Response status:', response.status);
        console.log('PartsService: Response headers:', Object.fromEntries(response.headers.entries()));
      }

      const data = await this.handleResponse(response);
      
      if (__DEV__) {
        console.log('PartsService: Received', Array.isArray(data) ? data.length : 'non-array', 'parts requests');
        if (Array.isArray(data) && data.length > 0) {
          console.log('PartsService: First request category data:', {
            category: data[0]?.category,
            subCategory: data[0]?.subCategory
          });
        }
      }
      
      return data;
    } catch (error: any) {
      console.error('Error fetching parts requests:', error);
      if (__DEV__) {
        console.error('PartsService: Detailed error:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }

  // Get parts requests created by the current user
  async getMyPartsRequests(): Promise<PartsRequest[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/my`, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching my parts requests:', error);
      throw error;
    }
  }

  // Create a new parts request
  async createPartsRequest(requestData: CreatePartsRequestData): Promise<PartsRequest> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating parts request:', error);
      throw error;
    }
  }

  // Update parts request status
  async updateRequestStatus(requestId: string, status: string): Promise<PartsRequest> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/${requestId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  }

  // Delete a parts request
  async deletePartsRequest(requestId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/${requestId}`, {
        method: 'DELETE',
        headers,
      });

      await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting parts request:', error);
      throw error;
    }
  }

  // Search parts requests by various criteria
  async searchPartsRequests(
    query: {
      partName?: string;
      category?: string;
      brand?: string;
      model?: string;
      location?: { latitude: number; longitude: number; radius: number };
    }
  ): Promise<PartsRequest[]> {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === 'object') {
            searchParams.append(key, JSON.stringify(value));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/search?${searchParams}`, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error searching parts requests:', error);
      throw error;
    }
  }

  // Accept a parts request (for providers)
  async acceptPartsRequest(requestId: string): Promise<PartsRequest> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/${requestId}/accept`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({}),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error accepting parts request:', error);
      throw error;
    }
  }

  // Reject a parts request (for providers)
  async rejectPartsRequest(requestId: string, reason?: string): Promise<PartsRequest> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/${requestId}/reject`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ reason }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error rejecting parts request:', error);
      throw error;
    }
  }

  // Initiate a phone call (logs the call attempt)
  async initiateCall(requestId: string, phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/${requestId}/call`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phoneNumber }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error logging call:', error);
      throw error;
    }
  }

  // Get my accepted requests (as a provider)
  async getMyAcceptedRequests(): Promise<PartsRequest[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/accepted`, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching my accepted requests:', error);
      throw error;
    }
  }

  // Update delivery information
  async updateDeliveryInfo(requestId: string, deliveryData: {
    estimatedDeliveryDate?: string;
    actualDeliveryDate?: string;
    trackingNumber?: string;
    notes?: string;
  }): Promise<PartsRequest> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/${requestId}/delivery`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(deliveryData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating delivery info:', error);
      throw error;
    }
  }

  // Complete a request
  async completeRequest(requestId: string, completionNotes?: string): Promise<PartsRequest> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/${requestId}/complete`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ notes: completionNotes }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error completing request:', error);
      throw error;
    }
  }

  // Track engagement events
  async trackEngagement(requestId: string, eventType: 'view' | 'interest' | 'contact_attempt' | 'call_attempt', metadata?: any): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      await fetch(`${config.apiUrl}/api/parts/requests/${requestId}/engagement`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ eventType, metadata }),
      });
    } catch (error) {
      // Don't throw error for tracking - it's not critical
      console.warn('Error tracking engagement:', error);
    }
  }

  // Get request engagement metrics (for debugging/admin)
  async getRequestEngagement(requestId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    interestedUsers: number;
    contactAttempts: number;
    engagementEvents: Array<{
      userId: string;
      eventType: string;
      timestamp: string;
    }>;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${config.apiUrl}/api/parts/requests/${requestId}/engagement`, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching engagement data:', error);
      throw error;
    }
  }
}

export default new PartsService();
