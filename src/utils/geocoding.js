import * as Location from 'expo-location';
import { toVietnameseAddress } from './vietnamese-address';

/**
 * Định dạng chuỗi địa chỉ chi tiết theo chuẩn Việt Nam từ dữ liệu Photon
 */
function formatPhotonAddress(props) {
  if (!props) return null;
  const parts = [];

  // 1. Tên địa danh / Cơ sở (vd: Học viện Công nghệ Bưu chính Viễn thông)
  if (props.name) {
    parts.push(props.name.trim());
  }

  // 2. Số nhà / Km
  if (props.housenumber) {
    const num = props.housenumber.trim();
    if (
      num.toLowerCase().startsWith('km') ||
      num.toLowerCase().startsWith('số') ||
      num.toLowerCase().startsWith('ngõ') ||
      num.toLowerCase().startsWith('ngách')
    ) {
      parts.push(num);
    } else {
      parts.push(`Số ${num}`);
    }
  }

  // 3. Tên đường / phố
  if (props.street) {
    const st = props.street.trim();
    if (st.toLowerCase().startsWith('đường') || st.toLowerCase().startsWith('phố')) {
      parts.push(st);
    } else {
      parts.push(`Đường ${st}`);
    }
  }

  // 4. Phường / Xã
  const ward = props.locality || props.suburb;
  if (ward) {
    const w = ward.trim();
    if (
      w.toLowerCase().startsWith('phường') ||
      w.toLowerCase().startsWith('xã') ||
      w.toLowerCase().startsWith('thị trấn')
    ) {
      parts.push(w);
    } else {
      parts.push(`Phường ${w}`);
    }
  }

  // 5. Quận / Huyện / Thị xã
  if (props.district) {
    const d = props.district.trim();
    if (
      d.toLowerCase().startsWith('quận') ||
      d.toLowerCase().startsWith('huyện') ||
      d.toLowerCase().startsWith('thị xã')
    ) {
      parts.push(d);
    } else {
      parts.push(`Quận ${d}`);
    }
  }

  // 6. Thành phố
  parts.push(props.city || 'Hà Nội');

  const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
  return uniqueParts.length > 0 ? toVietnameseAddress(uniqueParts.join(', ')) : null;
}

/**
 * Định dạng chuỗi địa chỉ từ kết quả expo-location native
 */
function formatNativeAddress(item) {
  if (!item) return null;
  const parts = [];

  if (item.name && item.name !== item.street && item.name !== item.city) {
    parts.push(item.name.trim());
  }
  if (item.street) {
    const st = item.street.trim();
    if (st.toLowerCase().startsWith('đường') || st.toLowerCase().startsWith('phố')) {
      parts.push(st);
    } else {
      parts.push(`Đường ${st}`);
    }
  }
  if (item.subregion) {
    const sub = item.subregion.trim();
    if (sub.toLowerCase().startsWith('phường') || sub.toLowerCase().startsWith('xã')) {
      parts.push(sub);
    } else {
      parts.push(`Phường ${sub}`);
    }
  }
  if (item.district) {
    const dist = item.district.trim();
    if (
      dist.toLowerCase().startsWith('quận') ||
      dist.toLowerCase().startsWith('huyện') ||
      dist.toLowerCase().startsWith('thị xã')
    ) {
      parts.push(dist);
    } else {
      parts.push(`Quận ${dist}`);
    }
  }
  parts.push(item.city || 'Hà Nội');

  const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
  return uniqueParts.length > 0 ? toVietnameseAddress(uniqueParts.join(', ')) : null;
}

/**
 * Tìm kiếm tọa độ và địa chỉ chi tiết đầy đủ (Tên cơ sở, đường, phường, quận, Hà Nội) bằng tiếng Việt chuẩn
 * @param {string} address - Chuỗi tìm kiếm (vd: "học viện công nghệ bưu chính viễn thông")
 * @returns {Promise<{latitude: number, longitude: number, formattedAddress: string}|null>}
 */
export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null;

  const query = address.trim();
  const hanoiQuery = query.toLowerCase().includes('hà nội') ? query : `${query} Hà Nội`;

  // 1. Sử dụng Photon Geocoder: Hỗ trợ tìm POI / Tên trường / Tòa nhà tại Hà Nội cực kỳ chính xác và trả về đầy đủ đường, quận, huyện
  try {
    const encoded = encodeURIComponent(hanoiQuery);
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encoded}&lat=21.028511&lon=105.854444&limit=1`
    );
    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      const coords = feature.geometry.coordinates; // [lon, lat]
      const formatted = formatPhotonAddress(feature.properties);

      return {
        latitude: coords[1],
        longitude: coords[0],
        formattedAddress: toVietnameseAddress(formatted || query),
      };
    }
  } catch (err) {
    console.warn('Photon geocoding lỗi, chuyển sang native geocoding:', err);
  }

  // 2. Fallback sử dụng Native Geocoder của expo-location
  try {
    const results = await Location.geocodeAsync(`${query}, Hà Nội, Việt Nam`);
    if (results && results.length > 0) {
      const lat = results[0].latitude;
      const lng = results[0].longitude;

      // Reverse geocode ngược lại để lấy tên đường, quận huyện chuẩn
      const detailedAddress = await reverseGeocodeCoords(lat, lng);

      return {
        latitude: lat,
        longitude: lng,
        formattedAddress: toVietnameseAddress(detailedAddress || query),
      };
    }
  } catch (err) {
    console.warn('Native geocoding lỗi:', err);
  }

  return null;
}

/**
 * Lấy tên địa chỉ đầy đủ (Tên cơ sở, số nhà, đường, phường, quận, Hà Nội) từ tọa độ GPS bằng tiếng Việt chuẩn
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string|null>}
 */
export async function reverseGeocodeCoords(latitude, longitude) {
  if (!latitude || !longitude) return null;

  // 1. Thử Photon Reverse Geocode để lấy cấu trúc đường, phường, quận chuẩn
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`);
    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const formatted = formatPhotonAddress(data.features[0].properties);
      if (formatted) return toVietnameseAddress(formatted);
    }
  } catch (err) {
    console.warn('Photon reverse geocoding lỗi, dùng native fallback:', err);
  }

  // 2. Fallback dùng Native Reverse Geocoder của expo-location
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const formatted = formatNativeAddress(results[0]);
      if (formatted) return toVietnameseAddress(formatted);
    }
  } catch (err) {
    console.warn('Native reverse geocoding lỗi:', err);
  }

  return null;
}
