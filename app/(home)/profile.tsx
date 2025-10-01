import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';
import OpenStreetMapView from '../../components/modern/OpenStreetMapView';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import UserService, { UpdateProfileData } from '../../services/userService';

// Sample car brands and models
const carData: { [key: string]: string[] } = {
  Toyota: ['Corolla', 'Camry', 'RAV4', 'Yaris'],
  Ford: ['Focus', 'Mustang', 'F-150', 'Escape'],
  BMW: ['3 Series', '5 Series', 'X5', 'M3'],
  Volkswagen: ['Golf', 'Passat', 'Tiguan', 'Polo'],
  Mercedes: ['C-Class', 'E-Class', 'S-Class', 'GLC'],
  Audi: ['A3', 'A4', 'A6', 'Q5'],
  Renault: ['Clio', 'Megane', 'Symbol', 'Duster'],
  Peugeot: ['208', '308', '508', '2008'],
};

const Profile: React.FC = () => {
  const router = useRouter();
  const { language, toggleLanguage, translations } = useLanguage();
  const { user, updateUser, logout } = useAuth();
  const t = translations[language];
  const [currentUser, setCurrentUser] = useState(user); // Local user state for immediate updates

  const [formData, setFormData] = useState<{
    type: 'boutique' | 'societe';
    nomBoutiqueSociete: string;
    nomGerant: string;
    email: string;
    phoneNumber: string;
    adresse: string;
    latitude: number;
    longitude: number;
    zoneGeoCouverte: string;
    typesPieces: ('neuf' | 'occasion')[];
    marquesSpecialises: string[];
  }>({
    type: currentUser?.type || 'boutique',
    nomBoutiqueSociete: currentUser?.companyName || '',
    nomGerant: currentUser?.firstName || '',
    email: currentUser?.email || '',
    phoneNumber: currentUser?.phone || '',
    adresse: currentUser?.location?.address || '',
    latitude: currentUser?.location?.latitude || 36.8065,
    longitude: currentUser?.location?.longitude || 10.1815,
    zoneGeoCouverte: currentUser?.zoneGeoCouverte || '',
    typesPieces: (currentUser?.specialization?.partTypes || ['neuf']) as ('neuf' | 'occasion')[],
    marquesSpecialises: Array.isArray(currentUser?.specialization?.vehicleBrands) ? currentUser.specialization.vehicleBrands : [],
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load user profile data
  const loadUserProfile = useCallback(async () => {
    try {
      console.log('Profile: Starting loadUserProfile...');
      const profile = await UserService.getProfile();
      console.log('Profile: UserService.getProfile returned:', profile);

      // Map UserService profile to AuthContext user structure
      const userUpdate = {
        _id: profile._id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        userType: profile.userType,
        companyName: profile.companyName,
        location: profile.location,
        specialization: profile.specialization,
        email: profile.email,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
      console.log('Profile: Updating user with:', userUpdate);
      
      // Update local state immediately
      setCurrentUser(prev => ({ ...prev, ...userUpdate } as any));
      
      // Also update AuthContext
      updateUser(userUpdate);
      
    } catch (error: any) {
      console.error('Profile: Error loading user profile:', error);
      
      // If it's an auth error, redirect to login
      if (error.message === 'Unauthorized') {
        logout();
      }
    }
  }, [updateUser, logout]);

  // Load user profile on component mount
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        // Load user profile from UserService
        await loadUserProfile();
      } catch (error) {
        console.error('Profile: Error during initialization:', error);
      }
    };
    
    initializeProfile();
  }, [loadUserProfile]);

  // Sync local user state with AuthContext when it changes
  useEffect(() => {
    if (user && user._id) {
      setCurrentUser(user);
    }
  }, [user]);

  // Update form data when currentUser data changes
  useEffect(() => {
    if (currentUser) {
      setFormData({
        type: currentUser.type || 'boutique',
        nomBoutiqueSociete: currentUser.companyName || '',
        nomGerant: currentUser.firstName || '',
        email: currentUser.email || '',
        phoneNumber: currentUser.phone || '',
        adresse: currentUser.location?.address || '',
        latitude: currentUser.location?.latitude || 36.8065,
        longitude: currentUser.location?.longitude || 10.1815,
        zoneGeoCouverte: currentUser.zoneGeoCouverte || '',
        typesPieces: (currentUser.specialization?.partTypes || ['neuf']) as ('neuf' | 'occasion')[],
        marquesSpecialises: Array.isArray(currentUser.specialization?.vehicleBrands) ? currentUser.specialization.vehicleBrands : [],
      });
    }
  }, [currentUser]);

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{8}$/;

    return (
      formData.nomBoutiqueSociete.trim() &&
      formData.nomGerant.trim() &&
      emailRegex.test(formData.email) &&
      phoneRegex.test(formData.phoneNumber) &&
      formData.adresse.trim() &&
      formData.zoneGeoCouverte.trim() &&
      formData.typesPieces.length > 0
    );
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert(
        t.error || 'Erreur',
        t.fillFields || 'Veuillez remplir tous les champs requis correctement.'
      );
      return;
    }

    try {
      setIsLoading(true);
      
      const updateData: UpdateProfileData = {
        firstName: formData.nomGerant,
        email: formData.email,
        phone: formData.phoneNumber,
        companyName: formData.nomBoutiqueSociete,
        location: {
          address: formData.adresse,
          latitude: formData.latitude,
          longitude: formData.longitude,
        },
        specialization: {
          partTypes: formData.typesPieces,
          vehicleBrands: formData.marquesSpecialises,
          vehicleModels: [],
        },
      };

      const updatedProfile = await UserService.updateProfile(updateData);
      
      // Update local state immediately
      setCurrentUser(prev => ({ ...prev, ...updatedProfile } as any));
      
      // Also update AuthContext
      updateUser(updatedProfile);
      
      setIsEditing(false);
      Alert.alert(
        t.success || 'Succès',
        t.profileUpdated || 'Profil mis à jour avec succès.'
      );
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert(
        t.error || 'Erreur',
        error.message || 'Erreur lors de la sauvegarde du profil.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const togglePartType = (type: 'neuf' | 'occasion') => {
    if (!isEditing) return;

    setFormData((prev) => ({
      ...prev,
      typesPieces: prev.typesPieces.includes(type)
        ? prev.typesPieces.filter((t) => t !== type)
        : [...prev.typesPieces, type],
    }));
  };

  const handleBrandChange = (brand: string) => {
    if (!isEditing) return;

    setFormData(prev => ({
      ...prev,
      marquesSpecialises: prev.marquesSpecialises.includes(brand)
        ? prev.marquesSpecialises.filter((b: string) => b !== brand)
        : [...prev.marquesSpecialises, brand],
    }));
  };

  const handleTypeChange = (newType: 'boutique' | 'societe') => {
    if (!isEditing) return;

    setFormData(prev => ({
      ...prev,
      type: newType,
    }));
  };

  const handleLocationSelect = (location: { latitude: number; longitude: number }) => {
    if (isEditing) {
      setFormData(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t.logoutTitle || 'Déconnexion',
      t.logoutConfirmMessage || 'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: t.cancel || 'Annuler', style: 'cancel' },
        {
          text: t.logout || 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={tw`flex-grow bg-gray-50 items-center justify-center min-h-full`}>
      {/* Header with gradient background */}
      <View style={tw`w-full bg-gradient-to-br from-blue-600 to-blue-800 pt-12 pb-6 px-5 shadow-lg`}>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`flex-row items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm shadow-sm`}
          >
            <Text style={tw`text-white text-lg font-bold mr-2`}>←</Text>
            <Text style={tw`text-white text-base font-semibold`}>
              {t.back || (language === 'fr' ? 'Retour' : 'رجوع')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={toggleLanguage} 
            style={tw`px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-sm`}
          >
            <Text style={tw`text-base font-semibold text-white`}>
              {language === 'fr' ? 'العربية' : 'Français'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Profile Header Info */}
        <View style={tw`items-center mt-4`}>
          <View style={tw`w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-3 shadow-lg`}>
            <Text style={tw`text-3xl text-white font-bold`}>
              {currentUser?.firstName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={tw`text-2xl font-bold text-black text-center mb-1`}>
            {currentUser?.firstName || 'Utilisateur'}
          </Text>
          <Text style={tw`text-base text-black/80 text-center mb-1`}>
            {currentUser?.companyName || 'Entreprise'}
          </Text>
          <View style={tw`px-3 py-1 bg-black/20 rounded-full`}>
            <Text style={tw`text-sm text-black font-medium`}>
              {t.supplier || (language === 'fr' ? 'Fournisseur iPiece' : 'مورد iPiece')}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content Container */}
      <View style={tw`w-full px-5 -mt-6`}>
        {/* Content Cards */}
        <View style={tw`bg-white rounded-2xl shadow-lg p-6 mb-6`}>
          <Text style={tw`text-2xl font-bold text-gray-800 mb-6 text-center`}>
            {t.profileTitle || 'Mon Profil'}
          </Text>

          {/* Business Information */}
          <View style={tw`mb-6`}>
            <View style={tw`flex-row items-center mb-4`}>
              <View style={tw`w-1 h-6 bg-blue-600 rounded-full mr-3`} />
              <Text style={tw`text-lg font-semibold text-gray-800`}>
                {t.businessInfo || "Informations commerciales"}
              </Text>
            </View>

            {/* Business Type */}
            <Text style={tw`text-sm font-medium text-gray-600 mb-3 ml-4`}>
              {t.businessType || "Type d'entreprise"}
            </Text>
            <View style={tw`flex-row justify-between mb-4 px-1`}>
              <TouchableOpacity
                style={tw`flex-1 h-12 rounded-xl justify-center items-center mx-1 border-2 ${formData.type === 'boutique' ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'} ${!isEditing ? 'opacity-60' : ''}`}
                onPress={() => handleTypeChange('boutique')}
                disabled={!isEditing}
              >
                <Text style={tw`text-base font-medium ${formData.type === 'boutique' ? 'text-white' : 'text-gray-700'}`}>
                  {t.boutique || "Boutique"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex-1 h-12 rounded-xl justify-center items-center mx-1 border-2 ${formData.type === 'societe' ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'} ${!isEditing ? 'opacity-60' : ''}`}
                onPress={() => handleTypeChange('societe')}
                disabled={!isEditing}
              >
                <Text style={tw`text-base font-medium ${formData.type === 'societe' ? 'text-white' : 'text-gray-700'}`}>
                  {t.societe || "Société"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Inputs */}
            <View style={tw`space-y-4`}>
              <View>
                <Text style={tw`text-sm font-medium text-gray-600 mb-2 ml-1`}>
                  {t.businessNamePlaceholder || "Nom de la boutique/société"}
                </Text>
                <TextInput
                  style={tw`w-full h-14 bg-gray-50 rounded-xl px-4 text-gray-800 border-2 ${isEditing ? 'border-gray-200 focus:border-blue-500' : 'border-gray-100'} ${!isEditing ? 'opacity-60' : ''}`}
                  placeholder={t.businessNamePlaceholder || "Nom de la boutique/société"}
                  value={formData.nomBoutiqueSociete}
                  onChangeText={(text) => setFormData({ ...formData, nomBoutiqueSociete: text })}
                  placeholderTextColor="#9CA3AF"
                  editable={isEditing}
                />
              </View>

              <View>
                <Text style={tw`text-sm font-medium text-gray-600 mb-2 ml-1`}>
                  {t.managerNamePlaceholder || "Nom du gérant"}
                </Text>
                <TextInput
                  style={tw`w-full h-14 bg-gray-50 rounded-xl px-4 text-gray-800 border-2 ${isEditing ? 'border-gray-200 focus:border-blue-500' : 'border-gray-100'} ${!isEditing ? 'opacity-60' : ''}`}
                  placeholder={t.managerNamePlaceholder || "Nom du gérant"}
                  value={formData.nomGerant}
                  onChangeText={(text) => setFormData({ ...formData, nomGerant: text })}
                  placeholderTextColor="#9CA3AF"
                  editable={isEditing}
                />
              </View>

              <View>
                <Text style={tw`text-sm font-medium text-gray-600 mb-2 ml-1`}>
                  {t.emailPlaceholder || "Email"}
                </Text>
                <TextInput
                  style={tw`w-full h-14 bg-gray-50 rounded-xl px-4 text-gray-800 border-2 ${isEditing ? 'border-gray-200 focus:border-blue-500' : 'border-gray-100'} ${!isEditing ? 'opacity-60' : ''}`}
                  placeholder={t.emailPlaceholder || "Email"}
                  keyboardType="email-address"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholderTextColor="#9CA3AF"
                  editable={isEditing}
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Text style={tw`text-sm font-medium text-gray-600 mb-2 ml-1`}>
                  {t.phoneLabel || "Téléphone (8 chiffres)"}
                </Text>
                <TextInput
                  style={tw`w-full h-14 bg-gray-50 rounded-xl px-4 text-gray-800 border-2 ${isEditing ? 'border-gray-200 focus:border-blue-500' : 'border-gray-100'} ${!isEditing ? 'opacity-60' : ''}`}
                  placeholder={t.phoneLabel || "Téléphone (8 chiffres)"}
                  keyboardType="phone-pad"
                  value={formData.phoneNumber}
                  onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                  placeholderTextColor="#9CA3AF"
                  editable={isEditing}
                  maxLength={8}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Location Card */}
        <View style={tw`bg-white rounded-2xl shadow-lg p-6 mb-6`}>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`w-1 h-6 bg-green-600 rounded-full mr-3`} />
            <Text style={tw`text-lg font-semibold text-gray-800`}>
              {t.location || "Localisation"}
            </Text>
          </View>
          
          <View style={tw`space-y-4 mb-4`}>
            <View>
              <Text style={tw`text-sm font-medium text-gray-600 mb-2 ml-1`}>
                {t.addressPlaceholder || "Adresse"}
              </Text>
              <TextInput
                style={tw`w-full h-14 bg-gray-50 rounded-xl px-4 text-gray-800 border-2 ${isEditing ? 'border-gray-200 focus:border-green-500' : 'border-gray-100'} ${!isEditing ? 'opacity-60' : ''}`}
                placeholder={t.addressPlaceholder || "Adresse"}
                value={formData.adresse}
                onChangeText={(text) => setFormData({ ...formData, adresse: text })}
                placeholderTextColor="#9CA3AF"
                editable={isEditing}
              />
            </View>

            <View>
              <Text style={tw`text-sm font-medium text-gray-600 mb-2 ml-1`}>
                {t.coverageAreaPlaceholder || "Zone géographique couverte"}
              </Text>
              <TextInput
                style={tw`w-full h-14 bg-gray-50 rounded-xl px-4 text-gray-800 border-2 ${isEditing ? 'border-gray-200 focus:border-green-500' : 'border-gray-100'} ${!isEditing ? 'opacity-60' : ''}`}
                placeholder={t.coverageAreaPlaceholder || "Zone géographique couverte"}
                value={formData.zoneGeoCouverte}
                onChangeText={(text) => setFormData({ ...formData, zoneGeoCouverte: text })}
                placeholderTextColor="#9CA3AF"
                editable={isEditing}
              />
            </View>
          </View>
          
          <OpenStreetMapView
            latitude={formData.latitude}
            longitude={formData.longitude}
            onLocationSelect={isEditing ? handleLocationSelect : undefined}
            style={tw`w-full h-64 rounded-2xl overflow-hidden shadow-md border border-gray-200`}
          />
          {isEditing && (
            <Text style={tw`text-xs text-gray-500 mt-2 text-center`}>
              {t.tapToSelectLocation || "Appuyez sur la carte pour sélectionner votre emplacement"}
            </Text>
          )}
        </View>

        {/* Specialization Card */}
        <View style={tw`bg-white rounded-2xl shadow-lg p-6 mb-6`}>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`w-1 h-6 bg-purple-600 rounded-full mr-3`} />
            <Text style={tw`text-lg font-semibold text-gray-800`}>
              {t.specialization || "Spécialisations"}
            </Text>
          </View>
          
          {/* Part Types */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-sm font-medium text-gray-600 mb-3 ml-1`}>
              {t.partTypes || "Types de pièces"}
            </Text>
            <View style={tw`flex-row justify-between px-1`}>
              <TouchableOpacity
                style={tw`flex-1 h-12 rounded-xl justify-center items-center mx-1 border-2 ${formData.typesPieces.includes('neuf') ? 'bg-purple-600 border-purple-600' : 'bg-gray-50 border-gray-200'} ${!isEditing ? 'opacity-60' : ''}`}
                onPress={() => togglePartType('neuf')}
                disabled={!isEditing}
              >
                <Text style={tw`text-base font-medium ${formData.typesPieces.includes('neuf') ? 'text-white' : 'text-gray-700'}`}>
                  {t.new || "Neuf"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex-1 h-12 rounded-xl justify-center items-center mx-1 border-2 ${formData.typesPieces.includes('occasion') ? 'bg-purple-600 border-purple-600' : 'bg-gray-50 border-gray-200'} ${!isEditing ? 'opacity-60' : ''}`}
                onPress={() => togglePartType('occasion')}
                disabled={!isEditing}
              >
                <Text style={tw`text-base font-medium ${formData.typesPieces.includes('occasion') ? 'text-white' : 'text-gray-700'}`}>
                  {t.used || "Occasion"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Specialized Brands */}
          <View>
            <Text style={tw`text-sm font-medium text-gray-600 mb-3 ml-1`}>
              {t.specializedBrands || "Marques spécialisées"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-1`}>
              <View style={tw`flex-row gap-3 px-1`}>
                {Object.keys(carData).map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={tw`px-4 py-2 rounded-xl border-2 ${formData.marquesSpecialises.includes(brand) ? 'bg-purple-600 border-purple-600' : 'bg-gray-50 border-gray-200'} ${!isEditing ? 'opacity-60' : ''}`}
                    onPress={() => handleBrandChange(brand)}
                    disabled={!isEditing}
                  >
                    <Text style={tw`font-medium ${formData.marquesSpecialises.includes(brand) ? 'text-white' : 'text-gray-700'} text-sm`}>
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={tw`bg-white rounded-2xl shadow-lg p-6 mb-6`}>
          <View style={tw`flex-row justify-center gap-3 mb-4`}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={tw`flex-1 h-14 bg-gray-500 hover:bg-gray-600 rounded-xl justify-center items-center shadow-sm`}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={tw`text-lg font-semibold text-white`}>
                    {t.cancel || "Annuler"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`flex-1 h-14 rounded-xl justify-center items-center shadow-sm ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                  onPress={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <View style={tw`flex-row items-center`}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={tw`text-lg font-semibold text-white ml-2`}>
                        {t.saving || "Sauvegarde..."}
                      </Text>
                    </View>
                  ) : (
                    <Text style={tw`text-lg font-semibold text-white`}>
                      {t.save || "Enregistrer"}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={tw`flex-1 h-14 bg-blue-600 hover:bg-blue-700 rounded-xl justify-center items-center shadow-sm`}
                onPress={() => setIsEditing(true)}
              >
                <View style={tw`flex-row items-center`}>
                  <Text style={tw`text-lg font-semibold text-white mr-2`}>✏️</Text>
                  <Text style={tw`text-lg font-semibold text-white`}>
                    {t.edit || "Modifier"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={tw`border-t border-gray-200 pt-4`}>
            <TouchableOpacity 
              onPress={handleLogout}
              style={tw`flex-row items-center justify-center py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200`}
            >
              <Text style={tw`text-lg mr-2`}>🚪</Text>
              <Text style={tw`text-base font-medium text-red-600`}>
                {t.disconnect || "Se déconnecter"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default Profile;
