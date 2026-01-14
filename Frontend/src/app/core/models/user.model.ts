// Enums
export enum UserRole {
  ADMIN = 'admin',
  SALES = 'sales',
  PURCHASE = 'purchase',
  INVENTORY = 'inventory',
  ACCOUNTANT = 'accountant',
  DATA_ENTRY = 'data_entry'
}

// Core User Interface
export interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole | string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  isDeleted?: boolean;
}

// User Management Request/Response Types
export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole | string;
  isActive?: boolean;
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  role?: UserRole | string;
  isActive?: boolean;
}

export interface UserListResponse {
  success: boolean;
  data: User[];  // Backend returns users array directly in data
  pagination: {  // Backend returns pagination at root level, not nested
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
  timestamp?: string;
}

export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  deleted: number;
  byRole: {
    [key: string]: number;
  };
}

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: UserRole | string;
  isActive?: boolean;
  search?: string;
  includeDeleted?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface UpdateRoleRequest {
  role: UserRole | string;
}

// Authentication Types
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse extends ApiResponse<{
  accessToken: string;
  refreshToken: string;
  user: User;
}> { }

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse extends ApiResponse<{
  accessToken: string;
  refreshToken: string;
}> { }

// Generic API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
