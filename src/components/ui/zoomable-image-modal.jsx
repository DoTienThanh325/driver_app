import React, { useEffect } from 'react';
import { Modal, StyleSheet, View, Pressable, Dimensions, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ZoomableImageModal({ visible, imageUrl, title, onClose, useModal = true }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translationX = useSharedValue(0);
  const savedTranslationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const savedTranslationY = useSharedValue(0);

  const resetTransform = () => {
    'worklet';
    scale.value = withSpring(1);
    savedScale.value = 1;
    translationX.value = withSpring(0);
    savedTranslationX.value = 0;
    translationY.value = withSpring(0);
    savedTranslationY.value = 0;
  };

  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translationX.value = 0;
      savedTranslationX.value = 0;
      translationY.value = 0;
      savedTranslationY.value = 0;
    }
  }, [visible]);

  const handleClose = () => {
    resetTransform();
    if (onClose) {
      onClose();
    }
  };

  // Cử chỉ Zoom chụm/mở 2 ngón tay
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.8, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translationX.value = withSpring(0);
        savedTranslationX.value = 0;
        translationY.value = withSpring(0);
        savedTranslationY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Cử chỉ Pan kéo lướt khi đang zoom
  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        translationX.value = savedTranslationX.value + e.translationX;
        translationY.value = savedTranslationY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslationX.value = translationX.value;
      savedTranslationY.value = translationY.value;
    });

  // Cử chỉ Nhấp đúp (Double Tap) để phóng to nhanh hoặc hoàn nguyên
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.2) {
        resetTransform();
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
  }));

  if (!visible || !imageUrl) return null;

  const content = (
    <View style={useModal ? styles.overlay : styles.overlayAbsolute}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>
            {title || 'Chi tiết ảnh'}
          </ThemedText>
        </View>
        <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Khung tương tác ảnh */}
      <GestureDetector gesture={composedGestures}>
        <View style={styles.imageContainer}>
          <Animated.View style={[styles.animatedWrap, animatedImageStyle]}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Footer Hint */}
      <View style={styles.footerBar}>
        <ThemedText style={styles.footerHint}>
          Chụm 2 ngón tay hoặc chạm 2 lần để phóng to
        </ThemedText>
      </View>
    </View>
  );

  if (!useModal) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'space-between',
  },
  overlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    zIndex: 99999,
    elevation: 99999,
  },
  headerBar: {
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  animatedWrap: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  footerBar: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerHint: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
});
