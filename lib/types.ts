// Types alinhados ao SQL em `scripts/001_create_schema.sql`
// (seu esquema usa: `appointment_time`, `block_date`, status `scheduled/completed/canceled`, etc.)

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  created_at: string
}

export interface Barbershop {
  id: string
  owner_id: string | null
  name: string
  address: string | null
  opening_time: string
  closing_time: string
  created_at: string
}

export interface Client {
  id: string
  barbershop_id: string
  name: string
  phone: string
  created_at: string
}

export interface Barber {
  id: string
  barbershop_id: string
  name: string
  created_at: string
}

export interface Service {
  id: string
  barbershop_id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  created_at: string
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'canceled'

export interface Appointment {
  id: string
  client_id: string
  service_id: string
  barber_id: string
  barbershop_id: string
  appointment_date: string
  appointment_time: string
  status: AppointmentStatus
  cancel_token: string
  created_at: string
  service?: Service
  barber?: Barber
}

export interface BlockedTime {
  id: string
  barber_id: string
  block_date: string
  start_time: string
  end_time: string
  reason: string | null
  created_at: string
}

export type PaymentMethod = 'cash' | 'pix' | 'card'

export interface Payment {
  id: string
  appointment_id: string
  amount: number
  method: PaymentMethod
  paid_at: string | null
  created_at: string
}
