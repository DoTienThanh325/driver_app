/**
 * Bộ từ điển và công cụ chuẩn hóa / dịch địa chỉ Hà Nội sang tiếng Việt chuẩn 100% có dấu
 */

// Danh sách 30 Quận, Huyện, Thị xã của Thủ đô Hà Nội
export const HANOI_DISTRICTS = {
  'ba dinh': 'Quận Ba Đình',
  'hoan kiem': 'Quận Hoàn Kiếm',
  'hai ba trung': 'Quận Hai Bà Trưng',
  'dong da': 'Quận Đống Đa',
  'tay ho': 'Quận Tây Hồ',
  'cau giay': 'Quận Cầu Giấy',
  'thanh xuan': 'Quận Thanh Xuân',
  'hoang mai': 'Quận Hoàng Mai',
  'long bien': 'Quận Long Biên',
  'nam tu liem': 'Quận Nam Từ Liêm',
  'bac tu liem': 'Quận Bắc Từ Liêm',
  'ha dong': 'Quận Hà Đông',
  'son tay': 'Thị xã Sơn Tây',
  'ba vi': 'Huyện Ba Vì',
  'chuong my': 'Huyện Chương Mỹ',
  'dan phuong': 'Huyện Đan Phượng',
  'dong anh': 'Huyện Đông Anh',
  'gia lam': 'Huyện Gia Lâm',
  'hoai duc': 'Huyện Hoài Đức',
  'me linh': 'Huyện Mê Linh',
  'my duc': 'Huyện Mỹ Đức',
  'phu xuyen': 'Huyện Phú Xuyên',
  'phuc tho': 'Huyện Phúc Thọ',
  'quoc oai': 'Huyện Quốc Oai',
  'soc son': 'Huyện Sóc Sơn',
  'thach that': 'Huyện Thạch Thất',
  'thanh oai': 'Huyện Thanh Oai',
  'thanh tri': 'Huyện Thanh Trì',
  'thuong tin': 'Huyện Thường Tín',
  'ung hoa': 'Huyện Ứng Hòa',
};

