import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

// Contexts and Services
import config from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import ConversationService from '../../services/conversationService';
import PartsService, { PartsRequest } from '../../services/partsService';

const OptimizedPartsRequestsPage: React.FC = () => {
  console.log('OptimizedPartsRequests: Component rendering at', new Date().toISOString());
  
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { language, translations } = useLanguage();
  const { addListener } = useWebSocket();
  const t = translations[language];
  const hasInitialized = useRef(false);
  
  console.log('OptimizedPartsRequests: Component state - authenticated:', isAuthenticated, 'user:', !!user, 'language:', language);

  // Debug: Check if token is actually stored
  useEffect(() => {
    const checkToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@auth_token');
        console.log('OptimizedPartsRequests: Token in AsyncStorage:', storedToken ? 'Present' : 'Missing');
      } catch (error) {
        console.log('OptimizedPartsRequests: Error checking AsyncStorage token:', error);
      }
    };
    checkToken();
  }, []);

  // State management
  const [requests, setRequests] = useState<PartsRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PartsRequest[]>([]);
  const [hiddenRequests, setHiddenRequests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Image popup states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Storage key for hidden requests
  const HIDDEN_REQUESTS_KEY = `@hidden_requests_${user?._id || 'anonymous'}`;

  // Load hidden requests from AsyncStorage
  const loadHiddenRequests = useCallback(async () => {
    const startTime = performance.now();
    console.log('OptimizedPartsRequests: Loading hidden requests from AsyncStorage with key:', HIDDEN_REQUESTS_KEY);
    
    try {
      const stored = await AsyncStorage.getItem(HIDDEN_REQUESTS_KEY);
      const endTime = performance.now();
      
      console.log(`OptimizedPartsRequests: AsyncStorage.getItem completed in ${(endTime - startTime).toFixed(2)}ms`);
      console.log('OptimizedPartsRequests: Stored hidden requests:', stored ? 'found' : 'none');
      
      if (stored) {
        const hiddenArray = JSON.parse(stored);
        console.log('OptimizedPartsRequests: Parsed hidden requests count:', hiddenArray.length);
        setHiddenRequests(new Set(hiddenArray));
      } else {
        console.log('OptimizedPartsRequests: No hidden requests found, setting empty set');
        setHiddenRequests(new Set());
      }
    } catch (error) {
      console.error('OptimizedPartsRequests: Error loading hidden requests:', error);
      console.error('OptimizedPartsRequests: Error type:', typeof error);
      setHiddenRequests(new Set());
    }
  }, [HIDDEN_REQUESTS_KEY]);

  // Save hidden requests to AsyncStorage
  const saveHiddenRequests = useCallback(async (hidden: Set<string>) => {
    try {
      const hiddenArray = Array.from(hidden);
      await AsyncStorage.setItem(HIDDEN_REQUESTS_KEY, JSON.stringify(hiddenArray));
    } catch (error) {
      console.error('Error saving hidden requests:', error);
    }
  }, [HIDDEN_REQUESTS_KEY]);

  // Helper function to get full image URL
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    
    // Images are served through the API gateway at /api/parts/images/
    if (imagePath.startsWith('/images/')) {
      return `${config.apiUrl}/api/parts${imagePath}`;
    }
    if (imagePath.startsWith('images/')) {
      return `${config.apiUrl}/api/parts/${imagePath}`;
    }
    return `${config.apiUrl}/api/parts${imagePath}`;
  };

  const getCategoryImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    
    let url;
    // Images are served through /api/parts/images endpoint
    if (imagePath.startsWith('/images/')) {
      url = `${config.apiUrl}/api/parts${imagePath}`;
    } else if (imagePath.startsWith('images/')) {
      url = `${config.apiUrl}/api/parts/${imagePath}`;
    } else {
      url = `${config.apiUrl}/api/parts/images/${imagePath}`;
    }
    
    return url;
  };

  const CategoryIcon = ({ category, size = 20, style }: { category?: { name: string; imagePath?: string }, size?: number, style?: any }) => {
    const [imageError, setImageError] = useState(false);
    const imageUrl = getCategoryImageUrl(category?.imagePath);

    if (!category?.imagePath || imageError || !imageUrl) {
      return <Ionicons name="car-sport-outline" size={size} color="#1E3A8A" style={style} />;
    }

    return (
      <Image
        source={{ uri: imageUrl }}
        style={[{ width: size, height: size }, style]}
        resizeMode="contain"
        onError={() => setImageError(true)}
      />
    );
  };

  // Optimized load requests function with timeout and validation
  const loadRequests = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('OptimizedPartsRequests: Not authenticated, skipping loadRequests');
      return;
    }

    const startTime = performance.now();
    console.log('OptimizedPartsRequests: Starting loadRequests at', new Date().toISOString());
    console.log('OptimizedPartsRequests: Authenticated:', isAuthenticated, 'User ID:', user?._id);

    try {
      // Add timeout to prevent hanging (8 seconds for faster feedback)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.log('OptimizedPartsRequests: Request timeout after 8 seconds');
          reject(new Error('Timeout'));
        }, 8000)
      );
      
      console.log('OptimizedPartsRequests: Calling PartsService.getPartsRequests()');
      const serviceStartTime = performance.now();
      const requestPromise = PartsService.getPartsRequests();
      
      const allRequests = await Promise.race([requestPromise, timeoutPromise]) as PartsRequest[];
      const serviceEndTime = performance.now();
      
      console.log(`OptimizedPartsRequests: PartsService.getPartsRequests() completed in ${(serviceEndTime - serviceStartTime).toFixed(2)}ms`);
      console.log('OptimizedPartsRequests: Raw response type:', typeof allRequests);
      console.log('OptimizedPartsRequests: Raw response is array:', Array.isArray(allRequests));
      
      // Validate the requests data structure
      if (!Array.isArray(allRequests)) {
        console.error('OptimizedPartsRequests: Expected array but received:', typeof allRequests);
        console.error('OptimizedPartsRequests: Response content:', allRequests);
        setRequests([]);
        setFilteredRequests([]);
        return;
      }
      
      const endTime = performance.now();
      console.log(`OptimizedPartsRequests: Successfully loaded ${allRequests.length} requests in ${(endTime - startTime).toFixed(2)}ms`);
      console.log('OptimizedPartsRequests: First request sample:', allRequests[0] || 'No requests available');
      
      setRequests(allRequests);
      setFilteredRequests(allRequests);
      
    } catch (error: any) {
      const endTime = performance.now();
      console.error(`OptimizedPartsRequests: Error loading requests after ${(endTime - startTime).toFixed(2)}ms:`, error);
      console.error('OptimizedPartsRequests: Error type:', typeof error);
      console.error('OptimizedPartsRequests: Error message:', error?.message);
      console.error('OptimizedPartsRequests: Error stack:', error?.stack);
      
      // Only show alert for non-timeout and non-auth errors to avoid annoying users
      if (!error?.message?.includes('Timeout') && error.message !== 'Unauthorized') {
        Alert.alert(
          t.error || (language === 'fr' ? 'Erreur' : 'خطأ'), 
          language === 'fr' ? 'Impossible de charger les demandes' : 'تعذر تحميل الطلبات'
        );
      }
      
      // Set empty arrays for graceful degradation
      setRequests([]);
      setFilteredRequests([]);
    }
  }, [isAuthenticated, user?._id, language, t.error]);

  // Filter requests based on search and hidden items
  const filterRequests = useCallback(() => {
    const startTime = performance.now();
    console.log('OptimizedPartsRequests: Starting filterRequests with', requests.length, 'total requests');
    console.log('OptimizedPartsRequests: Hidden requests count:', hiddenRequests.size);
    console.log('OptimizedPartsRequests: Search query:', searchQuery);

    let filtered = requests;

    // Filter out hidden requests
    const beforeHiddenFilter = filtered.length;
    filtered = filtered.filter(r => !hiddenRequests.has(r._id));
    console.log('OptimizedPartsRequests: After hidden filter:', filtered.length, 'requests (removed', beforeHiddenFilter - filtered.length, ')');

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const beforeSearchFilter = filtered.length;
      filtered = filtered.filter(r =>
        r.partName.toLowerCase().includes(query) ||
        r.requester?.firstName?.toLowerCase().includes(query) ||
        r.requester?.lastName?.toLowerCase().includes(query) ||
        r.vehicleInfo?.brand?.toLowerCase().includes(query) ||
        r.vehicleInfo?.model?.toLowerCase().includes(query)
      );
      console.log('OptimizedPartsRequests: After search filter:', filtered.length, 'requests (removed', beforeSearchFilter - filtered.length, ')');
    }

    const endTime = performance.now();
    console.log(`OptimizedPartsRequests: filterRequests completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log('OptimizedPartsRequests: Final filtered count:', filtered.length);

    setFilteredRequests(filtered);
  }, [requests, searchQuery, hiddenRequests]);

  // Initialization effect
  useEffect(() => {
    if (hasInitialized.current) {
      console.log('OptimizedPartsRequests: Already initialized, skipping');
      return;
    }

    // Wait for auth state to be determined
    if (!isAuthenticated) {
      console.log('OptimizedPartsRequests: Not authenticated yet, waiting...');
      return;
    }
    
    const initializeOptimizedPartsRequests = async () => {
      const initStartTime = performance.now();
      console.log('OptimizedPartsRequests: Starting initialization at', new Date().toISOString());
      console.log('OptimizedPartsRequests: Auth state - authenticated:', isAuthenticated, 'user:', user?._id);
      
      hasInitialized.current = true;
      setLoading(true);
      
      try {
        // Load hidden requests first
        console.log('OptimizedPartsRequests: Loading hidden requests...');
        const hiddenStartTime = performance.now();
        await loadHiddenRequests();
        const hiddenEndTime = performance.now();
        console.log(`OptimizedPartsRequests: Hidden requests loaded in ${(hiddenEndTime - hiddenStartTime).toFixed(2)}ms`);
        
        // Then load requests
        console.log('OptimizedPartsRequests: Loading parts requests...');
        const requestsStartTime = performance.now();
        await loadRequests();
        const requestsEndTime = performance.now();
        console.log(`OptimizedPartsRequests: Parts requests loaded in ${(requestsEndTime - requestsStartTime).toFixed(2)}ms`);
        
        const initEndTime = performance.now();
        console.log(`OptimizedPartsRequests: Total initialization completed in ${(initEndTime - initStartTime).toFixed(2)}ms`);
        
      } catch (error) {
        console.error('OptimizedPartsRequests: Error during initialization:', error);
        console.error('OptimizedPartsRequests: Initialization error type:', typeof error);
      } finally {
        setLoading(false);
        console.log('OptimizedPartsRequests: Loading state set to false');
      }
    };
    
    initializeOptimizedPartsRequests();
  }, [loadHiddenRequests, loadRequests, isAuthenticated, user?._id]);

  // Filter effect
  useEffect(() => {
    filterRequests();
  }, [filterRequests]);

  // WebSocket listener for real-time updates
  useEffect(() => {
    console.log('OptimizedPartsRequests: Setting up WebSocket listener');
    
    const unsubscribe = addListener((message) => {
      console.log('OptimizedPartsRequests: WebSocket message received:', message.type);
      switch (message.type) {
        case 'new_message':
          console.log('OptimizedPartsRequests: New message received, refreshing requests list');
          // Refresh the list to update last contacted times
          loadRequests();
          break;
        default:
          console.log('OptimizedPartsRequests: Unhandled WebSocket message type:', message.type);
          break;
      }
    });

    console.log('OptimizedPartsRequests: WebSocket listener set up successfully');
    return unsubscribe;
  }, [addListener, loadRequests]);

  // Optimized refresh function
  const onRefresh = useCallback(async () => {
    const refreshStartTime = performance.now();
    console.log('OptimizedPartsRequests: Starting manual refresh at', new Date().toISOString());
    
    setRefreshing(true);
    try {
      await loadRequests();
      const refreshEndTime = performance.now();
      console.log(`OptimizedPartsRequests: Manual refresh completed in ${(refreshEndTime - refreshStartTime).toFixed(2)}ms`);
    } catch (error) {
      console.error('OptimizedPartsRequests: Error during refresh:', error);
      console.error('OptimizedPartsRequests: Refresh error type:', typeof error);
      // Don't show error to user for refresh failures, just log them
    } finally {
      setRefreshing(false);
      console.log('OptimizedPartsRequests: Refresh state set to false');
    }
  }, [loadRequests]);

  // Hide request function
  const hideRequest = useCallback(async (requestId: string) => {
    const newHiddenRequests = new Set([...hiddenRequests, requestId]);
    setHiddenRequests(newHiddenRequests);
    await saveHiddenRequests(newHiddenRequests);
  }, [hiddenRequests, saveHiddenRequests]);

  // Start conversation function
  const startConversation = async (request: PartsRequest) => {
    if (!isAuthenticated) {
      console.log('OptimizedPartsRequests: Not authenticated for starting conversation');
      return;
    }
    
    const conversationStartTime = performance.now();
    console.log('OptimizedPartsRequests: Starting conversation with requester for request:', request._id);
    
    try {
      const result = await ConversationService.initiateConversationWithRequester(request._id);
      const conversationEndTime = performance.now();
      
      console.log(`OptimizedPartsRequests: Conversation initiation completed in ${(conversationEndTime - conversationStartTime).toFixed(2)}ms`);
      console.log('OptimizedPartsRequests: Conversation result:', result);
      
      if (result.isExisting) {
        console.log('OptimizedPartsRequests: Existing conversation found');
        Alert.alert(
          t.conversationExists || 'Conversation existante', 
          result.message,
          [
            { text: t.cancel || 'Annuler', style: 'cancel' },
            { 
              text: t.openConversation || 'Ouvrir la conversation', 
              onPress: () => router.push(`/(home)/conversation-detail?id=${result.conversation._id}`)
            }
          ]
        );
      } else {
        console.log('OptimizedPartsRequests: New conversation created');
        // New conversation created, navigate to it
        Alert.alert(
          t.conversationStarted || 'Conversation démarrée',
          result.message,
          [
            {
              text: t.openConversation || 'Ouvrir la conversation',
              onPress: () => router.push(`/(home)/conversation-detail?id=${result.conversation._id}`)
            }
          ]
        );
      }
    } catch (error) {
      console.error('OptimizedPartsRequests: Error starting conversation:', error);
      console.error('OptimizedPartsRequests: Conversation error type:', typeof error);
      Alert.alert(t.error || 'Erreur', 'Impossible de démarrer la conversation');
    }
  };

  // Call requester function
  const handleCallRequester = async (request: PartsRequest) => {
    const phoneNumber = request.requester.phone;
    
    if (!phoneNumber || phoneNumber === 'Not available' || phoneNumber === 'Not provided') {
      Alert.alert(
        t.numberNotAvailable || 'Numéro non disponible', 
        t.numberNotAvailableMessage || 'Le numéro de téléphone du demandeur n\'est pas disponible.'
      );
      return;
    }

    try {
      const url = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t.error || 'Erreur', t.cannotOpenPhone || 'Impossible d\'ouvrir l\'application téléphone');
      }
    } catch (error) {
      console.error('Error making call:', error);
      Alert.alert(t.error || 'Erreur', t.cannotMakeCall || 'Impossible d\'effectuer l\'appel');
    }
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'in-progress': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t.pending || 'En attente';
      case 'in-progress': return t.inProgress || 'En cours';
      case 'completed': return t.completed || 'Terminée';
      case 'cancelled': return t.cancelled || 'Annulée';
      default: return status;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t.justNow || 'À l\'instant';
    if (diffInMinutes < 60) return `${t.ago || 'Il y a'} ${diffInMinutes}${t.min || 'min'}`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${t.ago || 'Il y a'} ${diffInHours}${t.h || 'h'}`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${t.ago || 'Il y a'} ${diffInDays}${t.d || 'j'}`;
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
  };

  const closeImageModal = () => {
    setImageModalVisible(false);
    setSelectedImage(null);
  };

  // Swipeable Request Card Component
  const SwipeableRequestCard = ({ item }: { item: PartsRequest }) => {
    const translateX = new Animated.Value(0);
    const [isSwipedOut, setIsSwipedOut] = useState(false);

    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event: any) => {
      if (event.nativeEvent.state === State.END) {
        const { translationX, velocityX } = event.nativeEvent;
        
        // If swiped far enough or with enough velocity, hide the request
        if (Math.abs(translationX) > 150 || Math.abs(velocityX) > 1000) {
          // Animate out completely
          Animated.timing(translateX, {
            toValue: translationX > 0 ? 500 : -500,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setIsSwipedOut(true);
            hideRequest(item._id);
          });
        } else {
          // Snap back to center
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    if (isSwipedOut) {
      return null;
    }

    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View
          style={[
            { transform: [{ translateX }] },
            tw`mb-6`
          ]}
        >
          {renderRequestCard(item)}
        </Animated.View>
      </PanGestureHandler>
    );
  };

  // Request Card Component
  const renderRequestCard = (item: PartsRequest) => (
    <View style={[
      tw`bg-white rounded-2xl p-5 border border-gray-100`,
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }
    ]}>
      {/* Header */}
      <View style={tw`flex-row justify-between items-start mb-3`}>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center mb-2`}>
            <CategoryIcon 
              category={item.category} 
              size={32} 
              style={tw`mr-3`} 
            />
            <Text style={tw`text-xl font-bold text-blue-900 flex-1`} numberOfLines={2}>
              {item.partName}
            </Text>
          </View>
          
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="person-outline" size={16} color="#6B7280" style={tw`mr-2`} />
            <Text style={tw`text-base font-medium text-gray-700`}>
              {item.requester?.firstName} {item.requester?.lastName}
            </Text>
            {item.requester?.userType && (
              <View style={[
                tw`ml-2 px-2 py-1 rounded-full`,
                { backgroundColor: item.requester.userType === 'irepair' ? '#3B82F6' : '#10B981' }
              ]}>
                <Text style={tw`text-white text-xs font-semibold`}>
                  {item.requester.userType.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="car-outline" size={16} color="#6B7280" style={tw`mr-2`} />
            <Text style={tw`text-sm text-gray-600`}>
              {item.vehicleInfo?.brand} {item.vehicleInfo?.model} ({item.vehicleInfo?.year})
            </Text>
          </View>

          {item.vehicleInfo?.licensePlate && (
            <View style={tw`flex-row items-center mb-2`}>
              <Ionicons name="card-outline" size={16} color="#6B7280" style={tw`mr-2`} />
              <Text style={tw`text-sm text-gray-600`}>
                {item.vehicleInfo.licensePlate}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Status Summary */}
      <View style={tw`border-t border-gray-100 pt-4 mt-3 mb-3`}>
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={tw`text-white text-xs font-semibold`}>{getStatusText(item.status)}</Text>
          </View>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="time-outline" size={16} color="#6B7280" style={tw`mr-1`} />
            <Text style={tw`text-sm text-gray-600`}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Category Tree */}
      {(item.category || item.subCategory) && (
        <View style={tw`bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3`}>
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="folder-outline" size={16} color="#3B82F6" style={tw`mr-2`} />
            <Text style={tw`text-sm font-semibold text-blue-800`}>{t.category || 'Catégorie'}</Text>
          </View>
          <View style={tw`flex-row items-center flex-wrap`}>
            {item.category && (
              <View style={tw`flex-row items-center mr-2 mb-1`}>
                <CategoryIcon category={item.category} size={16} style={tw`mr-1`} />
                <Text style={tw`text-sm text-blue-700 font-medium`}>{item.category.name}</Text>
                {item.subCategory && <Ionicons name="chevron-forward" size={14} color="#3B82F6" style={tw`mx-1`} />}
              </View>
            )}
            {item.subCategory && (
              <View style={tw`flex-row items-center`}>
                <CategoryIcon category={item.subCategory} size={16} style={tw`mr-1`} />
                <Text style={tw`text-sm text-blue-600`}>{item.subCategory.name}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Notes */}
      {item.notes && (
        <View style={tw`bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3`}>
          <View style={tw`flex-row items-start`}>
            <Ionicons name="document-text-outline" size={16} color="#D97706" style={tw`mr-2 mt-1`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-sm font-semibold text-yellow-800 mb-1`}>{t.notes || 'Notes'}</Text>
              <Text style={tw`text-sm text-yellow-700 leading-5`}>{item.notes}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Request Images */}
      {item.images && item.images.length > 0 && (
        <View style={tw`mb-3`}>
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="images-outline" size={16} color="#6B7280" style={tw`mr-2`} />
            <Text style={tw`text-sm font-semibold text-gray-700`}>
              {t.images || 'Images'} ({item.images.length})
            </Text>
          </View>
          <FlatList
            horizontal
            data={item.images}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`gap-2`}
            renderItem={({ item: imagePath }) => {
              const imageUrl = getImageUrl(imagePath);
              return imageUrl ? (
                <TouchableOpacity onPress={() => openImageModal(imageUrl)}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={tw`w-16 h-16 rounded-lg`}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : null;
            }}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>
      )}

      {/* Quantity info */}
      {item.quantity && item.quantity > 1 && (
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="layers-outline" size={16} color="#6B7280" style={tw`mr-2`} />
          <Text style={tw`text-sm text-gray-600`}>
            {t.quantity || 'Quantité'}: {item.quantity}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={tw`flex-row justify-between items-center mt-4 pt-4 border-t border-gray-100`}>
        <View>
          <Text style={tw`text-xs text-gray-500`}>{t.requestedOn || 'Demandé le'}</Text>
          <Text style={tw`text-sm font-medium text-gray-700`}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
        
        <View style={tw`flex-row gap-2`}>
          <TouchableOpacity
            style={tw`flex-row items-center bg-green-600 rounded-lg py-2 px-4`}
            onPress={() => startConversation(item)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white text-sm font-semibold`}>
              {t.message || 'Message'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-row items-center bg-blue-600 rounded-lg py-2 px-4`}
            onPress={() => handleCallRequester(item)}
          >
            <Ionicons name="call-outline" size={16} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white text-sm font-semibold`}>
              {t.call || 'Appeler'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    console.log('OptimizedPartsRequests: Rendering loading state');
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`bg-blue-900 p-4 flex-row justify-between items-center shadow-lg`}>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              style={tw`mr-3`}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={tw`text-xl font-bold text-white`}>
              {t.partsRequests || 'Demandes de pièces'}
            </Text>
          </View>
        </View>
        
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={tw`mt-4 text-gray-600 text-base`}>
            {t.loading || 'Chargement...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('OptimizedPartsRequests: Rendering main content with', filteredRequests.length, 'filtered requests out of', requests.length, 'total requests');
  
  return (
    <GestureHandlerRootView style={tw`flex-1`}>
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        {/* Header */}
        <View style={tw`bg-blue-900 p-4 shadow-lg`}>
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-row items-center`}>
              <TouchableOpacity
                style={tw`mr-3`}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={tw`text-xl font-bold text-white`}>
                {t.partsRequests || 'Demandes de pièces'}
              </Text>
            </View>
            <Text style={tw`text-white text-sm`}>
              {filteredRequests.length} {t.items || 'éléments'}
            </Text>
          </View>

          {/* Search Bar */}
          <View style={tw`flex-row items-center bg-white rounded-lg p-3`}>
            <Ionicons name="search" size={20} color="#6B7280" style={tw`mr-3`} />
            <TextInput
              style={tw`flex-1 text-base text-gray-700`}
              placeholder={t.searchPlaceholder || 'Rechercher des demandes...'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {filteredRequests.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center px-8`}>
            <Ionicons name="clipboard-outline" size={64} color="#94A3B8" />
            <Text style={tw`text-xl font-semibold text-gray-700 mt-5 mb-3`}>
              {searchQuery ? (t.noSearchResults || 'Aucun résultat') : (t.noRequests || 'Aucune demande')}
            </Text>
            <Text style={tw`text-base text-gray-500 text-center leading-6`}>
              {searchQuery 
                ? (t.tryDifferentSearch || 'Essayez une recherche différente')
                : (t.noRequestsMessage || 'Les demandes de pièces apparaîtront ici')
              }
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={tw`mt-4 bg-blue-600 rounded-lg py-2 px-4`}
                onPress={() => setSearchQuery('')}
              >
                <Text style={tw`text-white font-semibold`}>
                  {t.clearSearch || 'Effacer la recherche'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredRequests}
            renderItem={({ item, index }) => (
              <View key={`${item._id}-${index}`}>
                <SwipeableRequestCard item={item} />
                {index === 0 && (
                  <View style={tw`bg-blue-100 border border-blue-200 rounded-lg p-3 mx-4 mb-4`}>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons name="information-circle" size={16} color="#3B82F6" style={tw`mr-2`} />
                      <Text style={tw`text-sm text-blue-800 flex-1`}>
                        {t.swipeToHide || 'Glissez à gauche ou à droite pour masquer une demande'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
            keyExtractor={(item, index) => `${item._id}-${index}`}
            contentContainerStyle={tw`px-4 py-6`}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}

        {/* Image Modal */}
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeImageModal}
        >
          <View style={tw`flex-1 bg-black bg-opacity-90 justify-center items-center`}>
            <TouchableOpacity
              style={tw`absolute top-12 right-4 z-10`}
              onPress={closeImageModal}
            >
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={{
                  width: screenWidth * 0.9,
                  height: screenHeight * 0.7,
                }}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default OptimizedPartsRequestsPage;