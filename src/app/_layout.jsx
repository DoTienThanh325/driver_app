import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { offlineSyncService } from '@/services/offline-sync.service';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
      // Tự động kiểm tra và xử lý hàng đợi đồng bộ khi khởi động ứng dụng
      offlineSyncService.processSyncQueue().catch((e) => {
        console.warn('Lỗi khi tự động chạy sync queue lúc khởi động:', e);
      });
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Đăng nhập', headerShown: false }} />
          <Stack.Screen name="register" options={{ title: 'Đăng ký', headerShown: false }} />
          <Stack.Screen name="driver-register" options={{ title: 'Đăng ký Tài xế', headerShown: false }} />
          <Stack.Screen name="driver-profile" options={{ title: 'Hồ sơ Tài xế', headerShown: false }} />
          <Stack.Screen name="business-profile" options={{ title: 'Hồ sơ Nhà hàng', headerShown: false }} />
          <Stack.Screen name="edit-restaurant" options={{ title: 'Chỉnh sửa Nhà hàng', headerShown: false }} />
          <Stack.Screen name="bank-link" options={{ title: 'Liên kết ngân hàng', headerShown: false }} />
          <Stack.Screen name="food-search" options={{ title: 'Tìm kiếm món ăn', headerShown: false }} />
          <Stack.Screen name="food-detail" options={{ title: 'Chi tiết món ăn', headerShown: false }} />
          <Stack.Screen name="edit-food" options={{ title: 'Chỉnh sửa món ăn', headerShown: false }} />
          <Stack.Screen name="driver-trips" options={{ title: 'Lịch sử cuốc xe', headerShown: false }} />
          <Stack.Screen name="driver-trip-detail" options={{ title: 'Chi tiết cuốc xe', headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
