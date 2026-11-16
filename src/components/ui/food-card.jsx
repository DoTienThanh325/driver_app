import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { normalizeImageUrl, DEFAULT_FOOD_IMAGE } from '@/utils/image-url';

export function FoodCard({ food, onPress }) {
  const minPrice = food.minPrice ?? food.options?.[0]?.price ?? 0;
  const formattedPrice = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(minPrice);

  const rawImageUrl = food.thumbnailUrl || food.options?.[0]?.imageUrl;
  const [imageUri, setImageUri] = useState(
    normalizeImageUrl(rawImageUrl) || DEFAULT_FOOD_IMAGE
  );

  useEffect(() => {
    setImageUri(normalizeImageUrl(rawImageUrl) || DEFAULT_FOOD_IMAGE);
  }, [rawImageUrl]);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress && onPress(food.id)}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        onError={() => setImageUri(DEFAULT_FOOD_IMAGE)}
      />
      <View style={styles.infoContainer}>
        <Text style={styles.foodName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {food.restaurantName || 'Quán ăn đối tác'}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {food.averageRating != null ? Number(food.averageRating).toFixed(1) : '5.0'}
            </Text>
          </View>
          <View style={styles.timeBox}>
            <Ionicons name="time-outline" size={13} color="#6B7280" />
            <Text style={styles.timeText}>15p</Text>
          </View>
        </View>
        <Text style={styles.priceText}>{formattedPrice}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  infoContainer: {
    padding: 10,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00B5B8',
  },
});
