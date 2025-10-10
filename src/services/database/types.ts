export type DatabaseMode = 'local' | 'cloud' | 'sync'

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  status: 'todo' | 'doing' | 'done'
  priority: number
  created_at: string
  updated_at: string
  due_date?: string
  sync_status?: 'synced' | 'pending' | 'conflict'
  last_synced_at?: string
}

export interface Message {
  id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  inserted_at: string
  model?: string
  provider?: string
  tokens?: number
  cost?: number
  sync_status?: 'synced' | 'pending' | 'conflict'
  last_synced_at?: string
}

export interface APIKey {
  id: string
  user_id: string
  provider: 'openai' | 'gemini'
  key: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_used_at?: string
  usage_count: number
  sync_status?: 'synced' | 'pending' | 'conflict'
  last_synced_at?: string
}

export interface DatabaseConfig {
  mode: DatabaseMode
  userId: string
  syncEnabled?: boolean
}

export interface SyncConflict {
  id: string
  table: 'tasks' | 'messages'
  localData: any
  cloudData: any
  conflictType: 'update' | 'delete' | 'create'
  timestamp: string
}

export interface DatabaseInterface {
  // Task operations
  getTasks(): Promise<Task[]>
  getTask(id: string): Promise<Task | null>
  createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task>
  updateTask(id: string, updates: Partial<Task>): Promise<Task>
  deleteTask(id: string): Promise<void>
  
  // Message operations
  getMessages(): Promise<Message[]>
  getMessage(id: string): Promise<Message | null>
  createMessage(message: Omit<Message, 'id' | 'inserted_at'>): Promise<Message>
  updateMessage(id: string, updates: Partial<Message>): Promise<Message>
  deleteMessage(id: string): Promise<void>
  
  // API Key operations
  getAPIKeys(): Promise<APIKey[]>
  getAPIKey(id: string): Promise<APIKey | null>
  getActiveAPIKey(provider: string): Promise<APIKey | null>
  createAPIKey(apiKey: Omit<APIKey, 'id' | 'created_at' | 'updated_at'>): Promise<APIKey>
  updateAPIKey(id: string, updates: Partial<APIKey>): Promise<APIKey>
  deleteAPIKey(id: string): Promise<void>
  
  // Sync operations
  sync(): Promise<void>
  getConflicts(): Promise<SyncConflict[]>
  resolveConflict(conflictId: string, resolution: 'local' | 'cloud' | 'merge'): Promise<void>
  
  // Database management
  initialize(): Promise<void>
  close(): Promise<void>
  isOnline(): boolean
}
