import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export default function Tabs({ items, activeTab, onTabChange }: TabsProps) {
  return (
    <View className="flex-row border-b border-gray-100 px-5">
      {items.map((item) => (
        <TouchableOpacity 
          key={item.id}
          onPress={() => onTabChange(item.id)}
          className={`pb-3 mr-8 ${activeTab === item.id ? 'border-b-2 border-[#4c669f]' : ''}`}
        >
          <Text className={`font-bold ${activeTab === item.id ? 'text-[#4c669f]' : 'text-gray-400'}`}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}