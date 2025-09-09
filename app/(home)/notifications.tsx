import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useLanguage } from '../../contexts/LanguageContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'parts_request' | 'message';
  read: boolean;
  createdAt: string;
  data?: any;
}

const NotificationsScreen = () => {
  const router = useRouter();
  const { language, translations } = useLanguage();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const loadNotifications = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      
      // Mock notifications for now - replace with actual API call
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Parts Request Update',
          message: 'Your parts request for brake pads has been accepted by AutoParts Pro.',
          type: 'parts_request',
          read: false,
          createdAt: new Date().toISOString(),
          data: { requestId: 'req_123' }
        },
        {
          id: '2',
          title: 'New Message',
          message: 'You have a new message about your brake pads request.',
          type: 'message',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          data: { conversationId: 'conv_456' }
        },
        {
          id: '3',
          title: 'Service Reminder',
          message: 'Your BMW X5 is due for maintenance in 500 km.',
          type: 'info',
          read: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          data: { carId: 'car_789' }
        },
      ];

      // Filter notifications if needed
      const filteredNotifications = filter === 'all' 
        ? mockNotifications
        : filter === 'unread'
        ? mockNotifications.filter(n => !n.read)
        : mockNotifications.filter(n => n.type === filter);

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, refreshing]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    // TODO: Call API to mark as read
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // TODO: Call API to mark all as read
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'parts_request':
        router.push('/(home)/parts-requests');
        break;
      case 'message':
        router.push('/(home)/messages');
        break;
      default:
        // Show notification details or navigate to relevant screen
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'parts_request': return 'cube-outline';
      case 'message': return 'chatbubble-outline';
      case 'success': return 'checkmark-circle-outline';
      case 'warning': return 'warning-outline';
      case 'error': return 'alert-circle-outline';
      default: return 'information-circle-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'parts_request': return { bg: 'bg-blue-100', text: '#2563EB' };
      case 'message': return { bg: 'bg-green-100', text: '#16A34A' };
      case 'success': return { bg: 'bg-green-100', text: '#16A34A' };
      case 'warning': return { bg: 'bg-yellow-100', text: '#D97706' };
      case 'error': return { bg: 'bg-red-100', text: '#DC2626' };
      default: return { bg: 'bg-gray-100', text: '#6B7280' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filterOptions = [
    { key: 'all', label: translations[language].all || 'All' },
    { key: 'unread', label: translations[language].unread || 'Unread' },
    { key: 'parts_request', label: 'Parts' },
    { key: 'message', label: 'Messages' },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const NotificationCard = ({ notification }: { notification: Notification }) => (
    <TouchableOpacity
      style={tw`bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm ${
        !notification.read ? 'border-l-4 border-l-blue-500' : ''
      }`}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={tw`flex-row items-start`}>
        {/* Icon */}
        <View style={[tw`w-10 h-10 rounded-full items-center justify-center mr-3`, tw`${getNotificationColor(notification.type).bg}`]}>
          <Ionicons 
            name={getNotificationIcon(notification.type) as any} 
            size={20} 
            color={getNotificationColor(notification.type).text}
          />
        </View>

        {/* Content */}
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-start justify-between mb-1`}>
            <Text style={[tw`font-semibold text-gray-900 flex-1`, !notification.read && tw`font-bold`]}>
              {notification.title}
            </Text>
            <Text style={tw`text-xs text-gray-500 ml-2`}>
              {formatDate(notification.createdAt)}
            </Text>
          </View>
          
          <Text style={[tw`text-sm text-gray-600 mb-2`, !notification.read && tw`text-gray-900`]}>
            {notification.message}
          </Text>

          {/* Notification type badge */}
          <View style={tw`flex-row items-center justify-between`}>
            <View style={[tw`px-2 py-1 rounded-full`, tw`${getNotificationColor(notification.type).bg}`]}>
              <Text style={[tw`text-xs font-medium`, { color: getNotificationColor(notification.type).text }]}>
                {notification.type.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            
            {!notification.read && (
              <View style={tw`w-2 h-2 bg-blue-500 rounded-full`} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white p-4 flex-row items-center justify-between shadow-sm`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            style={tw`mr-3`}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold text-gray-900`}>
            {translations[language].notifications || 'Notifications'}
          </Text>
        </View>
        
        {unreadCount > 0 && (
          <TouchableOpacity
            style={tw`bg-blue-600 px-3 py-2 rounded-lg`}
            onPress={markAllAsRead}
          >
            <Text style={tw`text-white text-sm font-medium`}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`p-4 max-h-16`}>
        <View style={tw`flex-row gap-2`}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                tw`px-4 py-2 rounded-full border`,
                filter === option.key
                  ? tw`bg-blue-600 border-blue-600`
                  : tw`bg-white border-gray-300`
              ]}
              onPress={() => setFilter(option.key)}
            >
              <Text
                style={[
                  tw`font-medium`,
                  filter === option.key ? tw`text-white` : tw`text-gray-700`
                ]}
              >
                {option.label}
                {option.key === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={tw`text-gray-600 mt-4`}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          style={tw`flex-1 px-4`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={tw`flex-1 items-center justify-center py-20`}>
              <View style={tw`w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4`}>
                <Ionicons name="notifications-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={tw`text-lg font-semibold text-gray-900 mb-2`}>
                {translations[language].noNotifications || 'No Notifications'}
              </Text>
              <Text style={tw`text-gray-600 text-center max-w-xs`}>
                {translations[language].noNotificationsDescription || 
                  'You\'ll see notifications about your parts requests and messages here.'}
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          )}
          
          <View style={tw`pb-6`} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default NotificationsScreen;
