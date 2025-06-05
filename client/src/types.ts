export interface User {
  id: number;
  username: string;
  email: string;
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
  shop_permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface FieldDefinition {
  id: number;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'currency' | 'select' | 'date' | 'multiselect' | 'richtext' | 'file' | 'formula';
  options?: string[];
  required: boolean;
  sort_order: number;
  hidden: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  order_data: Record<string, any>;
  created_by: number;
  updated_by: number;
  created_by_username: string;
  updated_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  error: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
} 