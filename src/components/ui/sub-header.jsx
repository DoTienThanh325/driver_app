import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';

export function SubHeader({ title, rightElement = null, onBack = null }) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftGroup}>
          <Pressable style={styles.backButton} onPress={handleBack} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>

        {rightElement && <View style={styles.rightGroup}>{rightElement}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#00B5B8',
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 14,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#33C4C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rightGroup: {
    alignItems: 'flex-end',
  },
});
