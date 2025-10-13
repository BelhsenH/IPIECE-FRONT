import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext'; // Import LanguageContext
import { authService } from '../../scripts/auth-script';

const Login: React.FC = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+216'); // Default to Tunisia
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ phone: '', password: '' });

  const { language, toggleLanguage, translations } = useLanguage();

  const validateField = (field: 'phone' | 'password', value: string) => {
    const newErrors = { ...errors };
    
    if (field === 'phone') {
      if (!value.trim()) {
        newErrors.phone = translations[language].enterPhone || 'Please enter your phone number';
      } else if (value.length < 8) {
        newErrors.phone = translations[language].validPhoneNumber || 'Please enter a valid phone number';
      } else {
        newErrors.phone = '';
      }
    }
    
    if (field === 'password') {
      if (!value.trim()) {
        newErrors.password = translations[language].enterPassword || 'Please enter your password';
      } else if (value.length < 6) {
        newErrors.password = translations[language].passwordMinLength || 'Password must be at least 6 characters';
      } else {
        newErrors.password = '';
      }
    }
    
    setErrors(newErrors);
    return !newErrors[field];
  };

  const validateLogin = () => {
    const phoneValid = validateField('phone', phoneNumber);
    const passwordValid = validateField('password', password);
    return phoneValid && passwordValid;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;

    setIsLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const response = await authService.login({
        phoneNumber: fullPhoneNumber,
        password
      });

      if (response.success) {
        router.replace('/(home)/dashboard');
      } else {
        const errorMessage = response.error || 'Login failed';
        
        if (errorMessage.toLowerCase().includes('not verified')) {
          Alert.alert(
            translations[language].error,
            translations[language].accountNotVerified || 'Your account is not verified. Please verify your phone number.',
            [
              { text: translations[language].cancel || 'Cancel', style: 'cancel' },
              { 
                text: translations[language].verify || 'Verify', 
                onPress: () => router.push({
                  pathname: '/(auth)/verify',
                  params: { phoneNumber: fullPhoneNumber }
                })
              }
            ]
          );
        } else if (errorMessage.toLowerCase().includes('invalid credentials') || errorMessage.toLowerCase().includes('invalid')) {
          Alert.alert(
            translations[language].error,
            translations[language].invalidCredentials || 'Invalid phone number or password. Please check your credentials and try again.',
            [
              { text: translations[language].ok || 'OK', style: 'default' },
              { 
                text: translations[language].forgotPassword || 'Forgot Password?', 
                onPress: () => router.push('/(auth)/forgotpassword')
              }
            ]
          );
        } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('user not found')) {
          Alert.alert(
            translations[language].error,
            translations[language].accountNotFound || 'No account found with this phone number. Please check your number or create a new account.',
            [
              { text: translations[language].ok || 'OK', style: 'default' },
              { 
                text: translations[language].signup || 'Sign Up', 
                onPress: () => router.push('/(auth)/signup')
              }
            ]
          );
        } else {
          Alert.alert(
            translations[language].error,
            errorMessage
          );
        }
      }
    } catch (error) {
      Alert.alert(
        translations[language].error,
        translations[language].networkError || 'Network error. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F1F5F9' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.centeredContainer}>
          {/* Language Toggle */}
          <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
            <Text style={styles.langToggleText}>
              {language === 'fr' ? 'العربية' : 'Français'}
            </Text>
          </TouchableOpacity>
          {/* Logo with shadow */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          {/* Title */}
          <Text style={styles.title}>{translations[language].login}</Text>
          <Text style={styles.subtitle}>{translations[language].accessAccount}</Text>

          {/* Phone Number Input with Country Code */}
          <View style={styles.inputContainer}>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={countryCode}
                onValueChange={(itemValue) => setCountryCode(itemValue)}
                style={styles.picker}
                dropdownIconColor="#1E3A8A"
              >
                <Picker.Item label="+216 (Tunisie)" value="+216" />
                <Picker.Item label="+213 (Algérie)" value="+213" />
              </Picker>
            </View>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder={translations[language].phonePlaceholder}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (text && text.length >= 8) validateField('phone', text);
              }}
              onBlur={() => validateField('phone', phoneNumber)}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          {errors.phone ? (
            <Text style={styles.errorText}>{errors.phone}</Text>
          ) : null}

          {/* Password Input with show/hide */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 0 }, errors.password && styles.inputError]}
              placeholder={translations[language].passwordPlaceholder}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (text && text.length >= 6) validateField('password', text);
              }}
              onBlur={() => validateField('password', password)}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={styles.showHideButton}
              onPress={() => setShowPassword((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#1E3A8A', fontWeight: '600' }}>
                {showPassword
                  ? translations[language].hide
                  : translations[language].show}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{translations[language].login}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{translations[language].or}</Text>
            <View style={styles.divider} />
          </View>

          {/* Sign Up and Forgot Password Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.linkTextPrimary}>
                {translations[language].noAccount}{' '}
                <Text style={styles.linkTextAccent}>{translations[language].signup}</Text>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/forgotpassword')}>
              <Text style={styles.linkTextSecondary}>{translations[language].forgotPassword}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Add new translations to your LanguageContext
// Example (add these keys to both 'fr' and 'ar'):
// error, enterPhoneAndPassword, accessAccount, phonePlaceholder, passwordPlaceholder, show, hide, or, noAccount, signup, forgotPassword

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center', // Center horizontally
    backgroundColor: '#F1F5F9',
    paddingVertical: 20,
  },
  centeredContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flex: 1,
    padding: 24,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    // Optional: add shadow for card effect
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F1F5F9',
  },
  logoContainer: {
    backgroundColor: '#fff',
    borderRadius: 100,
    padding: 18,
    marginBottom: 18,
    elevation: 6,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  logo: {
    width: 110,
    height: 110,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#64748B',
    marginBottom: 28,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  pickerWrapper: {
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    marginRight: 6,
  },
  picker: {
    width: 110,
    height: 48,
    color: '#1E3A8A',
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1E3A8A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    paddingHorizontal: 8,
  },
  showHideButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  linksContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  linkTextPrimary: {
    fontSize: 15,
    color: '#1E3A8A',
    marginBottom: 8,
    fontWeight: '500',
  },
  linkTextAccent: {
    color: '#2563EB',
    fontWeight: '700',
  },
  linkTextSecondary: {
    fontSize: 14,
    color: '#64748B',
    textDecorationLine: 'underline',
    marginBottom: 2,
  },
  langToggle: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
  },
  langToggleText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 15,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});

export default Login;