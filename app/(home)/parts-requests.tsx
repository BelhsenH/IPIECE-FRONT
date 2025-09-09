import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Linking,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  Animated
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import PartsService, { PartsRequest } from '../../services/partsService';
import ConversationService from '../../services/conversationService';
import config from '../../config';

const PartsRequestsPage: React.FC = () => {
  const router = useRouter();
  const { token } = useAuth();
  const { language, translations } = useLanguage();
  const { addListener } = useWebSocket();
  const t = translations[language];

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
    if (!imagePath) {
      console.log('PartsRequests: No imagePath provided');
      return null;
    }
    if (imagePath.startsWith('http')) {
      console.log('PartsRequests: Using absolute URL:', imagePath);
      return imagePath;
    }
    
    let url;
    // Images are served through /api/parts/images endpoint
    if (imagePath.startsWith('/images/')) {
      // Path already includes /images/, use with api/parts
      url = `${config.apiUrl}/api/parts${imagePath}`;
    } else if (imagePath.startsWith('images/')) {
      // Path starts with images/, add api/parts/
      url = `${config.apiUrl}/api/parts/${imagePath}`;
    } else {
      // Path doesn't include images/, add full path
      url = `${config.apiUrl}/api/parts/images/${imagePath}`;
    }
    
    console.log('PartsRequests: Constructed category image URL:', url, 'from path:', imagePath);
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
        onError={(error) => {
          console.error('CategoryIcon: Image load error:', error.nativeEvent.error);
          setImageError(true);
        }}
        onLoad={() => console.log('CategoryIcon: Image loaded successfully for:', category?.name)}
      />
    );
  };

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


  const loadRequests = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const requestPromise = PartsService.getPartsRequests();
      
      const allRequests = await Promise.race([requestPromise, timeoutPromise]) as PartsRequest[];
      setRequests(allRequests);
      setFilteredRequests(allRequests);
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des demandes:', error);
      if (!error?.message?.includes('Timeout')) {
        Alert.alert(
          t.error || (language === 'fr' ? 'Erreur' : 'خطأ'), 
          language === 'fr' ? 'Impossible de charger les demandes' : 'تعذر تحميل الطلبات'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token, language]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // WebSocket listener for real-time updates
  useEffect(() => {
    const unsubscribe = addListener((message) => {
      switch (message.type) {
        case 'conversation_initiated':
          // Show notification when someone initiates a conversation
          if (message.data.initiatorType !== 'ipiece') {
            Alert.alert(
              t.newConversationStarted || 'Nouvelle conversation',
              `Une conversation a été démarrée pour: ${message.data.partName}`,
              [
                { text: t.dismiss || 'Fermer', style: 'cancel' },
                {
                  text: t.openConversation || 'Ouvrir',
                  onPress: () => router.push(`/(home)/conversation-detail?id=${message.data.conversationId}`)
                }
              ]
            );
          }
          break;
        case 'new_message':
          // Refresh the list to update last contacted times
          loadRequests();
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, [addListener, loadRequests, router, t]);

  const filterRequests = useCallback(() => {
    let filtered = requests;

    // Filter out hidden requests
    filtered = filtered.filter(r => !hiddenRequests.has(r._id));

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.partName.toLowerCase().includes(query) ||
        r.requester?.firstName?.toLowerCase().includes(query) ||
        r.requester?.lastName?.toLowerCase().includes(query) ||
        r.vehicleInfo?.brand?.toLowerCase().includes(query) ||
        r.vehicleInfo?.model?.toLowerCase().includes(query)
      );
    }

    setFilteredRequests(filtered);
  }, [requests, searchQuery, hiddenRequests]);

  useEffect(() => {
    filterRequests();
  }, [filterRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, [loadRequests]);

  const startConversation = async (request: PartsRequest) => {
    if (!token) return;
    
    try {
      const result = await ConversationService.initiateConversationWithRequester(request._id);
      
      if (result.isExisting) {
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
      console.error('Erreur lors de la création de la conversation:', error);
      Alert.alert(t.error || 'Erreur', 'Impossible de démarrer la conversation');
    }
  };

  const startConversationWithOffer = async (request: PartsRequest) => {
    if (!token) return;

    Alert.prompt(
      t.startConversationWithOffer || 'Démarrer une conversation',
      t.enterInitialMessage || 'Entrez votre message initial (optionnel)',
      [
        { text: t.cancel || 'Annuler', style: 'cancel' },
        {
          text: t.send || 'Envoyer',
          onPress: async (initialMessage) => {
            try {
              const result = await ConversationService.initiateConversationWithRequester(
                request._id, 
                initialMessage
              );
              
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
            } catch (error) {
              console.error('Erreur lors de la création de la conversation:', error);
              Alert.alert(t.error || 'Erreur', 'Impossible de démarrer la conversation');
            }
          }
        }
      ],
      'plain-text'
    );
  };

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
      // Open phone dialer
      const url = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t.error || 'Erreur', t.cannotOpenPhone || 'Impossible d\'ouvrir l\'application téléphone');
      }
    } catch (error) {
      console.error('Erreur lors de l\'appel:', error);
      Alert.alert(t.error || 'Erreur', t.cannotMakeCall || 'Impossible d\'effectuer l\'appel');
    }
  };

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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'high': return t.urgent || 'Urgent';
      case 'medium': return t.normal || 'Normal';
      case 'low': return t.low || 'Faible';
      default: return urgency;
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

  const hideRequest = useCallback((requestId: string) => {
    setHiddenRequests(prev => new Set([...prev, requestId]));
  }, []);

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

  const renderRequestCard = (item: PartsRequest) => (
    <View style={[
      tw`bg-white rounded-2xl p-5 border border-gray-100`,
      {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
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
            <Text style={tw`text-lg font-bold text-blue-900 flex-1`}>{item.partName}</Text>
          </View>
          
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="person-outline" size={16} color="#6B7280" style={tw`mr-2`} />
            <Text style={tw`text-sm text-gray-600`}>
              {item.requester?.firstName} {item.requester?.lastName}
            </Text>
            <View style={tw`bg-blue-900 rounded-full px-2 py-1 ml-2`}>
              <Text style={tw`text-white text-xs font-semibold`}>
                {item.requester?.userType || 'Utilisateur'}
                {item.requester?.accountType === 'entreprise' && ' PRO'}
              </Text>
            </View>
          </View>

          {/* Contact Information */}
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="call-outline" size={16} color="#6B7280" style={tw`mr-2`} />
            <Text style={tw`text-xs text-gray-500`}>
              {item.requester?.phone || 'Non disponible'}
            </Text>
            {item.requester?.phone && item.requester.phone !== 'Not available' && item.requester.phone !== 'Not provided' && (
              <TouchableOpacity 
                style={tw`ml-2 bg-green-600 rounded-full px-2 py-1`}
                onPress={() => handleCallRequester(item)}
              >
                <Ionicons name="call" size={12} color="white" />
              </TouchableOpacity>
            )}
          </View>

          {/* Email Information */}
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="mail-outline" size={16} color="#6B7280" style={tw`mr-2`} />
            <Text style={tw`text-xs text-gray-500`} numberOfLines={1}>
              {item.requester?.email || 'Non disponible'}
            </Text>
          </View>
          
          {/* Vehicle Information Section */}
          <View style={tw`bg-gray-50 rounded-lg p-3 mb-2`}>
            <View style={tw`flex-row items-center mb-2`}>
              {(item.vehicleInfo?.brand || item.vehicleInfo?.model || item.vehicleInfo?.year || item.vehicleInfo?.licensePlate) ? (
                <Ionicons name="car" size={16} color="#6B7280" style={tw`mr-2`} />
              ) : null}
              <Text style={tw`text-sm font-medium text-gray-700`}>{t.vehicleInfo || 'Véhicule:'}</Text>
            </View>
            
            <View style={tw`ml-6`}>
              <Text style={tw`text-sm font-semibold text-gray-800 mb-1`}>
                {(item.vehicleInfo?.brand || item.vehicleInfo?.model) ? (
                  `${item.vehicleInfo?.brand || ''} ${item.vehicleInfo?.model || ''}`.trim()
                ) : (
                  item.vehicleInfo?.vin ? `VIN: ${item.vehicleInfo.vin}` : 'Véhicule non spécifié'
                )}
              </Text>
              
              <View style={tw`flex-row flex-wrap gap-2 mb-2`}>
                <View style={tw`bg-blue-100 rounded-full px-2 py-1`}>
                  <Text style={tw`text-xs text-blue-700`}>{t.yearLabel || 'Année:'} {item.vehicleInfo?.year}</Text>
                </View>
                
                {item.vehicleInfo?.fuelType && (
                  <View style={tw`bg-green-100 rounded-full px-2 py-1`}>
                    <Text style={tw`text-xs text-green-700`}>{t.fuelLabel || 'Carburant:'} {item.vehicleInfo.fuelType}</Text>
                  </View>
                )}
                
                {item.vehicleInfo?.engineType && (
                  <View style={tw`bg-purple-100 rounded-full px-2 py-1`}>
                    <Text style={tw`text-xs text-purple-700`}>{t.engineLabel || 'Moteur:'} {item.vehicleInfo.engineType}</Text>
                  </View>
                )}
              </View>
              
              {item.vehicleInfo?.licensePlate && (
                <View style={tw`flex-row items-center mb-1`}>
                  <Ionicons name="card-outline" size={14} color="#6B7280" style={tw`mr-1`} />
                  <Text style={tw`text-xs text-gray-600`}>
                    {t.registrationLabel || 'Immatriculation:'} {item.vehicleInfo.licensePlate}
                  </Text>
                </View>
              )}
              
              {item.vehicleInfo?.vin && (
                <View style={tw`flex-row items-center mb-1`}>
                  <Ionicons name="barcode-outline" size={14} color="#6B7280" style={tw`mr-1`} />
                  <Text style={tw`text-xs text-gray-600`}>
                    {t.vinLabel || 'VIN:'} {item.vehicleInfo.vin}
                  </Text>
                </View>
              )}
              
              {item.vehicleInfo?.color && (
                <View style={tw`flex-row items-center mb-1`}>
                  <Ionicons name="color-palette-outline" size={14} color="#6B7280" style={tw`mr-1`} />
                  <Text style={tw`text-xs text-gray-600`}>
                    {t.colorLabel || 'Couleur:'} {item.vehicleInfo.color}
                  </Text>
                </View>
              )}
              
              {item.vehicleInfo?.kilometrage && (
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="speedometer-outline" size={14} color="#6B7280" style={tw`mr-1`} />
                  <Text style={tw`text-xs text-gray-600`}>
                    {t.mileageLabel || 'Kilométrage:'} {item.vehicleInfo.kilometrage.toLocaleString()} {t.km || 'km'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Status and Urgency Summary */}
      <View style={tw`border-t border-gray-100 pt-4 mt-3 mb-3`}>
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-sm font-medium text-gray-700 mr-2`}>{t.statusLabel || 'État:'}</Text>
            <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={tw`text-white text-xs font-semibold`}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-sm font-medium text-gray-700 mr-2`}>{t.urgencyLabel || 'Urgence:'}</Text>
            <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: getUrgencyColor(item.urgencyLevel || 'medium') }]}>
              <Text style={tw`text-white text-xs font-semibold`}>
                {getUrgencyText(item.urgencyLevel || 'medium')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Category Tree */}
      {(item.category || item.subCategory) && (
        <View style={tw`bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3`}>
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="folder-outline" size={16} color="#3B82F6" style={tw`mr-2`} />
            <Text style={tw`text-sm font-medium text-blue-800`}>{t.categoryLabel || 'Catégorie:'}</Text>
          </View>
          <View style={tw`flex-row items-center flex-wrap`}>
            {item.category && (
              <>
                <View style={tw`flex-row items-center bg-blue-100 rounded-full px-3 py-1 mr-2 mb-1`}>
                  <CategoryIcon 
                    category={item.category} 
                    size={20} 
                    style={tw`mr-2`} 
                  />
                  <Text style={tw`text-blue-700 text-sm font-medium`}>{item.category.name}</Text>
                </View>
                {item.subCategory && (
                  <>
                    <Ionicons name="chevron-forward" size={14} color="#6B7280" style={tw`mr-2`} />
                    <View style={tw`flex-row items-center bg-blue-200 rounded-full px-3 py-1 mr-2 mb-1`}>
                      <CategoryIcon 
                        category={item.subCategory} 
                        size={20} 
                        style={tw`mr-2`} 
                      />
                      <Text style={tw`text-blue-800 text-sm font-medium`}>{item.subCategory.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#6B7280" style={tw`mr-2`} />
                  </>
                )}
                <Text style={tw`text-blue-900 text-sm font-semibold bg-blue-300 rounded-full px-3 py-1`}>
                  {item.partName}
                </Text>
              </>
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
              <Text style={tw`text-sm font-medium text-yellow-800 mb-1`}>{t.clientNote || 'Note du client:'}</Text>
              <Text style={tw`text-sm text-yellow-700`}>{item.notes}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Business info for irepair users */}
      {item.requester?.userType === 'irepair' && (
        <View style={tw`bg-gray-50 rounded-lg p-3 mb-3`}>
          <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>{t.garageInfo || 'Informations garage:'}</Text>
          {item.requester?.businessName && (
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="business-outline" size={14} color="#6B7280" style={tw`mr-2`} />
              <Text style={tw`text-sm text-gray-600`}>{item.requester.businessName}</Text>
              {item.requester.businessType && (
                <Text style={tw`text-xs text-blue-600 ml-2 uppercase`}>
                  ({item.requester.businessType})
                </Text>
              )}
            </View>
          )}
          {item.requester?.address && (
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="location-outline" size={14} color="#6B7280" style={tw`mr-2`} />
              <Text style={tw`text-sm text-gray-600 flex-1`} numberOfLines={2}>
                {item.requester.address}
              </Text>
            </View>
          )}
          {item.requester?.serviceZone && (
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="map-outline" size={14} color="#6B7280" style={tw`mr-2`} />
              <Text style={tw`text-sm text-gray-600`}>
                {t.serviceZone || 'Zone de service:'} {item.requester.serviceZone}
              </Text>
            </View>
          )}
          {item.requester?.serviceTypes && item.requester.serviceTypes.length > 0 && (
            <View style={tw`flex-row items-center flex-wrap mt-1`}>
              <Ionicons name="build-outline" size={14} color="#6B7280" style={tw`mr-2`} />
              <Text style={tw`text-sm text-gray-600 mr-2`}>{t.services || 'Services:'}</Text>
              {item.requester.serviceTypes.map((service, index) => (
                <View key={index} style={tw`bg-green-100 rounded-full px-2 py-1 mr-1 mt-1`}>
                  <Text style={tw`text-xs text-green-700 capitalize`}>{service}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Request Images */}
      {item.images && item.images.length > 0 && (
        <View style={tw`mb-3`}>
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="images-outline" size={16} color="#6B7280" style={tw`mr-2`} />
            <Text style={tw`text-sm font-medium text-gray-700`}>
              {t.partPhotos || `Photo${item.images.length > 1 ? 's' : ''} de la pièce:`}
            </Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`gap-2`}
          >
            {item.images.map((imagePath, index) => {
              const imageUrl = getImageUrl(imagePath);
              return imageUrl ? (
                <TouchableOpacity 
                  key={index} 
                  style={tw`relative`}
                  onPress={() => openImageModal(imageUrl)}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={tw`w-24 h-24 rounded-lg`}
                    resizeMode="cover"
                  />
                  <View style={tw`absolute top-1 right-1 bg-black bg-opacity-50 rounded-full px-2 py-1`}>
                    <Text style={tw`text-white text-xs font-medium`}>{index + 1}</Text>
                  </View>
                  {/* Add a zoom indicator */}
                  <View style={tw`absolute bottom-1 right-1 bg-black bg-opacity-50 rounded-full p-1`}>
                    <Ionicons name="expand" size={12} color="white" />
                  </View>
                </TouchableOpacity>
              ) : null;
            })}
          </ScrollView>
        </View>
      )}

      {/* Quantity info */}
      {item.quantity && item.quantity > 1 && (
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="layers-outline" size={16} color="#6B7280" style={tw`mr-2`} />
          <Text style={tw`text-sm text-gray-600`}>{t.quantityLabel || 'Quantité:'} {item.quantity}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={tw`flex-row justify-between items-center mt-4 pt-4 border-t border-gray-100`}>
        <View>
          <Text style={tw`text-xs text-gray-400`}>{formatTimeAgo(item.createdAt)}</Text>
          {item.lastContactedAt && (
            <Text style={tw`text-xs text-blue-600 mt-1`}>
              {t.lastInteraction || 'Dernière interaction:'} {formatTimeAgo(item.lastContactedAt)}
            </Text>
          )}
        </View>
        
        <View style={tw`flex-col gap-2 flex-wrap`}>
          <TouchableOpacity
            style={tw`bg-blue-600 rounded-lg px-4 py-2 flex-row items-center`}
            onPress={() => startConversation(item)}
          >
            <Ionicons name="chatbubble" size={14} color="white" style={tw`mr-1`} />
            <Text style={tw`text-white text-xs font-medium`}>
              {t.quickChat || 'Chat'}
            </Text>
          </TouchableOpacity>

          {/*<TouchableOpacity
            style={tw`bg-purple-600 rounded-lg px-4 py-2 flex-row items-center`}
            onPress={() => startConversationWithOffer(item)}
          >
            <Ionicons name="chatbubbles" size={14} color="white" style={tw`mr-1`} />
            <Text style={tw`text-white text-xs font-medium`}>
              {t.chatWithMessage || 'Message'}
            </Text>
          </TouchableOpacity> */}

          {item.requester?.phone && 
           item.requester.phone !== 'Not available' && 
           item.requester.phone !== 'Not provided' && (
            <TouchableOpacity
              style={tw`bg-green-600 rounded-lg px-4 py-2 flex-row items-center`}
              onPress={() => handleCallRequester(item)}
            >
              <Ionicons name="call" size={14} color="white" style={tw`mr-1`} />
              <Text style={tw`text-white text-xs font-medium`}>
                {t.call || 'Call'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={tw`text-gray-600 mt-4`}>{t.loadingRequests || 'Chargement des demandes...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={tw`flex-1`}>
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-blue-900 p-4 shadow-lg`}>
        <View style={tw`flex-row items-center mb-4`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold text-white flex-1`}>{t.partsRequestsTitle || 'Demandes de pièces'}</Text>
          <Text style={tw`text-blue-200 text-sm`}>{filteredRequests.length} demandes</Text>
        </View>

        {/* Search */}
        <View style={tw`bg-white rounded-xl p-3 flex-row items-center`}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={tw`mr-3`} />
          <TextInput
            style={tw`flex-1 text-gray-800`}
            placeholder={t.searchByPartName || "Rechercher par nom de pièce, client ou véhicule..."}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <Ionicons name="clipboard-outline" size={64} color="#D1D5DB" />
          <Text style={tw`text-gray-500 text-lg font-semibold mt-4`}>
            {searchQuery ? (t.noResultsFound || 'Aucun résultat trouvé') : (t.noRequests || 'Aucune demande')}
          </Text>
          <Text style={tw`text-gray-400 text-center mt-2 px-8`}>
            {searchQuery 
              ? (t.tryModifyingSearch || 'Essayez de modifier votre recherche')
              : (t.requestsWillAppearHere || 'Les demandes de pièces apparaîtront ici')
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={({ item, index }) => (
            <View key={item._id}>
              <SwipeableRequestCard item={item} />
              {/* Enhanced visual separator */}
              {index < filteredRequests.length - 1 && (
                <View style={tw`flex-row items-center justify-center mx-8 my-4`}>
                  <View style={tw`flex-1 h-px bg-gray-200`} />
                  <View style={tw`mx-3 flex-row space-x-1`}>
                    <View style={tw`w-1.5 h-1.5 bg-blue-300 rounded-full`} />
                    <View style={tw`w-1.5 h-1.5 bg-blue-400 rounded-full`} />
                    <View style={tw`w-1.5 h-1.5 bg-blue-300 rounded-full`} />
                  </View>
                  <View style={tw`flex-1 h-px bg-gray-200`} />
                </View>
              )}
            </View>
          )}
          keyExtractor={(item) => item._id}
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
            style={tw`absolute top-12 right-6 z-10 bg-black bg-opacity-70 rounded-full p-3`}
            onPress={closeImageModal}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          {selectedImage && (
            <TouchableOpacity 
              style={tw`flex-1 justify-center items-center w-full`}
              onPress={closeImageModal}
              activeOpacity={1}
            >
              <Image
                source={{ uri: selectedImage }}
                style={{
                  width: screenWidth - 40,
                  height: screenHeight - 200,
                  maxWidth: screenWidth - 40,
                  maxHeight: screenHeight - 200,
                }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
          
          <View style={tw`absolute bottom-12 left-0 right-0 items-center`}>
            <Text style={tw`text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded-full`}>
              {t.tapToClose || 'Appuyez pour fermer'}
            </Text>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default PartsRequestsPage;
