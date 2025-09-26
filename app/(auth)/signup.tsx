import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import StepIndicator from 'react-native-step-indicator';
import tw from 'twrnc';
import { useLanguage } from '../../contexts/LanguageContext';
import { authService } from '../../scripts/auth-script';

const stepsKeys = ['companyInfo', 'location', 'contact', 'specialization'];

const stepIndicatorStyles = {
  stepIndicatorSize: 30,
  currentStepIndicatorSize: 40,
  separatorStrokeWidth: 2,
  currentStepStrokeWidth: 3,
  stepStrokeCurrentColor: '#1E3A8A',
  stepStrokeWidth: 2,
  separatorStrokeFinishedWidth: 2,
  stepStrokeFinishedColor: '#1E3A8A',
  stepStrokeUnFinishedColor: '#D1D5DB',
  separatorFinishedColor: '#1E3A8A',
  separatorUnFinishedColor: '#D1D5DB',
  stepIndicatorFinishedColor: '#1E3A8A',
  stepIndicatorUnFinishedColor: '#FFFFFF',
  stepIndicatorCurrentColor: '#FFFFFF',
  stepIndicatorLabelFontSize: 13,
  currentStepIndicatorLabelFontSize: 13,
  stepIndicatorLabelCurrentColor: '#1E3A8A',
  stepIndicatorLabelFinishedColor: '#FFFFFF',
  stepIndicatorLabelUnFinishedColor: '#4B5563',
  labelColor: '#4B5563',
  labelSize: 13,
  currentStepLabelColor: '#1E3A8A',
};

