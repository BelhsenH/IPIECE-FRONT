import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { authService } from '../../scripts/auth-script';

const Verify: React.FC = () => {
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const { language, toggleLanguage, translations } = useLanguage();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      Alert.alert(
        translations[language].error,
        translations[language].enterCode || 'Please enter the verification code'
      );
      return;
    }

    if (!phoneNumber) {
      Alert.alert(
        translations[language].error,
        translations[language].phoneNumberMissing || 'Phone number is missing'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyPhone({
        phoneNumber: phoneNumber,
        code: verificationCode
      });

      if (response.success) {
        Alert.alert(
          translations[language].success || 'Success',
          translations[language].verificationSuccess || 'Phone number verified successfully!',
          [
            {
              text: translations[language].ok || 'OK',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        );
      } else {
        Alert.alert(
          translations[language].error,
          response.error || translations[language].verificationFailed || 'Verification failed'
        );
      }
    } catch (error) {
      Alert.alert(
        translations[language].error,
        translations[language].unexpectedError || 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    if (!phoneNumber) {
      Alert.alert(
        translations[language].error,
        translations[language].phoneNumberMissing || 'Phone number is missing'
      );
      return;
    }

    setIsResending(true);
    try {
      const response = await authService.resendVerificationCode(phoneNumber);

      if (response.success) {
        setCountdown(60);
        Alert.alert(
          translations[language].success || 'Success',
          translations[language].codeResent || 'Verification code sent successfully'
        );
      } else {
        Alert.alert(
          translations[language].error,
          response.error || translations[language].failedToResendCode || 'Failed to resend code'
        );
      }
    } catch (error) {
      Alert.alert(
        translations[language].error,
        translations[language].unexpectedError || 'An unexpected error occurred'
      );
    } finally {
      setIsResending(false);
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
              {language === 'fr' ? 'ar' : 'Français'}
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
            {translations[language].verifyPhone || 'Verify Phone Number'}
          </Text>
          <Text style={styles.subtitle}>
            {translations[language].verifySubtitle || `We sent a verification code to ${phoneNumber}`}
          </Text>

          {/* Verification Code Input */}
          <TextInput
            style={styles.input}
            placeholder={translations[language].verificationCodePlaceholder || 'Enter verification code'}
            keyboardType="numeric"
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholderTextColor="#9CA3AF"
            maxLength={6}
          />

          {/* Verify Button */}
          <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {translations[language].verify || 'Verify'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              {translations[language].didntReceiveCode || "Didn't receive the code?"}
            </Text>
            <TouchableOpacity 
              style={[styles.resendButton, countdown > 0 && styles.resendButtonDisabled]} 
              onPress={handleResendCode} 
              disabled={countdown > 0 || isResending}
            >
              {isResending ? (
                <ActivityIndicator size="small" color="#1E3A8A" />
              ) : (
                <Text style={[styles.resendButtonText, countdown > 0 && styles.resendButtonTextDisabled]}>
                  {countdown > 0 
                    ? `${translations[language].resendIn || 'Resend in'} ${countdown}s`
                    : translations[language].resendCode || 'Resend Code'
                  }
                </Text>
              )}
            </TouchableOpacity>
          </View>

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
    lineHeight: 22,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 18,
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    letterSpacing: 4,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  resendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E0E7FF',
  },
  resendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  resendButtonText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: '#9CA3AF',
  },
  linkTextSecondary: {
    fontSize: 14,
    color: '#64748B',
    textDecorationLine: 'underline',
    marginBottom: 2,
    marginTop: 8,
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

export default Verify;