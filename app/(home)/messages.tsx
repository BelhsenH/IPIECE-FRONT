import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ConversationService, { Conversation } from '../../services/conversationService';

const MessagesPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const [filters, setFilters] = useState([
    { key: 'all', label: language === 'fr' ? 'Toutes' : 'الكل', count: 0 },
    { key: 'unread', label: language === 'fr' ? 'Non lues' : 'غير مقروء', count: 0 },
  ]);

  const loadConversations = useCallback(async () => {
    // Don't proceed if user is not available
    if (!user?._id) {
      console.log('MessagesPage: User not available, skipping conversations load');
      setConversations([]);
      setFilteredConversations([]);
      setFilters([
        { key: 'all', label: language === 'fr' ? 'Toutes' : 'الكل', count: 0 },
        { key: 'unread', label: language === 'fr' ? 'Non lues' : 'غير مقروء', count: 0 },
      ]);
      setConversationsLoading(false);
      setLoading(false);
      return;
    }

    try {
      setConversationsLoading(true);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000)
      );
      
      const conversationPromise = ConversationService.getConversations();
      
      const data = await Promise.race([conversationPromise, timeoutPromise]) as Conversation[];
      
      // Validate the data structure
      if (!Array.isArray(data)) {
        console.error('MessagesPage: Expected array but received:', typeof data);
        throw new Error('Invalid data structure');
      }

      // Filter out invalid conversations
      const validConversations = data.filter((conv, index) => {
        if (!conv || typeof conv !== 'object') {
          console.warn(`MessagesPage: Invalid conversation at index ${index}`);
          return false;
        }
        
        if (!conv._id) {
          console.warn(`MessagesPage: Conversation missing _id at index ${index}`);
          return false;
        }
        
        if (!Array.isArray(conv.participants)) {
          console.warn(`MessagesPage: Invalid participants at index ${index}`);
          return false;
        }
        
        return true;
      });

      setConversations(validConversations);
      setFilteredConversations(validConversations);
      
      // Update filter counts with proper validation
      const unreadCount = validConversations.reduce((acc, conv) => {
        try {
          const currentUserParticipant = conv.participants.find(p => {
            if (!p || typeof p !== 'object' || !p.user || !p.user._id) {
              return false;
            }
            return p.user._id === user._id;
          });
          return acc + (currentUserParticipant?.unreadCount && currentUserParticipant.unreadCount > 0 ? 1 : 0);
        } catch (error) {
          console.error('MessagesPage: Error processing conversation for unread count:', error);
          return acc;
        }
      }, 0);
      
      setFilters([
        { key: 'all', label: language === 'fr' ? 'Toutes' : 'الكل', count: validConversations.length },
        { key: 'unread', label: language === 'fr' ? 'Non lues' : 'غير مقروء', count: unreadCount },
      ]);
    } catch (error: any) {
      console.error('Erreur lors du chargement des conversations:', error);
      if (!error?.message?.includes('Timeout')) {
        Alert.alert(
          language === 'fr' ? 'Erreur' : 'خطأ', 
          language === 'fr' ? 'Impossible de charger les conversations' : 'تعذر تحميل المحادثات'
        );
      }
      // Set empty state on error
      setConversations([]);
      setFilteredConversations([]);
      setFilters([
        { key: 'all', label: language === 'fr' ? 'Toutes' : 'الكل', count: 0 },
        { key: 'unread', label: language === 'fr' ? 'Non lues' : 'غير مقروء', count: 0 },
      ]);
    } finally {
      setConversationsLoading(false);
      setLoading(false);
    }
  }, [user, language]);

  const filterConversations = useCallback(() => {
    let filtered = conversations;

    // Filter by unread status
    if (selectedFilter === 'unread') {
      filtered = filtered.filter(conv => {
        try {
          if (!user?._id || !Array.isArray(conv.participants)) {
            return false;
          }
          
          const currentUserParticipant = conv.participants.find(p => {
            if (!p || typeof p !== 'object' || !p.user || !p.user._id) {
              return false;
            }
            return p.user._id === user._id;
          });
          
          return currentUserParticipant?.unreadCount && currentUserParticipant.unreadCount > 0;
        } catch (error) {
          console.error('MessagesPage: Error filtering conversation:', error);
          return false;
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        try {
          if (!user?._id || !Array.isArray(conv.participants)) {
            return false;
          }
          
          const otherParticipant = conv.participants.find(p => {
            if (!p || typeof p !== 'object' || !p.user || !p.user._id) {
              return false;
            }
            return p.user._id !== user._id;
          })?.user;
          
          return (
            otherParticipant?.firstName?.toLowerCase().includes(query) ||
            otherParticipant?.lastName?.toLowerCase().includes(query) ||
            conv.lastMessage?.content?.toLowerCase().includes(query)
          );
        } catch (error) {
          console.error('MessagesPage: Error searching conversation:', error);
          return false;
        }
      });
    }

    setFilteredConversations(filtered);
  }, [searchQuery, selectedFilter, conversations, user]);

  useEffect(() => {
    // Set initial loading to false immediately to show UI faster
    setLoading(false);
    
    // Only load data if user is available
    if (user?._id) {
      loadConversations();
    } else {
      // If user is not available, set empty state
      setConversations([]);
      setFilteredConversations([]);
      setFilters([
        { key: 'all', label: language === 'fr' ? 'Toutes' : 'الكل', count: 0 },
        { key: 'unread', label: language === 'fr' ? 'Non lues' : 'غير مقروء', count: 0 },
      ]);
      setConversationsLoading(false);
    }
  }, [loadConversations, user?._id, language]);

  useEffect(() => {
    filterConversations();
  }, [filterConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const openConversation = (conversation: Conversation) => {
    router.push(`/(home)/conversation-detail?id=${conversation._id}`);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}j`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    // Safely get other participant with proper validation
    let otherParticipant = null;
    let currentUserParticipant = null;
    
    try {
      if (user?._id && Array.isArray(item.participants)) {
        otherParticipant = item.participants.find(p => {
          if (!p || typeof p !== 'object' || !p.user || !p.user._id) {
            return false;
          }
          return p.user._id !== user._id;
        })?.user;
        
        currentUserParticipant = item.participants.find(p => {
          if (!p || typeof p !== 'object' || !p.user || !p.user._id) {
            return false;
          }
          return p.user._id === user._id;
        });
      }
    } catch (error) {
      console.error('MessagesPage: Error processing participants:', error);
    }
    
    const unreadCount = currentUserParticipant?.unreadCount || 0;
    const hasUnread = unreadCount > 0;

    return (
      <TouchableOpacity
        style={[
          tw`bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4`,
          hasUnread ? tw`border-l-blue-500` : tw`border-l-gray-200`
        ]}
        onPress={() => openConversation(item)}
      >
        <View style={tw`flex-row items-start`}>
          {/* Avatar */}
          <View style={tw`w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3`}>
            <Ionicons name="person" size={20} color="#1E3A8A" />
          </View>

          {/* Content */}
          <View style={tw`flex-1`}>
            <View style={tw`flex-row justify-between items-start mb-2`}>
              <View>
                <Text style={[
                  tw`text-base font-semibold text-gray-900`,
                  hasUnread && tw`font-bold`
                ]}>
                  {otherParticipant?.firstName || 'Utilisateur'} {otherParticipant?.lastName || ''}
                </Text>
                <Text style={tw`text-sm text-blue-600`}>
                  {otherParticipant?.userType || 'Utilisateur'}
                </Text>
              </View>
              
              <View style={tw`items-end`}>
                <Text style={tw`text-xs text-gray-400`}>
                  {formatTimeAgo(item.lastMessage?.timestamp?.toString() || item.updatedAt?.toString() || new Date().toISOString())}
                </Text>
                {hasUnread && (
                  <View style={tw`bg-blue-500 rounded-full w-5 h-5 items-center justify-center mt-1`}>
                    <Text style={tw`text-white text-xs font-bold`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Last message */}
            <Text
              style={[
                tw`text-sm text-gray-600`,
                hasUnread && tw`font-semibold text-gray-800`
              ]}
              numberOfLines={2}
            >
              {item.lastMessage?.content || 'Nouvelle conversation'}
            </Text>

            {/* Status indicator */}
            <View style={tw`flex-row items-center justify-between mt-2`}>
              <View style={tw`px-2 py-1 rounded-full bg-green-100`}>
                <Text style={tw`text-xs font-semibold text-green-700`}>
                  Active
                </Text>
              </View>
              
              <Ionicons 
                name="chevron-forward" 
                size={16} 
                color="#9CA3AF" 
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && conversationsLoading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={tw`text-gray-600 mt-4`}>
            {language === 'fr' ? 'Chargement des messages...' : 'تحميل الرسائل...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-blue-900 p-4 shadow-lg`}>
        <View style={tw`flex-row items-center mb-4`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold text-white flex-1`}>
            {language === 'fr' ? 'Messages' : 'الرسائل'}
          </Text>
          <Text style={tw`text-blue-200 text-sm`}>
            {filteredConversations.length} {language === 'fr' ? 'conversations' : 'محادثة'}
          </Text>
        </View>

        {/* Search */}
        <View style={tw`bg-white rounded-xl p-3 flex-row items-center`}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={tw`mr-3`} />
          <TextInput
            style={tw`flex-1 text-gray-800`}
            placeholder={language === 'fr' ? 'Rechercher une conversation...' : 'البحث في المحادثات...'}
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

      {/* Filters */}
      <View style={tw`bg-white border-b border-gray-200`}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          contentContainerStyle={tw`px-4 py-3`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                tw`px-4 py-2 rounded-full mr-3`,
                selectedFilter === item.key ? tw`bg-blue-600` : tw`bg-gray-100`
              ]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text
                style={[
                  tw`font-semibold`,
                  selectedFilter === item.key ? tw`text-white` : tw`text-gray-600`
                ]}
              >
                {item.label} ({item.count})
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text style={tw`text-gray-500 text-lg font-semibold mt-4`}>
            {searchQuery 
              ? (language === 'fr' ? 'Aucune conversation trouvée' : 'لم يتم العثور على محادثات')
              : (language === 'fr' ? 'Aucune conversation' : 'لا توجد محادثات')
            }
          </Text>
          <Text style={tw`text-gray-400 text-center mt-2 px-8`}>
            {searchQuery 
              ? (language === 'fr' ? 'Essayez de modifier votre recherche' : 'جرب تعديل البحث')
              : (language === 'fr' ? 'Les conversations avec les clients apparaîtront ici' : 'ستظهر المحادثات مع العملاء هنا')
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item._id}
          contentContainerStyle={tw`p-4`}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
};

export default MessagesPage;