// Từ điển các Phường / Xã phổ biến tại Hà Nội
export const HANOI_WARDS = {
  'mo lao': 'Phường Mộ Lao',
  'van quan': 'Phường Văn Quán',
  'phuc la': 'Phường Phúc La',
  'ha cau': 'Phường Hà Cầu',
  'quang trung': 'Phường Quang Trung',
  'yet kieu': 'Phường Yết Kiêu',
  'kien hung': 'Phường Kiến Hưng',
  'la khe': 'Phường La Khê',
  'duong noi': 'Phường Dương Nội',
  'yen nghia': 'Phường Yên Nghĩa',
  'phu la': 'Phường Phú La',
  'phu luong': 'Phường Phú Lương',
  'phu lam': 'Phường Phú Lãm',
  'dong mai': 'Phường Đồng Mai',
  'bien giang': 'Phường Biên Giang',
  'hang trong': 'Phường Hàng Trống',
  'trang tien': 'Phường Tràng Tiền',
  'hang bong': 'Phường Hàng Bông',
  'hang gai': 'Phường Hàng Gai',
  'hang dao': 'Phường Hàng Đào',
  'hang bac': 'Phường Hàng Bạc',
  'hang buom': 'Phường Hàng Buồm',
  'hang ma': 'Phường Hàng Mã',
  'dong xuan': 'Phường Đồng Xuân',
  'cua dong': 'Phường Cửa Đông',
  'cua nam': 'Phường Cửa Nam',
  'ly thai to': 'Phường Lý Thái Tổ',
  'phan chu trinh': 'Phường Phan Chu Trinh',
  'quan hoa': 'Phường Quan Hoa',
  'dich vong': 'Phường Dịch Vọng',
  'dich vong hau': 'Phường Dịch Vọng Hậu',
  'yen hoa': 'Phường Yên Hòa',
  'trung hoa': 'Phường Trung Hòa',
  'mai dich': 'Phường Mai Dịch',
  'nghia do': 'Phường Nghĩa Đô',
  'nghia tan': 'Phường Nghĩa Tân',
  'lang ha': 'Phường Láng Hạ',
  'lang thuong': 'Phường Láng Thượng',
  'o cho dua': 'Phường Ô Chợ Dừa',
  'cat linh': 'Phường Cát Linh',
  'van mieu': 'Phường Văn Miếu',
  'quoc tu giam': 'Phường Quốc Tử Giám',
  'hang bot': 'Phường Hàng Bột',
  'nam dong': 'Phường Nam Đồng',
  'trung liet': 'Phường Trung Liệt',
  'kham thien': 'Phường Khâm Thiên',
  'tho quan': 'Phường Thổ Quan',
  'phuong lien': 'Phường Phương Liên',
  'phuong mai': 'Phường Phương Mai',
  'kim lien': 'Phường Kim Liên',
  'khuong thuong': 'Phường Khương Thượng',
  'thinh quang': 'Phường Thịnh Quang',
  'trung phung': 'Phường Trung Phụng',
  'bach khoa': 'Phường Bách Khoa',
  'dong tam': 'Phường Đồng Tâm',
  'bach dang': 'Phường Bạch Đằng',
  'thanh nhan': 'Phường Thanh Nhàn',
  'cau den': 'Phường Cầu Dền',
  'bach mai': 'Phường Bạch Mai',
  'quynh mai': 'Phường Quỳnh Mai',
  'quynh loi': 'Phường Quỳnh Lôi',
  'minh khai': 'Phường Minh Khai',
  'dong mac': 'Phường Đống Mác',
  'thanh luong': 'Phường Thanh Lương',
  'vinh tuy': 'Phường Vĩnh Tuy',
  'pho hue': 'Phường Phố Huế',
  'pham dinh ho': 'Phường Phạm Đình Hổ',
  'nguyen du': 'Phường Nguyễn Du',
  'le dai hanh': 'Phường Lê Đại Hành',
  'my dinh 1': 'Phường Mỹ Đình 1',
  'my dinh 2': 'Phường Mỹ Đình 2',
  'me tri': 'Phường Mễ Trì',
  'phu do': 'Phường Phú Đô',
  'tay mo': 'Phường Tây Mỗ',
  'dai mo': 'Phường Đại Mỗ',
  'cau dien': 'Phường Cầu Diễn',
  'xuan phuong': 'Phường Xuân Phương',
  'phuong canh': 'Phường Phương Canh',
  'trung van': 'Phường Trung Văn',
  'co nhue 1': 'Phường Cổ Nhuế 1',
  'co nhue 2': 'Phường Cổ Nhuế 2',
  'dong ngac': 'Phường Đông Ngạc',
  'duc thang': 'Phường Đức Thắng',
  'lien mac': 'Phường Liên Mạc',
  'phu dien': 'Phường Phú Diễn',
  'phuc dien': 'Phường Phúc Diễn',
  'tay tuu': 'Phường Tây Tựu',
  'thuy phuong': 'Phường Thụy Phương',
  'xuan dinh': 'Phường Xuân Đỉnh',
  'xuan tao': 'Phường Xuân Tảo',
  'kim ma': 'Phường Kim Mã',
  'giang vo': 'Phường Giảng Võ',
  'lieu giai': 'Phường Liễu Giai',
  'cong vi': 'Phường Cống Vị',
  'ngoc ha': 'Phường Ngọc Hà',
  'doi can': 'Phường Đội Cấn',
  'dien bien': 'Phường Điện Biên',
  'quan thanh': 'Phường Quán Thánh',
  'truc bach': 'Phường Trúc Bạch',
  'phuc xa': 'Phường Phúc Xá',
  'nguyen trung truc': 'Phường Nguyễn Trung Trực',
  'thanh cong': 'Phường Thành Công',
  'vinh phuc': 'Phường Vĩnh Phúc',
  'ngoc khanh': 'Phường Ngọc Khánh',
  'thuy khue': 'Phường Thụy Khuê',
  'buoi': 'Phường Bưởi',
  'quang an': 'Phường Quảng An',
  'nhat tan': 'Phường Nhật Tân',
  'tu lien': 'Phường Tứ Liên',
  'xuan la': 'Phường Xuân La',
  'yen phu': 'Phường Yên Phụ',
  'phu thuong': 'Phường Phú Thượng',
};

// Hàm bỏ dấu tiếng Việt để đối chiếu từ khóa không dấu
export function removeVietnameseAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuyển đổi và chuẩn hóa chuỗi địa chỉ sang tiếng Việt chuẩn 100% có dấu
 * @param {string} rawAddress - Chuỗi địa chỉ thô từ bản đồ hoặc geocoder
 * @returns {string} - Chuỗi địa chỉ chuẩn tiếng Việt
 */
