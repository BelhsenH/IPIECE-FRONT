import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { authService } from '../../scripts/auth-script';

const ResetPassword: React.FC = () => {
  const router = useRouter();
  const { phoneNumber, code } = useLocalSearchParams<{ phoneNumber: string; code: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({ newPassword: '', confirmPassword: '' });

  const { language, toggleLanguage, translations } = useLanguage();

  const validateField = (field: 'newPassword' | 'confirmPassword', value: string) => {
    const newErrors = { ...errors };
    
    if (field === 'newPassword') {
      if (!value.trim()) {
        newErrors.newPassword = translations[language].enterNewPassword || 'Please enter a new password';
      } else if (value.length < 6) {
        newErrors.newPassword = translations[language].passwordMinLength || 'Password must be at least 6 characters';
      } else {
        newErrors.newPassword = '';
      }
    }
    
    if (field === 'confirmPassword') {
      if (!value.trim()) {
        newErrors.confirmPassword = translations[language].confirmNewPassword || 'Please confirm your new password';
      } else if (value !== newPassword) {
        newErrors.confirmPassword = translations[language].passwordMismatch || 'Passwords do not match';
      } else {
        newErrors.confirmPassword = '';
      }
    }
    
    setErrors(newErrors);
    return !newErrors[field];
  };

  const validateResetPassword = () => {
    const newPasswordValid = validateField('newPassword', newPassword);
    const confirmPasswordValid = validateField('confirmPassword', confirmPassword);
    return newPasswordValid && confirmPasswordValid;
  };

  const handleResetPassword = async () => {
    if (!validateResetPassword()) return;

    if (!phoneNumber || !code) {
      Alert.alert(
        translations[language].error,
        translations[language].missingPhoneOrCode || 'Missing phone number or verification code'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.resetPassword({
        phoneNumber: phoneNumber,
        code: code,
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
        Alert.alert(
          translations[language].error,
          errorMessage
        );
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
          <Text style={styles.title}>
            {translations[language].resetPassword || 'Reset Password'}
          </Text>
          <Text style={styles.subtitle}>
            {translations[language].enterNewPassword || 'Enter your new password'}
          </Text>

          {/* New Password Input with show/hide */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 0 }, errors.newPassword && styles.inputError]}
              placeholder={translations[language].newPasswordPlaceholder || 'New Password'}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (text && text.length >= 6) validateField('newPassword', text);
              }}
              onBlur={() => validateField('newPassword', newPassword)}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={styles.showHideButton}
              onPress={() => setShowNewPassword((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#1E3A8A', fontWeight: '600' }}>
                {showNewPassword
                  ? translations[language].hide
                  : translations[language].show}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.newPassword ? (
            <Text style={styles.errorText}>{errors.newPassword}</Text>
          ) : null}

          {/* Confirm Password Input with show/hide */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 0 }, errors.confirmPassword && styles.inputError]}
              placeholder={translations[language].confirmPasswordPlaceholder || 'Confirm New Password'}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (text && text === newPassword) validateField('confirmPassword', text);
              }}
              onBlur={() => validateField('confirmPassword', confirmPassword)}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={styles.showHideButton}
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#1E3A8A', fontWeight: '600' }}>
                {showConfirmPassword
                  ? translations[language].hide
                  : translations[language].show}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}

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

export default ResetPassword;
