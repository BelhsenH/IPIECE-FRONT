import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Linking, 
  Alert, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modalize } from 'react-native-modalize';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import PartsService, { PartsRequest } from '../../services/partsService';
import ConversationService, { Conversation } from '../../services/conversationService';
import UserService from '../../services/userService';
import config from '../../config';

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { language, toggleLanguage, translations } = useLanguage();
  const t = translations[language];
  const { user, logout, updateUser } = useAuth();
  const modalizeRef = useRef<Modalize>(null);
  const hasInitialized = useRef(false);
  const [selectedRequest, setSelectedRequest] = useState<PartsRequest | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  
  // Dashboard data
  const [stats, setStats] = useState({
    pendingRequests: 0,
    activeConversations: 0,
    unreadMessages: 0,
    completedRequests: 0,
  });
  const [pendingRequests, setPendingRequests] = useState<PartsRequest[]>([]);

  // Load user profile data
  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await UserService.getProfile();
      updateUser(profile);
    } catch {
      // Error handling - could add user notification here if needed
    }
  }, [updateUser]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      const requestPromise = PartsService.getPartsRequests();
      const allRequests = await Promise.race([requestPromise, timeoutPromise]) as PartsRequest[];
      const pending = allRequests.filter(r => r.status === 'pending');
      const completed = allRequests.filter(r => r.status === 'completed');
      setStats(prev => ({
        ...prev,
        pendingRequests: pending.length,
        completedRequests: completed.length,
      }));
      setPendingRequests(pending);
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
      }
      setStats(prev => ({
        ...prev,
        pendingRequests: 0,
        completedRequests: 0,
      }));
      setPendingRequests([]);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setConversationsLoading(true);
      
      // Don't proceed if user is not available
      if (!user?._id) {
        setStats(prev => ({
          ...prev,
          activeConversations: 0,
          unreadMessages: 0,
        }));
        return;
      }

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000)
      );
      const conversationPromise = ConversationService.getConversations();
      const conversations = await Promise.race([conversationPromise, timeoutPromise]) as Conversation[];
      
      // Validate the conversations data structure
      if (!Array.isArray(conversations)) {
        console.error('ConversationService: Expected array but received:', typeof conversations);
        setStats(prev => ({
          ...prev,
          activeConversations: 0,
          unreadMessages: 0,
        }));
        return;
      }
      
      // Filter out invalid conversations and calculate unread count
      const validConversations = conversations.filter((conv, index) => {
        if (!conv || typeof conv !== 'object') {
          console.warn(`ConversationService: Invalid conversation at index ${index}`);
          return false;
        }
        
        if (!conv._id) {
          console.warn(`ConversationService: Conversation missing _id at index ${index}`);
          return false;
        }
        
        if (!Array.isArray(conv.participants)) {
          console.warn(`ConversationService: Invalid participants at index ${index}`);
          return false;
        }
        
        return true;
      });
      
      // Calculate unread count with proper null checks
      const unreadCount = validConversations.reduce((acc, conv) => {
        try {
          const currentUser = conv.participants.find(p => {
            // Ensure participant structure is valid
            if (!p || typeof p !== 'object') {
              return false;
            }
            
            if (!p.user || typeof p.user !== 'object' || !p.user._id) {
              return false;
            }
            
            return p.user._id === user._id;
          });
          
          if (currentUser && typeof currentUser.unreadCount === 'number') {
            return acc + currentUser.unreadCount;
          }
          
          return acc;
        } catch (error) {
          console.error('ConversationService: Error processing conversation:', error);
          return acc;
        }
      }, 0);

      setStats(prev => ({
        ...prev,
        activeConversations: validConversations.length,
        unreadMessages: unreadCount,
      }));
      
    } catch (error: any) {
      if (error.message === 'Unauthorized' || error.message === 'No authentication token available') {
        console.log('ConversationService: Authorization error');
      } else if (!error?.message?.includes('Timeout')) {
        console.error('ConversationService: Error:', error.message);
      }
      setStats(prev => ({
        ...prev,
        activeConversations: 0,
        unreadMessages: 0,
      }));
    } finally {
      setConversationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (hasInitialized.current) return;
    
    const initializeDashboard = async () => {
      hasInitialized.current = true;
      setLoading(true);
      
      // First load user profile to ensure user data is available
      await loadUserProfile();
      
      // Then load other data in parallel
      await Promise.all([
        loadStats(),
        loadConversations(), // This will now check for user availability internally
      ]);
      
      setLoading(false);
    };
    
    initializeDashboard();
  }, [loadUserProfile, loadStats, loadConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // First refresh user profile to ensure user data is current
      await loadUserProfile();
      
      // Then load other data in parallel
      await Promise.all([
        loadStats(),
        loadConversations(), // This will check for user availability internally
      ]);
    } catch (error) {
      console.error('Dashboard: Error during refresh:', error);
    }
    
    setRefreshing(false);
  }, [loadUserProfile, loadStats, loadConversations]);

