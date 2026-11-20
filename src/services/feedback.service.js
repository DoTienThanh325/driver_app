import { apiClient } from './api-client';

export const feedbackService = {
  /**
   * Khách hàng gửi đánh giá tài xế cho chuyến đi
   * POST /api/feedbacks/driver
   */
  submitDriverFeedback: async ({ tripId, driverId, rating, comment = '', tags = [] }) => {
    const formattedTags = Array.isArray(tags) ? tags.join(', ') : (tags || '');
    return await apiClient.post('/api/feedbacks/driver', {
      tripId,
      driverId,
      rating: Number(rating),
      comment: comment.trim(),
      tags: formattedTags,
    });
  },

  /**
   * Khách hàng gửi đánh giá nhà hàng cho đơn hàng
   * POST /api/feedbacks/restaurant
   */
  submitRestaurantFeedback: async ({ orderId, restaurantId, rating, comment = '', tags = [] }) => {
    const formattedTags = Array.isArray(tags) ? tags.join(', ') : (tags || '');
    return await apiClient.post('/api/feedbacks/restaurant', {
      orderId,
      restaurantId,
      rating: Number(rating),
      comment: comment.trim(),
      tags: formattedTags,
    });
  },

  /**
   * Khách hàng gửi đánh giá món ăn cho đơn hàng
   * POST /api/feedbacks/food
   */
  submitFoodFeedback: async ({ orderId, foodId, rating, comment = '', tags = [] }) => {
    const formattedTags = Array.isArray(tags) ? tags.join(', ') : (tags || '');
    return await apiClient.post('/api/feedbacks/food', {
      orderId,
      foodId,
      rating: Number(rating),
      comment: comment.trim(),
      tags: formattedTags,
    });
  },

  /**
   * Kiểm tra chuyến đi đã được đánh giá chưa
   * GET /api/feedbacks/trip/{tripId}/status
   */
  getTripFeedbackStatus: async (tripId) => {
    if (!tripId) return { isRated: false };
    try {
      const res = await apiClient.get(`/api/feedbacks/trip/${tripId}/status`);
      return {
        ...res,
        isRated: !!(res?.isRated ?? res?.isReviewed),
      };
    } catch {
      return { isRated: false };
    }
  },
};
