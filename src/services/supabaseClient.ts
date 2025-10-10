import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Task = {
  id: string
  user_id: string
  title: string
  description?: string
  status: 'todo' | 'doing' | 'done'
  priority: number
  created_at: string
  updated_at: string
  due_date?: string
}

export type Message = {
  id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  inserted_at: string
}
