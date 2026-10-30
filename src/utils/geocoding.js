import * as Location from 'expo-location';
import {
  toVietnameseAddress,
  translatePOI,
  translateStreet,
} from './vietnamese-address';

/**
 * Helper gọi fetch có timeout để tránh bị treo khi mạng chậm
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = 4500) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
};

/**
 * Định dạng chuỗi địa chỉ chi tiết theo chuẩn Việt Nam từ kết quả OpenStreetMap Nominatim
 */
function formatNominatimAddress(item) {
  if (!item) return null;
  const addr = item.address || {};
  const names = item.namedetails || {};
  const parts = [];

  // 1. Tên POI / Cơ sở
  // Ưu tiên: name:vi từ namedetails -> amenity/building/shop... -> name -> item.name
  let poiName =
    names['name:vi'] ||
    addr.amenity ||
    addr.building ||
    addr.shop ||
    addr.tourism ||
    addr.office ||
    addr.leisure ||
    names['name'] ||
    item.name;

  if (poiName) {
    const translatedPoi = translatePOI(String(poiName).trim());
    if (
      translatedPoi !== addr.road &&
      translatedPoi !== addr.suburb &&
      translatedPoi !== addr.city
    ) {
      parts.push(translatedPoi);
    }
  }

  // 2. Số nhà
  const houseNum = addr.house_number || addr.housenumber;
  if (houseNum) {
    const num = String(houseNum).trim();
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

  // 3. Tên đường / phố (dịch sang tiếng Việt có dấu qua translateStreet)
  const road = addr.road || addr.pedestrian || addr.footway || addr.street;
  if (road) {
    parts.push(translateStreet(String(road).trim()));
  }

  // 4. Phường / Xã
  const ward = addr.suburb || addr.quarter || addr.neighbourhood || addr.village || addr.residential;
  if (ward) {
    const w = String(ward).trim();
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
  const district = addr.county || addr.district || addr.city_district;
  if (district) {
    const d = String(district).trim();
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
  parts.push(addr.state || addr.city || 'Hà Nội');

  const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
  return uniqueParts.length > 0 ? toVietnameseAddress(uniqueParts.join(', ')) : null;
}

/**
 * Định dạng chuỗi địa chỉ chi tiết theo chuẩn Việt Nam từ dữ liệu Photon (Komoot)
 */
function formatPhotonAddress(props) {
  if (!props) return null;
  const parts = [];

  // 1. Tên địa danh / Cơ sở (vd: Hanoi University of Science and Technology -> Đại học Bách khoa Hà Nội)
  if (props.name) {
    const translated = translatePOI(props.name.trim());
    if (translated !== props.street) {
      parts.push(translated);
    }
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

  // 3. Tên đường / phố (vd: Dai Co Viet -> Đường Đại Cồ Việt)
  if (props.street) {
    parts.push(translateStreet(props.street.trim()));
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
    parts.push(translatePOI(item.name.trim()));
  }
  if (item.street) {
    parts.push(translateStreet(item.street.trim()));
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
 * @param {string} address - Chuỗi tìm kiếm (vd: "học viện công nghệ bưu chính viễn thông", "đại học bách khoa hà nội")
 * @returns {Promise<{latitude: number, longitude: number, formattedAddress: string}|null>}
 */
export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null;

  const query = address.trim();
  const hanoiQuery = query.toLowerCase().includes('hà nội') ? query : `${query} Hà Nội`;

  // 1. Sử dụng Photon Geocoder: Hỗ trợ tìm POI / Tên trường / Tòa nhà tại Hà Nội cực nhanh
  try {
    const encoded = encodeURIComponent(hanoiQuery);
    const res = await fetchWithTimeout(
      `https://photon.komoot.io/api/?q=${encoded}&lat=21.028511&lon=105.854444&limit=1`,
      {},
      4000
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
    console.warn('Photon geocoding lỗi, chuyển sang Nominatim search:', err);
  }

  // 2. Fallback Nominatim Search với accept-language=vi
  try {
    const encoded = encodeURIComponent(hanoiQuery);
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&accept-language=vi&addressdetails=1&namedetails=1&limit=1`,
      {
        headers: {
          'User-Agent': 'TM-DriverApp/1.0 (contact: support@tm.vn)',
          'Accept-Language': 'vi,en;q=0.8',
        },
      },
      4000
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      const formatted = formatNominatimAddress(item);

      return {
        latitude: lat,
        longitude: lon,
        formattedAddress: toVietnameseAddress(formatted || query),
      };
    }
  } catch (err) {
    console.warn('Nominatim search lỗi, chuyển sang native geocoding:', err);
  }

  // 3. Fallback sử dụng Native Geocoder của expo-location
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

  // 1. Ưu tiên số 1: Nominatim Reverse Geocode với accept-language=vi & namedetails=1
  // Tự động phân giải tên tiếng Việt của mọi địa danh/trường học/bệnh viện/tuyến đường trong OpenStreetMap
  try {
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi&addressdetails=1&namedetails=1&zoom=18`,
      {
        headers: {
          'User-Agent': 'TM-DriverApp/1.0 (contact: support@tm.vn)',
          'Accept-Language': 'vi,en;q=0.8',
        },
      },
      4000
    );
    const data = await res.json();
    if (data && (data.address || data.display_name)) {
      const formatted = formatNominatimAddress(data);
      if (formatted) return toVietnameseAddress(formatted);
    }
  } catch (err) {
    console.warn('Nominatim reverse geocoding lỗi, chuyển sang fallback Photon:', err);
  }

  // 2. Fallback số 2: Photon Reverse Geocode (Komoot)
  try {
    const res = await fetchWithTimeout(
      `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`,
      {},
      4000
    );
    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const formatted = formatPhotonAddress(data.features[0].properties);
      if (formatted) return toVietnameseAddress(formatted);
    }
  } catch (err) {
    console.warn('Photon reverse geocoding lỗi, dùng native fallback:', err);
  }

  // 3. Fallback số 3: Native Reverse Geocoder của expo-location
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
