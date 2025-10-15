import { DatabaseInterface, Task, Message, SyncConflict, DatabaseConfig, APIKey, ChatSession, Column, Reminder } from './types'
import { getSupabaseClient } from '../supabaseClient'

export class CloudDatabaseService implements DatabaseInterface {
  private config: DatabaseConfig

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    // Check if we have real Supabase credentials
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey || 
        supabaseUrl === 'https://dummy.supabase.co' || 
        supabaseAnonKey === 'dummy-key') {
      console.warn('Cloud database mode selected but no Supabase credentials found. Using local mode instead.')
      throw new Error('No Supabase credentials configured')
    }
  }

  async close(): Promise<void> {
    // Cloud database doesn't need closing
  }

  isOnline(): boolean {
    return navigator.onLine
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.config.userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getTask(id: string): Promise<Task | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .single()

    if (error) return null
    return data
  }

  async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        user_id: this.config.userId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTask(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', this.config.userId)

    if (error) throw error
  }

  // Message operations
  async getMessages(): Promise<Message[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', this.config.userId)
      .order('inserted_at', { ascending: true })
      .limit(50)

    if (error) throw error
    return data || []
  }

  async getMessagesByChatSession(chatSessionId: string): Promise<Message[]> {
    const supabase = getSupabaseClient()
    
    // Try both string and number versions to handle data type inconsistencies
    const { data: dataString, error: errorString } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', this.config.userId)
      .eq('chat_session_id', chatSessionId)
      .order('inserted_at', { ascending: true })
      .limit(100)

    const { data: dataNumber, error: errorNumber } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', this.config.userId)
      .eq('chat_session_id', parseInt(chatSessionId))
      .order('inserted_at', { ascending: true })
      .limit(100)

    if (errorString && errorNumber) {
      throw errorString
    }

    // Combine results and remove duplicates
    const allData = [...(dataString || []), ...(dataNumber || [])]
    const uniqueData = allData.filter((msg, index, self) => 
      index === self.findIndex(m => m.id === msg.id)
    )

    return uniqueData
  }

  async getMessage(id: string): Promise<Message | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .single()

    if (error) return null
    return data
  }

  async createMessage(messageData: Omit<Message, 'id' | 'inserted_at'>): Promise<Message> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...messageData,
        user_id: this.config.userId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteMessage(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('user_id', this.config.userId)

    if (error) throw error
  }

  // Chat Session operations
  async getChatSessions(): Promise<ChatSession[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', this.config.userId)
      .order('last_message_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data || []
  }

  async getChatSession(id: string): Promise<ChatSession | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      throw error
    }
    return data
  }

  async createChatSession(chatSessionData: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>): Promise<ChatSession> {
    const supabase = getSupabaseClient()
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        ...chatSessionData,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteChatSession(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', this.config.userId)

    if (error) throw error
  }

  // API Key operations
  async getAPIKeys(): Promise<APIKey[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', this.config.userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getAPIKey(id: string): Promise<APIKey | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .single()

    if (error) return null
    return data
  }

  async getActiveAPIKey(provider: string): Promise<APIKey | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', this.config.userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single()

    if (error) return null
    return data
  }

  async createAPIKey(apiKeyData: Omit<APIKey, 'id' | 'created_at' | 'updated_at'>): Promise<APIKey> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        ...apiKeyData,
        user_id: this.config.userId,
        usage_count: 0
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateAPIKey(id: string, updates: Partial<APIKey>): Promise<APIKey> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('api_keys')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteAPIKey(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', this.config.userId)

    if (error) throw error
  }

  // Column operations
  async getColumns(): Promise<Column[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('columns')
      .select('*')
      .eq('user_id', this.config.userId)
      .order('position', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getColumn(id: string): Promise<Column | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('columns')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .single()

    if (error) return null
    return data
  }

  async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('columns')
      .insert({
        ...columnData,
        user_id: this.config.userId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateColumn(id: string, updates: Partial<Column>): Promise<Column> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('columns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteColumn(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('columns')
      .delete()
      .eq('id', id)
      .eq('user_id', this.config.userId)

    if (error) throw error
  }

  // Reminder operations
  async getReminders(): Promise<Reminder[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', this.config.userId)
      .order('reminder_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getReminder(id: string): Promise<Reminder | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .single()

    if (error) return null
    return data
  }

  async createReminder(reminderData: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>): Promise<Reminder> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        ...reminderData,
        user_id: this.config.userId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('reminders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', this.config.userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteReminder(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', this.config.userId)

    if (error) throw error
  }

  // Sync operations (not applicable for cloud-only mode)
  async sync(): Promise<void> {
    // Cloud database doesn't need sync
  }

  async getConflicts(): Promise<SyncConflict[]> {
    // Cloud database doesn't have conflicts
    return []
  }

  async resolveConflict(_conflictId: string, _resolution: 'local' | 'cloud' | 'merge'): Promise<void> {
    // Cloud database doesn't have conflicts
  }
}
