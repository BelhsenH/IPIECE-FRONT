import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import UserService, { UpdateProfileData } from '../../services/userService';
import tw from 'twrnc';

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
  const { user, updateUser, refreshUserProfile, logout } = useAuth();
  const t = translations[language];

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    companyName: user?.companyName || '',
    address: user?.location?.address || '',
    latitude: user?.location?.latitude || 36.8065,
    longitude: user?.location?.longitude || 10.1815,
    partTypes: user?.specialization?.partTypes || ['neuf'],
    vehicleBrands: user?.specialization?.vehicleBrands || [],
    vehicleModels: user?.specialization?.vehicleModels || [],
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: user?.location?.latitude || 36.8065,
    longitude: user?.location?.longitude || 10.1815,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        companyName: user.companyName || '',
        address: user.location?.address || '',
        latitude: user.location?.latitude || 36.8065,
        longitude: user.location?.longitude || 10.1815,
        partTypes: user.specialization?.partTypes || ['neuf'],
        vehicleBrands: user.specialization?.vehicleBrands || [],
        vehicleModels: user.specialization?.vehicleModels || [],
      });
      setRegion({
        latitude: user.location?.latitude || 36.8065,
        longitude: user.location?.longitude || 10.1815,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      await refreshUserProfile();
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{8}$/;
    
    return (
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      emailRegex.test(formData.email) &&
      phoneRegex.test(formData.phone) &&
      formData.address.trim() &&
      formData.partTypes.length > 0
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
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        companyName: formData.companyName,
        location: {
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
        },
        specialization: {
          partTypes: formData.partTypes,
          vehicleBrands: formData.vehicleBrands,
          vehicleModels: formData.vehicleModels,
        },
      };

      const updatedProfile = await UserService.updateProfile(updateData);
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

  const togglePartType = (type: string) => {
    if (!isEditing) return;
    
    setFormData((prev) => ({
      ...prev,
      partTypes: prev.partTypes.includes(type)
        ? prev.partTypes.filter((t) => t !== type)
        : [...prev.partTypes, type],
    }));
  };

  const handleBrandChange = (brand: string) => {
    if (!isEditing) return;
    
    const updatedBrands = formData.vehicleBrands.includes(brand)
      ? formData.vehicleBrands.filter(b => b !== brand)
      : [...formData.vehicleBrands, brand];
    
    setFormData(prev => ({
      ...prev,
      vehicleBrands: updatedBrands,
      // Clear models if brand is deselected
      vehicleModels: updatedBrands.includes(brand) 
        ? prev.vehicleModels 
        : prev.vehicleModels.filter(model => !carData[brand]?.includes(model))
    }));
  };

  const handleModelChange = (model: string) => {
    if (!isEditing) return;
    
    setFormData(prev => ({
      ...prev,
      vehicleModels: prev.vehicleModels.includes(model)
        ? prev.vehicleModels.filter(m => m !== model)
        : [...prev.vehicleModels, model],
    }));
  };

  const handleMapPress = (e: any) => {
    if (!isEditing) return;
    
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setFormData(prev => ({
      ...prev,
      latitude,
      longitude,
    }));
    setRegion({ ...region, latitude, longitude });
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
    <ScrollView contentContainerStyle={tw`flex-grow bg-white p-5 items-center justify-center min-h-full`}>
      <View style={tw`h-4`} />

      <View style={tw`w-full flex-row items-center justify-between mb-4`}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`flex-row items-center p-2 rounded-2xl bg-blue-100`}
        >
          <Text style={tw`text-blue-900 text-base font-bold mr-1`}>&larr;</Text>
          <Text style={tw`text-blue-900 text-base font-bold`}>
            {t.back || (language === 'fr' ? 'Retour' : 'رجوع')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleLanguage} style={tw`p-2 bg-gray-100 rounded-lg`}>
          <Text style={tw`text-base font-bold text-blue-900`}>
            {language === 'fr' ? 'العربية' : 'Français'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={tw`w-full items-center`}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={tw`w-40 h-40 mb-5`}
          resizeMode="contain"
        />
        <Text style={tw`text-3xl font-bold text-blue-900 mb-2 text-center`}>
          {t.profileTitle || 'Mon Profil'}
        </Text>
        <Text style={tw`text-base text-gray-600 mb-5 text-center`}>
          {user?.firstName} {user?.lastName} - {t.supplier || (language === 'fr' ? 'Fournisseur iPiece' : 'مورد iPiece')}
        </Text>

        {/* Personal Information */}
        <View style={tw`w-full mb-4`}>
          <Text style={tw`text-lg font-semibold text-blue-900 mb-2 text-center`}>
            {t.personalInfo || "Informations personnelles"}
          </Text>
          
          <TextInput
            style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
            placeholder={t.firstNamePlaceholder || "Prénom"}
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
            placeholderTextColor="#9CA3AF"
            editable={isEditing}
          />
          
          <TextInput
            style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
            placeholder={t.lastNamePlaceholder || "Nom"}
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
            placeholderTextColor="#9CA3AF"
            editable={isEditing}
          />
          
          <TextInput
            style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
            placeholder={t.emailPlaceholder || "Email"}
            keyboardType="email-address"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholderTextColor="#9CA3AF"
            editable={isEditing}
            autoCapitalize="none"
          />
          
          <TextInput
            style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
            placeholder={t.phoneLabel || "Téléphone (8 chiffres)"}
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholderTextColor="#9CA3AF"
            editable={isEditing}
            maxLength={8}
          />
          
          <TextInput
            style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
            placeholder={t.companyLabel || "Nom de l'entreprise"}
            value={formData.companyName}
            onChangeText={(text) => setFormData({ ...formData, companyName: text })}
            placeholderTextColor="#9CA3AF"
            editable={isEditing}
          />
        </View>

        {/* Location */}
        <View style={tw`w-full mb-4`}>
          <Text style={tw`text-lg font-semibold text-blue-900 mb-2 text-center`}>
            {t.location || "Localisation"}
          </Text>
          
          <TextInput
            style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
            placeholder={t.addressPlaceholder || "Adresse"}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholderTextColor="#9CA3AF"
            editable={isEditing}
          />
          
          <View style={tw`w-full h-64 mb-4 rounded-lg overflow-hidden`}>
            <MapView
              style={tw`w-full h-full`}
              region={region}
              onPress={handleMapPress}
            >
              <Marker
                coordinate={{
                  latitude: formData.latitude,
                  longitude: formData.longitude,
                }}
                title={user?.companyName || 'Mon entreprise'}
                description={formData.address}
              />
            </MapView>
          </View>
        </View>

        {/* Specialization */}
        <View style={tw`w-full mb-4`}>
          <Text style={tw`text-lg font-semibold text-blue-900 mb-2 text-center`}>
            {t.specialization || "Spécialisations"}
          </Text>
          
          {/* Part Types */}
          <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>
            {t.partTypes || "Types de pièces"}
          </Text>
          <View style={tw`flex-row justify-between mb-4`}>
            <TouchableOpacity
              style={tw`flex-1 h-12 bg-gray-100 rounded-lg justify-center items-center mx-1 ${formData.partTypes.includes('neuf') ? 'bg-blue-900' : ''}`}
              onPress={() => togglePartType('neuf')}
            >
              <Text style={tw`text-base ${formData.partTypes.includes('neuf') ? 'text-white' : 'text-gray-600'}`}>
                {t.new || "Neuf"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`flex-1 h-12 bg-gray-100 rounded-lg justify-center items-center mx-1 ${formData.partTypes.includes('occasion') ? 'bg-blue-900' : ''}`}
              onPress={() => togglePartType('occasion')}
            >
              <Text style={tw`text-base ${formData.partTypes.includes('occasion') ? 'text-white' : 'text-gray-600'}`}>
                {t.used || "Occasion"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`flex-1 h-12 bg-gray-100 rounded-lg justify-center items-center mx-1 ${formData.partTypes.includes('compatible') ? 'bg-blue-900' : ''}`}
              onPress={() => togglePartType('compatible')}
            >
              <Text style={tw`text-base ${formData.partTypes.includes('compatible') ? 'text-white' : 'text-gray-600'}`}>
                {t.compatible || "Compatible"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle Brands */}
          <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>
            {t.vehicleBrands || "Marques spécialisées"}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-4`}>
            <View style={tw`flex-row gap-2 px-1`}>
              {Object.keys(carData).map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={tw`px-4 py-2 rounded-full ${formData.vehicleBrands.includes(brand) ? 'bg-blue-900' : 'bg-gray-100'}`}
                  onPress={() => handleBrandChange(brand)}
                >
                  <Text style={tw`${formData.vehicleBrands.includes(brand) ? 'text-white' : 'text-gray-700'}`}>
                    {brand}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Vehicle Models */}
          {formData.vehicleBrands.length > 0 && (
            <>
              <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>
                {t.vehicleModels || "Modèles spécialisés"}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-4`}>
                <View style={tw`flex-row gap-2 px-1`}>
                  {formData.vehicleBrands.flatMap(brand => 
                    carData[brand]?.map(model => (
                      <TouchableOpacity
                        key={`${brand}-${model}`}
                        style={tw`px-3 py-1 rounded-full ${formData.vehicleModels.includes(model) ? 'bg-green-600' : 'bg-gray-100'}`}
                        onPress={() => handleModelChange(model)}
                      >
                        <Text style={tw`text-sm ${formData.vehicleModels.includes(model) ? 'text-white' : 'text-gray-700'}`}>
                          {model}
                        </Text>
                      </TouchableOpacity>
                    )) || []
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={tw`flex-row justify-center w-full mb-5 gap-2`}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={tw`flex-1 h-12 bg-gray-600 rounded-lg justify-center items-center min-w-[120px]`}
                onPress={() => setIsEditing(false)}
              >
                <Text style={tw`text-lg font-semibold text-white`}>
                  {t.cancel || "Annuler"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex-1 h-12 bg-blue-900 rounded-lg justify-center items-center min-w-[120px]`}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={tw`text-lg font-semibold text-white`}>
                    {t.save || "Enregistrer"}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={tw`flex-1 h-12 bg-blue-900 rounded-lg justify-center items-center min-w-[120px]`}
              onPress={() => setIsEditing(true)}
            >
              <Text style={tw`text-lg font-semibold text-white`}>
                {t.edit || "Modifier"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleLogout}>
          <Text style={tw`text-sm text-red-600 underline text-center`}>
            {t.disconnect || "Se déconnecter"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Profile;
