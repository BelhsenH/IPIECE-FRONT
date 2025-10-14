import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { authService } from '../../scripts/auth-script';

const ForgotPassword: React.FC = () => {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+216'); // Default to Tunisia
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Phone input, 2: Code input, 3: New password
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { language, toggleLanguage, translations } = useLanguage();

  const validatePhone = () => {
    if (!phoneNumber.trim()) {
      Alert.alert(
        translations[language].error,
        translations[language].enterPhone || 'Please enter your phone number'
      );
      return false;
    }

    if (phoneNumber.length < 8) {
      Alert.alert(
        translations[language].error,
        translations[language].validPhoneNumber || 'Please enter a valid phone number'
      );
      return false;
    }

    return true;
  };

  const handleSendCode = async () => {
    if (!validatePhone()) return;

    setIsLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const response = await authService.forgotPassword({
        phoneNumber: fullPhoneNumber
      });

      if (response.success) {
        setStep(2);
        Alert.alert(
          translations[language].success || 'Success',
          translations[language].codeSuccess || 'Verification code sent to your phone'
        );
      } else {
        const errorMessage = response.error || 'Failed to send verification code';
        if (errorMessage.toLowerCase().includes('not found')) {
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
      console.error('Forgot password error:', error);
      Alert.alert(
        translations[language].error,
        translations[language].networkError || 'Network error. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateResetPassword = () => {
    if (!verificationCode.trim()) {
      Alert.alert(
        translations[language].error,
        translations[language].enterCode || 'Please enter the verification code'
      );
      return false;
    }

    if (verificationCode.length < 4) {
      Alert.alert(
        translations[language].error,
        translations[language].validCode || 'Please enter a valid verification code'
      );
      return false;
    }

    if (!newPassword.trim()) {
      Alert.alert(
        translations[language].error,
        translations[language].enterNewPassword || 'Please enter a new password'
      );
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        translations[language].error,
        translations[language].passwordMinLength || 'Password must be at least 6 characters'
      );
      return false;
    }

    if (!confirmPassword.trim()) {
      Alert.alert(
        translations[language].error,
        translations[language].confirmNewPassword || 'Please confirm your new password'
      );
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        translations[language].error,
        translations[language].passwordMismatch || 'Passwords do not match'
      );
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateResetPassword()) return;

    setIsLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const response = await authService.resetPassword({
        phoneNumber: fullPhoneNumber,
        code: verificationCode,
        newPassword: newPassword
      });

      if (response.success) {
        Alert.alert(
          translations[language].success || 'Success',
          translations[language].passwordResetSuccess || 'Password reset successfully',
          [
            {
              text: translations[language].ok || 'OK',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        );
      } else {
        const errorMessage = response.error || 'Failed to reset password';
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('expired')) {
          Alert.alert(
            translations[language].error,
            translations[language].invalidOrExpiredCode || 'The verification code is invalid or expired. Please try again.'
          );
        } else {
          Alert.alert(
            translations[language].error,
            errorMessage
          );
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert(
        translations[language].error,
        translations[language].networkError || 'Network error. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <>
          <Text style={styles.subtitle}>
            {translations[language].enterPhoneResetPassword || 'Enter your phone number to reset your password'}
          </Text>

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
              style={styles.input}
              placeholder={translations[language].phonePlaceholder}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Send Code Button */}
          <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {translations[language].sendCode || 'Send Verification Code'}
              </Text>
            )}
          </TouchableOpacity>
        </>
      );
    } else if (step === 2) {
      return (
        <>
          <Text style={styles.subtitle}>
            {translations[language].enterCodeAndNewPassword || 'Enter the verification code and your new password'}
          </Text>

          {/* Verification Code Input */}
          <TextInput
            style={[styles.input, { width: '100%', marginBottom: 16 }]}
            placeholder={translations[language].verificationCodePlaceholder || 'Verification Code'}
            keyboardType="numeric"
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholderTextColor="#9CA3AF"
          />

          {/* New Password Input */}
          <TextInput
            style={[styles.input, { width: '100%', marginBottom: 16 }]}
            placeholder={translations[language].newPasswordPlaceholder || 'New Password'}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholderTextColor="#9CA3AF"
          />

          {/* Confirm Password Input */}
          <TextInput
            style={[styles.input, { width: '100%', marginBottom: 18 }]}
            placeholder={translations[language].confirmPasswordPlaceholder || 'Confirm New Password'}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholderTextColor="#9CA3AF"
          />

          {/* Reset Password Button */}
          <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {translations[language].resetPassword || 'Reset Password'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#6B7280', marginTop: 10 }]} 
            onPress={() => setStep(1)}
          >
            <Text style={styles.buttonText}>
              {translations[language].back || 'Back'}
            </Text>
          </TouchableOpacity>
        </>
      );
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
              source={require('../../assets/images/ipiece.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {translations[language].forgotPassword || 'Forgot Password'}
          </Text>

          {renderStepContent()}

          {/* Back to Login */}
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.linkTextSecondary}>
              {translations[language].backToLogin || 'Back to Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
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
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1E3A8A',
    elevation: 2,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
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
  linkTextSecondary: {
    fontSize: 14,
    color: '#64748B',
    textDecorationLine: 'underline',
    marginBottom: 2,
    marginTop: 20,
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
});

export default ForgotPassword;
