import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useAuth } from '../../contexts/AuthContext';
import PartsService from '../../services/partsService';
import { useLanguage } from '../../contexts/LanguageContext';

interface PartCategory {
  id: string;
  name: string;
  icon: string;
  subCategories: string[];
}

interface PartType {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  description: string;
  isCommon: boolean;
}

const CreatePartsRequestScreen = () => {
  const router = useRouter();
  const { token } = useAuth();
  const { language, translations } = useLanguage();
  
  const [formData, setFormData] = useState({
    partName: '',
    category: '',
    description: '',
    notes: '',
    urgency: 'medium' as 'low' | 'medium' | 'high',
    quantity: 1,
    preferredCommunicationMethod: 'message' as 'call' | 'message',
    vehicleInfo: {
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      licensePlate: '',
      vin: '',
      engineType: '',
      color: '',
    }
  });
  
  const [selectedPartType, setSelectedPartType] = useState<PartType | null>(null);
  const [showPartSelection, setShowPartSelection] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Parts categories data
  const partCategories: PartCategory[] = [
    {
      id: 'engine',
      name: 'Engine & Performance',
      icon: 'settings-outline',
      subCategories: ['Engine Block', 'Pistons', 'Valves', 'Timing Belt', 'Spark Plugs', 'Air Filter', 'Oil Filter', 'Fuel Injection']
    },
    {
      id: 'brakes',
      name: 'Brakes & Safety',
      icon: 'shield-checkmark-outline',
      subCategories: ['Brake Pads', 'Brake Discs', 'Brake Fluid', 'Brake Calipers', 'ABS Sensors', 'Brake Lines']
    },
    {
      id: 'suspension',
      name: 'Suspension & Steering',
      icon: 'car-outline',
      subCategories: ['Shock Absorbers', 'Struts', 'Springs', 'Steering Wheel', 'Power Steering Pump', 'Ball Joints']
    },
    {
      id: 'transmission',
      name: 'Transmission',
      icon: 'cog-outline',
      subCategories: ['Clutch', 'Gearbox', 'Transmission Fluid', 'Drive Belt', 'CV Joints']
    },
    {
      id: 'electrical',
      name: 'Electrical & Lighting',
      icon: 'flash-outline',
      subCategories: ['Battery', 'Alternator', 'Starter Motor', 'Headlights', 'Tail Lights', 'Fuses', 'Wiring']
    },
    {
      id: 'body',
      name: 'Body & Interior',
      icon: 'car-sport-outline',
      subCategories: ['Bumpers', 'Doors', 'Mirrors', 'Seats', 'Dashboard', 'Windows', 'Trim']
    },
    {
      id: 'tires',
      name: 'Tires & Wheels',
      icon: 'ellipse-outline',
      subCategories: ['Tires', 'Wheels', 'Wheel Covers', 'Tire Pressure Sensors']
    },
    {
      id: 'cooling',
      name: 'Cooling System',
      icon: 'thermometer-outline',
      subCategories: ['Radiator', 'Coolant', 'Water Pump', 'Thermostat', 'Cooling Fans']
    }
  ];

  // Generate part types from categories
  const partTypes: PartType[] = partCategories.flatMap(category => 
    category.subCategories.map((subCat, index) => ({
      id: `${category.id}-${index}`,
      name: subCat,
      category: category.name,
      subCategory: subCat,
      description: `${subCat} for your vehicle`,
      isCommon: ['Brake Pads', 'Oil Filter', 'Air Filter', 'Battery', 'Tires', 'Spark Plugs'].includes(subCat)
    }))
  );

  const handleSubmit = async () => {
    if (!selectedPartType) {
      Alert.alert('Error', 'Please select a part type');
      return;
    }

    if (!formData.vehicleInfo.brand || !formData.vehicleInfo.model || !formData.vehicleInfo.licensePlate) {
      Alert.alert('Error', 'Please fill in vehicle information');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Session expired, please log in again');
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        partName: selectedPartType.name,
        category: selectedPartType.category,
        subCategory: selectedPartType.subCategory,
        description: selectedPartType.description,
        vehicleInfo: {
          brand: formData.vehicleInfo.brand,
          model: formData.vehicleInfo.model,
          year: formData.vehicleInfo.year,
          licensePlate: formData.vehicleInfo.licensePlate,
          vin: formData.vehicleInfo.vin,
          engineType: formData.vehicleInfo.engineType,
          color: formData.vehicleInfo.color,
        },
        quantity: formData.quantity,
        notes: formData.notes.trim() || undefined,
        urgencyLevel: formData.urgency,
      };

      await PartsService.createPartsRequest(requestData);

      Alert.alert(
        'Request Created',
        'Your parts request has been created successfully. Parts suppliers can now contact you.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating request:', error);
      Alert.alert('Error', 'Unable to create request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'low': return translations[language].low || 'Low';
      case 'medium': return translations[language].medium || 'Medium';
      case 'high': return translations[language].high || 'High';
      default: return urgency;
    }
  };



  const PartSelectionModal = () => {
    if (!showPartSelection) return null;

    // Filter parts based on search and category
    const filteredParts = partTypes.filter(part => {
      const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           part.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === '' || part.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort parts - common parts first
    const sortedParts = filteredParts.sort((a, b) => {
      if (a.isCommon && !b.isCommon) return -1;
      if (!a.isCommon && b.isCommon) return 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <View style={tw`absolute inset-0 bg-black bg-opacity-50 justify-center z-50`}>
        <View style={tw`bg-white mx-4 rounded-2xl max-h-5/6`}>
          <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
            <Text style={tw`text-lg font-bold text-gray-900`}>
              Select Spare Part
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setShowPartSelection(false);
                setSearchQuery('');
                setSelectedCategory('');
              }}
              style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}
            >
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={tw`p-4 border-b border-gray-200`}>
            <View style={tw`bg-gray-100 rounded-xl flex-row items-center px-4 py-3`}>
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                style={tw`flex-1 ml-2 text-gray-900`}
                placeholder="Search spare parts..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Categories Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`max-h-16 border-b border-gray-200`}>
            <View style={tw`flex-row p-4 gap-2`}>
              <TouchableOpacity
                style={[
                  tw`px-4 py-2 rounded-full border`,
                  selectedCategory === '' ? tw`bg-blue-600 border-blue-600` : tw`bg-white border-gray-300`
                ]}
                onPress={() => setSelectedCategory('')}
              >
                <Text style={[
                  tw`font-medium`,
                  selectedCategory === '' ? tw`text-white` : tw`text-gray-700`
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              {partCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    tw`px-4 py-2 rounded-full border`,
                    selectedCategory === category.name ? tw`bg-blue-600 border-blue-600` : tw`bg-white border-gray-300`
                  ]}
                  onPress={() => setSelectedCategory(category.name)}
                >
                  <Text style={[
                    tw`font-medium`,
                    selectedCategory === category.name ? tw`text-white` : tw`text-gray-700`
                  ]}>
                    {category.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <ScrollView style={tw`max-h-96 p-4`}>
            {sortedParts.length === 0 ? (
              <View style={tw`items-center py-8`}>
                <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
                <Text style={tw`text-gray-500 mt-2`}>No parts found</Text>
              </View>
            ) : (
              sortedParts.map((part) => (
                <TouchableOpacity
                  key={part.id}
                  style={tw`bg-gray-50 rounded-xl p-4 mb-3 flex-row items-center ${
                    selectedPartType?.id === part.id ? 'border-2 border-blue-600 bg-blue-50' : 'border border-gray-200'
                  }`}
                  onPress={() => {
                    setSelectedPartType(part);
                    setFormData(prev => ({
                      ...prev,
                      partType: part.name,
                      category: part.category,
                      subCategory: part.subCategory
                    }));
                    setShowPartSelection(false);
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                >
                  <View style={tw`w-12 h-12 rounded-lg bg-blue-100 items-center justify-center mr-3`}>
                    <Ionicons name="cube" size={24} color="#2563EB" />
                  </View>
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center`}>
                      <Text style={tw`text-lg font-semibold text-gray-900`}>
                        {part.name}
                      </Text>
                      {part.isCommon && (
                        <View style={tw`ml-2 bg-green-100 px-2 py-1 rounded-full`}>
                          <Text style={tw`text-xs font-medium text-green-800`}>Common</Text>
                        </View>
                      )}
                    </View>
                    <Text style={tw`text-sm text-gray-600`}>
                      {part.category}
                    </Text>
                    <Text style={tw`text-xs text-gray-500 mt-1`}>
                      {part.description}
                    </Text>
                  </View>
                  {selectedPartType?.id === part.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`bg-blue-900 p-4 flex-row items-center shadow-lg`}>
        <TouchableOpacity
          style={tw`mr-3`}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={tw`text-xl font-bold text-white flex-1`}>
          {translations[language].requestPart || 'Request Spare Part'}
        </Text>
      </View>

      <ScrollView style={tw`flex-1 p-6`} showsVerticalScrollIndicator={false}>
        {/* Part Selection */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>
            {translations[language].selectPartType || 'Select Part Type'} *
          </Text>
          <TouchableOpacity
            style={tw`bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-between`}
            onPress={() => setShowPartSelection(true)}
          >
            {selectedPartType ? (
              <View style={tw`flex-row items-center flex-1`}>
                <View style={tw`w-12 h-12 rounded-lg bg-blue-100 items-center justify-center mr-3`}>
                  <Ionicons name="cube" size={24} color="#2563EB" />
                </View>
                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-lg font-semibold text-gray-900`}>
                      {selectedPartType.name}
                    </Text>
                    {selectedPartType.isCommon && (
                      <View style={tw`ml-2 bg-green-100 px-2 py-1 rounded-full`}>
                        <Text style={tw`text-xs font-medium text-green-800`}>Common</Text>
                      </View>
                    )}
                  </View>
                  <Text style={tw`text-sm text-gray-600`}>
                    {selectedPartType.category}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={tw`flex-row items-center flex-1`}>
                <View style={tw`w-12 h-12 rounded-lg bg-gray-100 items-center justify-center mr-3`}>
                  <Ionicons name="cube-outline" size={24} color="#6B7280" />
                </View>
                <Text style={tw`text-gray-500 text-lg`}>
                  {translations[language].choosePart || 'Choose a spare part'}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Vehicle Information */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>
            Vehicle Information *
          </Text>
          
          <View style={tw`bg-white rounded-xl border border-gray-200 p-4 space-y-4`}>
            <View>
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Brand *</Text>
              <TextInput
                style={tw`bg-gray-50 rounded-lg px-4 py-3 text-gray-900 border border-gray-200`}
                placeholder="Enter vehicle brand"
                value={formData.vehicleInfo.brand}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  vehicleInfo: { ...prev.vehicleInfo, brand: text }
                }))}
              />
            </View>
            
            <View>
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Model *</Text>
              <TextInput
                style={tw`bg-gray-50 rounded-lg px-4 py-3 text-gray-900 border border-gray-200`}
                placeholder="Enter vehicle model"
                value={formData.vehicleInfo.model}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  vehicleInfo: { ...prev.vehicleInfo, model: text }
                }))}
              />
            </View>
            
            <View>
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>License Plate *</Text>
              <TextInput
                style={tw`bg-gray-50 rounded-lg px-4 py-3 text-gray-900 border border-gray-200`}
                placeholder="Enter license plate"
                value={formData.vehicleInfo.licensePlate}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  vehicleInfo: { ...prev.vehicleInfo, licensePlate: text }
                }))}
              />
            </View>
            
            <View style={tw`flex-row space-x-4`}>
              <View style={tw`flex-1`}>
                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Year</Text>
                <TextInput
                  style={tw`bg-gray-50 rounded-lg px-4 py-3 text-gray-900 border border-gray-200`}
                  placeholder="Year"
                  keyboardType="numeric"
                  value={formData.vehicleInfo.year.toString()}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    vehicleInfo: { ...prev.vehicleInfo, year: parseInt(text) || new Date().getFullYear() }
                  }))}
                />
              </View>
              
              <View style={tw`flex-1`}>
                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Color</Text>
                <TextInput
                  style={tw`bg-gray-50 rounded-lg px-4 py-3 text-gray-900 border border-gray-200`}
                  placeholder="Color"
                  value={formData.vehicleInfo.color}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    vehicleInfo: { ...prev.vehicleInfo, color: text }
                  }))}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Quantity */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>
            {translations[language].quantity || 'Quantity'}
          </Text>
          <View style={tw`bg-white rounded-xl p-4 border border-gray-200 flex-row items-center justify-center`}>
            <TouchableOpacity
              style={tw`w-10 h-10 rounded-lg bg-gray-100 items-center justify-center`}
              onPress={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
            >
              <Ionicons name="remove" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={tw`text-xl font-semibold text-gray-900 mx-6`}>
              {formData.quantity}
            </Text>
            <TouchableOpacity
              style={tw`w-10 h-10 rounded-lg bg-gray-100 items-center justify-center`}
              onPress={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
            >
              <Ionicons name="add" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Urgency */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>
            {translations[language].urgency || 'Urgency'}
          </Text>
          <View style={tw`flex-row gap-2`}>
            {['low', 'medium', 'high'].map((urgency) => (
              <TouchableOpacity
                key={urgency}
                style={[
                  tw`flex-1 rounded-xl p-3 border`,
                  formData.urgency === urgency
                    ? tw`border-transparent ${getUrgencyColor(urgency)}`
                    : tw`bg-white border-gray-200`
                ]}
                onPress={() => setFormData({ ...formData, urgency: urgency as 'low' | 'medium' | 'high' })}
              >
                <Text style={[
                  tw`text-center font-semibold`,
                  formData.urgency === urgency
                    ? tw`${getUrgencyColor(urgency).split(' ')[0]}`
                    : tw`text-gray-600`
                ]}>
                  {getUrgencyText(urgency)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Communication Method */}
        <View style={tw`mb-6`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>
            Preferred Communication Method
          </Text>
          <View style={tw`flex-row gap-3`}>
            {[
              { key: 'message', label: 'Message', icon: 'chatbubble-outline' },
              { key: 'call', label: 'Phone Call', icon: 'call-outline' }
            ].map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[
                  tw`flex-1 rounded-xl p-4 border flex-row items-center justify-center`,
                  formData.preferredCommunicationMethod === method.key
                    ? tw`border-blue-600 bg-blue-50`
                    : tw`bg-white border-gray-200`
                ]}
                onPress={() => setFormData({ ...formData, preferredCommunicationMethod: method.key as 'call' | 'message' })}
              >
                <Ionicons 
                  name={method.icon as any} 
                  size={20} 
                  color={formData.preferredCommunicationMethod === method.key ? '#2563EB' : '#6B7280'} 
                  style={tw`mr-2`} 
                />
                <Text style={[
                  tw`font-medium`,
                  formData.preferredCommunicationMethod === method.key
                    ? tw`text-blue-600`
                    : tw`text-gray-600`
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={tw`mb-8`}>
          <Text style={tw`text-lg font-semibold text-gray-900 mb-3`}>
            {translations[language].additionalNotes || 'Additional Notes'}
          </Text>
          <TextInput
            style={tw`bg-white rounded-xl p-4 border border-gray-200 text-gray-900 min-h-24`}
            placeholder={translations[language].additionalInfo || "Additional information..."}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            tw`bg-blue-600 rounded-xl p-4 flex-row items-center justify-center`,
            loading && tw`opacity-50`
          ]}
          onPress={handleSubmit}
          disabled={loading || !selectedPartType || !formData.vehicleInfo.brand || !formData.vehicleInfo.model || !formData.vehicleInfo.licensePlate}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="white" />
              <Text style={tw`text-white text-lg font-semibold ml-2`}>
                {translations[language].createRequest || 'Create Request'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <View style={tw`mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200`}>
          <View style={tw`flex-row items-start`}>
            <Ionicons name="information-circle" size={20} color="#2563EB" />
            <Text style={tw`text-blue-700 text-sm ml-2 flex-1`}>
              {translations[language].requestHelpText || 
                "After submitting your request, parts suppliers will be notified and can contact you through the messaging system with quotes and availability."}
            </Text>
          </View>
        </View>
      </ScrollView>

      <PartSelectionModal />
    </SafeAreaView>
  );
};

export default CreatePartsRequestScreen;
