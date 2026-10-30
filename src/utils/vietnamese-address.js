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

// Từ điển các Địa danh / Điểm POI nổi tiếng tại Hà Nội (dịch từ tên tiếng Anh / viết tắt sang tiếng Việt chuẩn)
export const POI_TRANSLATIONS = {
  // Các trường Đại học & Học viện lớn
  'hanoi university of science and technology': 'Đại học Bách khoa Hà Nội',
  'hust': 'Đại học Bách khoa Hà Nội',
  'vietnam national university': 'Đại học Quốc gia Hà Nội',
  'vnu': 'Đại học Quốc gia Hà Nội',
  'national economics university': 'Đại học Kinh tế Quốc dân',
  'neu': 'Đại học Kinh tế Quốc dân',
  'hanoi medical university': 'Đại học Y Hà Nội',
  'hanoi university of civil engineering': 'Đại học Xây dựng Hà Nội',
  'huce': 'Đại học Xây dựng Hà Nội',
  'nuce': 'Đại học Xây dựng Hà Nội',
  'posts and telecommunications institute of technology': 'Học viện Công nghệ Bưu chính Viễn thông',
  'ptit': 'Học viện Công nghệ Bưu chính Viễn thông',
  'foreign trade university': 'Đại học Ngoại thương',
  'ftu': 'Đại học Ngoại thương',
  'academy of finance': 'Học viện Tài chính',
  'diplomatic academy of vietnam': 'Học viện Ngoại giao',
  'dav': 'Học viện Ngoại giao',
  'banking academy': 'Học viện Ngân hàng',
  'hanoi university of pharmacy': 'Đại học Dược Hà Nội',
  'hanoi university of industry': 'Đại học Công nghiệp Hà Nội',
  'haui': 'Đại học Công nghiệp Hà Nội',
  'hanoi open university': 'Đại học Mở Hà Nội',
  'thuyloi university': 'Đại học Thủy lợi',
  'vietnam academy of agriculture': 'Học viện Nông nghiệp Việt Nam',
  'hanoi pedagogical university': 'Đại học Sư phạm Hà Nội',
  'hnue': 'Đại học Sư phạm Hà Nội',
  'vietnam university of commerce': 'Đại học Thương mại',
  'tmu': 'Đại học Thương mại',
  'hanoi university': 'Đại học Hà Nội',
  'hanu': 'Đại học Hà Nội',
  'academy of journalism and communication': 'Học viện Báo chí và Tuyên truyền',
  'ajc': 'Học viện Báo chí và Tuyên truyền',
  'hanoi law university': 'Đại học Luật Hà Nội',
  'university of transport and communications': 'Đại học Giao thông Vận tải',
  'utc': 'Đại học Giao thông Vận tải',

  // Bệnh viện lớn
  'bach mai hospital': 'Bệnh viện Bạch Mai',
  'viet duc hospital': 'Bệnh viện Hữu nghị Việt Đức',
  '108 military central hospital': 'Bệnh viện Trung ương Quân đội 108',
  'central military hospital 108': 'Bệnh viện Trung ương Quân đội 108',
  'k hospital': 'Bệnh viện K',
  'national hospital of pediatrics': 'Bệnh viện Nhi Trung ương',
  'national hospital of obstetrics and gynecology': 'Bệnh viện Phụ sản Trung ương',
  'saint paul general hospital': 'Bệnh viện Đa khoa Xanh Pôn',
  'e hospital': 'Bệnh viện E',
  'vinmec international hospital': 'Bệnh viện Đa khoa Quốc tế Vinmec',

  // Danh lam thắng cảnh & Hồ tại Hà Nội
  'hoan kiem lake': 'Hồ Hoàn Kiếm',
  'sword lake': 'Hồ Hoàn Kiếm',
  'west lake': 'Hồ Tây',
  'truc bach lake': 'Hồ Trúc Bạch',
  'bay mau lake': 'Hồ Bảy Mẫu',
  'thien quang lake': 'Hồ Thiền Quang',
  'ho chi minh mausoleum': 'Lăng Chủ tịch Hồ Chí Minh',
  'temple of literature': 'Văn Miếu - Quốc Tử Giám',
  'thang long imperial citadel': 'Hoàng thành Thăng Long',
  'imperial citadel of thang long': 'Hoàng thành Thăng Long',
  'hanoi opera house': 'Nhà hát Lớn Hà Nội',
  'st. joseph\'s cathedral': 'Nhà thờ Lớn Hà Nội',
  'saint joseph cathedral': 'Nhà thờ Lớn Hà Nội',
  'one pillar pagoda': 'Chùa Một Cột',
  'tran quoc pagoda': 'Chùa Trấn Quốc',
  'hoa lo prison': 'Di tích Nhà tù Hỏa Lò',
  'vietnam military history museum': 'Bảo tàng Lịch sử Quân sự Việt Nam',
  'vietnam national museum of history': 'Bảo tàng Lịch sử Quốc gia',

  // Trung tâm thương mại & Tòa nhà văn phòng
  'vincom center': 'Vincom Center',
  'vincom mega mall royal city': 'Vincom Mega Mall Royal City',
  'royal city': 'Khu đô thị Royal City',
  'vincom mega mall times city': 'Vincom Mega Mall Times City',
  'times city': 'Khu đô thị Times City',
  'lotte center hanoi': 'Lotte Center Hà Nội',
  'lotte mall west lake': 'Lotte Mall Tây Hồ',
  'keangnam hanoi landmark tower': 'Tòa nhà Keangnam Landmark 72',
  'keangnam landmark 72': 'Tòa nhà Keangnam Landmark 72',
  'aeon mall ha dong': 'AEON Mall Hà Đông',
  'aeon mall long bien': 'AEON Mall Long Biên',
  'trang tien plaza': 'Tràng Tiền Plaza',
  'the manor hanoi': 'The Manor Hà Nội',

  // Sân vận động & Bến bãi
  'my dinh national stadium': 'Sân vận động Quốc gia Mỹ Đình',
  'hang day stadium': 'Sân vận động Hàng Đẫy',
  'noi bai international airport': 'Sân bay Quốc tế Nội Bài',
  'hanoi railway station': 'Ga Hà Nội',
  'giap bat bus station': 'Bến xe Giáp Bát',
  'my dinh bus station': 'Bến xe Mỹ Đình',
  'nuoc ngam bus station': 'Bến xe Nước Ngầm',
  'gia lam bus station': 'Bến xe Gia Lâm',
  'yen nghia bus station': 'Bến xe Yên Nghĩa',
};

