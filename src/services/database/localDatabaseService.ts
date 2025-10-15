import { DatabaseInterface, Task, Message, SyncConflict, DatabaseConfig, APIKey, Column, Reminder, ChatSession } from './types'
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
      .sortBy('created_at')
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

    // Let Dexie auto-generate the ID - don't include id field
    const id = await localDB.tasks.add(taskDataWithTimestamps)
    
    // Fetch the created task to get the auto-generated ID
    const createdTask = await localDB.tasks.get(id)
    if (!createdTask) {
      throw new Error('Failed to create task')
    }
    
    const task: Task = {
      ...createdTask,
      id: createdTask.id.toString()
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
      .sortBy('inserted_at')
  }

  async getMessagesByChatSession(chatSessionId: string): Promise<Message[]> {
    // Get all messages for user and filter by chat_session_id
    const allMessages = await localDB.messages
      .where('user_id')
      .equals(this.config.userId)
      .toArray()
    
    return allMessages
      .filter(msg => {
        // Handle both string and number chat_session_id values
        const msgSessionId = msg.chat_session_id
        return msgSessionId === chatSessionId || 
               msgSessionId === chatSessionId.toString() || 
               msgSessionId?.toString() === chatSessionId
      })
      .sort((a, b) => new Date(a.inserted_at).getTime() - new Date(b.inserted_at).getTime())
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

    // Let Dexie auto-generate the ID - don't include id field
    const id = await localDB.messages.add(messageDataWithTimestamp)
    
    // Fetch the created message to get the auto-generated ID
    const createdMessage = await localDB.messages.get(id)
    if (!createdMessage) {
      throw new Error('Failed to create message')
    }
    
    const message: Message = {
      ...createdMessage,
      id: createdMessage.id.toString()
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

  // Chat Session operations
  async getChatSessions(): Promise<ChatSession[]> {
    return await localDB.chatSessions
      .where('user_id')
      .equals(this.config.userId)
      .sortBy('last_message_at')
      .then(sessions => sessions.reverse()) // Most recent first
  }

  async getChatSession(id: string): Promise<ChatSession | null> {
    // Try to get by string ID first, then by number ID
    let chatSession = await localDB.chatSessions.get(id)
    if (!chatSession) {
      // Try with numeric ID
      const numericId = parseInt(id)
      if (!isNaN(numericId)) {
        chatSession = await localDB.chatSessions.get(numericId)
      }
    }
    
    if (!chatSession) {
      return null
    }
    
    // Convert ID to string for consistency
    return {
      ...chatSession,
      id: chatSession.id.toString()
    }
  }

  async createChatSession(chatSessionData: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>): Promise<ChatSession> {
    const now = new Date().toISOString()
    const chatSessionDataWithTimestamp = {
      ...chatSessionData,
      created_at: now,
      updated_at: now,
      sync_status: 'pending' as const
    }

    const id = await localDB.chatSessions.add(chatSessionDataWithTimestamp)
    
    // Fetch the created chat session to get the auto-generated ID
    const createdChatSession = await localDB.chatSessions.get(id)
    if (!createdChatSession) {
      throw new Error('Failed to create chat session')
    }
    
    const chatSession: ChatSession = {
      ...createdChatSession,
      id: createdChatSession.id.toString()
    }
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('chatSessions', 'create', chatSession)
    }

    return chatSession
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    // Try to get by string ID first, then by number ID
    let existingChatSession = await localDB.chatSessions.get(id)
    if (!existingChatSession) {
      // Try with numeric ID
      const numericId = parseInt(id)
      if (!isNaN(numericId)) {
        existingChatSession = await localDB.chatSessions.get(numericId)
      }
    }
    
    if (!existingChatSession) {
      throw new Error('Chat session not found')
    }

    const updatedChatSession: ChatSession = {
      ...existingChatSession,
      ...updates,
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    }

    await localDB.chatSessions.put(updatedChatSession)
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('chatSessions', 'update', updatedChatSession)
    }

    return updatedChatSession
  }

  async deleteChatSession(id: string): Promise<void> {
    await localDB.chatSessions.delete(id)
    
    // Add to sync queue if online
    if (this.isOnline()) {
      await this.addToSyncQueue('chatSessions', 'delete', { id })
    }
  }

  // Column operations
  async getColumns(): Promise<Column[]> {
    return await localDB.columns
      .where('user_id')
      .equals(this.config.userId)
      .sortBy('position')
  }

  async getColumn(id: string): Promise<Column | null> {
    return await localDB.columns.get(id) || null
  }

  async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    const now = new Date().toISOString()
    const columnDataWithTimestamp = {
      ...columnData,
      created_at: now,
      updated_at: now,
      sync_status: 'pending' as const
    }

    const id = await localDB.columns.add(columnDataWithTimestamp)
    const createdColumn = await localDB.columns.get(id)
    if (!createdColumn) {
      throw new Error('Failed to create column')
    }
    
    const column: Column = {
      ...createdColumn,
      id: createdColumn.id.toString()
    }
    
    if (this.isOnline()) {
      await this.addToSyncQueue('columns', 'create', column)
    }

    return column
  }

  async updateColumn(id: string, updates: Partial<Column>): Promise<Column> {
    const existingColumn = await localDB.columns.get(id)
    if (!existingColumn) {
      throw new Error('Column not found')
    }

    const updatedColumn: Column = {
      ...existingColumn,
      ...updates,
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    }

    await localDB.columns.put(updatedColumn)
    
    if (this.isOnline()) {
      await this.addToSyncQueue('columns', 'update', updatedColumn)
    }

    return updatedColumn
  }

  async deleteColumn(id: string): Promise<void> {
    await localDB.columns.delete(id)
    
    if (this.isOnline()) {
      await this.addToSyncQueue('columns', 'delete', { id })
    }
  }

  // Reminder operations
  async getReminders(): Promise<Reminder[]> {
    return await localDB.reminders
      .where('user_id')
      .equals(this.config.userId)
      .toArray()
  }

  async getReminder(id: string): Promise<Reminder | null> {
    return await localDB.reminders.get(id) || null
  }

  async createReminder(reminderData: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>): Promise<Reminder> {
    const now = new Date().toISOString()
    const reminderDataWithTimestamp = {
      ...reminderData,
      created_at: now,
      updated_at: now,
      sync_status: 'pending' as const
    }

    const id = await localDB.reminders.add(reminderDataWithTimestamp)
    const createdReminder = await localDB.reminders.get(id)
    if (!createdReminder) {
      throw new Error('Failed to create reminder')
    }
    
    const reminder: Reminder = {
      ...createdReminder,
      id: createdReminder.id.toString()
    }
    
    if (this.isOnline()) {
      await this.addToSyncQueue('reminders', 'create', reminder)
    }

    return reminder
  }

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
    const existingReminder = await localDB.reminders.get(id)
    if (!existingReminder) {
      throw new Error('Reminder not found')
    }

    const updatedReminder: Reminder = {
      ...existingReminder,
      ...updates,
      updated_at: new Date().toISOString(),
      sync_status: 'pending'
    }

    await localDB.reminders.put(updatedReminder)
    
    if (this.isOnline()) {
      await this.addToSyncQueue('reminders', 'update', updatedReminder)
    }

    return updatedReminder
  }

  async deleteReminder(id: string): Promise<void> {
    await localDB.reminders.delete(id)
    
    if (this.isOnline()) {
      await this.addToSyncQueue('reminders', 'delete', { id })
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

    // Let Dexie auto-generate the ID - don't include id field
    const id = await localDB.apiKeys.add(apiKeyDataWithTimestamps)
    
    // Fetch the created API key to get the auto-generated ID
    const createdAPIKey = await localDB.apiKeys.get(id)
    if (!createdAPIKey) {
      throw new Error('Failed to create API key')
    }
    
    const apiKey: APIKey = {
      ...createdAPIKey,
      id: createdAPIKey.id.toString()
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
