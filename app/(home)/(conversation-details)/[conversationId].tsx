import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import ConversationService, { Conversation, Message } from '../../../services/conversationService';
import RealtimeService from '../../../services/realtimeService';

const ConversationDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, token } = useAuth();
  const { language, translations } = useLanguage();
  const t = translations[language];
  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<{ uri: string; duration: number } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId) {
        Alert.alert('Erreur', 'ID de conversation manquant');
        router.back();
        return;
      }

      try {
        console.log('Loading conversation:', conversationId);
        const conversationData = await ConversationService.getConversation(conversationId);
        setConversation(conversationData);
      } catch (error: any) {
        console.error('Error loading conversation:', error);
        Alert.alert(
          'Erreur',
          error.message || 'Impossible de charger la conversation'
        );
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId, router]);

  // Real-time messaging setup
  useEffect(() => {
    if (!conversationId) return;

    const setupRealtime = async () => {
      try {
        await RealtimeService.connect();
        RealtimeService.joinConversation(conversationId);
      } catch (error) {
        console.error('Failed to connect to realtime service:', error);
      }
    };

    setupRealtime();

    // Listen for new messages
    const unsubscribeNewMessage = RealtimeService.onNewMessage((message) => {
      if (message.senderId !== user?._id) {
        setConversation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, message]
          };
        });
      }
    });

    // Listen for typing indicators
    const unsubscribeTyping = RealtimeService.onUserTyping((data) => {
      if (data.conversationId === conversationId && data.userId !== user?._id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      }
    });

    return () => {
      RealtimeService.leaveConversation(conversationId);
      unsubscribeNewMessage();
      unsubscribeTyping();
    };
  }, [conversationId, user?._id]);

  // Handle typing indicator
  useEffect(() => {
    let typingTimeout: ReturnType<typeof setTimeout>;
    
    if (isTyping && conversationId) {
      RealtimeService.sendTyping(conversationId, true);
      
      typingTimeout = setTimeout(() => {
        RealtimeService.sendTyping(conversationId, false);
        setIsTyping(false);
      }, 3000);
    }
    
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [isTyping, conversationId]);

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder aux photos');
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    if (selectedImages.length >= 2) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez ajouter que 2 images maximum par message');
      return;
    }

    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 2 - selectedImages.length,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets) {
        const newImageUris = result.assets.map((asset: ImagePicker.ImagePickerAsset) => asset.uri);
        setSelectedImages(prev => [...prev, ...newImageUris]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner les images');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const requestAudioPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour enregistrer l\'audio');
      return false;
    }
    return true;
  };

  const startRecording = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Erreur', 'Impossible de commencer l\'enregistrement');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();
    
    if (uri) {
      const duration = status.durationMillis ? Math.floor(status.durationMillis / 1000) : 0;
      setVoiceMessage({ uri, duration });
    }
    
    setRecording(null);
  };

  const cancelVoiceMessage = () => {
    setVoiceMessage(null);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && selectedImages.length === 0 && !voiceMessage) return;
    if (!conversationId) return;

    setSending(true);
    try {
      const sentMessage = await ConversationService.sendMessage(
        conversationId,
        newMessage.trim() || (voiceMessage ? '🎤 Message vocal' : ''),
        selectedImages.length > 0 ? selectedImages : undefined,
        voiceMessage || undefined
      );

      // Add the sent message to the conversation
      setConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, sentMessage]
        };
      });

      setNewMessage('');
      setSelectedImages([]);
      setVoiceMessage(null);

    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Impossible d\'envoyer le message'
      );
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Handle case where sender might be undefined - check both senderId and sender._id
    const senderId = item.sender?._id || item.senderId;
    const isFromCurrentUser = senderId === user?._id;
    
    console.log('ipiece Message render debug:', {
      messageId: item._id,
      messageSenderId: item.senderId,
      messageSenderObjectId: item.sender?._id,
      currentUserId: user?._id,
      isFromCurrentUser,
      senderName: item.sender ? `${item.sender.firstName} ${item.sender.lastName}` : 'No sender'
    });
    
    return (
    <View style={[
      styles.messageContainer,
      isFromCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
    ]}>
      <View style={[
        styles.messageBubble,
        isFromCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
      ]}>
        {!isFromCurrentUser && item.sender && (
          <Text style={styles.senderName}>
            {item.sender.firstName} {item.sender.lastName}
          </Text>
        )}
        
        {item.content && (
          <Text style={[
            styles.messageText,
            isFromCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {item.content}
          </Text>
        )}

        {item.images && item.images.length > 0 && (
          <View style={styles.imagesContainer}>
            {item.images.map((imageUri: string, index: number) => (
              <Image key={index} source={{ uri: imageUri }} style={styles.messageImage} />
            ))}
          </View>
        )}

        {item.voiceMessage && (
          <TouchableOpacity
            style={[
              styles.voiceMessageContainer,
              isFromCurrentUser ? styles.currentUserVoiceMessage : styles.otherUserVoiceMessage
            ]}
          >
            <Ionicons 
              name="play" 
              size={20} 
              color={isFromCurrentUser ? 'white' : '#1E3A8A'} 
            />
            <Text style={[
              styles.voiceMessageText,
              isFromCurrentUser ? styles.currentUserText : styles.otherUserText
            ]}>
              {Math.floor(item.voiceMessage.duration / 60)}:{String(item.voiceMessage.duration % 60).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[
          styles.timestamp,
          isFromCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp
        ]}>
          {formatTime((item.timestamp || item.createdAt || new Date()).toString())}
        </Text>
      </View>
    </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conversation introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {conversation ? 'Conversation' : 'Chargement...'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {conversation ? 
                (() => {
                  const otherUser = conversation.participants.find(p => p.user?._id !== user?._id)?.user;
                  return otherUser ? `${otherUser.firstName} ${otherUser.lastName} (${otherUser.userType})` : 'Utilisateur';
                })() : 
                ''
              }
            </Text>
          </View>
        </View>

        <FlatList
          data={[...conversation?.messages || [], ...(typingUsers.size > 0 ? [{ _id: 'typing', isTyping: true }] : [])]}
          renderItem={({ item }) => {
            if ((item as any).isTyping) {
              return (
                <View style={styles.messageContainer}>
                  <View style={styles.otherUserMessage}>
                    <View style={[styles.messageBubble, styles.otherUserBubble]}>
                      <Text style={styles.senderName}>En train d&apos;écrire...</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 6, height: 6, backgroundColor: '#94A3B8', borderRadius: 3, marginRight: 4 }} />
                        <View style={{ width: 6, height: 6, backgroundColor: '#94A3B8', borderRadius: 3, marginRight: 4 }} />
                        <View style={{ width: 6, height: 6, backgroundColor: '#94A3B8', borderRadius: 3 }} />
                      </View>
                    </View>
                  </View>
                </View>
              );
            }
            return renderMessage({ item: item as Message });
          }}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {voiceMessage && (
          <View style={styles.selectedImagesContainer}>
            <Text style={styles.senderName}>Message vocal enregistré</Text>
            <View style={[styles.selectedImageContainer, { backgroundColor: '#EBF4FF' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
                <Ionicons name="mic" size={20} color="#1E3A8A" />
                <Text style={{ color: '#1E3A8A', marginLeft: 8 }}>
                  {Math.floor(voiceMessage.duration / 60)}:{String(voiceMessage.duration % 60).padStart(2, '0')}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={cancelVoiceMessage}
              >
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {selectedImages.length > 0 && (
          <View style={styles.selectedImagesContainer}>
            <FlatList
              data={selectedImages}
              horizontal
              renderItem={({ item, index }) => (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: item }} style={styles.selectedImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.selectedImagesList}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          
          <TouchableOpacity 
            style={styles.imageButton} 
            onPress={isRecording ? stopRecording : startRecording}
            disabled={selectedImages.length > 0 || voiceMessage !== null}
          >
            <Ionicons 
              name={isRecording ? "stop" : "mic"} 
              size={24} 
              color={selectedImages.length > 0 || voiceMessage ? "#94A3B8" : (isRecording ? "#EF4444" : "#1E3A8A")} 
            />
          </TouchableOpacity>
          
          <TextInput
            style={[styles.textInput, isRecording && { opacity: 0.5 }]}
            placeholder="Tapez votre réponse..."
            value={newMessage}
            onChangeText={(text) => {
              setNewMessage(text);
              if (text.trim() && !isTyping) {
                setIsTyping(true);
              }
            }}
            multiline
            maxLength={500}
            editable={!isRecording}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton, 
              (!newMessage.trim() && selectedImages.length === 0 && !voiceMessage) && styles.sendButtonDisabled,
              sending && styles.sendButtonDisabled
            ]} 
            onPress={sendMessage}
            disabled={!newMessage.trim() && selectedImages.length === 0 && !voiceMessage}
          >
            {sending ? (
              <ActivityIndicator size={16} color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
        
        {isRecording && (
          <View style={[styles.inputContainer, { justifyContent: 'center' }]}>
            <ActivityIndicator size="small" color="#EF4444" />
            <Text style={{ color: '#EF4444', marginLeft: 8 }}>
              Enregistrement en cours...
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  messagesList: {
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  messageContainer: {
    marginBottom: 15,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserBubble: {
    backgroundColor: '#1E3A8A',
  },
  otherUserBubble: {
    backgroundColor: 'white',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: '#334155',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  currentUserTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherUserTimestamp: {
    color: '#94A3B8',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  messageImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  currentUserVoiceMessage: {
    backgroundColor: '#1E40AF',
  },
  otherUserVoiceMessage: {
    backgroundColor: '#F3F4F6',
  },
  voiceMessageText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  selectedImagesContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 10,
  },
  selectedImagesList: {
    paddingHorizontal: 15,
  },
  selectedImageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  imageButton: {
    marginRight: 10,
    marginBottom: 8,
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
});

export default ConversationDetailScreen;
