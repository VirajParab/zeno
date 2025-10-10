import { DatabaseInterface, Task, Message, SyncConflict, DatabaseConfig, APIKey } from './types'
import { supabase } from '../supabaseClient'

export class CloudDatabaseService implements DatabaseInterface {
  private config: DatabaseConfig

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    // Cloud database is always initialized
  }

  async close(): Promise<void> {
    // Cloud database doesn't need closing
  }

  isOnline(): boolean {
    return navigator.onLine
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.config.userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getTask(id: string): Promise<Task | null> {
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
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', this.config.userId)

    if (error) throw error
  }

  // Message operations
  async getMessages(): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', this.config.userId)
      .order('inserted_at', { ascending: true })
      .limit(50)

    if (error) throw error
    return data || []
  }

  async getMessage(id: string): Promise<Message | null> {
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
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('user_id', this.config.userId)

    if (error) throw error
  }

  // API Key operations
  async getAPIKeys(): Promise<APIKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', this.config.userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getAPIKey(id: string): Promise<APIKey | null> {
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
    const { error } = await supabase
      .from('api_keys')
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