// Sample car brands and models
const carData: Record<string, string[]> = {
  "Alfa Romeo": ["Giulia", "Stelvio"],
  "Audi": ["A3 Berline", "A3 Sportback", "E-tron GT", "Q2", "Q3", "Q3 Sportback", "Q6 e-tron", "Q7", "Q8"],
  "Bako": ["B-Van", "Bee"],
  "Bestune": ["T77 Pro"],
  "BMW": ["i4", "i5", "iX", "iX1", "iX3", "Série 1", "Série 3", "Série 4 Coupé", "Série 4 Gran Coupé", "Série 5", "X1", "X2", "X3", "X3 Hybride", "X4", "X5 Hybride"],
  "BYD": ["Atto 3", "Dolphin", "King", "Song Plus", "Tang EV"],
  "Changan": ["Hunter", "New Star Van", "Stra Truck Double Cabine"],
  "Chery": ["Arrio 8", "Tiggo 1X populaire", "Tiggo 3X", "Tiggo 4 Pro", "Tiggo 7 Pro"],
  "Chevrolet": ["Captiva", "Equinox", "Groove"],
  "Citroen": ["Berlingo", "Berlingo Van", "C3 Populaire", "C4 X", "Jumper", "Jumpy Fourgon"],
  "Cupra": ["Leon", "Terramar"],
  "Dacia": ["Duster", "Logan", "Sandero", "Sandero Stepway"],
  "DFSK": ["C31", "C32", "Glory 500", "Glory 580", "Glory iX5", "K01H", "K025"],
  "Dongfeng": ["Forthing T5 EVO", "Rich 6"],
  "FAW": ["Besturn X40"],
  "Fiat": ["500", "Doblo", "Doblo Combi", "Ducato", "Fiorino Combi", "Scudo Combi", "Tipo Berline"],
  "Foday": ["F22 D", "F22 Max", "F22 S"],
  "Ford": ["Everest", "Ranger", "Ranger Raptor"],
  "Foton": ["TM5 3.4T Chassis Cabine", "Tunland G7 Double Cabine", "Tunland G7 Simple Cabine", "View C2 Van"],
  "GAC": ["Emkoo", "Emzoom", "GA4"],
  "Geely": ["Azkarra", "Coolray", "Emgrand", "Geometry C", "GX3 Pro", "Monjaro", "Starray", "Tugella"],
  "GWM": ["Haval H6 Hybride", "Haval Jolion", "Poer AT", "Poer MT", "Tank 300 HEV", "Tank 500 HEV", "Wingle 5 Double Cabine", "Wingle 5 Simple Cabine"],
  "Honda": ["Accord", "City", "Civic", "Civic Hybride", "Civic Type R", "CR-V", "CR-V Hybride", "HR-V", "Jazz", "ZR-V"],
  "Hyundai": ["Azera Hybride", "Bayon", "Creta", "Grand i10", "Grand i10 Populaire", "Grand i10 Sedan", "i20", "i30 Fastback", "Ioniq 5", "Ioniq 6", "Kona", "Kona Electric", "Palisade Calligraphy", "Staria 11 places", "Staria 9 places", "Tucson", "Tucson Hybride", "Venue"],
  "JAC": ["T8 Pro Double Cabine"],
  "Jaguar": ["E-Pace", "F-Pace"],
  "Jeep": ["Renegade", "Wrangler", "Wrangler Unlimited"],
  "Jetour": ["Dashing", "X70 Plus"],
  "KIA": ["EV6", "EV6 GT", "EV9", "Niro Hybride", "Picanto", "Picanto Populaire", "Seltos", "Sonet", "Sportage", "Sportage Hybride", "Stonic"],
  "Land Rover": ["Defender 110", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  "Mahindra": ["KUV 100", "Pick-up DC", "Pick-up SC", "XUV 300"],
  "Mercedes-Benz": ["CLA", "Classe A", "Classe A Berline", "Classe C", "Classe C Plug-in Hybride", "Classe E", "Classe E Plug-in Hybride", "Classe S", "Classe V", "CLE Coupé", "EQB", "EQE Berline", "EQE SUV", "EQS SUV", "GLA", "GLB", "GLC", "GLC Coupé", "GLC Coupé Plug-in Hybride", "GLC Plug-in Hybride", "GLE", "GLE Coupé"],
  "MG": ["3", "3 Hybrid+", "4", "5", "7", "Cyberster", "GT", "One", "RX5", "RX9", "ZS", "ZS Hybrid+"],
  "Mini": ["Aceman", "Cooper Electric", "Countryman"],
  "Mitsubishi": ["Attrage Populaire", "Eclipse Cross", "L200 Double Cabine", "Pajero", "Pajero Sport"],
  "Nissan": ["Juke", "Navara", "Qashqai e-Power"],
  "Opel": ["Combo Cargo", "Corsa", "Crossland", "Grandland", "Mokka"],
  "Peugeot": ["2008", "208", "308", "408", "Boxer", "Boxer Double Cabine", "Expert", "Expert Combi", "Landtrek Double Cabine", "Landtrek Simple Cabine", "Partner", "Rifter", "Traveller"],
  "Porche": ["911", "Cayenne", "Cayenne Coupé", "Macan Electric", "Taycan", "Taycan Cross Turismo"],
  "Renault": ["Austral", "Clio", "Express Combi", "Express Van", "Kwid Populaire", "Master", "Megane", "Megane Sedan"],
  "Seat": ["Arona", "Ateca", "Ibiza", "Leon"],
  "Skoda": ["Fabia", "Kamiq", "Kushaq", "Octavia", "Scala"],
  "SsangYong": ["Korando", "Musso", "Rexton", "Tivoli", "Torres"],
  "Suzuki": ["Baleno", "Celerio Populaire", "Ertiga", "Fronx", "Jimny 3 portes", "Jimny 5 portes", "Swift"],
  "Tata": ["Super Ace Simple Cabine", "Xenon X2 Double Cabine 4x2", "Xenon X2 Double Cabine 4x4", "Xenon X2 Simple Cabine"],
  "Toyota": ["Coaster", "Corolla Sedan", "Corolla Sedan Hybride", "Fortuner", "Hiace", "Hiace Van", "Hilux Double Cabine", "Hilux Simple Cabine", "Land Cruiser 300", "Land Cruiser 76", "Land Cruiser 79", "Prado", "RAV 4 Hybride", "Yaris Cross Hybride", "Yaris Hybride"],
  "Volkswagen": ["Amarok", "Caddy Cargo", "Golf 8", "Polo", "T-Cross", "Tiguan", "Virtus"],
  "Volvo": ["EC40", "EX30", "XC40", "XC60", "XC90"],
  "Wallyscar": ["Annibal", "Annibal XXL"]
};


// Sample geographic zones
const geoZones = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Zaghouan",
  "Bizerte",
  "Béja",
  "Jendouba",
  "Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gabès",
  "Medenine",
  "Tataouine",
  "Gafsa",
  "Tozeur",
  "Kebili"
];