// assuming you're using expo-router

const handleLogout = () => {
  Alert.alert(
    t.logoutConfirm || 'Déconnexion',
    t.logoutMessage || 'Voulez-vous vraiment vous déconnecter ?',
    [
      { text: t.cancel || 'Annuler', style: 'cancel' },
      {
        text: t.logout || 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            await logout();
            router.replace('/(auth)/login');
          } catch {
          }
        },
      },
    ]
  );
};


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const openRequestModal = (request: PartsRequest) => {
    setSelectedRequest(request);
    modalizeRef.current?.open();
  };



  const handleStartConversation = async (request: PartsRequest) => {
    try {
      const conversation = await ConversationService.createConversation(request._id);
      router.push(`/(home)/conversation-detail?id=${conversation._id}`);
      modalizeRef.current?.close();
    } catch {
      Alert.alert(t.error || 'Erreur', 'Impossible de démarrer la conversation');
    }
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() =>
      Alert.alert(t.error || 'Erreur', t.callError || 'Impossible de passer l\'appel')
    );
  };

  const getCategoryImageUrl = (imagePath?: string) => {
    if (!imagePath) {
      console.log('Dashboard: No imagePath provided');
      return null;
    }
    if (imagePath.startsWith('http')) {
      console.log('Dashboard: Using absolute URL:', imagePath);
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
    
    console.log('Dashboard: Constructed category image URL:', url, 'from path:', imagePath);
    return url;
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

  const renderNotification = ({ item }: { item: PartsRequest }) => (
    <View style={[
      tw`bg-white rounded-2xl p-5 mb-4`,
      {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
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
          </View>

          {/* Email Information */}
          <View style={tw`flex-row items-center mb-2`}>
            <Ionicons name="mail-outline" size={16} color="#6B7280" style={tw`mr-2`} />
            <Text style={tw`text-xs text-gray-500`} numberOfLines={1}>
              {item.requester?.email || 'Non disponible'}
            </Text>
          </View>
          
          {/* Vehicle info with conditional car icon */}
          <View style={tw`flex-row items-center mb-2`}>
            {(item.vehicleInfo?.brand || item.vehicleInfo?.model || item.vehicleInfo?.year || item.vehicleInfo?.licensePlate) ? (
              <Ionicons name="car" size={16} color="#6B7280" style={tw`mr-1`} />
            ) : null}
            <Text style={tw`text-xs text-gray-500`}>
              {(item.vehicleInfo?.brand || item.vehicleInfo?.model || item.vehicleInfo?.year) ? (
                `${item.vehicleInfo?.brand || ''} ${item.vehicleInfo?.model || ''} ${item.vehicleInfo?.year ? `(${item.vehicleInfo.year})` : ''}`.trim()
              ) : (
                item.vehicleInfo?.vin ? `VIN: ${item.vehicleInfo.vin}` : 'Véhicule non spécifié'
              )}
            </Text>
          </View>

          {/* Additional vehicle info if available */}
          {(item.vehicleInfo?.fuelType || item.vehicleInfo?.engineType) && (
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="car-outline" size={16} color="#6B7280" style={tw`mr-2`} />
              <Text style={tw`text-xs text-gray-400`}>
                {[item.vehicleInfo.fuelType, item.vehicleInfo.engineType].filter(Boolean).join(' • ')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Status and Urgency Summary */}
      <View style={tw`border-t border-gray-100 pt-3 mt-2 mb-3`}>
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

      {/* Footer */}
      <View style={tw`flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100`}>
        <View>
          <Text style={tw`text-xs text-gray-400`}>{formatTimeAgo(item.createdAt)}</Text>
          {item.lastContactedAt && (
            <Text style={tw`text-xs text-blue-600 mt-1`}>
              {t.lastInteraction || 'Dernière interaction:'} {formatTimeAgo(item.lastContactedAt)}
            </Text>
          )}
        </View>
        
        <View style={tw`flex-row gap-2`}>
          <TouchableOpacity
            style={tw`bg-blue-600 rounded-lg px-3 py-2`}
            onPress={() => handleStartConversation(item)}
          >
            <Ionicons name="chatbubble" size={16} color="white" />
          </TouchableOpacity>

          {item.requester?.phone && 
           item.requester.phone !== 'Not available' && 
           item.requester.phone !== 'Not provided' && (
            <TouchableOpacity
              style={tw`bg-green-600 rounded-lg px-3 py-2`}
              onPress={() => handleCall(item.requester?.phone || '')}
            >
              <Ionicons name="call" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  // Add skeleton card component
  const SkeletonCard = () => (
    <View style={tw`w-1/2 px-2 mb-4`}>
      <View style={tw`bg-gray-100 rounded-xl p-4 border-l-4 border-gray-300`}>
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <View style={tw`w-6 h-6 bg-gray-300 rounded`} />
          <View style={tw`w-8 h-8 bg-gray-300 rounded`} />
        </View>
        <View style={tw`w-20 h-4 bg-gray-300 rounded`} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        {/* Header */}
        <View style={tw`bg-blue-900 p-4 shadow-lg`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={tw`mr-3`}>
                <Ionicons name="menu" size={24} color="white" />
              </TouchableOpacity>
              <Text style={tw`text-xl font-bold text-white`}>{t.dashboardTitle || 'Tableau de bord'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(home)/notifications')}>
              <Ionicons name="notifications" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Skeleton Loading */}
        <ScrollView style={tw`flex-1`}>
          <View style={tw`p-4`}>
            <View style={tw`flex-row flex-wrap -mx-2`}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </View>

          {/* Loading indicator */}
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={tw`text-gray-600 mt-4`}>{t.dashboardLoadingText || 'Chargement du tableau de bord...'}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[tw`flex-1 bg-gray-50`, { position: 'relative' }]}>
      {/* Header */}
      <View style={tw`bg-blue-900 p-4 flex-row justify-between items-center shadow-lg`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={toggleSidebar} style={tw`mr-3`}>
            <Ionicons name={isSidebarOpen ? 'close-outline' : 'menu-outline'} size={24} color="white" />
          </TouchableOpacity>
          <Image
            source={require('../../assets/images/logo.png')}
            style={tw`w-10 h-10 mr-3`}
            resizeMode="contain"
          />
          <View>
            <Text style={tw`text-xl font-bold text-white`}>
              {t.hello || (language === 'fr' ? 'Bonjour' : 'مرحباً')} {user?.firstName || 'Utilisateur'}
            </Text>
            <Text style={tw`text-blue-200 text-sm`}>
              {user?.companyName || user?.lastName || 'iPiece Provider'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(home)/profile')}>
              <Text style={tw`text-blue-200 text-sm underline`}>
                {t.viewProfile || (language === 'fr' ? 'Voir le profil' : 'عرض الملف الشخصي')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={tw`flex-row items-center`}>
          {stats.unreadMessages > 0 && (
            <TouchableOpacity
              style={tw`mr-3 relative`}
              onPress={() => router.push('/(home)/messages')}
            >
              <Ionicons name="mail" size={24} color="white" />
              <View style={tw`absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full items-center justify-center`}>
                <Text style={tw`text-white text-xs font-bold`}>
                  {stats.unreadMessages > 9 ? '9+' : stats.unreadMessages}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsSidebarOpen(false)}
          style={tw`absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-40 z-20`}
        />
      )}

      {/* Sidebar */}
      <View
        pointerEvents={isSidebarOpen ? 'auto' : 'none'}
        style={[
          tw`absolute top-0 bottom-0 left-0 w-3/4 max-w-[300px] z-30 bg-white p-4`,
          {
            borderTopRightRadius: 20,
            borderBottomRightRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            transform: [{ translateX: isSidebarOpen ? 0 : -350 }],
          }
        ]}
      >
        <View style={tw`h-4`} />
        
        {/* User Info */}
        <View style={tw`items-center mb-6`}>
          <TouchableOpacity 
            style={tw`items-center`}
            onPress={() => { 
              setIsSidebarOpen(false); 
              router.push('/(home)/profile'); 
            }}
          >
            <View style={tw`w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-2`}>
              <Ionicons name="business" size={32} color="#1E3A8A" />
            </View>
            <Text style={tw`text-blue-900 text-base font-bold text-center`}>
              {user?.firstName || ''} {user?.lastName || ''}
            </Text>
            <Text style={tw`text-blue-400 text-xs text-center`}>{user?.email || ''}</Text>
            <Text style={tw`text-blue-600 text-sm font-semibold mt-1 text-center`}>
              {user?.companyName || (t.supplier || (language === 'fr' ? 'Fournisseur iPiece' : 'مورد iPiece'))}
            </Text>
            <Text style={tw`text-blue-300 text-xs mt-1 underline`}>
              {t.editProfile || (language === 'fr' ? 'Modifier le profil' : 'تعديل الملف الشخصي')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language Toggle */}
        <View style={tw`mb-4 border-t border-blue-100 pt-4`}>
          <TouchableOpacity
            style={tw`flex-row items-center justify-between p-3 rounded-xl bg-blue-50`}
            onPress={toggleLanguage}
          >
            <View style={tw`flex-row items-center`}>
              <Ionicons name="language-outline" size={20} color="#3B82F6" style={tw`mr-3`} />
              <Text style={tw`text-blue-800 text-base font-medium`}>
                {language === 'fr' ? 'Langue' : 'اللغة'}
              </Text>
            </View>
            <View style={tw`flex-row items-center bg-white rounded-lg px-3 py-1`}>
              <Text style={tw`text-blue-900 text-sm font-semibold`}>
                {language === 'fr' ? 'FR' : 'AR'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#1E3A8A" style={tw`ml-1`} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Navigation */}
        <TouchableOpacity
          style={tw`flex-row items-center mb-3 p-3 rounded-xl bg-blue-900`}
          onPress={() => { setIsSidebarOpen(false); }}
        >
          <Ionicons name="grid-outline" size={20} color="white" style={tw`mr-3`} />
          <Text style={tw`text-white text-base font-medium`}>
            {t.dashboard || (language === 'fr' ? 'Tableau de bord' : 'لوحة القيادة')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`flex-row items-center mb-3 p-3 rounded-xl bg-blue-800`}
          onPress={() => { setIsSidebarOpen(false); router.push('/(home)/parts-requests'); }}
        >
          <Ionicons name="list-outline" size={20} color="white" style={tw`mr-3`} />
          <Text style={tw`text-white text-base font-medium`}>
            {t.allRequests || (language === 'fr' ? 'Toutes les demandes' : 'جميع الطلبات')}
          </Text>
        </TouchableOpacity>

       {/* <TouchableOpacity
          style={tw`flex-row items-center mb-3 p-3 rounded-xl bg-green-700`}
          onPress={() => { setIsSidebarOpen(false); router.push('/(home)/parts-requests-new'); }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="white" style={tw`mr-3`} />
          <Text style={tw`text-white text-base font-medium`}>
            {language === 'fr' ? 'Mes demandes acceptées' : 'طلباتي المقبولة'}
          </Text>
        </TouchableOpacity>*/}

        <TouchableOpacity
          style={tw`flex-row items-center mb-3 p-3 rounded-xl bg-blue-700`}
          onPress={() => { setIsSidebarOpen(false); router.push('/(home)/conversations'); }}
        >
          <Ionicons name="chatbubbles-outline" size={20} color="white" style={tw`mr-3`} />
          <Text style={tw`text-white text-base font-medium`}>
            {t.conversations || (language === 'fr' ? 'Conversations' : 'المحادثات')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`flex-row items-center mb-3 p-3 rounded-xl bg-blue-700`}
          onPress={() => { setIsSidebarOpen(false); router.push('/(home)/messages'); }}
        >
          <Ionicons name="mail-outline" size={20} color="white" style={tw`mr-3`} />
          <Text style={tw`text-white text-base font-medium`}>
            {t.messages || (language === 'fr' ? 'Messages' : 'الرسائل')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw`flex-row items-center mb-3 p-3 rounded-xl bg-blue-600`}
          onPress={() => { setIsSidebarOpen(false); router.push('/(home)/profile'); }}
        >
          <Ionicons name="person-outline" size={20} color="white" style={tw`mr-3`} />
          <Text style={tw`text-white text-base font-medium`}>
            {t.profile || (language === 'fr' ? 'Profil' : 'الملف الشخصي')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={tw`flex-1`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Statistics Cards */}
        <View style={tw`p-4`}>
          <View style={tw`flex-row flex-wrap -mx-2`}>
            <View style={tw`w-1/2 px-2 mb-4`}>
              <View style={tw`bg-orange-50 rounded-xl p-4 border-l-4 border-orange-500`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Ionicons name="time" size={24} color="#F59E0B" />
                  {statsLoading ? (
                    <ActivityIndicator size="small" color="#F59E0B" />
                  ) : (
                    <Text style={tw`text-2xl font-bold text-orange-600`}>{stats.pendingRequests}</Text>
                  )}
                </View>
                <Text style={tw`text-orange-700 font-medium`}>
                  {t.pending || (language === 'fr' ? 'En attente' : 'في الانتظار')}
                </Text>
              </View>
            </View>
            
            <View style={tw`w-1/2 px-2 mb-4`}>
              <View style={tw`bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Ionicons name="chatbubbles" size={24} color="#3B82F6" />
                  {conversationsLoading ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Text style={tw`text-2xl font-bold text-blue-600`}>{stats.activeConversations}</Text>
                  )}
                </View>
                <Text style={tw`text-blue-700 font-medium`}>
                  {t.conversations || (language === 'fr' ? 'Conversations' : 'المحادثات')}
                </Text>
              </View>
            </View>

            <View style={tw`w-1/2 px-2 mb-4`}>
              <View style={tw`bg-red-50 rounded-xl p-4 border-l-4 border-red-500`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Ionicons name="mail-unread" size={24} color="#EF4444" />
                  {conversationsLoading ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Text style={tw`text-2xl font-bold text-red-600`}>{stats.unreadMessages}</Text>
                  )}
                </View>
                <Text style={tw`text-red-700 font-medium`}>
                  {t.unread || (language === 'fr' ? 'Non lus' : 'غير مقروء')}
                </Text>
              </View>
            </View>

            <View style={tw`w-1/2 px-2 mb-4`}>
              <View style={tw`bg-green-50 rounded-xl p-4 border-l-4 border-green-500`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  {statsLoading ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <Text style={tw`text-2xl font-bold text-green-600`}>{stats.completedRequests}</Text>
                  )}
                </View>
                <Text style={tw`text-green-700 font-medium`}>
                  {t.completed || (language === 'fr' ? 'Terminées' : 'مكتملة')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={tw`px-4 mb-6`}>
          <Text style={tw`text-xl font-bold text-gray-900 mb-4`}>{t.quickActions || 'Actions rapides'}</Text>
          <View style={tw`flex-row flex-wrap gap-3`}>
            <TouchableOpacity
              style={tw`flex-1 bg-blue-600 rounded-xl p-4 items-center min-w-32`}
              onPress={() => router.push('/(home)/parts-requests')}
            >
              <Ionicons name="list" size={24} color="white" />
              <Text style={tw`text-white font-semibold mt-2 text-center`}>{t.viewAllRequestsButton || 'Voir toutes\nles demandes'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={tw`flex-1 bg-green-600 rounded-xl p-4 items-center min-w-32`}
              onPress={() => router.push('/(home)/messages')}
            >
              <Ionicons name="chatbubbles" size={24} color="white" />
              <Text style={tw`text-white font-semibold mt-2 text-center`}>{t.messagesButton || 'Messages'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Requests */}
        <View style={tw`px-4 mb-6`}>
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>
              {t.pendingRequestsTitle || 'Demandes en attente'} ({pendingRequests.length})
            </Text>
            <TouchableOpacity onPress={() => router.push('/(home)/parts-requests')}>
              <Text style={tw`text-blue-600 font-semibold`}>{t.seeAll || 'Voir tout'}</Text>
            </TouchableOpacity>
          </View>
          
          {pendingRequests.length === 0 ? (
            <View style={tw`bg-white rounded-xl p-8 items-center`}>
              <Ionicons name="clipboard-outline" size={48} color="#D1D5DB" />
              <Text style={tw`text-gray-500 text-lg font-semibold mt-4`}>
                {statsLoading ? (t.loading || 'Chargement...') : (t.noRequestsPending || 'Aucune demande en attente')}
              </Text>
              <Text style={tw`text-gray-400 text-center mt-2`}>
                {statsLoading 
                  ? (t.loadingData || 'Récupération des données en cours...')
                  : (t.newRequestsWillAppearHere || 'Les nouvelles demandes de pièces apparaîtront ici')
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={pendingRequests.slice(0, 3)}
              renderItem={({ item, index }) => (
                <View key={item._id}>
                  {renderNotification({ item })}
                  {/* Enhanced visual separator */}
                  {index < Math.min(pendingRequests.length, 3) - 1 && (
                    <View style={tw`flex-row items-center justify-center mx-6 my-3`}>
                      <View style={tw`flex-1 h-px bg-gray-200`} />
                      <View style={tw`mx-2 w-1 h-1 bg-blue-300 rounded-full`} />
                      <View style={tw`flex-1 h-px bg-gray-200`} />
                    </View>
                  )}
                </View>
              )}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal pour les détails de la demande */}
      <Modalize
        ref={modalizeRef}
        adjustToContentHeight
        modalStyle={tw`bg-white rounded-t-3xl`}
        handlePosition="outside"
        handleStyle={tw`bg-gray-300 w-12 h-1.5 rounded-full mt-2`}
      >
        {selectedRequest && (
          <View style={tw`p-6`}>
            <Text style={tw`text-2xl font-bold text-blue-900 mb-6`}>{t.requestDetails || 'Détails de la demande'}</Text>
            
            <View style={tw`bg-gray-50 rounded-xl p-4 mb-6`}>
              <View style={tw`flex-row items-center mb-3`}>
                {selectedRequest.category?.imagePath ? (
                  <Image
                    source={{ uri: getCategoryImageUrl(selectedRequest.category.imagePath) }}
                    style={tw`w-8 h-8 mr-3`}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name="car-sport" size={32} color="#1E3A8A" style={tw`mr-3`} />
                )}
                <Text style={tw`text-xl font-bold text-gray-800`}>{selectedRequest.partName}</Text>
              </View>
              
              <View style={tw`mb-4`}>
                <Text style={tw`text-base font-semibold text-gray-700 mb-1`}>{t.requesterLabel || 'Demandeur:'}</Text>
                <Text style={tw`text-gray-600`}>
                  {selectedRequest.requester?.firstName} {selectedRequest.requester?.lastName} 
                  ({selectedRequest.requester?.userType || 'Utilisateur'})
                </Text>
                <Text style={tw`text-blue-600`}>{selectedRequest.requester?.phone}</Text>
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-base font-semibold text-gray-700 mb-1`}>{t.vehicleLabel || 'Véhicule:'}</Text>
                <Text style={tw`text-gray-600`}>
                  {selectedRequest.vehicleInfo?.brand} {selectedRequest.vehicleInfo?.model} ({selectedRequest.vehicleInfo?.year})
                </Text>
                <Text style={tw`text-gray-500 text-sm`}>
                  {t.licensePlate || 'Immatriculation:'} {selectedRequest.vehicleInfo?.licensePlate}
                </Text>
                {selectedRequest.vehicleInfo?.vin && (
                  <Text style={tw`text-gray-500 text-sm`}>VIN: {selectedRequest.vehicleInfo.vin}</Text>
                )}
              </View>

              {selectedRequest.notes && (
                <View style={tw`mb-4`}>
                  <Text style={tw`text-base font-semibold text-gray-700 mb-1`}>{t.notesLabel || 'Notes:'}</Text>
                  <Text style={tw`text-gray-600`}>{selectedRequest.notes}</Text>
                </View>
              )}

              <View style={tw`flex-row justify-between items-center`}>
                <View>
                  <Text style={tw`text-sm text-gray-500`}>{t.urgencyLabel || 'Urgence:'}</Text>
                  <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: getUrgencyColor(selectedRequest.urgencyLevel || 'medium') }]}>
                    <Text style={tw`text-white text-sm font-semibold`}>
                      {getUrgencyText(selectedRequest.urgencyLevel || 'medium')}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={tw`text-sm text-gray-500`}>{t.dateLabel || 'Date:'}</Text>
                  <Text style={tw`text-gray-700`}>{formatTimeAgo(selectedRequest.createdAt)}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                style={tw`flex-1 bg-blue-600 rounded-xl p-4 items-center`}
                onPress={() => handleStartConversation(selectedRequest)}
              >
                <Ionicons name="chatbubble" size={20} color="white" />
                <Text style={tw`text-white font-semibold mt-1`}>{t.message || 'Message'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={tw`flex-1 bg-green-600 rounded-xl p-4 items-center`}
                onPress={() => handleCall(selectedRequest.requester?.phone || '')}
              >
                <Ionicons name="call" size={20} color="white" />
                <Text style={tw`text-white font-semibold mt-1`}>{t.callAction || 'Appeler'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modalize>
    </SafeAreaView>
  );
};

export default Dashboard;