import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import Tabs from '../../components/ui/Tabs';
import { Ionicons } from '@expo/vector-icons';
import SocialFeed from '../../components/social/SocialFeed';
import SocialDiscussions from '../../components/social/SocialDiscussions';

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState('feed');

  const tabItems = [
    { id: 'feed', label: 'Fil d\'actu' },
    { id: 'discussions', label: 'Discussions' },
  ];

  return (
    <View className="flex-1 bg-white dark:bg-black pt-16">
      <Tabs 
        items={tabItems} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      <View className="flex-1 bg-gray-50 dark:bg-black">
        {activeTab === 'feed' ? (
          <SocialFeed />
        ) : (
          <SocialDiscussions />
        )}
      </View>

      {/* Floating Action Button (FAB) pour Discussions */}
      {activeTab === 'discussions' && (
        <TouchableOpacity 
          className="absolute bottom-6 right-6 bg-[#4c669f] w-14 h-14 rounded-full justify-center items-center shadow-lg"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}