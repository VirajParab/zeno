import Dexie, { Table } from 'dexie'
import { Task, Message, SyncConflict, APIKey, Column, Reminder, ChatSession } from './types'

export class LocalDatabase extends Dexie {
  tasks!: Table<Task>
  messages!: Table<Message>
  apiKeys!: Table<APIKey>
  columns!: Table<Column>
  reminders!: Table<Reminder>
  chatSessions!: Table<ChatSession>
  syncQueue!: Table<any>
  conflicts!: Table<SyncConflict>

  constructor() {
    super('ZenoLocalDB_v4')
    
    // Updated schema with new tables
    this.version(4).stores({
      tasks: '++id, user_id, status, column_id, position, created_at, updated_at, sync_status',
      messages: '++id, user_id, role, inserted_at, chat_session_id, sync_status',
      apiKeys: '++id, user_id, provider, is_active, created_at, updated_at, sync_status',
      columns: '++id, user_id, position, created_at, updated_at, sync_status',
      reminders: '++id, user_id, task_id, reminder_date, is_sent, created_at, updated_at, sync_status',
      chatSessions: '++id, user_id, title, created_at, updated_at, last_message_at, message_count, sync_status',
      syncQueue: '++id, table, operation, data, timestamp',
      conflicts: '++id, table, localData, cloudData, conflictType, timestamp'
    })
  }
}

export const localDB = new LocalDatabase()
