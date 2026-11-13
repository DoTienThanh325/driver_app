/**
 * Danh sách các ngân hàng phổ biến tại Việt Nam hỗ trợ chuẩn Napas và VietQR
 * Mỗi ngân hàng bao gồm: Tên đầy đủ, Tên viết tắt, Mã BIN 6 số, Logo, và các URL Scheme / Package để mở ứng dụng
 */
export const VIETNAM_BANKS = [
  {
    id: 'mbbank',
    name: 'Ngân hàng TMCP Quân Đội',
    shortName: 'MB Bank',
    bin: '970422',
    logo: 'https://api.vietqr.io/img/MB.png',
    schemes: ['mbmobile://', 'mbbank://'],
    androidPackage: 'com.mbmobile',
    iosAppId: '1202807663',
  },
  {
    id: 'vietcombank',
    name: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
    shortName: 'Vietcombank',
    bin: '970436',
    logo: 'https://api.vietqr.io/img/VCB.png',
    schemes: ['vietcombank://', 'vcb://'],
    androidPackage: 'com.VCB',
    iosAppId: '561433133',
  },
  {
    id: 'techcombank',
    name: 'Ngân hàng TMCP Kỹ Thương Việt Nam',
    shortName: 'Techcombank',
    bin: '970407',
    logo: 'https://api.vietqr.io/img/TCB.png',
    schemes: ['techcombank://', 'tcbmobile://'],
    androidPackage: 'vn.com.techcombank.bb.app',
    iosAppId: '1549429711',
  },
  {
    id: 'vietinbank',
    name: 'Ngân hàng TMCP Công Thương Việt Nam',
    shortName: 'VietinBank',
    bin: '970415',
    logo: 'https://api.vietqr.io/img/ICB.png',
    schemes: ['vietinbankiplus://', 'icb://'],
    androidPackage: 'com.vietinbank.ipay',
    iosAppId: '683550886',
  },
  {
    id: 'bidv',
    name: 'Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam',
    shortName: 'BIDV',
    bin: '970418',
    logo: 'https://api.vietqr.io/img/BIDV.png',
    schemes: ['bidvsmartbanking://', 'bidv://'],
    androidPackage: 'com.vnpay.bidv',
    iosAppId: '1060658651',
  },
  {
    id: 'acb',
    name: 'Ngân hàng TMCP Á Châu',
    shortName: 'ACB',
    bin: '970416',
    logo: 'https://api.vietqr.io/img/ACB.png',
    schemes: ['acbone://', 'acb://'],
    androidPackage: 'mobile.acb.com.vn',
    iosAppId: '950141024',
  },
  {
    id: 'vpbank',
    name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng',
    shortName: 'VPBank',
    bin: '970432',
    logo: 'https://api.vietqr.io/img/VPB.png',
    schemes: ['vpbankneo://', 'vpb://'],
    androidPackage: 'com.vnpay.vpbankonline',
    iosAppId: '1209349510',
  },
  {
    id: 'tpbank',
    name: 'Ngân hàng TMCP Tiên Phong',
    shortName: 'TPBank',
    bin: '970423',
    logo: 'https://api.vietqr.io/img/TPB.png',
    schemes: ['tpbank://', 'tpb://'],
    androidPackage: 'com.tpbankquickpay',
    iosAppId: '450464147',
  },
  {
    id: 'sacombank',
    name: 'Ngân hàng TMCP Sài Gòn Thương Tín',
    shortName: 'Sacombank',
    bin: '970403',
    logo: 'https://api.vietqr.io/img/STB.png',
    schemes: ['sacombankpay://', 'stb://'],
    androidPackage: 'src.com.sacombank',
    iosAppId: '883554314',
  },
  {
    id: 'hdbank',
    name: 'Ngân hàng TMCP Phát Triển TP.HCM',
    shortName: 'HDBank',
    bin: '970437',
    logo: 'https://api.vietqr.io/img/HDB.png',
    schemes: ['hdbank://'],
    androidPackage: 'com.vnpay.hdbank',
    iosAppId: '1461658565',
  },
  {
    id: 'shb',
    name: 'Ngân hàng TMCP Sài Gòn - Hà Nội',
    shortName: 'SHB',
    bin: '970443',
    logo: 'https://api.vietqr.io/img/SHB.png',
    schemes: ['shbmobile://'],
    androidPackage: 'com.vnpay.shb',
    iosAppId: '538278798',
  },
  {
    id: 'msb',
    name: 'Ngân hàng TMCP Hàng Hải',
    shortName: 'MSB',
    bin: '970426',
    logo: 'https://api.vietqr.io/img/MSB.png',
    schemes: ['msb://'],
    androidPackage: 'com.msb.mb',
    iosAppId: '1480922378',
  },
];

/**
 * Tìm kiếm ngân hàng theo mã BIN
 */
export const findBankByBin = (bin) => {
  if (!bin) return null;
  return VIETNAM_BANKS.find((b) => b.bin === String(bin).trim()) || null;
};

/**
 * Tìm kiếm ngân hàng theo tên hoặc shortName
 */
export const findBankByName = (name) => {
  if (!name) return null;
  const search = String(name).toLowerCase().trim();
  return (
    VIETNAM_BANKS.find(
      (b) =>
        b.shortName.toLowerCase().includes(search) ||
        b.name.toLowerCase().includes(search) ||
        b.id.toLowerCase() === search
    ) || null
  );
};
