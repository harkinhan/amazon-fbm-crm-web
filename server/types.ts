export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'operator' | 'tracker' | 'designer';
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  hire_date?: string;
  department?: string;
  position?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  address?: string;
  bio?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface UserAuth {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'tracker' | 'designer';
  department?: string;
  position?: string;
}

export interface UserShopPermission {
  id: number;
  user_id: number;
  shop_name: string;
  created_at: string;
}

export interface UserWithPermissions extends Omit<User, 'password'> {
  shop_permissions: string[];
}

export interface FieldDefinition {
  id: number;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'currency' | 'select' | 'date' | 'multiselect' | 'richtext' | 'file' | 'formula';
  options?: string; // JSON string for select/multiselect options
  required: boolean;
  sortOrder: number;
  hidden: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  [key: string]: any; // Dynamic fields based on field definitions
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
} 