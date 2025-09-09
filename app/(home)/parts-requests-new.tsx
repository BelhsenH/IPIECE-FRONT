import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import PartsService, { PartsRequest } from '../../services/partsService';
import ConversationService from '../../services/conversationService';
import tw from 'twrnc';

const PartsRequestsScreen = () => {
  const router = useRouter();
  const { token } = useAuth();
  const [requests, setRequests] = useState<PartsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!token) return;

    try {
      // For ipiece users, get requests that match their parts catalog
      const data = await PartsService.getPartsRequests(token);
      setRequests(data);
      
      // Track view engagement for each request (but don't await to avoid slowing down the UI)
      if (data && Array.isArray(data)) {
        data.forEach((request: PartsRequest) => {
          if (request._id) {
            PartsService.trackEngagement(request._id, 'view');
          }
        });
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, [loadRequests]);

  const handleAcceptRequest = async (request: PartsRequest) => {
    if (!token) return;

    try {
      // Track interest engagement
      PartsService.trackEngagement(request._id, 'interest');
      
      Alert.alert(
        'Accept Request',
        `Do you want to accept this parts request for ${request.partName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept',
            onPress: async () => {
              try {
                // Track contact attempt
                PartsService.trackEngagement(request._id, 'contact_attempt');
                
                // Accept the request
                await PartsService.acceptPartsRequest(request._id);
                
                // Create conversation
                const conversation = await ConversationService.createConversation(request._id, token);
                
                // Navigate to conversation
                router.push(`/conversation-detail?id=${conversation._id}`);
                
                // Refresh the list
                loadRequests();
              } catch (error) {
                console.error('Error accepting request:', error);
                Alert.alert('Erreur', 'Impossible d\'accepter la demande');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error handling accept request:', error);
      Alert.alert('Erreur', 'Une erreur s\'est produite');
    }
  };

  const handleIgnoreRequest = async (request: PartsRequest) => {
    if (!token) return;

    try {
      Alert.alert(
        'Ignore Request',
        'This request will be hidden from your list. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Ignore',
            style: 'destructive',
            onPress: async () => {
              try {
                // Reject the request (or mark as ignored)
                await PartsService.rejectPartsRequest(request._id, 'Not relevant for our inventory');
                
                // Refresh the list
                loadRequests();
                
                Alert.alert('Success', 'Request has been ignored');
              } catch (error) {
                console.error('Error ignoring request:', error);
                Alert.alert('Erreur', 'Impossible d\'ignorer la demande');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error handling ignore request:', error);
      Alert.alert('Erreur', 'Une erreur s\'est produite');
    }
  };

  const handleStartConversation = async (request: PartsRequest) => {
    if (!token) return;

    try {
      // Track contact attempt for call
      PartsService.trackEngagement(request._id, 'call_attempt');
      
      // Create or get existing conversation for this request
      const conversation = await ConversationService.createConversation(request._id, token);
      
      // Navigate to conversation
      router.push(`/conversation-detail?id=${conversation._id}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      Alert.alert('Erreur', 'Impossible de démarrer la conversation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.accent;
      case 'in-progress': return Colors.info;
      case 'completed': return Colors.success;
      case 'cancelled': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in-progress': return 'En cours';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getCommunicationMethodIcon = (method: string) => {
    switch (method) {
      case 'call': return 'call';
      case 'message': return 'chatbubble';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderRequest = ({ item }: { item: PartsRequest }) => (
    <View style={tw`bg-white rounded-xl p-4 mb-3 shadow-md border border-gray-100`}>
      <View style={tw`flex-row justify-between items-start mb-3`}>
        <View style={tw`flex-1 mr-3`}>
          <Text style={tw`text-lg font-bold text-blue-900 mb-1`}>{item.partName}</Text>
          <Text style={tw`text-sm text-gray-600`}>
            Par {item.requester.firstName} {item.requester.lastName}
          </Text>
        </View>
        <View style={[tw`px-3 py-1 rounded-full`, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={tw`text-white text-xs font-semibold`}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={tw`mb-3`}>
        <View style={tw`flex-row items-center mb-1`}>
          <Ionicons name="car" size={16} color="#64748B" />
          <Text style={tw`text-sm text-gray-700 ml-2`}>
            {item.vehicleInfo.brand} {item.vehicleInfo.model} ({item.vehicleInfo.year})
          </Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="card" size={16} color="#64748B" />
          <Text style={tw`text-sm text-gray-700 ml-2`}>
            {item.vehicleInfo.licensePlate}
          </Text>
        </View>
      </View>

      {item.notes && (
        <View style={tw`mb-3 p-3 bg-gray-50 rounded-lg`}>
          <Text style={tw`text-sm font-medium text-gray-600 mb-1`}>Notes:</Text>
          <Text style={tw`text-sm text-gray-700 leading-5`}>{item.notes}</Text>
        </View>
      )}

      <View style={tw`border-t border-gray-200 pt-3`}>
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons 
              name={getCommunicationMethodIcon(item.preferredCommunicationMethod)} 
              size={16} 
              color="#64748B" 
            />
            <Text style={tw`text-sm text-gray-600 ml-2`}>
              {item.preferredCommunicationMethod === 'call' ? 'Appel préféré' : 'Message préféré'}
            </Text>
          </View>
          <Text style={tw`text-sm text-gray-500`}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        
        <View style={tw`flex-row items-center gap-3`}>
          <TouchableOpacity
            style={tw`flex-1 flex-row items-center justify-center bg-green-600 rounded-lg py-3 px-4`}
            onPress={() => handleAcceptRequest(item)}
          >
            <Ionicons name="checkmark-circle" size={16} color="white" />
            <Text style={tw`text-white text-base font-semibold ml-2`}>Accept</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`flex-1 flex-row items-center justify-center bg-gray-500 rounded-lg py-3 px-4`}
            onPress={() => handleIgnoreRequest(item)}
          >
            <Ionicons name="close-circle" size={16} color="white" />
            <Text style={tw`text-white text-base font-semibold ml-2`}>Ignore</Text>
          </TouchableOpacity>
          
          {item.preferredCommunicationMethod === 'call' && (
            <TouchableOpacity 
              style={tw`w-11 h-11 rounded-lg bg-blue-100 border border-blue-600 items-center justify-center`}
              onPress={() => handleStartConversation(item)}
            >
              <Ionicons name="call" size={16} color="#1E3A8A" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
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
            <Text style={tw`text-xl font-bold text-white`}>Demandes de pièces</Text>
          </View>
        </View>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={tw`mt-4 text-gray-600 text-base`}>Chargement des demandes...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={tw`text-xl font-bold text-white`}>Demandes de pièces</Text>
        </View>
        <TouchableOpacity style={tw`p-2`}>
          <Ionicons name="filter" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <View style={tw`flex-1 p-6`}>
        <Text style={tw`text-2xl font-bold text-blue-900 mb-4`}>Demandes disponibles</Text>
        
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={item => item._id}
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={tw`items-center py-16`}>
              <Ionicons name="clipboard-outline" size={64} color="#94A3B8" />
              <Text style={tw`text-xl font-semibold text-gray-700 mt-5 mb-3`}>
                Aucune demande
              </Text>
              <Text style={tw`text-base text-gray-500 text-center leading-6 px-8`}>
                Les demandes de pièces des clients apparaîtront ici
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default PartsRequestsScreen;
