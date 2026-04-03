import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { SahayakService, KYCService } from '../../components/services/apiService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function KYCRegistrationScreen() {
  const { farmerId } = useLocalSearchParams();
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (showOTPInput) {
      startTimer();
    }
  }, [showOTPInput]);

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateAadhaar = (number) => /^\d{12}$/.test(number);

  const formatAadhaar = (text) => {
    const cleaned = String(text || '').replace(/\D/g, '').substring(0, 12);
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`;
  };

  const handleAadhaarChange = (text) => setAadhaarNumber(formatAadhaar(text));

  const sendAadhaarOTP = async () => {
    const cleanedAadhaar = aadhaarNumber.replace(/\s/g, '');

    if (!validateAadhaar(cleanedAadhaar)) {
      Alert.alert('Error', 'Please enter a valid 12-digit Aadhaar number');
      return;
    }

    try {
      setIsLoading(true);

      const response = await KYCService.sendAadhaarOTP(cleanedAadhaar);

      if (response.success) {
        setTransactionId(response.transactionId);
        setShowOTPInput(true);
        Alert.alert('OTP Sent', 'OTP has been sent to the Aadhaar-linked mobile number');
      } else {
        Alert.alert('Error', response.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send Aadhaar OTP error:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = () => {
    setTimer(30);
    setCanResend(false);
    setOtp('');
    sendAadhaarOTP();
  };

  const verifyAadhaarOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setIsLoading(true);

      const otpResponse = await KYCService.verifyAadhaarOTP(transactionId, otp);

      if (otpResponse.success) {
        const cleanedAadhaar = aadhaarNumber.replace(/\s/g, '');

        const kycResponse = await SahayakService.completeKYC(null, farmerId, cleanedAadhaar);

        if (kycResponse.success) {
          Alert.alert(
            'KYC Completed!',
            'The farmer\'s KYC verification has been completed successfully. They can now proceed to land registration.',
            [
              {
                text: 'OK',
                onPress: () => {
                  router.back();
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', kycResponse.message || 'Failed to complete KYC');
        }
      } else {
        Alert.alert('Error', otpResponse.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify Aadhaar OTP error:', error);
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteKYC = async () => {
    if (!showOTPInput) {
      await sendAadhaarOTP();
    } else {
      await verifyAadhaarOTP();
    }
  };

  return (
    <View className="flex-1 bg-blue-50">
      <StatusBar style="dark" />

      <View className="bg-white pt-12 pb-6 px-6 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <FontAwesome name="arrow-left" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <View className="flex-1 mt-5">
            <Text className="text-2xl font-bold text-blue-800">KYC Registration</Text>
            <Text className="text-blue-600 mt-1">Complete farmer's identity verification</Text>
          </View>
        </View>
      </View>

      <View className="flex-1 p-6">
        <View className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mr-4">
              <FontAwesome name="id-card" size={20} color="#ef4444" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-800">Aadhaar Verification</Text>
              <Text className="text-gray-600 text-sm">Farmer ID: {farmerId}</Text>
            </View>
          </View>
          
          <Text className="text-gray-700 text-sm leading-5">
            Help the farmer complete their KYC by entering their Aadhaar number below. 
            This will verify their identity and allow them to proceed with land registration.
          </Text>
        </View>

        <View className="space-y-2 mb-6">
          <Text className="text-blue-800 font-semibold text-lg">
            Aadhaar Number <Text className="text-red-500">*</Text>
          </Text>
          <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
            <FontAwesome name="id-card" size={20} color="#3b82f6" />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-800 tracking-wider"
              placeholder="XXXX XXXX XXXX"
              placeholderTextColor="#6B7280"
              value={aadhaarNumber}
              onChangeText={handleAadhaarChange}
              keyboardType="number-pad"
              maxLength={14}
              style={{ fontFamily: 'monospace' }}
              editable={!showOTPInput}
            />
          </View>
          <Text className="text-gray-500 text-xs ml-1">
            Enter the 12-digit Aadhaar number
          </Text>
        </View>

        {showOTPInput && (
          <View className="space-y-2 mb-6">
            <Text className="text-blue-800 font-semibold text-lg">
              Enter Aadhaar OTP <Text className="text-red-500">*</Text>
            </Text>
            <View className="bg-white rounded-lg border border-blue-200 flex-row items-center px-4 py-4">
              <FontAwesome name="key" size={20} color="#3b82f6" />
              <TextInput
                className="flex-1 ml-3 text-base text-gray-800 tracking-wider text-center"
                placeholder="000000"
                placeholderTextColor="#6B7280"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                style={{ fontFamily: 'monospace' }}
              />
            </View>
            <View className="flex-row justify-between items-center ml-1">
              <Text className="text-gray-500 text-xs">
                OTP sent to Aadhaar-linked mobile
              </Text>
              {canResend ? (
                <TouchableOpacity onPress={resendOTP}>
                  <Text className="text-blue-500 font-medium text-xs">Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-gray-400 text-xs">Resend in {timer}s</Text>
              )}
            </View>
            <Text className="text-blue-600 text-xs ml-1">
              💡 Test OTP: 654321
            </Text>
          </View>
        )}

        <TouchableOpacity className={`rounded-lg py-4 px-6 ${isLoading ? 'bg-red-300' : 'bg-red-500'} shadow-sm`} onPress={handleCompleteKYC} disabled={isLoading}>
          {isLoading ? (
            <View className="flex-row items-center justify-center">
              <LoadingSpinner size="small" color="#ffffff" />
              <Text className="text-white font-semibold text-lg ml-2">
                {showOTPInput ? 'Verifying OTP...' : 'Sending OTP...'}
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-lg text-center">
              {showOTPInput ? 'Verify OTP & Complete KYC' : 'Send Aadhaar OTP'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
