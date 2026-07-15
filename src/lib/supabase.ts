import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Cafe = {
  id: string;
  name: string;
  area: string;
  description: string;
  image_url: string;
  opening_hours: string;
  current_wait_minutes: number;
  is_open: boolean;
  total_tables: number;
  available_tables: number;
  owner_id: string | null;
  created_at: string;
};

export type MenuItem = {
  id: string;
  cafe_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
  created_at: string;
};

export type QueueStatus = 'waiting' | 'called' | 'seated' | 'cancelled';

export type QueueEntry = {
  id: string;
  cafe_id: string;
  user_id: string;
  customer_name: string;
  phone: string;
  party_size: number;
  position: number;
  is_student: boolean;
  status: QueueStatus;
  created_at: string;
};

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type Reservation = {
  id: string;
  cafe_id: string;
  user_id: string;
  customer_name: string;
  phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  is_student: boolean;
  status: ReservationStatus;
  notes: string;
  created_at: string;
};

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  cafe_id: string;
  user_id: string;
  customer_name: string;
  phone: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  is_student: boolean;
  status: OrderStatus;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'customer' | 'owner' | 'admin';
  created_at: string;
};

export type OwnerRequest = {
  id: string;
  user_id: string;
  cafe_name: string;
  area: string;
  description: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export const STUDENT_DISCOUNT_RATE = 0.1;
