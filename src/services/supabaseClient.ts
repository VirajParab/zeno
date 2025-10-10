import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    // Only create client if we have real credentials
    if (supabaseUrl && supabaseAnonKey && 
        supabaseUrl !== 'https://dummy.supabase.co' && 
        supabaseAnonKey !== 'dummy-key') {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    } else {
      // Create a dummy client that won't make network requests
      supabaseInstance = createClient('https://dummy.supabase.co', 'dummy-key', {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      })
    }
  }
  return supabaseInstance
}

// For backward compatibility - but this will be lazy-loaded
export const supabase = getSupabaseClient()

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