export function toVietnameseAddress(rawAddress) {
  if (!rawAddress || typeof rawAddress !== 'string') return '';

  let text = rawAddress.trim();

  // Bỏ hậu tố quốc gia tiếng Anh / thừa
  text = text.replace(/,\s*(?:Vietnam|Viet Nam|VN|Việt Nam)$/i, '');

  // Phân tách thành từng phân đoạn theo dấu phẩy
  let rawSegments = text.split(',').map((s) => s.trim()).filter(Boolean);

  let formattedSegments = [];

  for (let seg of rawSegments) {
    let s = seg;

    // 1. Chuẩn hóa tên Thành phố
    if (/^(?:Hanoi|Ha Noi|Hà Nội)$/i.test(s)) {
      formattedSegments.push('Hà Nội');
      continue;
    }

    const unaccent = removeVietnameseAccents(s)
      .toLowerCase()
      .replace(/^(?:quan|huyen|thi xa|phuong|xa|thanh pho|tp\.?)\s+/i, '')
      .replace(/\s*(?:district|ward|st\.?|street|road|rd\.?|ave\.?|avenue)$/i, '')
      .trim();

    // 2. Đối chiếu từ điển Quận / Huyện Hà Nội
    let matchedDistrict = null;
    for (const [key, val] of Object.entries(HANOI_DISTRICTS)) {
      if (unaccent === key || unaccent === removeVietnameseAccents(val).toLowerCase()) {
        matchedDistrict = val;
        break;
      }
    }
    if (matchedDistrict) {
      formattedSegments.push(matchedDistrict);
      continue;
    }

    // 3. Đối chiếu từ điển Phường / Xã Hà Nội
    let matchedWard = null;
    for (const [key, val] of Object.entries(HANOI_WARDS)) {
      if (unaccent === key || unaccent === removeVietnameseAccents(val).toLowerCase()) {
        matchedWard = val;
        break;
      }
    }
    if (matchedWard) {
      formattedSegments.push(matchedWard);
      continue;
    }

    // 4. Dịch các từ tiếng Anh thông dụng sang tiếng Việt
    s = s
      .replace(/\bStreet\b/gi, '')
      .replace(/\bRoad\b/gi, '')
      .replace(/\bSt\.?\b/gi, '')
      .replace(/\bRd\.?\b/gi, '')
      .replace(/\bAvenue\b/gi, '')
      .replace(/\bAve\.?\b/gi, '')
      .replace(/\bWard\b/gi, '')
      .replace(/\bDistrict\b/gi, '')
      .replace(/\bNo\.?\s*(\d+)/gi, 'Số $1')
      .trim();

    // 5. Chuẩn hóa số nhà (nếu chỉ là con số thuần túy vd: "10")
    if (/^\d+[A-Za-z0-9\/-]*$/.test(s) && !s.toLowerCase().startsWith('số') && !s.toLowerCase().startsWith('km')) {
      s = `Số ${s}`;
    }

    // 6. Kiểm tra nếu là số nhà kèm tên đường (vd: 12 Hang Trong)
    const numMatch = s.match(/^(\d+[A-Za-z0-9\/-]*)\s+(.+)$/);
    if (numMatch && !s.toLowerCase().startsWith('km') && !s.toLowerCase().startsWith('số')) {
      formattedSegments.push(`Số ${numMatch[1]}`);
      s = numMatch[2].trim();
    }

    // 7. Kiểm tra xem có phải cơ sở giáo dục, y tế, tòa nhà hay không
    const unaccentLower = removeVietnameseAccents(s).toLowerCase();
    const isPOI =
      unaccentLower.includes('hoc vien') ||
      unaccentLower.includes('dai hoc') ||
      unaccentLower.includes('truong') ||
      unaccentLower.includes('benh vien') ||
      unaccentLower.includes('toa nha') ||
      unaccentLower.includes('chung cu') ||
      unaccentLower.includes('khach san') ||
      unaccentLower.includes('nha hang') ||
      unaccentLower.includes('quan an') ||
      unaccentLower.includes('cho') ||
      unaccentLower.includes('cong vien') ||
      unaccentLower.includes('trung tam');

    // 8. Thêm tiền tố Đường / Phố nếu là tên đường chưa có tiền tố
    if (
      s &&
      !isPOI &&
      !s.startsWith('Số ') &&
      !s.startsWith('Km ') &&
      !s.startsWith('Đường ') &&
      !s.startsWith('Phố ') &&
      !s.startsWith('Ngõ ') &&
      !s.startsWith('Ngách ') &&
      !s.startsWith('Phường ') &&
      !s.startsWith('Quận ') &&
      !s.startsWith('Huyện ') &&
      s !== 'Hà Nội'
    ) {
      if (unaccentLower.startsWith('hang ') || unaccentLower.startsWith('trang ')) {
        s = `Phố ${s}`;
      } else {
        s = `Đường ${s}`;
      }
    }

    formattedSegments.push(s);
  }

  // Đảm bảo luôn có "Hà Nội" ở cuối địa chỉ
  if (!formattedSegments.some((p) => p.includes('Hà Nội'))) {
    formattedSegments.push('Hà Nội');
  }

  // Khử trùng lặp và loại bỏ các phần tử rỗng
  const unique = Array.from(new Set(formattedSegments.filter(Boolean)));
  return unique.join(', ');
}
