import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ConversationService, { Conversation } from '../../services/conversationService';
import WebSocketService, { WebSocketMessage } from '../../services/websocketService';

const ConversationsScreen: React.FC = () => {
  const router = useRouter();
  const { user, token } = useAuth();
  const { language, translations } = useLanguage();
  const t = translations[language];

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!token) return;

    try {
      const conversationsData = await ConversationService.getConversations();
      setConversations(conversationsData);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Impossible de charger les conversations'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
    
    // Initialize WebSocket connection
    WebSocketService.connect();

    // Subscribe to WebSocket messages
    const unsubscribeNewMessage = WebSocketService.subscribe('new_message', (message: WebSocketMessage) => {
      console.log('Received new message:', message);
      // Update the conversation with the new message
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message.data,
              messages: [...(conv.messages || []), message.data],
              updatedAt: new Date()
            };
          }
          return conv;
        });
      });
    });

    const unsubscribeMessageRead = WebSocketService.subscribe('message_read', (message: WebSocketMessage) => {
      console.log('Messages marked as read:', message);
      // Update unread counts for the conversation
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              participants: conv.participants.map(p => {
                if (p.user && p.user._id === user?._id) {
                  return { ...p, unreadCount: 0 };
                }
                return p;
              })
            };
          }
          return conv;
        })
      );
    });

    const unsubscribeConversationUpdated = WebSocketService.subscribe('conversation_updated', (message: WebSocketMessage) => {
      console.log('Conversation updated:', message);
      // Refresh conversations to get the latest data
      loadConversations();
    });

    const unsubscribeConversationCreated = WebSocketService.subscribe('conversation_created', (message: WebSocketMessage) => {
      console.log('New conversation created:', message);
      // Add the new conversation to the list
      setConversations(prevConversations => [message.data, ...prevConversations]);
    });

    const unsubscribeConnection = WebSocketService.onConnectionChange((connected: boolean) => {
      setWsConnected(connected);
      if (connected) {
        console.log('WebSocket connected, refreshing conversations');
        // Refresh data when connection is restored
        loadConversations();
      }
    });

    return () => {
      // Cleanup subscriptions
      unsubscribeNewMessage();
      unsubscribeMessageRead();
      unsubscribeConversationUpdated();
      unsubscribeConversationCreated();
      unsubscribeConnection();
    };
  }, [loadConversations, user?._id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const handleConversationPress = (conversationId: string) => {
    router.push(`/(home)/(conversation-details)/${conversationId}` as any);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays}j`;
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.user && p.user._id !== user?._id)?.user;
  };

  const getCurrentUserUnreadCount = (conversation: Conversation) => {
    const currentUserParticipant = conversation.participants.find(p => p.user && p.user._id === user?._id);
    return currentUserParticipant?.unreadCount || 0;
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherUser = getOtherParticipant(item);
    const unreadCount = getCurrentUserUnreadCount(item);
    const lastMessage = item.lastMessage;

    return (
      <TouchableOpacity
        style={tw`bg-white rounded-xl p-4 mb-3 shadow-md ${unreadCount > 0 ? 'border-l-4 border-blue-500' : ''}`}
        onPress={() => handleConversationPress(item._id)}
      >
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center mb-2`}>
              <View style={tw`w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3`}>
                <Ionicons 
                  name={otherUser?.userType === 'icar' ? 'car' : 'build'} 
                  size={24} 
                  color="#1E3A8A" 
                />
              </View>
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <Text style={tw`text-lg font-bold text-gray-900`}>
                    {otherUser?.firstName} {otherUser?.lastName}
                  </Text>
                  {unreadCount > 0 && (
                    <View style={tw`bg-blue-500 rounded-full min-w-6 h-6 items-center justify-center px-2`}>
                      <Text style={tw`text-white text-xs font-bold`}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={tw`text-sm text-blue-600 font-medium`}>
                  {otherUser?.userType === 'icar' ? 'Client iCar' : 'Service iRepair'}
                </Text>
              </View>
            </View>

            {lastMessage && (
              <View style={tw`ml-15`}>
                <Text 
                  style={tw`text-gray-600 mb-1 ${unreadCount > 0 ? 'font-semibold' : ''}`}
                  numberOfLines={2}
                >
                  {lastMessage.sender && lastMessage.sender._id === user?._id ? 'Vous: ' : ''}
                  {lastMessage.content}
                </Text>
                <Text style={tw`text-xs text-gray-400`}>
                  {formatTimeAgo((lastMessage.timestamp || lastMessage.createdAt || new Date()).toString())}
                </Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`bg-blue-900 p-4 flex-row items-center shadow-lg`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold text-white`}>
            {language === 'fr' ? 'Conversations' : 'المحادثات'}
          </Text>
        </View>
        
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={tw`text-gray-600 mt-4`}>
            {language === 'fr' ? 'Chargement des conversations...' : 'جاري تحميل المحادثات...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-blue-900 p-4 flex-row items-center justify-between shadow-lg`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold text-white`}>
            {language === 'fr' ? 'Mes Conversations' : 'محادثاتي'}
          </Text>
          {wsConnected && (
            <View style={tw`ml-2`}>
              <Ionicons name="wifi" size={16} color="#4ECDC4" />
            </View>
          )}
        </View>
        
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <ScrollView 
          contentContainerStyle={tw`flex-grow justify-center items-center p-4`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={tw`items-center`}>
            <Ionicons name="chatbubbles-outline" size={80} color="#D1D5DB" />
            <Text style={tw`text-xl font-bold text-gray-500 mt-4 text-center`}>
              {language === 'fr' ? 'Aucune conversation' : 'لا توجد محادثات'}
            </Text>
            <Text style={tw`text-gray-400 text-center mt-2 max-w-xs`}>
              {language === 'fr' 
                ? 'Vos conversations avec les clients apparaîtront ici' 
                : 'ستظهر محادثاتك مع العملاء هنا'
              }
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={tw`p-4`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Stats Footer */}
      <View style={tw`bg-white border-t border-gray-200 p-4`}>
        <View style={tw`flex-row justify-around`}>
          <View style={tw`items-center`}>
            <Text style={tw`text-2xl font-bold text-blue-900`}>
              {conversations.length}
            </Text>
            <Text style={tw`text-sm text-gray-600`}>
              {language === 'fr' ? 'Total' : 'المجموع'}
            </Text>
          </View>
          
          <View style={tw`items-center`}>
            <Text style={tw`text-2xl font-bold text-orange-600`}>
              {conversations.reduce((acc, conv) => acc + getCurrentUserUnreadCount(conv), 0)}
            </Text>
            <Text style={tw`text-sm text-gray-600`}>
              {language === 'fr' ? 'Non lues' : 'غير مقروءة'}
            </Text>
          </View>
          
          <View style={tw`items-center`}>
            <Text style={tw`text-2xl font-bold text-green-600`}>
              {conversations.filter(conv => conv.messages?.length > 0).length}
            </Text>
            <Text style={tw`text-sm text-gray-600`}>
              {language === 'fr' ? 'Actives' : 'نشطة'}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ConversationsScreen;
