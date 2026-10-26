import React, { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { userStorage } from '@/services/storage/user.storage';

export default function TabLayout() {
  const [isDriver, setIsDriver] = useState(false);

  const checkDriverRole = useCallback(async () => {
    const hasRole = await userStorage.isDriver();
    setIsDriver(hasRole);
  }, []);

  useEffect(() => {
    checkDriverRole();
  }, [checkDriverRole]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.7)',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          backgroundColor: '#00B5B8',
          borderTopColor: 'transparent',
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. Tab Trang chủ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />

      {/* 2. Tab Hoạt động */}
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Hoạt động',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />

      {/* 3. Tab Tài xế (Chỉ hiển thị khi có quyền DRIVER) */}
      <Tabs.Screen
        name="driver"
        options={{
          href: isDriver ? '/driver' : null,
          title: 'Tài xế',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'car-sport' : 'car-sport-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />

      {/* 4. Tab Ưu đãi */}
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Ưu đãi',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'pricetag' : 'pricetag-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />

      {/* 5. Tab Tài khoản */}
      <Tabs.Screen
        name="account"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
