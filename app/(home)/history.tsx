import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

const History: React.FC = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`flex-1 justify-center items-center p-4`}>
        <Text style={tw`text-xl font-bold text-gray-800 mb-2`}>History</Text>
        <Text style={tw`text-gray-600 text-center`}>
          History feature coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default History;