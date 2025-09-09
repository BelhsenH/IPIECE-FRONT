import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../../contexts/AuthContext';
import PartsService, { PartsRequest } from '../../services/partsService';
import ConversationService, { Conversation } from '../../services/conversationService';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    pendingRequests: 0,
    activeConversations: 0,
    unreadMessages: 0,
    completedRequests: 0,
  });
  const [recentRequests, setRecentRequests] = useState<PartsRequest[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    
    try {
      // Charger les demandes de pièces
      const requests = await PartsService.getPartsRequests();
      const pendingRequests = requests.filter(r => r.status === 'pending');
      const completedRequests = requests.filter(r => r.status === 'completed');
      
      // Charger les conversations
      const conversations = await ConversationService.getConversations(token);
      const unreadCount = conversations.reduce((acc, conv) => {
        const currentUser = conv.participants.find(p => p.user._id === user?.id);
        return acc + (currentUser?.unreadCount || 0);
      }, 0);

      setStats({
        pendingRequests: pendingRequests.length,
        activeConversations: conversations.length,
        unreadMessages: unreadCount,
        completedRequests: completedRequests.length,
      });

      // Les 5 demandes les plus récentes
      setRecentRequests(requests.slice(0, 5));
      
      // Les 5 conversations les plus récentes
      setRecentConversations(conversations.slice(0, 5));
      
    } catch (error) {
      console.error('Erreur lors du chargement du tableau de bord:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du tableau de bord');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptée';
      case 'completed': return 'Terminée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
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

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={tw`text-gray-600 mt-4`}>Chargement du tableau de bord...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-8`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* En-tête */}
        <View style={tw`bg-blue-600 px-6 py-8 rounded-b-3xl shadow-lg`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <View>
              <Text style={tw`text-white text-2xl font-bold`}>
                Bonjour, {user?.nomBoutiqueSociete || user?.nomGerant || 'Fournisseur'}!
              </Text>
              <Text style={tw`text-blue-200 text-base mt-1`}>
                Voici votre aperçu aujourd'hui
              </Text>
            </View>
            <TouchableOpacity
              style={tw`w-12 h-12 bg-blue-700 rounded-full items-center justify-center`}
              onPress={() => router.push('/(home)/notifications')}
            >
              <Ionicons name="notifications" size={24} color="white" />
              {stats.unreadMessages > 0 && (
                <View style={tw`absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full items-center justify-center`}>
                  <Text style={tw`text-white text-xs font-bold`}>
                    {stats.unreadMessages > 9 ? '9+' : stats.unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistiques */}
        <View style={tw`px-6 -mt-8`}>
          <View style={tw`bg-white rounded-2xl shadow-lg p-6 mb-6`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Aperçu</Text>
            <View style={tw`flex-row flex-wrap`}>
              <View style={tw`w-1/2 pr-2 mb-4`}>
                <View style={tw`bg-orange-50 rounded-xl p-4`}>
                  <View style={tw`flex-row items-center justify-between`}>
                    <Ionicons name="time" size={24} color="#F59E0B" />
                    <Text style={tw`text-2xl font-bold text-orange-600`}>
                      {stats.pendingRequests}
                    </Text>
                  </View>
                  <Text style={tw`text-orange-700 font-medium mt-2`}>En attente</Text>
                </View>
              </View>
              
              <View style={tw`w-1/2 pl-2 mb-4`}>
                <View style={tw`bg-blue-50 rounded-xl p-4`}>
                  <View style={tw`flex-row items-center justify-between`}>
                    <Ionicons name="chatbubbles" size={24} color="#3B82F6" />
                    <Text style={tw`text-2xl font-bold text-blue-600`}>
                      {stats.activeConversations}
                    </Text>
                  </View>
                  <Text style={tw`text-blue-700 font-medium mt-2`}>Conversations</Text>
                </View>
              </View>

              <View style={tw`w-1/2 pr-2`}>
                <View style={tw`bg-red-50 rounded-xl p-4`}>
                  <View style={tw`flex-row items-center justify-between`}>
                    <Ionicons name="mail-unread" size={24} color="#EF4444" />
                    <Text style={tw`text-2xl font-bold text-red-600`}>
                      {stats.unreadMessages}
                    </Text>
                  </View>
                  <Text style={tw`text-red-700 font-medium mt-2`}>Non lus</Text>
                </View>
              </View>

              <View style={tw`w-1/2 pl-2`}>
                <View style={tw`bg-green-50 rounded-xl p-4`}>
                  <View style={tw`flex-row items-center justify-between`}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <Text style={tw`text-2xl font-bold text-green-600`}>
                      {stats.completedRequests}
                    </Text>
                  </View>
                  <Text style={tw`text-green-700 font-medium mt-2`}>Terminées</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={tw`px-6 mb-6`}>
          <View style={tw`bg-white rounded-2xl shadow-lg p-6`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-4`}>Actions rapides</Text>
            <View style={tw`flex-row flex-wrap gap-4`}>
              <TouchableOpacity
                style={tw`flex-1 bg-blue-600 rounded-xl p-4 items-center min-w-32`}
                onPress={() => router.push('/(home)/parts-requests')}
              >
                <Ionicons name="list" size={24} color="white" />
                <Text style={tw`text-white font-semibold mt-2 text-center`}>
                  Voir toutes{'\n'}les demandes
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={tw`flex-1 bg-green-600 rounded-xl p-4 items-center min-w-32`}
                onPress={() => router.push('/(home)/messages')}
              >
                <Ionicons name="chatbubbles" size={24} color="white" />
                <Text style={tw`text-white font-semibold mt-2 text-center`}>
                  Messages
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`flex-1 bg-purple-600 rounded-xl p-4 items-center min-w-32`}
                onPress={() => router.push('/(home)/add-part')}
              >
                <Ionicons name="add-circle" size={24} color="white" />
                <Text style={tw`text-white font-semibold mt-2 text-center`}>
                  Ajouter{'\n'}pièce
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Demandes récentes */}
        {recentRequests.length > 0 && (
          <View style={tw`px-6 mb-6`}>
            <View style={tw`bg-white rounded-2xl shadow-lg p-6`}>
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <Text style={tw`text-lg font-bold text-gray-900`}>Demandes récentes</Text>
                <TouchableOpacity onPress={() => router.push('/(home)/parts-requests')}>
                  <Text style={tw`text-blue-600 font-semibold`}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              
              {recentRequests.map((request) => (
                <TouchableOpacity
                  key={request._id}
                  style={tw`border-b border-gray-100 py-4 last:border-b-0`}
                  onPress={() => router.push(`/(home)/parts-request-detail?id=${request._id}`)}
                >
                  <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-1`}>
                      <Text style={tw`font-semibold text-gray-900`} numberOfLines={1}>
                        {request.partName}
                      </Text>
                      <Text style={tw`text-sm text-gray-600 mt-1`}>
                        {request.requester.firstName} {request.requester.lastName}
                      </Text>
                      <Text style={tw`text-xs text-gray-500 mt-1`}>
                        {formatTimeAgo(request.createdAt)}
                      </Text>
                    </View>
                    <View style={tw`ml-3 items-end`}>
                      <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                        <Text style={[tw`text-xs font-semibold`, { color: getStatusColor(request.status) }]}>
                          {getStatusText(request.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Conversations récentes */}
        {recentConversations.length > 0 && (
          <View style={tw`px-6`}>
            <View style={tw`bg-white rounded-2xl shadow-lg p-6`}>
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <Text style={tw`text-lg font-bold text-gray-900`}>Messages récents</Text>
                <TouchableOpacity onPress={() => router.push('/(home)/messages')}>
                  <Text style={tw`text-blue-600 font-semibold`}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              
              {recentConversations.map((conversation) => {
                const otherParticipant = conversation.participants.find(p => p.user._id !== user?.id);
                const unreadCount = conversation.participants.find(p => p.user._id === user?.id)?.unreadCount || 0;
                
                return (
                  <TouchableOpacity
                    key={conversation._id}
                    style={tw`border-b border-gray-100 py-4 last:border-b-0`}
                    onPress={() => router.push(`/conversation-detail?id=${conversation._id}`)}
                  >
                    <View style={tw`flex-row items-center`}>
                      <View style={tw`w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3`}>
                        <Ionicons name="person" size={20} color="#2563EB" />
                      </View>
                      <View style={tw`flex-1`}>
                        <View style={tw`flex-row items-center justify-between`}>
                          <Text style={tw`font-semibold text-gray-900`} numberOfLines={1}>
                            {otherParticipant?.user.firstName} {otherParticipant?.user.lastName}
                          </Text>
                          {unreadCount > 0 && (
                            <View style={tw`w-6 h-6 bg-red-500 rounded-full items-center justify-center ml-2`}>
                              <Text style={tw`text-white text-xs font-bold`}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={tw`text-sm text-gray-600 mt-1`} numberOfLines={1}>
                          {conversation.lastMessage?.content || 'Conversation démarrée'}
                        </Text>
                        <Text style={tw`text-xs text-gray-500 mt-1`}>
                          {conversation.lastMessage 
                            ? formatTimeAgo(conversation.lastMessage.timestamp.toString())
                            : formatTimeAgo(conversation.createdAt.toString())
                          }
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* État vide */}
        {recentRequests.length === 0 && recentConversations.length === 0 && (
          <View style={tw`px-6`}>
            <View style={tw`bg-white rounded-2xl shadow-lg p-8 items-center`}>
              <Ionicons name="business" size={64} color="#D1D5DB" />
              <Text style={tw`text-xl font-bold text-gray-900 mt-4 text-center`}>
                Bienvenue sur ipiece!
              </Text>
              <Text style={tw`text-gray-600 text-center mt-2 leading-6`}>
                Vous recevrez bientôt des demandes de pièces automobiles de la part de clients.
                Commencez par ajouter vos pièces au catalogue.
              </Text>
              <TouchableOpacity
                style={tw`bg-blue-600 rounded-xl px-6 py-3 mt-6`}
                onPress={() => router.push('/(home)/add-part')}
              >
                <Text style={tw`text-white font-semibold`}>Ajouter des pièces</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
