export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: 'client' | 'barber' | 'admin'
  created_at: string
  updated_at: string
}

export interface Barbershop {
  id: string
  name: string
  address: string | null
  phone: string | null
  logo_url: string | null
  opening_time: string
  closing_time: string
  created_at: string
}

export interface Client {
  id: string
  user_id: string
  barbershop_id: string
  notes: string | null
  created_at: string
}

export interface Barber {
  id: string
  user_id: string
  barbershop_id: string
  specialty: string | null
  is_active: boolean
  created_at: string
  profile?: Profile
}

export interface Service {
  id: string
  barbershop_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  icon: string | null
  is_active: boolean
  created_at: string
}

export interface Appointment {
  id: string
  client_id: string
  barber_id: string
  service_id: string
  barbershop_id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
  service?: Service
  barber?: Barber & { profile?: Profile }
}

export interface BlockedTime {
  id: string
  barber_id: string
  barbershop_id: string
  blocked_date: string
  start_time: string
  end_time: string
  reason: string | null
  created_at: string
}

export interface Payment {
  id: string
  appointment_id: string
  amount: number
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix'
  status: 'pending' | 'paid' | 'refunded'
  paid_at: string | null
  created_at: string
}
