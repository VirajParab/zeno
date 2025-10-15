import { DatabaseInterface, Task, Message, SyncConflict, DatabaseConfig, APIKey, ChatSession, Column, Reminder } from './types'
import { LocalDatabaseService } from './localDatabaseService'
import { CloudDatabaseService } from './cloudDatabaseService'

export class SyncDatabaseService implements DatabaseInterface {
  private localService: LocalDatabaseService
  private cloudService: CloudDatabaseService

  constructor(config: DatabaseConfig) {
    this.localService = new LocalDatabaseService(config)
    this.cloudService = new CloudDatabaseService(config)
  }

  async initialize(): Promise<void> {
    await this.localService.initialize()
    try {
      await this.cloudService.initialize()
    } catch (error) {
      console.warn('Cloud service initialization failed, continuing with local-only mode:', error)
    }
  }

  async close(): Promise<void> {
    await this.localService.close()
    await this.cloudService.close()
  }

  isOnline(): boolean {
    return navigator.onLine
  }

  // Task operations - always work with local first, sync to cloud
  async getTasks(): Promise<Task[]> {
    return await this.localService.getTasks()
  }

  async getTask(id: string): Promise<Task | null> {
    return await this.localService.getTask(id)
  }

  async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const task = await this.localService.createTask(taskData)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.createTask(taskData)
        await this.localService.updateTask(task.id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync task to cloud:', error)
      }
    }
    
    return task
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const task = await this.localService.updateTask(id, updates)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.updateTask(id, updates)
        await this.localService.updateTask(id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync task update to cloud:', error)
      }
    }
    
    return task
  }

  async deleteTask(id: string): Promise<void> {
    await this.localService.deleteTask(id)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.deleteTask(id)
      } catch (error) {
        console.error('Failed to sync task deletion to cloud:', error)
      }
    }
  }

  // Message operations - always work with local first, sync to cloud
  async getMessages(): Promise<Message[]> {
    return await this.localService.getMessages()
  }

  async getMessagesByChatSession(chatSessionId: string): Promise<Message[]> {
    return await this.localService.getMessagesByChatSession(chatSessionId)
  }

  async getMessage(id: string): Promise<Message | null> {
    return await this.localService.getMessage(id)
  }

  async createMessage(messageData: Omit<Message, 'id' | 'inserted_at'>): Promise<Message> {
    const message = await this.localService.createMessage(messageData)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.createMessage(messageData)
        await this.localService.updateMessage(message.id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync message to cloud:', error)
      }
    }
    
    return message
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message> {
    const message = await this.localService.updateMessage(id, updates)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.updateMessage(id, updates)
        await this.localService.updateMessage(id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync message update to cloud:', error)
      }
    }
    
    return message
  }

  async deleteMessage(id: string): Promise<void> {
    await this.localService.deleteMessage(id)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.deleteMessage(id)
      } catch (error) {
        console.error('Failed to sync message deletion to cloud:', error)
      }
    }
  }

  // Chat Session operations - always work with local first, sync to cloud
  async getChatSessions(): Promise<ChatSession[]> {
    return await this.localService.getChatSessions()
  }

  async getChatSession(id: string): Promise<ChatSession | null> {
    return await this.localService.getChatSession(id)
  }

  async createChatSession(chatSessionData: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>): Promise<ChatSession> {
    const chatSession = await this.localService.createChatSession(chatSessionData)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.createChatSession(chatSessionData)
      } catch (error) {
        console.error('Failed to sync chat session creation to cloud:', error)
      }
    }

    return chatSession
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    const chatSession = await this.localService.updateChatSession(id, updates)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.updateChatSession(id, updates)
      } catch (error) {
        console.error('Failed to sync chat session update to cloud:', error)
      }
    }

    return chatSession
  }

  async deleteChatSession(id: string): Promise<void> {
    await this.localService.deleteChatSession(id)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.deleteChatSession(id)
      } catch (error) {
        console.error('Failed to sync chat session deletion to cloud:', error)
      }
    }
  }

  // API Key operations - always work with local first, sync to cloud
  async getAPIKeys(): Promise<APIKey[]> {
    return await this.localService.getAPIKeys()
  }

  async getAPIKey(id: string): Promise<APIKey | null> {
    return await this.localService.getAPIKey(id)
  }

  async getActiveAPIKey(provider: 'openai' | 'gemini'): Promise<APIKey | null> {
    return await this.localService.getActiveAPIKey(provider)
  }

  async createAPIKey(apiKeyData: Omit<APIKey, 'id' | 'created_at' | 'updated_at'>): Promise<APIKey> {
    const apiKey = await this.localService.createAPIKey(apiKeyData)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.createAPIKey(apiKeyData)
        await this.localService.updateAPIKey(apiKey.id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync API key to cloud:', error)
      }
    }
    
    return apiKey
  }

  async updateAPIKey(id: string, updates: Partial<APIKey>): Promise<APIKey> {
    const apiKey = await this.localService.updateAPIKey(id, updates)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.updateAPIKey(id, updates)
        await this.localService.updateAPIKey(id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync API key update to cloud:', error)
      }
    }
    
    return apiKey
  }

  async deleteAPIKey(id: string): Promise<void> {
    await this.localService.deleteAPIKey(id)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.deleteAPIKey(id)
      } catch (error) {
        console.error('Failed to sync API key deletion to cloud:', error)
      }
    }
  }

  // Column operations - always work with local first, sync to cloud
  async getColumns(): Promise<Column[]> {
    return await this.localService.getColumns()
  }

  async getColumn(id: string): Promise<Column | null> {
    return await this.localService.getColumn(id)
  }

  async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    const column = await this.localService.createColumn(columnData)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.createColumn(columnData)
        await this.localService.updateColumn(column.id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync column to cloud:', error)
      }
    }
    
    return column
  }

  async updateColumn(id: string, updates: Partial<Column>): Promise<Column> {
    const column = await this.localService.updateColumn(id, updates)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.updateColumn(id, updates)
        await this.localService.updateColumn(id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync column update to cloud:', error)
      }
    }
    
    return column
  }

  async deleteColumn(id: string): Promise<void> {
    await this.localService.deleteColumn(id)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.deleteColumn(id)
      } catch (error) {
        console.error('Failed to sync column deletion to cloud:', error)
      }
    }
  }

  // Reminder operations - always work with local first, sync to cloud
  async getReminders(): Promise<Reminder[]> {
    return await this.localService.getReminders()
  }

  async getReminder(id: string): Promise<Reminder | null> {
    return await this.localService.getReminder(id)
  }

  async createReminder(reminderData: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>): Promise<Reminder> {
    const reminder = await this.localService.createReminder(reminderData)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.createReminder(reminderData)
        await this.localService.updateReminder(reminder.id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync reminder to cloud:', error)
      }
    }
    
    return reminder
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
    const reminder = await this.localService.updateReminder(id, updates)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.updateReminder(id, updates)
        await this.localService.updateReminder(id, { sync_status: 'synced' })
      } catch (error) {
        console.error('Failed to sync reminder update to cloud:', error)
      }
    }
    
    return reminder
  }

  async deleteReminder(id: string): Promise<void> {
    await this.localService.deleteReminder(id)
    
    // Try to sync to cloud if online
    if (this.isOnline()) {
      try {
        await this.cloudService.deleteReminder(id)
      } catch (error) {
        console.error('Failed to sync reminder deletion to cloud:', error)
      }
    }
  }

  // Sync operations
  async sync(): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Cannot sync while offline')
    }

    // Use local service sync which handles bidirectional sync
    await this.localService.sync()
  }

  async getConflicts(): Promise<SyncConflict[]> {
    return await this.localService.getConflicts()
  }

  async resolveConflict(conflictId: string, resolution: 'local' | 'cloud' | 'merge'): Promise<void> {
    await this.localService.resolveConflict(conflictId, resolution)
  }
}

// Factory function to create the appropriate database service
export function createDatabaseService(config: DatabaseConfig): DatabaseInterface {
  switch (config.mode) {
    case 'local':
      return new LocalDatabaseService(config)
    case 'cloud':
      return new CloudDatabaseService(config)
    case 'sync':
      return new SyncDatabaseService(config)
    default:
      throw new Error(`Unknown database mode: ${config.mode}`)
  }
}
