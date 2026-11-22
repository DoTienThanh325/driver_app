import { SHIPPING_TYPE, TRIP_STATUS } from '@/services/trip.service';

const actions = {
  [TRIP_STATUS.DRIVER_ASSIGNED]: {
    nextStatus: TRIP_STATUS.DRIVER_ARRIVING,
    label: 'Đã đến điểm đón',
    foodLabel: 'Đã đến quán',
  },
  [TRIP_STATUS.DRIVER_ARRIVING]: {
    nextStatus: TRIP_STATUS.IN_PROGRESS,
    label: 'Bắt đầu chuyến đi',
    foodLabel: 'Bắt đầu giao món',
  },
  [TRIP_STATUS.IN_PROGRESS]: {
    nextStatus: TRIP_STATUS.COMPLETED,
    label: 'Hoàn thành chuyến đi',
    foodLabel: 'Hoàn thành giao món',
  },
};

export function getDriverTripAction(trip) {
  const action = actions[trip?.status];
  if (!action) return null;

  return {
    nextStatus: action.nextStatus,
    label: trip.shippingType === SHIPPING_TYPE.FOOD_DELIVERY ? action.foodLabel : action.label,
  };
}
