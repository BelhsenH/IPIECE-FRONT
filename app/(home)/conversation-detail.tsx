import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
  ActivityIndicator,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import tw from 'twrnc';
import { useAuth } from '../../contexts/AuthContext';
import ConversationService, { Conversation, Message } from '../../services/conversationService';

const ConversationDetail: React.FC = () => {
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const debugCreateConversation = async () => {
    try {
      const result = await ConversationService.createTestConversation();
      console.log('Test conversation created:', result);
      Alert.alert('Debug', `Test conversation created: ${result.conversationId}`);
    } catch (error: any) {
      console.error('Error creating test conversation:', error);
      Alert.alert('Debug Error', error.message || 'Unknown error');
    }
  };

  const debugListConversations = async () => {
    try {
      const result = await ConversationService.debugConversations();
      console.log('Debug conversations:', result);
      Alert.alert('Debug', `Found ${result.conversationsCount} conversations for user ${result.userId}`);
    } catch (error: any) {
      console.error('Error debugging conversations:', error);
      Alert.alert('Debug Error', error.message || 'Unknown error');
    }
  };

  const loadConversation = useCallback(async () => {
    if (!conversationId || !token) return;

    try {
      const conv = await ConversationService.getConversation(conversationId);
      setConversation(conv);
      setMessages(conv.messages || []);
      
      // Mark as read
      await ConversationService.markAsRead(conversationId);
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error);
      Alert.alert('Erreur', 'Impossible de charger la conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId, token]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversation();
    setRefreshing(false);
  }, [loadConversation]);

  const pickImages = async () => {
    if (selectedImages.length >= 2) {
      Alert.alert('Limite atteinte', 'Vous pouvez télécharger au maximum 2 images par message.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Permission d\'accès à la galerie nécessaire.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: Math.min(2 - selectedImages.length, 2),
    });

    if (!result.canceled) {
      const newImages = result.assets.filter((asset, index) => selectedImages.length + index < 2);
      setSelectedImages([...selectedImages, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    const updated = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(updated);
  };

  const sendMessage = async () => {
    if (!conversationId || !token || (!messageText.trim() && selectedImages.length === 0)) {
      return;
    }

    setSending(true);
    try {
      let imageUrls: string[] = [];
      
      if (selectedImages.length > 0) {
        setUploading(true);
        imageUrls = await ConversationService.uploadImages(selectedImages);
        setUploading(false);
      }

      const newMessage = await ConversationService.sendMessage(
        conversationId,
        messageText.trim() || '📷 Image(s)',
        imageUrls
      );

      setMessages([...messages, newMessage]);
      setMessageText('');
      setSelectedImages([]);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleCall = (phoneNumber: string) => {
    Alert.alert(
      'Passer un appel',
      `Voulez-vous appeler ce numéro ?\n${phoneNumber}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Appeler',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`).catch(() =>
              Alert.alert('Erreur', 'Impossible de passer l\'appel')
            );
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return messageDate.toLocaleDateString('fr-FR');
  };

  const renderMessage = (message: Message, index: number) => {
    // Use senderId directly from the message, fallback to sender._id if available
    const messageSenderId = message.senderId || message.sender?._id;
    const isOwnMessage = messageSenderId === user?._id;
    
    // Find the sender info from conversation participants if sender is not populated
    let senderInfo = message.sender;
    if (!senderInfo && conversation?.participants) {
      const participant = conversation.participants.find(p => 
        p.user && p.user._id === messageSenderId
      );
      senderInfo = participant?.user;
    }
    
    const showAvatar = !isOwnMessage && (index === messages.length - 1 || 
      messages[index + 1]?.senderId !== messageSenderId);

    return (
      <View key={message._id} style={tw`mb-4`}>
        <View style={[
          tw`flex-row`,
          isOwnMessage ? tw`justify-end` : tw`justify-start`
        ]}>
          {!isOwnMessage && (
            <View style={tw`w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-2 mt-1`}>
              {showAvatar ? (
                <Ionicons name="person" size={16} color="#1E3A8A" />
              ) : (
                <View style={tw`w-8 h-8`} />
              )}
            </View>
          )}
          
          <View style={[
            tw`max-w-3/4 rounded-2xl p-3`,
            isOwnMessage 
              ? tw`bg-blue-600 rounded-tr-none` 
              : tw`bg-white border border-gray-200 rounded-tl-none`
          ]}>
            {!isOwnMessage && showAvatar && senderInfo && (
              <Text style={tw`text-blue-600 text-xs font-semibold mb-1`}>
                {senderInfo.firstName} {senderInfo.lastName}
                {senderInfo.userType && (
                  <Text style={tw`text-blue-400`}> • {senderInfo.userType}</Text>
                )}
              </Text>
            )}
            
            {message.content && (
              <Text style={[
                tw`text-base`,
                isOwnMessage ? tw`text-white` : tw`text-gray-800`
              ]}>
                {message.content}
              </Text>
            )}
            
            {message.images && message.images.length > 0 && (
              <View style={tw`${message.content ? 'mt-2' : ''}`}>
                {message.images.map((imageUrl, imgIndex) => (
                  <TouchableOpacity key={imgIndex} style={tw`mb-1`}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={tw`w-48 h-48 rounded-lg`}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <Text style={[
              tw`text-xs mt-1`,
              isOwnMessage ? tw`text-blue-100` : tw`text-gray-500`
            ]}>
              {formatDate(message.timestamp || message.createdAt || new Date())}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const otherParticipant = conversation?.participants?.find(p => 
    p.user && p.user._id !== user?._id
  )?.user;

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={tw`text-gray-600 mt-4`}>Chargement de la conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-blue-900 p-4 flex-row items-center shadow-lg`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`mr-3`}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={tw`w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3`}>
          <Ionicons name="person" size={20} color="#1E3A8A" />
        </View>
        
        <View style={tw`flex-1`}>
          <Text style={tw`text-white text-lg font-bold`}>
            {otherParticipant?.firstName} {otherParticipant?.lastName}
          </Text>
          <Text style={tw`text-blue-200 text-sm`}>
            {otherParticipant?.userType || 'Utilisateur'}
          </Text>
        </View>
        
        {otherParticipant && (
          <TouchableOpacity
            style={tw`bg-green-600 rounded-full p-2`}
            onPress={() => handleCall('0123456789')} // Use actual phone number
          >
            <Ionicons name="call" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={tw`flex-1 px-4`}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={tw`py-4`}>
          {messages.length === 0 ? (
            <View style={tw`items-center justify-center py-20`}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={tw`text-gray-500 text-lg font-semibold mt-4`}>Aucun message</Text>
              <Text style={tw`text-gray-400 text-center mt-2`}>
                Commencez la conversation en envoyant un message
              </Text>
            </View>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
          )}
        </View>
      </ScrollView>

      {/* Image Preview */}
      {selectedImages.length > 0 && (
        <View style={tw`bg-white border-t border-gray-200 p-3`}>
          <Text style={tw`text-gray-700 font-semibold mb-2`}>
            Images sélectionnées ({selectedImages.length}/2)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={tw`flex-row gap-2`}>
              {selectedImages.map((image, index) => (
                <View key={index} style={tw`relative`}>
                  <Image
                    source={{ uri: image.uri }}
                    style={tw`w-16 h-16 rounded-lg`}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={tw`absolute -top-1 -right-1 bg-red-500 rounded-full w-6 h-6 items-center justify-center`}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Message Input */}
      <View style={tw`bg-white border-t border-gray-200 p-4`}>
        <View style={tw`flex-row items-end`}>
          
          <View style={tw`flex-1 bg-gray-100 rounded-2xl px-4 py-2 mr-3 max-h-32`}>
            <TextInput
              style={tw`text-base text-gray-800`}
              placeholder="Tapez votre message..."
              placeholderTextColor="#9CA3AF"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              textAlignVertical="top"
            />
          </View>
          
          <TouchableOpacity
            style={[
              tw`bg-blue-600 rounded-full p-3`,
              (sending || uploading) && tw`bg-gray-400`
            ]}
            onPress={sendMessage}
            disabled={sending || uploading || (!messageText.trim() && selectedImages.length === 0)}
          >
            {(sending || uploading) ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
        
        {uploading && (
          <View style={tw`mt-2 flex-row items-center justify-center`}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={tw`text-blue-600 ml-2 text-sm`}>
              Téléchargement des images...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ConversationDetail;
