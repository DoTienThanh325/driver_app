export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface LoginResponse {
  challengeToken: string;
  expiresInSeconds: number;
  message: string;
  otp: string | null;
}

export interface VerifyOtpRequest {
  challengeToken: string;
  otp: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

export interface UserResponse {
  id: string;
  username: string;
  phoneNumber: string;
  roles: string[];
}

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type VehicleType = 'CAR' | 'MOTORBIKE';

export interface DriverCandidateSummary {
  driverId: string;
  username: string;
  phoneNumber: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface DocumentImagePair {
  front: string | null;
  back: string | null;
}

export interface VehicleDetail {
  id: string;
  vehicleType: VehicleType;
  registrationFront: string | null;
  plate: string | null;
  status: VerificationStatus;
  createdAt: string;
}

export interface DriverDetail {
  driverId: string;
  username: string;
  phoneNumber: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  idCard: DocumentImagePair | null;
  license: DocumentImagePair | null;
  licenseMotorbike: DocumentImagePair | null;
  licenseCar: DocumentImagePair | null;
  vehicle: VehicleDetail | null;
  vehicles: VehicleDetail[];
}

export interface UpdateDriverVerificationRequest {
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export type BusinessRegistrationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BANNED';

export interface BusinessRegistrationSummary {
  id: string;
  userId: string;
  restaurantName: string;
  status: BusinessRegistrationStatus;
  createdAt: string;
}

export interface BusinessRegistrationDetail {
  id: string;
  userId: string;
  restaurantId: string | null;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLatitude: number;
  restaurantLongitude: number;
  businessLicenseUrls: string[];
  status: BusinessRegistrationStatus;
  rejectReason: string | null;
  banReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewBusinessRequest {
  status: 'ACCEPTED' | 'REJECTED' | 'BANNED';
  rejectReason?: string;
  banReason?: string;
}

export type ComplainationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type ReportType =
  | 'DRIVER_LATE'
  | 'RECKLESS_DRIVING'
  | 'WRONG_ROUTE'
  | 'UNPROFESSIONAL_BEHAVIOR'
  | 'VEHICLE_MISMATCH'
  | 'OVERCHARGING'
  | 'DRIVER_NO_SHOW'
  | 'CUSTOMER_NO_SHOW';

export interface ComplaintSummary {
  id: string;
  reportType: ReportType;
  status: ComplainationStatus;
  tripId: string;
  createdAt: string;
}

export interface ComplaintParticipant {
  id: string;
  username: string | null;
  phoneNumber: string | null;
}

export interface ComplaintDetail {
  id: string;
  tripId: string;
  reportType: ReportType;
  status: ComplainationStatus;
  customer: ComplaintParticipant;
  driver: ComplaintParticipant;
  adminNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateComplaintStatusRequest {
  status: 'ACCEPTED' | 'REJECTED';
  adminNote?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface BanUserRequest {
  reason: string;
}

export interface AdminUserStatusResponse {
  userId: string;
  status: 'ACTIVE' | 'BANNED';
  banReason: string | null;
  bannedAt: string | null;
}

export type VoucherType = 'FOOD' | 'TRANSIT';
export type VoucherProviderType = 'APP' | 'RESTAURANT';

export interface CreateVoucherRequest {
  discount: number;
  maxDiscount: number;
  minValue: number;
  type: VoucherType;
  expiredAt: string;
}

export interface CreateVoucherResponse {
  message: string;
}

export interface SystemVoucherItem {
  id: string;
  discount: number;
  maxDiscount: number;
  minValue: number;
  type: VoucherType;
  providerType: VoucherProviderType;
  expiredAt: string;
  createdAt: string;
}
