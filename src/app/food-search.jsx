import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FoodCard } from '@/components/ui/food-card';
import { foodService } from '@/services/food.service';
import { foodSearchStyles as styles } from '@/styles/screens/food-search.styles';

const DEFAULT_FOODS = [
  {
    id: 'food-demo-1',
    name: 'Cơm gà xối mỡ giòn rụm',
    restaurantName: 'Cơm Gà Hải Nam',
    minPrice: 45000,
    averageRating: 4.9,
    thumbnailUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500',
    options: [{ size: 'Đùi gà', price: 45000 }],
  },
  {
    id: 'food-demo-2',
    name: 'Cơm tấm sườn bì chả',
    restaurantName: 'Cơm Tấm Ba Ghiền',
    minPrice: 40000,
    averageRating: 5.0,
    thumbnailUrl: 'https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=500',
    options: [{ size: 'Dĩa thường', price: 40000 }],
  },
  {
    id: 'food-demo-3',
    name: 'Phở bò tái nạm Hà Nội',
    restaurantName: 'Phở Gia Truyền Bát Đàn',
    minPrice: 50000,
    averageRating: 4.8,
    thumbnailUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500',
    options: [{ size: 'Tô đầy đủ', price: 50000 }],
  },
  {
    id: 'food-demo-4',
    name: 'Bún chả Hà Nội truyền thống',
    restaurantName: 'Bún Chả Hương Liên',
    minPrice: 45000,
    averageRating: 4.9,
    thumbnailUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=500',
    options: [{ size: 'Suất đặc biệt', price: 45000 }],
  },
];

export default function FoodSearchScreen() {
  const [keyword, setKeyword] = useState('');
  const [foods, setFoods] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const fetchFoods = useCallback(async (query = '') => {
    setLoading(true);
    try {
      if (query.trim()) {
        const res = await foodService.searchFoods(query.trim());
        const items = res?.content || (Array.isArray(res) ? res : []);
        setFoods(items);
      } else {
        const res = await foodService.getAllFoods(0, 20);
        const items = res?.content || (Array.isArray(res) ? res : []);
        setFoods(items.length > 0 ? items : DEFAULT_FOODS);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách món ăn:', err.message);
      setFoods(DEFAULT_FOODS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  // Xử lý khi người dùng nhập từ khóa: Lấy gợi ý từ Elasticsearch & Debounce tìm kiếm
  const handleKeywordChange = (text) => {
    setKeyword(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length >= 2) {
      // 1. Gọi Elasticsearch Autocomplete Suggestion API
      foodService
        .getSuggestions(text.trim())
        .then((items) => {
          if (Array.isArray(items) && items.length > 0) {
            setSuggestions(items);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        })
        .catch(() => {
          setSuggestions([]);
          setShowSuggestions(false);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    // 2. Debounce tự động cập nhật danh sách kết quả bên dưới
    searchTimeoutRef.current = setTimeout(() => {
      fetchFoods(text);
    }, 450);
  };

  // Chọn một gợi ý từ danh sách Elasticsearch
  const handleSelectSuggestion = (item) => {
    setKeyword(item);
    setShowSuggestions(false);
    setSuggestions([]);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    fetchFoods(item);
  };

  const handleClear = () => {
    setKeyword('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    fetchFoods('');
  };

  const handleSubmitSearch = () => {
    setShowSuggestions(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    fetchFoods(keyword);
  };

  const handleFoodPress = (foodId) => {
    setShowSuggestions(false);
    router.push({
      pathname: '/food-detail',
      params: { id: foodId },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* 1. Header Wrapper chứa Thanh tìm kiếm & Floating Gợi ý */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm món ăn, quán ăn..."
              placeholderTextColor="#9CA3AF"
              value={keyword}
              onChangeText={handleKeywordChange}
              onSubmitEditing={handleSubmitSearch}
              onFocus={() => {
                if (suggestions.length > 0 && keyword.trim().length >= 2) {
                  setShowSuggestions(true);
                }
              }}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {keyword.length > 0 && (
              <TouchableOpacity onPress={handleClear} hitSlop={6}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Floating Elasticsearch Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.suggestionItem,
                  idx === suggestions.length - 1 && { borderBottomWidth: 0 },
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelectSuggestion(item)}
              >
                <View style={styles.suggestionLeft}>
                  <Ionicons name="search-outline" size={16} color="#00B5B8" />
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {item}
                  </Text>
                </View>
                <Ionicons name="arrow-up-back-outline" size={15} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 2. Tiêu đề danh sách */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {keyword.trim() ? `Kết quả cho "${keyword.trim()}"` : 'Gợi ý cho bạn'}
        </Text>
      </View>

      {/* 3. Lưới hiển thị 2 cột món ăn */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B5B8" />
        </View>
      ) : foods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="fast-food-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>
            {keyword.trim() ? 'Không tìm thấy món ăn phù hợp.' : 'Chưa có món ăn nào trong danh mục.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(item) => item.id || String(Math.random())}
          numColumns={2}
          style={{ flex: 1, backgroundColor: '#F8F9FA' }}
          contentContainerStyle={styles.listContent}
          onScrollBeginDrag={() => setShowSuggestions(false)}
          renderItem={({ item }) => (
            <FoodCard food={item} onPress={handleFoodPress} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
