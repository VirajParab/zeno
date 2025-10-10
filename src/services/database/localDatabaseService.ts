import { DatabaseInterface, Task, Message, SyncConflict, DatabaseConfig, APIKey } from './types'
import { localDB } from './localDatabase'
import { supabase } from '../supabaseClient'

export class LocalDatabaseService implements DatabaseInterface {
  private config: DatabaseConfig

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    await localDB.open()
  }

  async close(): Promise<void> {
    await localDB.close()
  }

  isOnline(): boolean {
    return navigator.onLine
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    return await localDB.tasks
      .where('user_id')
      .equals(this.config.userId)
      .toArray()
  }

  async getTask(id: string): Promise<Task | null> {
    return await localDB.tasks.get(id) || null
  }

  async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const now = new Date().toISOString()
    const taskDataWithTimestamps = {
      ...taskData,
      created_at: now,
      updated_at: now,
      sync_status: 'pending' as const
    }

    // Let Dexie auto-generate the ID
    const id = await localDB.tasks.add(taskDataWithTimestamps as any)
    
    const task: Task = {
      id: id.toString(),
      ...taskDataWithTimestamps
    }
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('tasks', 'create', task)
    }

    return task
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const existingTask = await localDB.tasks.get(id)
    if (!existingTask) {
      throw new Error('Task not found')
    }

    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    }

    await localDB.tasks.put(updatedTask)
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('tasks', 'update', updatedTask)
    }

    return updatedTask
  }

  async deleteTask(id: string): Promise<void> {
    await localDB.tasks.delete(id)
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('tasks', 'delete', { id })
    }
  }

  // Message operations
  async getMessages(): Promise<Message[]> {
    return await localDB.messages
      .where('user_id')
      .equals(this.config.userId)
      .reverse()
      .sortBy('inserted_at')
  }

  async getMessage(id: string): Promise<Message | null> {
    return await localDB.messages.get(id) || null
  }

  async createMessage(messageData: Omit<Message, 'id' | 'inserted_at'>): Promise<Message> {
    const now = new Date().toISOString()
    const messageDataWithTimestamp = {
      ...messageData,
      inserted_at: now,
      sync_status: 'pending' as const
    }

    // Let Dexie auto-generate the ID
    const id = await localDB.messages.add(messageDataWithTimestamp as any)
    
    const message: Message = {
      id: id.toString(),
      ...messageDataWithTimestamp
    }
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('messages', 'create', message)
    }

    return message
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message> {
    const existingMessage = await localDB.messages.get(id)
    if (!existingMessage) {
      throw new Error('Message not found')
    }

    const updatedMessage: Message = {
      ...existingMessage,
      ...updates,
      sync_status: 'pending'
    }

    await localDB.messages.put(updatedMessage)
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('messages', 'update', updatedMessage)
    }

    return updatedMessage
  }

  async deleteMessage(id: string): Promise<void> {
    await localDB.messages.delete(id)
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('messages', 'delete', { id })
    }
  }

  // API Key operations
  async getAPIKeys(): Promise<APIKey[]> {
    return await localDB.apiKeys
      .where('user_id')
      .equals(this.config.userId)
      .toArray()
  }

  async getAPIKey(id: string): Promise<APIKey | null> {
    return await localDB.apiKeys.get(id) || null
  }

  async getActiveAPIKey(provider: string): Promise<APIKey | null> {
    return await localDB.apiKeys
      .where('user_id')
      .equals(this.config.userId)
      .and(key => key.provider === provider && key.is_active === true)
      .first() || null
  }

  async createAPIKey(apiKeyData: Omit<APIKey, 'id' | 'created_at' | 'updated_at'>): Promise<APIKey> {
    const now = new Date().toISOString()
    const apiKeyDataWithTimestamps = {
      ...apiKeyData,
      created_at: now,
      updated_at: now,
      usage_count: 0,
      sync_status: 'pending' as const
    }

    // Let Dexie auto-generate the ID
    const id = await localDB.apiKeys.add(apiKeyDataWithTimestamps as any)
    
    const apiKey: APIKey = {
      id: id.toString(),
      ...apiKeyDataWithTimestamps
    }
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('api_keys', 'create', apiKey)
    }

    return apiKey
  }

  async updateAPIKey(id: string, updates: Partial<APIKey>): Promise<APIKey> {
    const existingAPIKey = await localDB.apiKeys.get(id)
    if (!existingAPIKey) {
      throw new Error('API key not found')
    }

    const updatedAPIKey: APIKey = {
      ...existingAPIKey,
      ...updates,
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    }

    await localDB.apiKeys.put(updatedAPIKey)
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('api_keys', 'update', updatedAPIKey)
    }

    return updatedAPIKey
  }

  async deleteAPIKey(id: string): Promise<void> {
    await localDB.apiKeys.delete(id)
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('api_keys', 'delete', { id })
    }
  }

  // Sync operations
  async sync(): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Cannot sync while offline')
    }

    // Process sync queue
    const syncItems = await localDB.syncQueue.toArray()
    
    for (const item of syncItems) {
      try {
        await this.processSyncItem(item)
        await localDB.syncQueue.delete(item.id!)
      } catch (error) {
        console.error('Sync error:', error)
        // Keep item in queue for retry
      }
    }

    // Pull changes from cloud
    await this.pullFromCloud()
  }

  async getConflicts(): Promise<SyncConflict[]> {
    return await localDB.conflicts.toArray()
  }

  async resolveConflict(conflictId: string, resolution: 'local' | 'cloud' | 'merge'): Promise<void> {
    const conflict = await localDB.conflicts.get(conflictId)
    if (!conflict) {
      throw new Error('Conflict not found')
    }

    switch (resolution) {
      case 'local':
        // Keep local data, mark as synced
        if (conflict.table === 'tasks') {
          await localDB.tasks.put({ ...conflict.localData, sync_status: 'synced' })
        } else {
          await localDB.messages.put({ ...conflict.localData, sync_status: 'synced' })
        }
        break
      case 'cloud':
        // Use cloud data
        if (conflict.table === 'tasks') {
          await localDB.tasks.put({ ...conflict.cloudData, sync_status: 'synced' })
        } else {
          await localDB.messages.put({ ...conflict.cloudData, sync_status: 'synced' })
        }
        break
      case 'merge':
        // Merge data (custom logic based on table)
        const mergedData = this.mergeData(conflict.localData, conflict.cloudData, conflict.table)
        if (conflict.table === 'tasks') {
          await localDB.tasks.put({ ...mergedData, sync_status: 'synced' })
        } else {
          await localDB.messages.put({ ...mergedData, sync_status: 'synced' })
        }
        break
    }

    await localDB.conflicts.delete(conflictId)
  }

  // Private helper methods
  private async addToSyncQueue(table: string, operation: string, data: any): Promise<void> {
    await localDB.syncQueue.add({
      table,
      operation,
      data,
      timestamp: new Date().toISOString()
    })
  }

  private async processSyncItem(item: any): Promise<void> {
    const { table, operation, data } = item

    switch (operation) {
      case 'create':
        await supabase.from(table).insert(data)
        break
      case 'update':
        await supabase.from(table).update(data).eq('id', data.id)
        break
      case 'delete':
        await supabase.from(table).delete().eq('id', data.id)
        break
    }
  }

  private async pullFromCloud(): Promise<void> {
    // Pull tasks
    const { data: cloudTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.config.userId)

    if (cloudTasks) {
      for (const cloudTask of cloudTasks) {
        const localTask = await localDB.tasks.get(cloudTask.id)
        
        if (!localTask) {
          // New task from cloud
          await localDB.tasks.add({ ...cloudTask, sync_status: 'synced' })
        } else if (localTask.sync_status === 'synced') {
          // Check for conflicts
          if (new Date(cloudTask.updated_at) > new Date(localTask.updated_at)) {
            await localDB.tasks.put({ ...cloudTask, sync_status: 'synced' })
          }
        } else {
          // Local changes pending, create conflict
          await this.createConflict('tasks', localTask, cloudTask, 'update')
        }
      }
    }

    // Pull messages
    const { data: cloudMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', this.config.userId)

    if (cloudMessages) {
      for (const cloudMessage of cloudMessages) {
        const localMessage = await localDB.messages.get(cloudMessage.id)
        
        if (!localMessage) {
          // New message from cloud
          await localDB.messages.add({ ...cloudMessage, sync_status: 'synced' })
        } else if (localMessage.sync_status === 'synced') {
          // Check for conflicts
          if (new Date(cloudMessage.inserted_at) > new Date(localMessage.inserted_at)) {
            await localDB.messages.put({ ...cloudMessage, sync_status: 'synced' })
          }
        } else {
          // Local changes pending, create conflict
          await this.createConflict('messages', localMessage, cloudMessage, 'update')
        }
      }
    }
  }

  private async createConflict(table: string, localData: any, cloudData: any, conflictType: string): Promise<void> {
    await localDB.conflicts.add({
      id: crypto.randomUUID(),
      table: table as 'tasks' | 'messages',
      localData,
      cloudData,
      conflictType: conflictType as 'update' | 'delete' | 'create',
      timestamp: new Date().toISOString()
    })
  }

  private mergeData(localData: any, cloudData: any, table: string): any {
    // Simple merge strategy - prefer non-null values, use cloud for timestamps
    const merged = { ...localData, ...cloudData }
    
    if (table === 'tasks') {
      // For tasks, prefer local title/description if different
      if (localData.title !== cloudData.title) {
        merged.title = localData.title || cloudData.title
      }
      if (localData.description !== cloudData.description) {
        merged.description = localData.description || cloudData.description
      }
      // Use latest timestamp
      merged.updated_at = new Date(Math.max(
        new Date(localData.updated_at).getTime(),
        new Date(cloudData.updated_at).getTime()
      )).toISOString()
    }
    
    return merged
  }
}