// Từ điển các Tuyến đường / Tuyến phố phổ biến tại Hà Nội (chuẩn hóa tên không dấu sang có dấu)
export const HANOI_STREETS = {
  // Trục Giải Phóng - Lê Duẩn - Hai Bà Trưng
  'dai co viet': 'Đại Cồ Việt',
  'giai phong': 'Giải Phóng',
  'le duan': 'Lê Duẩn',
  'tran dai nghia': 'Trần Đại Nghĩa',
  'ta quang buu': 'Tạ Quang Bửu',
  'bach mai': 'Bạch Mai',
  'pho hue': 'Phố Huế',
  'hang bai': 'Hàng Bài',
  'dinh tien hoang': 'Đinh Tiên Hoàng',
  'trang tien': 'Tràng Tiền',
  'ba trieu': 'Bà Triệu',
  'quang trung': 'Quang Trung',
  'nguyen du': 'Nguyễn Du',
  'tran hung dao': 'Trần Hưng Đạo',
  'ly thuong kiet': 'Lý Thường Kiệt',
  'hai ba trung': 'Hai Bà Trưng',
  'hang khay': 'Hàng Khay',
  'le thai to': 'Lê Thái Tổ',

  // Khu Đống Đa - Ba Đình
  'dien bien phu': 'Điện Biên Phủ',
  'nguyen thai hoc': 'Nguyễn Thái Học',
  'kim ma': 'Kim Mã',
  'lieu giai': 'Liễu Giai',
  'van cao': 'Văn Cao',
  'doi can': 'Đội Cấn',
  'hoang hoa tham': 'Hoàng Hoa Thám',
  'thuy khue': 'Thụy Khuê',
  'thanh nien': 'Thanh Niên',
  'yen phu': 'Yên Phụ',
  'giang vo': 'Giảng Võ',
  'lang ha': 'Láng Hạ',
  'huynh thuc khang': 'Huỳnh Thúc Kháng',
  'nguyen chi thanh': 'Nguyễn Chí Thanh',
  'chua boc': 'Chùa Bộc',
  'pham ngoc thach': 'Phạm Ngọc Thạch',
  'ton that tung': 'Tôn Thất Tùng',
  'thai ha': 'Thái Hà',
  'thai thinh': 'Thái Thịnh',
  'tay son': 'Tây Sơn',
  'ton duc thang': 'Tôn Đức Thắng',
  'nguyen luong bang': 'Nguyễn Lương Bằng',
  'xa dan': 'Xã Đàn',
  'o cho dua': 'Ô Chợ Dừa',
  'de la thanh': 'Đê La Thành',
  'duong lang': 'Đường Láng',

  // Trục Cầu Giấy - Nam/Bắc Từ Liêm
  'cau giay': 'Cầu Giấy',
  'xuan thuy': 'Xuân Thủy',
  'ho tung mau': 'Hồ Tùng Mậu',
  'pham van dong': 'Phạm Văn Đồng',
  'pham hung': 'Phạm Hùng',
  'khuat duy tien': 'Khuất Duy Tiến',
  'nguyen xien': 'Nguyễn Xiển',
  'nguyen trai': 'Nguyễn Trãi',
  'hoang quoc viet': 'Hoàng Quốc Việt',
  'nguyen phong sac': 'Nguyễn Phong Sắc',
  'tran thai tong': 'Trần Thái Tông',
  'duy tan': 'Duy Tân',
  'ton that thuyet': 'Tôn Thất Thuyết',
  'le duc tho': 'Lê Đức Thọ',
  'le quang dao': 'Lê Quang Đạo',
  'me tri': 'Mễ Trì',
  'chau van liem': 'Châu Văn Liêm',
  'trung hoa': 'Trung Hòa',
  'yen hoa': 'Yên Hòa',
  'tran duy hung': 'Trần Duy Hưng',
  'hoang dao thuy': 'Hoàng Đạo Thúy',
  'nguyen thi dinh': 'Nguyễn Thị Định',
  'le van luong': 'Lê Văn Lương',
  'to huu': 'Tố Hữu',

  // Khu Thanh Xuân - Hoàng Mai
  'truong chinh': 'Trường Chinh',
  'dai la': 'Đại La',
  'minh khai': 'Minh Khai',
  'vinh tuy': 'Vĩnh Tuy',
  'tam trinh': 'Tam Trinh',
  'linh nam': 'Lĩnh Nam',
  'kim nguu': 'Kim Ngưu',
  'lo duc': 'Lò Đúc',
  'tran khat chan': 'Trần Khát Chân',
  'vo thi sau': 'Võ Thị Sáu',
  'thanh nhan': 'Thanh Nhàn',
  'dinh cong': 'Định Công',
  'giai phong': 'Giải Phóng',

  // Khu Tây Hồ
  'au co': 'Âu Cơ',
  'lac long quan': 'Lạc Long Quân',
  'vo chi cong': 'Võ Chí Công',
  'nguyen hoang ton': 'Nguyễn Hoàng Tôn',
  'xuan la': 'Xuân La',
  'quang an': 'Quảng An',

  // Khu Hà Đông
  'tran phu': 'Trần Phú',
  'quang trung': 'Quang Trung',
  'phung hung': 'Phùng Hưng',
  'to hieu': 'Tô Hiệu',
  'le trong tan': 'Lê Trọng Tấn',
  'van phu': 'Văn Phú',

  // Khu Long Biên - Gia Lâm
  'nguyen van cu': 'Nguyễn Văn Cừ',
  'ngo gia tu': 'Ngô Gia Tự',
  'nguyen son': 'Nguyễn Sơn',
  'ngoc lam': 'Ngọc Lâm',
  'co linh': 'Cổ Linh',
  'dam quang trung': 'Đàm Quang Trung',
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
 * Dịch tên địa danh / POI sang tiếng Việt chuẩn nếu có trong từ điển
 */
export function translatePOI(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  const clean = removeVietnameseAccents(trimmed.replace(/^(Đường|Phố|Street|Road)\s+/i, '')).toLowerCase().trim();
  if (POI_TRANSLATIONS[clean]) {
    return POI_TRANSLATIONS[clean];
  }
  return trimmed;
}

/**
 * Chuẩn hóa tên đường Hà Nội sang có dấu
 */
export function translateStreet(street) {
  if (!street || typeof street !== 'string') return '';
  const trimmed = street.trim();
  const clean = removeVietnameseAccents(trimmed.replace(/^(Đường|Phố|Street|Road|St\.?|Rd\.?)\s+/i, '')).toLowerCase().trim();
  if (HANOI_STREETS[clean]) {
    const accented = HANOI_STREETS[clean];
    if (clean.startsWith('hang ') || clean.startsWith('trang ')) {
      return `Phố ${accented}`;
    }
    return `Đường ${accented}`;
  }
  return trimmed;
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

    // 2. Kiểm tra nếu phân đoạn là POI (kể cả có lỡ bị gán prefix "Đường" hoặc "Phố")
    const cleanPOIKey = removeVietnameseAccents(s.replace(/^(?:Đường|Phố|Street|Road)\s+/i, ''))
      .toLowerCase()
      .trim();
    if (POI_TRANSLATIONS[cleanPOIKey]) {
      formattedSegments.push(POI_TRANSLATIONS[cleanPOIKey]);
      continue;
    }

    const unaccent = removeVietnameseAccents(s)
      .toLowerCase()
      .replace(/^(?:quan|huyen|thi xa|phuong|xa|thanh pho|tp\.?)\s+/i, '')
      .replace(/\s*(?:district|ward|st\.?|street|road|rd\.?|ave\.?|avenue)$/i, '')
      .trim();

    // 3. Đối chiếu từ điển Quận / Huyện Hà Nội
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

    // 4. Đối chiếu từ điển Phường / Xã Hà Nội
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

    // 5. Kiểm tra nếu là tên đường từ từ điển HANOI_STREETS (vd: Dai Co Viet -> Đường Đại Cồ Việt)
    const cleanStreetKey = removeVietnameseAccents(s.replace(/^(?:Đường|Phố|Street|Road|St\.?|Rd\.?)\s+/i, ''))
      .toLowerCase()
      .trim();
    if (HANOI_STREETS[cleanStreetKey]) {
      const accentedStreet = HANOI_STREETS[cleanStreetKey];
      const prefix = (cleanStreetKey.startsWith('hang ') || cleanStreetKey.startsWith('trang ')) ? 'Phố' : 'Đường';
      formattedSegments.push(`${prefix} ${accentedStreet}`);
      continue;
    }

    // 6. Dịch các từ tiếng Anh thông dụng sang tiếng Việt
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

    // 7. Chuẩn hóa số nhà (nếu chỉ là con số thuần túy vd: "10" hoặc "1")
    if (/^\d+[A-Za-z0-9\/-]*$/.test(s) && !s.toLowerCase().startsWith('số') && !s.toLowerCase().startsWith('km')) {
      s = `Số ${s}`;
    }

    // 8. Kiểm tra nếu là số nhà kèm tên đường (vd: 12 Hang Trong, 1 Dai Co Viet)
    const numMatch = s.match(/^(\d+[A-Za-z0-9\/-]*)\s+(.+)$/);
    if (numMatch && !s.toLowerCase().startsWith('km') && !s.toLowerCase().startsWith('số')) {
      formattedSegments.push(`Số ${numMatch[1]}`);
      const restStreet = numMatch[2].trim();
      const restCleanKey = removeVietnameseAccents(restStreet.replace(/^(?:Đường|Phố)\s+/i, '')).toLowerCase().trim();
      if (HANOI_STREETS[restCleanKey]) {
        const accentedRest = HANOI_STREETS[restCleanKey];
        const prefix = (restCleanKey.startsWith('hang ') || restCleanKey.startsWith('trang ')) ? 'Phố' : 'Đường';
        formattedSegments.push(`${prefix} ${accentedRest}`);
      } else {
        formattedSegments.push(`Đường ${restStreet}`);
      }
      continue;
    }

    // 9. Kiểm tra xem có phải cơ sở giáo dục, y tế, tòa nhà, công trình hay không (hỗ trợ cả tiếng Việt và tiếng Anh)
    const unaccentLower = removeVietnameseAccents(s).toLowerCase();
    const isPOI =
      Boolean(POI_TRANSLATIONS[cleanPOIKey]) ||
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
      unaccentLower.includes('trung tam') ||
      unaccentLower.includes('university') ||
      unaccentLower.includes('institute') ||
      unaccentLower.includes('college') ||
      unaccentLower.includes('academy') ||
      unaccentLower.includes('hospital') ||
      unaccentLower.includes('stadium') ||
      unaccentLower.includes('building') ||
      unaccentLower.includes('tower') ||
      unaccentLower.includes('lake') ||
      unaccentLower.includes('plaza') ||
      unaccentLower.includes('mall') ||
      unaccentLower.includes('center') ||
      unaccentLower.includes('centre') ||
      unaccentLower.includes('school') ||
      unaccentLower.includes('museum') ||
      unaccentLower.includes('temple') ||
      unaccentLower.includes('pagoda') ||
      unaccentLower.includes('cathedral') ||
      unaccentLower.includes('airport') ||
      unaccentLower.includes('station');

    // 10. Thêm tiền tố Đường / Phố nếu là tên đường chưa có tiền tố
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