const SignUp: React.FC = () => {
  const router = useRouter();
  const { language, toggleLanguage, translations } = useLanguage();
  const t = translations[language];

  const steps = [
    { label: t.companyInfo || 'Infos Entreprise' },
    { label: t.location || 'Localisation' },
    { label: t.contact || 'Contact' },
    { label: t.specialization || 'Spécialisation' },
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    type: 'boutique' as 'boutique' | 'societe',
    nomBoutiqueSociete: '',
    nomGerant: '',
    raisonSociale: '',
    adresse: '',
    geolocation: { lat: 36.8065, lng: 10.1815 }, // Default to Tunis, now as numbers
    zoneGeoCouverte: '',
    phoneNumber: '',
    countryCode: '+216',
    email: '',
    typesPieces: [] as ('neuf' | 'occasion')[],
    marquesSpecialises: [] as string[],
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 36.8065,
    longitude: 10.1815,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const validateStep = () => {
    if (currentStep === 0) {
      return (
        formData.type &&
        formData.nomBoutiqueSociete.trim() &&
        formData.nomGerant.trim()
      );
    }
    if (currentStep === 1) {
      return (
        formData.adresse.trim() &&
        formData.geolocation.lat &&
        formData.geolocation.lng &&
        formData.zoneGeoCouverte.trim()
      );
    }
    if (currentStep === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return formData.phoneNumber.trim() && emailRegex.test(formData.email);
    }
    if (currentStep === 3) {
      return (
        formData.typesPieces.length > 0 &&
        formData.marquesSpecialises.length > 0 &&
        formData.password.trim() &&
        formData.password === formData.confirmPassword
      );
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) {
      Alert.alert(t.error || 'Erreur', t.fillFields || 'Veuillez remplir tous les champs requis correctement.');
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSignUp();
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const fullPhoneNumber = `${formData.countryCode}${formData.phoneNumber}`;
      const registrationData = {
        type: formData.type,
        nomBoutiqueSociete: formData.nomBoutiqueSociete,
        nomGerant: formData.nomGerant,
        adresse: formData.adresse,
        geolocation: formData.geolocation,
        zoneGeoCouverte: formData.zoneGeoCouverte,
        phoneNumber: fullPhoneNumber,
        email: formData.email,
        typesPieces: formData.typesPieces,
        marquesSpecialises: formData.marquesSpecialises,
        raisonSociale: formData.raisonSociale,
        password: formData.password,
      };

      const response = await authService.register(registrationData);

      if (response.success) {
        Alert.alert(
          t.success || 'Success',
          t.registrationSuccess || 'Registration successful! Please verify your phone number.',
          [
            {
              text: t.ok || 'OK',
              onPress: () => router.push({
                pathname: '/(auth)/verify',
                params: { phoneNumber: fullPhoneNumber }
              })
            }
          ]
        );
      } else {
        Alert.alert(
          t.error || 'Error',
          response.error || 'Registration failed'
        );
      }
    } catch (error) {
      Alert.alert(
        t.error || 'Error',
        'An unexpected error occurred during registration'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMarque = (marque: string) => {
    setFormData((prev) => ({
      ...prev,
      marquesSpecialises: prev.marquesSpecialises.includes(marque)
        ? prev.marquesSpecialises.filter((m) => m !== marque)
        : [...prev.marquesSpecialises, marque],
    }));
  };

  const toggleTypePiece = (type: string) => {
    const validType = type as 'neuf' | 'occasion';
    setFormData((prev) => ({
      ...prev,
      typesPieces: prev.typesPieces.includes(validType)
        ? prev.typesPieces.filter((t) => t !== validType)
        : [...prev.typesPieces, validType],
    }));
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setFormData({
      ...formData,
      geolocation: { lat: latitude, lng: longitude },
    });
    setRegion({ ...region, latitude, longitude });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={tw`w-full`}>
            <Text style={tw`text-lg font-semibold text-blue-900 mb-2 text-center`}>
              {t.companyType || "Type d'entreprise"}
            </Text>
            <View style={tw`mb-4 bg-gray-100 rounded-lg`}>
              <Picker
                selectedValue={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                style={tw`w-full h-12 text-blue-900`}
              >
                <Picker.Item label={t.boutique || "Boutique"} value="boutique" />
                <Picker.Item label={t.company || "Société"} value="societe" />
              </Picker>
            </View>
            <TextInput
              style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
              placeholder={t.companyNamePlaceholder || "Nom de la boutique/société"}
              value={formData.nomBoutiqueSociete}
              onChangeText={(text) => setFormData({ ...formData, nomBoutiqueSociete: text })}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
              placeholder={t.managerNamePlaceholder || "Nom du gérant"}
              value={formData.nomGerant}
              onChangeText={(text) => setFormData({ ...formData, nomGerant: text })}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
              placeholder={t.socialReasonPlaceholder || "Raison sociale (optionnel)"}
              value={formData.raisonSociale}
              onChangeText={(text) => setFormData({ ...formData, raisonSociale: text })}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        );
      case 1:
        return (
          <View style={tw`w-full`}>
            <TextInput
              style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
              placeholder={t.addressPlaceholder || "Adresse"}
              value={formData.adresse}
              onChangeText={(text) => setFormData({ ...formData, adresse: text })}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={tw`text-lg font-semibold text-blue-900 mb-2 text-center`}>
              {t.geolocation || "Géolocalisation"}
            </Text>
            <View style={tw`w-full h-64 mb-4 rounded-lg overflow-hidden`}>
              <MapView
                style={tw`w-full h-full`}
                region={region}
                onPress={handleMapPress}
              >
                <Marker
                  coordinate={{
                    latitude: formData.geolocation.lat,
                    longitude: formData.geolocation.lng,
                  }}
                />
              </MapView>
            </View>
            <View style={tw`flex-row mb-4`}>
              <TextInput
                style={tw`flex-1 h-12 bg-gray-100 rounded-lg px-4 mr-2 text-blue-900`}
                placeholder={t.latitude || "Latitude"}
                keyboardType="numeric"
                value={formData.geolocation.lat.toString()}
                onChangeText={(text) => {
                  const numericValue = parseFloat(text);
                  const finalValue = isNaN(numericValue) ? 0 : numericValue;
                  setFormData({ 
                    ...formData, 
                    geolocation: { 
                      ...formData.geolocation, 
                      lat: finalValue 
                    } 
                  });
                  if (!isNaN(numericValue)) {
                    setRegion(prev => ({ ...prev, latitude: finalValue }));
                  }
                }}
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={tw`flex-1 h-12 bg-gray-100 rounded-lg px-4 text-blue-900`}
                placeholder={t.longitude || "Longitude"}
                keyboardType="numeric"
                value={formData.geolocation.lng.toString()}
                onChangeText={(text) => {
                  const numericValue = parseFloat(text);
                  const finalValue = isNaN(numericValue) ? 0 : numericValue;
                  setFormData({ 
                    ...formData, 
                    geolocation: { 
                      ...formData.geolocation, 
                      lng: finalValue 
                    } 
                  });
                  if (!isNaN(numericValue)) {
                    setRegion(prev => ({ ...prev, longitude: finalValue }));
                  }
                }}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <Text style={tw`text-lg font-semibold text-blue-900 mb-2 text-center`}>
              {t.coveredZone || "Zone géographique couverte"}
            </Text>
            <View style={tw`mb-4 bg-gray-100 rounded-lg`}>
              <Picker
                selectedValue={formData.zoneGeoCouverte}
                onValueChange={(value) => setFormData({ ...formData, zoneGeoCouverte: value })}
                style={tw`w-full h-12 text-blue-900`}
              >
                <Picker.Item label={t.selectZone || "Sélectionner une zone"} value="" />
                {geoZones.map((zone) => (
                  <Picker.Item key={zone} label={zone} value={zone} />
                ))}
              </Picker>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={tw`w-full`}>
            <View style={tw`flex-row mb-4`}>
              <View style={tw`w-1/3 bg-gray-100 rounded-lg mr-2`}>
                <Picker
                  selectedValue={formData.countryCode}
                  onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                  style={tw`w-full h-12 text-blue-900`}
                >
                  <Picker.Item label="+216 (Tunisia)" value="+216" />
                  <Picker.Item label="+213 (Algeria)" value="+213" />
                </Picker>
              </View>
              <TextInput
                style={tw`flex-1 h-12 bg-gray-100 rounded-lg px-4 text-blue-900`}
                placeholder={t.phonePlaceholder || "Numéro de téléphone"}
                keyboardType="phone-pad"
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TextInput
              style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
              placeholder={t.emailPlaceholder || "Email"}
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        );
      case 3:
        return (
          <View style={tw`w-full`}>
            <Text style={tw`text-lg font-semibold text-blue-900 mb-2 text-center`}>
              {t.pieceTypes || "Types de pièces"}
            </Text>
            <View style={tw`flex-row justify-between mb-4`}>
              <TouchableOpacity
                style={tw`flex-1 h-12 bg-gray-100 rounded-lg justify-center items-center mx-1 ${formData.typesPieces.includes('neuf') ? 'bg-blue-900' : ''}`}
                onPress={() => toggleTypePiece('neuf')}
              >
                <Text style={tw`text-base ${formData.typesPieces.includes('neuf') ? 'text-white' : 'text-gray-600'}`}>
                  {t.new || "Neuf"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex-1 h-12 bg-gray-100 rounded-lg justify-center items-center mx-1 ${formData.typesPieces.includes('occasion') ? 'bg-blue-900' : ''}`}
                onPress={() => toggleTypePiece('occasion')}
              >
                <Text style={tw`text-base ${formData.typesPieces.includes('occasion') ? 'text-white' : 'text-gray-600'}`}>
                  {t.used || "Occasion"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={tw`text-lg font-semibold text-blue-900 mb-2 text-center`}>
              {t.specialBrands || "Marques spécialisées"}
            </Text>
            <Text style={tw`text-sm text-gray-600 mb-2 text-center`}>
              {t.selectMultipleBrands || "Sélectionnez une ou plusieurs marques"}
            </Text>
            <ScrollView 
              style={tw`max-h-60 mb-4`} 
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={tw`flex-row flex-wrap justify-start`}>
                {Object.keys(carData).map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    style={tw`m-1 px-3 py-2 rounded-lg border ${
                      formData.marquesSpecialises.includes(brand)
                        ? 'bg-blue-900 border-blue-900'
                        : 'bg-gray-100 border-gray-300'
                    }`}
                    onPress={() => toggleMarque(brand)}
                  >
                    <Text
                      style={tw`text-sm ${
                        formData.marquesSpecialises.includes(brand)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {formData.marquesSpecialises.length > 0 && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-sm font-medium text-blue-900 mb-2`}>
                  {t.selectedBrands || "Marques sélectionnées:"}
                </Text>
                <Text style={tw`text-sm text-gray-600`}>
                  {formData.marquesSpecialises.join(", ")}
                </Text>
              </View>
            )}
            <TextInput
              style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
              placeholder={t.passwordPlaceholder || "Mot de passe"}
              secureTextEntry
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={tw`w-full h-12 bg-gray-100 rounded-lg px-4 mb-4 text-blue-900`}
              placeholder={t.confirmPasswordPlaceholder || "Confirmer le mot de passe"}
              secureTextEntry
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView contentContainerStyle={tw`flex-grow bg-white p-5 items-center justify-center min-h-full`}>
      <View style={tw`w-full items-end mb-4`}>
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
          {t.signupTitle || "Inscription"}
        </Text>
        <Text style={tw`text-base text-gray-600 mb-5 text-center`}>
          {t.signupSubtitle || "Créez votre compte"}
        </Text>
        <StepIndicator
          customStyles={stepIndicatorStyles}
          currentPosition={currentStep}
          labels={steps.map((step) => step.label)}
          stepCount={steps.length}
        />
        <View style={tw`w-full mt-5 items-center`}>
          {renderStepContent()}
          <View style={tw`flex-row justify-center w-full mb-5 gap-2`}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={tw`flex-1 h-12 bg-gray-600 rounded-lg justify-center items-center min-w-[120px]`}
                onPress={() => setCurrentStep(currentStep - 1)}
              >
                <Text style={tw`text-lg font-semibold text-white`}>
                  {t.previous || "Précédent"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={tw`flex-1 h-12 bg-blue-900 rounded-lg justify-center items-center min-w-[120px]`}
              onPress={handleNext}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={tw`text-lg font-semibold text-white`}>
                  {currentStep === steps.length - 1 ? (t.signup || "S'inscrire") : (t.next || "Suivant")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={tw`text-sm text-gray-600 underline text-center`}>
              {t.alreadyHaveAccount || "Déjà un compte ? Connectez-vous"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default SignUp;