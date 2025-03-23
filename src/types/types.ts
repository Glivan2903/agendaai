
export interface Professional {
  id: string;
  name: string;
  photo_url?: string;
  bio?: string;
  phone?: string;
  active?: boolean;
  user_id?: string;
  company_id?: string; // Added for company association
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  active?: boolean;
  company_id?: string; // Added for company association
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  start_time?: string;
  end_time?: string;
  professional_id?: string;
  company_id?: string; // Added for company association
}

export interface Appointment {
  id: string;
  professional_id: string;
  service_id: string;
  slot_id: string;
  client_name: string;
  client_phone: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at?: string;
  services?: Service;
  professionals?: Professional;
  slots?: TimeSlot;
  company_id?: string; // Added for company association
}

export interface ProfessionalService {
  id: string;
  professional_id: string;
  service_id: string;
  company_id?: string; // Added for company association
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'professional';
  tipo_usuario?: 'admin' | 'superadmin';
  auth_id?: string;
  created_at?: string;
  updated_at?: string;
  company_id?: string; // Added for company association
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  plan?: string;
  plan_value?: number;
  plan_expiry_date?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  created_at?: string;
}

export interface WebhookConfiguration {
  id: string;
  url: string;
  event_type: string; // Changed to required
  company_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
