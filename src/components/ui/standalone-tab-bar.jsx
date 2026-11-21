import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';

export function StandaloneTabBar({ activeTab = 'home' }) {
  return (
    <View style={styles.tabBarStyle}>
      {/* 1. Trang chủ */}
      <Pressable
        style={styles.tabItem}
        onPress={() => router.replace('/(tabs)')}
      >
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={24}
          color="#FFFFFF"
        />
        <ThemedText style={styles.tabLabel}>Trang chủ</ThemedText>
      </Pressable>

      {/* 2. Hoạt động */}
      <Pressable
        style={styles.tabItem}
        onPress={() => router.replace('/(tabs)/activity')}
      >
        <Ionicons
          name={activeTab === 'activity' ? 'time' : 'time-outline'}
          size={24}
          color="rgba(255, 255, 255, 0.7)"
        />
        <ThemedText style={[styles.tabLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
          Hoạt động
        </ThemedText>
      </Pressable>

      {/* 3. Ưu đãi */}
      <Pressable
        style={styles.tabItem}
        onPress={() => router.replace('/(tabs)/promotions')}
      >
        <Ionicons
          name={activeTab === 'promotions' ? 'pricetag' : 'pricetag-outline'}
          size={24}
          color="rgba(255, 255, 255, 0.7)"
        />
        <ThemedText style={[styles.tabLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
          Ưu đãi
        </ThemedText>
      </Pressable>

      {/* 4. Tài khoản */}
      <Pressable
        style={styles.tabItem}
        onPress={() => router.replace('/(tabs)/account')}
      >
        <Ionicons
          name={activeTab === 'account' ? 'person' : 'person-outline'}
          size={24}
          color="rgba(255, 255, 255, 0.7)"
        />
        <ThemedText style={[styles.tabLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
          Tài khoản
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarStyle: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    backgroundColor: '#00B5B8',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
});
